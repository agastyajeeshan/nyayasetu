import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
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
   * Registers a new piece of forensic/physical evidence
   */
  public static createEvidence(params: CreateEvidenceParams): EvidenceItem {
    const caseItem = db.cases.find(c => c.id === params.caseId);
    if (!caseItem) throw new Error(`Case '${params.caseId}' not found.`);

    const evidenceId = `EVD-${Date.now()}-${uuidv4().slice(0, 6)}`;
    const evidenceNumber = `EVD-${new Date().getFullYear()}-${db.evidence_items.length + 101}`;
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

    db.evidence_items.unshift(item);

    // Create Initial Custody Event
    const hashProof = CryptoService.sha256(`CUSTODY_INIT:${evidenceId}:${params.actorName}:${params.storageLocker}:${new Date().toISOString()}`);
    
    // Anchor to ledger
    const ledgerBlock = LedgerService.createBlock({
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

    db.custody_events.push(initialEvent);
    db.save();

    AuditService.log({
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
   * Transfers custody of evidence to another custodian / forensic lab / court
   */
  public static transferCustody(params: TransferCustodyParams): CustodyEvent {
    const item = db.evidence_items.find(e => e.id === params.evidenceId);
    if (!item) throw new Error('Evidence item not found.');

    const previousCustodian = item.currentCustodian;
    item.currentCustodian = params.toCustodian;
    item.storageLocker = params.toLocation;
    item.updatedAt = new Date().toISOString();

    const timestamp = new Date().toISOString();
    const hashProof = CryptoService.sha256(`CUSTODY_TRANSFER:${item.id}:${previousCustodian}->${params.toCustodian}:${timestamp}`);

    const ledgerBlock = LedgerService.createBlock({
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

    db.custody_events.push(event);
    db.save();

    AuditService.log({
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
   * Retrieves full custody timeline and evidence detail
   */
  public static getEvidenceDetail(evidenceId: string): {
    evidence: EvidenceItem;
    custodyHistory: CustodyEvent[];
    linkedDocuments: any[];
  } | null {
    const item = db.evidence_items.find(e => e.id === evidenceId || e.evidenceNumber === evidenceId);
    if (!item) return null;

    const custodyHistory = db.custody_events
      .filter(c => c.evidenceId === item.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const linkedDocuments = db.documents.filter(d => item.linkedDocumentIds.includes(d.id));

    return {
      evidence: item,
      custodyHistory,
      linkedDocuments
    };
  }

  /**
   * List all evidence items
   */
  public static listEvidence(filters: { caseId?: string; type?: string; search?: string }): EvidenceItem[] {
    let list = [...db.evidence_items];

    if (filters.caseId) {
      list = list.filter(e => e.caseId === filters.caseId || e.caseNumber === filters.caseId);
    }
    if (filters.type) {
      list = list.filter(e => e.type === filters.type);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(e =>
        e.evidenceNumber.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.caseNumber.toLowerCase().includes(q) ||
        e.currentCustodian.toLowerCase().includes(q)
      );
    }

    return list;
  }
}
