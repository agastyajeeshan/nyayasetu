import { PostgresService } from '../db/postgres.js';
import { AuditEvent, UserRole } from '../types/index.js';

export interface AuditQueryFilters {
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
}

export class AuditRepository {
  public static mapRowToAudit(row: any): AuditEvent {
    return {
      id: row.id,
      timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
      actorId: row.actor_id,
      actorName: row.actor_name,
      actorRole: row.actor_role as UserRole,
      organization: row.organization || '',
      department: row.department || '',
      action: row.action,
      resourceType: row.resource_type as any,
      resourceId: row.resource_id || '',
      resourceName: row.resource_name || undefined,
      details: row.details || '',
      outcome: row.outcome as any,
      ipAddress: row.ip_address || '',
      userAgent: row.user_agent || undefined,
      ledgerBlockIndex: row.ledger_block_index ? Number(row.ledger_block_index) : undefined,
      integrityHash: row.integrity_hash || ''
    };
  }

  public static async create(a: AuditEvent): Promise<AuditEvent> {
    await PostgresService.query(`
      INSERT INTO audit_events (
        id, timestamp, actor_id, actor_name, actor_role, organization,
        department, action, resource_type, resource_id, resource_name,
        details, outcome, ip_address, user_agent, ledger_block_index, integrity_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO NOTHING
    `, [
      a.id, a.timestamp || new Date().toISOString(), a.actorId, a.actorName,
      a.actorRole, a.organization || null, a.department || null, a.action,
      a.resourceType, a.resourceId || null, a.resourceName || null,
      a.details || null, a.outcome || 'SUCCESS', a.ipAddress || null,
      a.userAgent || null, a.ledgerBlockIndex || null, a.integrityHash || null
    ]);
    return a;
  }

  public static async queryLogs(filters: AuditQueryFilters): Promise<{ logs: AuditEvent[]; totalCount: number }> {
    let whereClauses: string[] = ['1=1'];
    const params: any[] = [];

    if (filters.actorId) {
      params.push(filters.actorId);
      whereClauses.push(`actor_id = $${params.length}`);
    }

    if (filters.user) {
      params.push(`%${filters.user.toLowerCase()}%`);
      whereClauses.push(`(LOWER(actor_name) LIKE $${params.length} OR LOWER(actor_id) LIKE $${params.length})`);
    }

    if (filters.role) {
      params.push(filters.role);
      whereClauses.push(`actor_role = $${params.length}`);
    }

    if (filters.resourceType) {
      params.push(filters.resourceType);
      whereClauses.push(`resource_type = $${params.length}`);
    }

    if (filters.resourceId) {
      params.push(filters.resourceId);
      whereClauses.push(`resource_id = $${params.length}`);
    }

    if (filters.caseId) {
      params.push(filters.caseId);
      whereClauses.push(`(resource_id = $${params.length} OR details ILIKE '%' || $${params.length} || '%')`);
    }

    if (filters.documentId) {
      params.push(filters.documentId);
      whereClauses.push(`(resource_id = $${params.length} OR details ILIKE '%' || $${params.length} || '%')`);
    }

    if (filters.evidenceId) {
      params.push(filters.evidenceId);
      whereClauses.push(`(resource_id = $${params.length} OR details ILIKE '%' || $${params.length} || '%')`);
    }

    if (filters.action) {
      params.push(filters.action);
      whereClauses.push(`action = $${params.length}`);
    }

    if (filters.outcome) {
      params.push(filters.outcome);
      whereClauses.push(`outcome = $${params.length}`);
    }

    if (filters.isSecurityEvent) {
      whereClauses.push(`(
        action IN ('LOGIN_FAILURE', 'PASSWORD_CHANGE_FAILED', 'FACE_REMOVE_FAILED', 'UNAUTHORIZED_ACCESS', 'TAMPER_DETECTED')
        OR outcome = 'FAILURE'
        OR outcome = 'BLOCKED'
      )`);
    }

    if (filters.startDate) {
      params.push(filters.startDate);
      whereClauses.push(`timestamp >= $${params.length}`);
    }

    if (filters.endDate) {
      params.push(filters.endDate);
      whereClauses.push(`timestamp <= $${params.length}`);
    }

    if (filters.search) {
      params.push(`%${filters.search.toLowerCase()}%`);
      whereClauses.push(`(
        LOWER(action) LIKE $${params.length} OR
        LOWER(details) LIKE $${params.length} OR
        LOWER(actor_name) LIKE $${params.length} OR
        LOWER(resource_id) LIKE $${params.length} OR
        LOWER(resource_name) LIKE $${params.length}
      )`);
    }

    const whereSql = whereClauses.join(' AND ');

    // Count
    const countRes = await PostgresService.query(`SELECT COUNT(*) FROM audit_events WHERE ${whereSql}`, params);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    // Logs
    let sql = `SELECT * FROM audit_events WHERE ${whereSql} ORDER BY timestamp DESC`;

    const limit = filters.limit || 50;
    params.push(limit);
    sql += ` LIMIT $${params.length}`;

    if (filters.offset) {
      params.push(filters.offset);
      sql += ` OFFSET $${params.length}`;
    }

    const logsRes = await PostgresService.query(sql, params);
    const logs = logsRes.rows.map(r => this.mapRowToAudit(r));

    return { logs, totalCount };
  }

  public static async findByActorId(actorId: string, limit: number = 20): Promise<AuditEvent[]> {
    const res = await PostgresService.query(
      'SELECT * FROM audit_events WHERE actor_id = $1 ORDER BY timestamp DESC LIMIT $2',
      [actorId, limit]
    );
    return res.rows.map(r => this.mapRowToAudit(r));
  }

  public static async findRecentForUser(userId: string, userName: string, limit: number = 10): Promise<AuditEvent[]> {
    const res = await PostgresService.query(`
      SELECT * FROM audit_events 
      WHERE actor_id = $1 
         OR (resource_type = 'AUTH' AND resource_id = $1)
         OR details ILIKE '%' || $2 || '%'
      ORDER BY timestamp DESC 
      LIMIT $3
    `, [userId, userName, limit]);
    return res.rows.map(r => this.mapRowToAudit(r));
  }

  public static async count(): Promise<number> {
    const res = await PostgresService.query('SELECT COUNT(*) FROM audit_events');
    return parseInt(res.rows[0].count, 10);
  }
}
