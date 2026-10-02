import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
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
   * Logs an append-only audit event and anchors it into the ledger
   */
  public static log(params: LogAuditParams): AuditEvent {
    const id = `AUD-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const timestamp = new Date().toISOString();

    const payloadString = `${id}:${timestamp}:${params.actorId}:${params.action}:${params.resourceType}:${params.resourceId}:${params.outcome}`;
    const integrityHash = CryptoService.sha256(payloadString);

    let ledgerBlockIndex: number | undefined;

    // Record high-impact events directly to cryptographic ledger
    if (params.recordToLedger !== false) {
      const block = LedgerService.createBlock({
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

    db.audit_events.unshift(event); // newest first in memory
    db.save();
    return event;
  }

  /**
   * Queries audit logs with multi-field filtering (Feature 9)
   */
  public static queryLogs(filters: {
    actorId?: string;
    user?: string;
    role?: string;
    caseId?: string;
    documentId?: string;
    evidenceId?: string;
    resourceType?: string;
    resourceId?: string;
    action?: string;
    actionCategory?: string;
    isSecurityEvent?: boolean;
    outcome?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): { total: number; logs: AuditEvent[] } {
    let list = [...db.audit_events];

    if (filters.actorId) {
      list = list.filter(l => l.actorId === filters.actorId);
    }
    if (filters.user) {
      const u = filters.user.toLowerCase();
      list = list.filter(l => l.actorName.toLowerCase().includes(u) || l.actorId.toLowerCase().includes(u));
    }
    if (filters.role) {
      list = list.filter(l => l.actorRole.toLowerCase() === filters.role?.toLowerCase());
    }
    if (filters.caseId) {
      const cid = filters.caseId.toLowerCase();
      list = list.filter(l => 
        (l.resourceType === 'CASE' && l.resourceId.toLowerCase().includes(cid)) ||
        (l.details && l.details.toLowerCase().includes(cid))
      );
    }
    if (filters.documentId) {
      const did = filters.documentId.toLowerCase();
      list = list.filter(l => 
        (l.resourceType === 'DOCUMENT' && l.resourceId.toLowerCase().includes(did)) ||
        (l.resourceName && l.resourceName.toLowerCase().includes(did)) ||
        (l.details && l.details.toLowerCase().includes(did))
      );
    }
    if (filters.evidenceId) {
      const eid = filters.evidenceId.toLowerCase();
      list = list.filter(l => 
        (l.resourceType === 'EVIDENCE' && l.resourceId.toLowerCase().includes(eid)) ||
        (l.resourceName && l.resourceName.toLowerCase().includes(eid)) ||
        (l.details && l.details.toLowerCase().includes(eid))
      );
    }
    if (filters.resourceType) {
      list = list.filter(l => l.resourceType.toLowerCase() === filters.resourceType?.toLowerCase());
    }
    if (filters.resourceId) {
      list = list.filter(l => l.resourceId.toLowerCase().includes(filters.resourceId!.toLowerCase()));
    }
    if (filters.action) {
      list = list.filter(l => l.action.toLowerCase().includes(filters.action!.toLowerCase()));
    }

    // Action Category normalization (Feature 9)
    if (filters.actionCategory) {
      const cat = filters.actionCategory.toUpperCase();
      list = list.filter(l => {
        const act = l.action.toUpperCase();
        if (cat === 'UPLOAD') return act.includes('UPLOAD') || act.includes('CREATE');
        if (cat === 'VIEW') return act.includes('VIEW') || act.includes('PREVIEW') || act.includes('ACCESS');
        if (cat === 'DOWNLOAD') return act.includes('DOWNLOAD');
        if (cat === 'MODIFY') return act.includes('UPDATE') || act.includes('STATUS') || act.includes('EDIT');
        if (cat === 'SIGN') return act.includes('SIGN');
        if (cat === 'VERIFY') return act.includes('VERIF') || act.includes('INTEGRITY') || act.includes('CHECK');
        if (cat === 'SHARE') return act.includes('SHARE');
        if (cat === 'REVOKE') return act.includes('REVOK') || act.includes('HOLD');
        if (cat === 'TRANSFER') return act.includes('TRANSFER') || act.includes('CUSTODY');
        if (cat === 'EXPORT') return act.includes('EXPORT');
        return act.includes(cat);
      });
    }

    // Security event filter
    if (filters.isSecurityEvent) {
      list = list.filter(l => 
        l.outcome === 'BLOCKED' ||
        l.outcome === 'FAILURE' ||
        l.action.includes('TAMPER') ||
        l.action.includes('HOLD') ||
        l.action.includes('REVOK') ||
        l.action.includes('ALERT')
      );
    }

    if (filters.outcome) {
      list = list.filter(l => l.outcome === filters.outcome);
    }
    if (filters.startDate) {
      list = list.filter(l => new Date(l.timestamp) >= new Date(filters.startDate!));
    }
    if (filters.endDate) {
      list = list.filter(l => new Date(l.timestamp) <= new Date(filters.endDate!));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(l => 
        l.details.toLowerCase().includes(q) ||
        l.actorName.toLowerCase().includes(q) ||
        (l.resourceName && l.resourceName.toLowerCase().includes(q)) ||
        l.action.toLowerCase().includes(q)
      );
    }

    const total = list.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    const logs = list.slice(offset, offset + limit);

    return { total, logs };
  }
}
