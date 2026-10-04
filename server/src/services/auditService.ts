import { v4 as uuidv4 } from 'uuid';
import { AuditRepository, AuditQueryFilters } from '../repositories/auditRepository.js';
import { CryptoService } from './cryptoService.js';
import { LedgerService } from './ledgerService.js';
import { AuditEvent, UserRole } from '../types/index.js';

export interface LogAuditParams {
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  organization: string;
  department: string;
  action: string;
  resourceType: 'CASE' | 'DOCUMENT' | 'EVIDENCE' | 'SHARE' | 'AUTH' | 'USER' | 'ASSET' | 'LEDGER';
  resourceId: string;
  resourceName?: string;
  details: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  ipAddress: string;
  userAgent?: string;
  recordToLedger?: boolean;
}

export class AuditService {
  /**
   * Logs an append-only audit event and anchors it into the PostgreSQL ledger
   */
  public static async log(params: LogAuditParams): Promise<AuditEvent> {
    const id = `AUD-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const timestamp = new Date().toISOString();

    const payloadString = `${id}:${timestamp}:${params.actorId}:${params.action}:${params.resourceType}:${params.resourceId}:${params.outcome}`;
    const integrityHash = CryptoService.sha256(payloadString);

    let ledgerBlockIndex: number | undefined;

    // Record high-impact events directly to cryptographic ledger
    if (params.recordToLedger !== false) {
      const block = await LedgerService.createBlock({
        eventType: `AUDIT_${params.action}`,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        resourceHash: integrityHash,
        actorId: params.actorId,
        actorName: params.actorName,
        payload: {
          auditId: id,
          action: params.action,
          details: params.details,
          outcome: params.outcome,
          ip: params.ipAddress
        }
      });
      ledgerBlockIndex = block.blockIndex;
    }

    const event: AuditEvent = {
      id,
      timestamp,
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      organization: params.organization || 'Ministry of Home Affairs',
      department: params.department || 'NCRB',
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      resourceName: params.resourceName,
      details: params.details,
      outcome: params.outcome,
      ipAddress: params.ipAddress || '127.0.0.1',
      userAgent: params.userAgent,
      ledgerBlockIndex,
      integrityHash
    };

    await AuditRepository.create(event);
    return event;
  }

  /**
   * Queries audit logs with multi-field filtering from PostgreSQL
   */
  public static async queryLogs(filters: AuditQueryFilters): Promise<{ total: number; logs: AuditEvent[] }> {
    const result = await AuditRepository.queryLogs(filters);
    return {
      total: result.totalCount,
      logs: result.logs
    };
  }
}
