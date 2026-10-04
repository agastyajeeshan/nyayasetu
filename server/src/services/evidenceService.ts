import { v4 as uuidv4 } from 'uuid';
import { 
  EvidenceRepository, 
  CustodyRepository, 
  CaseRepository, 
  DocumentRepository 
} from '../repositories/index.js';
import { PostgresService } from '../db/postgres.js';
import { CryptoService } from './cryptoService.js';
import { LedgerService } from './ledgerService.js';
import { AuditService } from './auditService.js';
import { EvidenceItem, CustodyEvent, EvidenceType, UserRole } from '../types/index.js';

export interface CreateEvidenceParams {
  caseId: string;
  type: EvidenceType;
  description: string;
  collectionLocation: string;
  collectionTimestamp: string;
  storageLocker: string;
  handlingNotes: string;
  rawSampleOrDigest: string; // Used to compute evidence hash
  linkedDocumentIds?: string[];
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  actorDepartment: string;
  ipAddress: string;
}

export interface TransferCustodyParams {
  evidenceId: string;
  toCustodian: string;
  toLocation: string;
  reason: string;
  notes?: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  actorDepartment: string;
  ipAddress: string;
}

export class EvidenceService {
  /**
   * Registers a new piece of forensic/physical evidence inside a PostgreSQL transaction
   */
  public static async createEvidence(params: CreateEvidenceParams): Promise<EvidenceItem> {
    const caseItem = await CaseRepository.findById(params.caseId) || await CaseRepository.findByCaseNumber(params.caseId);
    if (!caseItem) throw new Error(`Case '${params.caseId}' not found.`);

    const evidenceId = `EVD-${Date.now()}-${uuidv4().slice(0, 6)}`;
    const count = (await EvidenceRepository.count()) + 101;
    const evidenceNumber = `EVD-${new Date().getFullYear()}-${count}`;
    const sha256Hash = CryptoService.sha256(`${evidenceId}:${params.type}:${params.description}:${params.rawSampleOrDigest}`);

    const item: EvidenceItem = {
      id: evidenceId,
      evidenceNumber,
      caseId: caseItem.id,
      caseNumber: caseItem.caseNumber,
      type: params.type,
      description: params.description,
      collectionLocation: params.collectionLocation,
      collectionTimestamp: params.collectionTimestamp,
      collectorId: params.actorId,
      collectorName: params.actorName,
      storageLocker: params.storageLocker,
      currentCustodian: params.actorName,
      currentCustodianRole: params.actorRole,
      handlingNotes: params.handlingNotes,
      sha256Hash,
      linkedDocumentIds: params.linkedDocumentIds || [],
      isLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Initial custody event & ledger anchoring
    const hashProof = CryptoService.sha256(`CUSTODY_INIT:${evidenceId}:${params.actorName}:${params.storageLocker}:${new Date().toISOString()}`);

    const ledgerBlock = await LedgerService.createBlock({
      eventType: 'EVIDENCE_COLLECTED',
      resourceType: 'EVIDENCE',
      resourceId: item.id,
      resourceHash: sha256Hash,
      actorId: params.actorId,
      actorName: params.actorName,
      payload: {
        evidenceNumber,
        type: item.type,
        location: item.collectionLocation,
        storageLocker: item.storageLocker,
        hashProof
      }
    });

    const initialEvent: CustodyEvent = {
      id: `CUST-${Date.now()}-${uuidv4().slice(0, 6)}`,
      evidenceId,
      eventType: 'COLLECTION',
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      fromCustodian: 'Incident Scene',
      toCustodian: `${params.actorName} (${params.actorRole})`,
      location: params.storageLocker,
      timestamp: new Date().toISOString(),
      reason: 'Initial scene collection & evidence tagging',
      notes: params.handlingNotes,
      acknowledgedByDestination: true,
      acknowledgedAt: new Date().toISOString(),
      hashProof,
      ledgerBlockId: ledgerBlock.blockHash
    };

    await PostgresService.withTransaction(async () => {
      await EvidenceRepository.create(item);
      await CustodyRepository.create(initialEvent);
    });

    await AuditService.log({
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      organization: 'Ministry of Home Affairs',
      department: params.actorDepartment,
      action: 'EVIDENCE_REGISTERED',
      resourceType: 'EVIDENCE',
      resourceId: item.id,
      resourceName: `${item.evidenceNumber}: ${item.description.slice(0, 30)}...`,
      details: `Evidence item ${item.evidenceNumber} (${item.type}) registered to case ${caseItem.caseNumber}. Stored at ${item.storageLocker}`,
      outcome: 'SUCCESS',
      ipAddress: params.ipAddress
    });

    return item;
  }

  /**
   * Transfers custody of evidence to another custodian / forensic lab / court inside a PostgreSQL transaction
   */
  public static async transferCustody(params: TransferCustodyParams): Promise<CustodyEvent> {
    const item = await EvidenceRepository.findById(params.evidenceId);
    if (!item) throw new Error('Evidence item not found.');

    const previousCustodian = item.currentCustodian;
    const timestamp = new Date().toISOString();
    const hashProof = CryptoService.sha256(`CUSTODY_TRANSFER:${item.id}:${previousCustodian}->${params.toCustodian}:${timestamp}`);

    const ledgerBlock = await LedgerService.createBlock({
      eventType: 'EVIDENCE_CUSTODY_TRANSFERRED',
      resourceType: 'EVIDENCE',
      resourceId: item.id,
      resourceHash: hashProof,
      actorId: params.actorId,
      actorName: params.actorName,
      payload: {
        evidenceNumber: item.evidenceNumber,
        fromCustodian: previousCustodian,
        toCustodian: params.toCustodian,
        toLocation: params.toLocation,
        reason: params.reason
      }
    });

    const event: CustodyEvent = {
      id: `CUST-${Date.now()}-${uuidv4().slice(0, 6)}`,
      evidenceId: item.id,
      eventType: 'TRANSFER',
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      fromCustodian: previousCustodian,
      toCustodian: params.toCustodian,
      location: params.toLocation,
      timestamp,
      reason: params.reason,
      notes: params.notes,
      acknowledgedByDestination: true,
      acknowledgedAt: timestamp,
      hashProof,
      ledgerBlockId: ledgerBlock.blockHash
    };

    await PostgresService.withTransaction(async () => {
      await EvidenceRepository.update(item.id, {
        currentCustodian: params.toCustodian,
        storageLocker: params.toLocation,
        updatedAt: timestamp
      });
      await CustodyRepository.create(event);
    });

    await AuditService.log({
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      organization: 'Ministry of Home Affairs',
      department: params.actorDepartment,
      action: 'EVIDENCE_CUSTODY_TRANSFERRED',
      resourceType: 'EVIDENCE',
      resourceId: item.id,
      resourceName: item.evidenceNumber,
      details: `Custody of ${item.evidenceNumber} transferred from '${previousCustodian}' to '${params.toCustodian}'. Reason: ${params.reason}`,
      outcome: 'SUCCESS',
      ipAddress: params.ipAddress
    });

    return event;
  }

  /**
   * Retrieves full custody timeline and evidence detail from PostgreSQL
   */
  public static async getEvidenceDetail(evidenceId: string): Promise<{
    evidence: EvidenceItem;
    custodyHistory: CustodyEvent[];
    linkedDocuments: any[];
  } | null> {
    const item = await EvidenceRepository.findById(evidenceId) || await EvidenceRepository.findByEvidenceNumber(evidenceId);
    if (!item) return null;

    const custodyHistory = await CustodyRepository.findByEvidenceId(item.id);
    custodyHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const linkedDocuments: any[] = [];
    for (const docId of item.linkedDocumentIds) {
      const doc = await DocumentRepository.findById(docId);
      if (doc) linkedDocuments.push(doc);
    }

    return {
      evidence: item,
      custodyHistory,
      linkedDocuments
    };
  }

  /**
   * List all evidence items from PostgreSQL
   */
  public static async listEvidence(filters: { caseId?: string; type?: string; search?: string }): Promise<EvidenceItem[]> {
    return EvidenceRepository.findMany(filters);
  }
}
