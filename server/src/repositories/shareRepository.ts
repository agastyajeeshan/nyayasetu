import { PostgresService } from '../db/postgres.js';
import { ShareLink, ShareAccessLog } from '../types/index.js';

export class ShareRepository {
  public static mapRowToShare(row: any): ShareLink {
    return {
      id: row.id,
      shareToken: row.share_token,
      documentId: row.document_id || undefined,
      caseId: row.case_id || undefined,
      resourceType: row.resource_type as any,
      resourceTitle: row.resource_title,
      sharedByUserId: row.shared_by_user_id,
      sharedByName: row.shared_by_name,
      recipientEmail: row.recipient_email,
      recipientName: row.recipient_name,
      recipientOrg: row.recipient_org || '',
      permission: row.permission as any,
      watermarkText: row.watermark_text || '',
      purpose: row.purpose || '',
      accessPasscodeHash: row.access_passcode_hash || undefined,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : '',
      isRevoked: Boolean(row.is_revoked),
      revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : undefined,
      revokedBy: row.revoked_by || undefined,
      accessCount: Number(row.access_count) || 0,
      maxAccessCount: row.max_access_count ? Number(row.max_access_count) : undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
    };
  }

  public static mapRowToLog(row: any): ShareAccessLog {
    return {
      id: row.id,
      shareId: row.share_id,
      accessedAt: row.accessed_at ? new Date(row.accessed_at).toISOString() : new Date().toISOString(),
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      action: row.action as any,
      outcome: row.outcome as any
    };
  }

  public static async findById(id: string): Promise<ShareLink | null> {
    const res = await PostgresService.query('SELECT * FROM share_links WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToShare(res.rows[0]);
  }

  public static async findByToken(token: string): Promise<ShareLink | null> {
    const res = await PostgresService.query('SELECT * FROM share_links WHERE share_token = $1', [token]);
    if (res.rows.length === 0) return null;
    return this.mapRowToShare(res.rows[0]);
  }

  public static async findByCaseId(caseId: string): Promise<ShareLink[]> {
    const res = await PostgresService.query('SELECT * FROM share_links WHERE case_id = $1 ORDER BY created_at DESC', [caseId]);
    return res.rows.map(r => this.mapRowToShare(r));
  }

  public static async findByDocId(documentId: string): Promise<ShareLink[]> {
    const res = await PostgresService.query('SELECT * FROM share_links WHERE document_id = $1 ORDER BY created_at DESC', [documentId]);
    return res.rows.map(r => this.mapRowToShare(r));
  }

  public static async findByUserId(userId: string): Promise<ShareLink[]> {
    const res = await PostgresService.query('SELECT * FROM share_links WHERE shared_by_user_id = $1 ORDER BY created_at DESC', [userId]);
    return res.rows.map(r => this.mapRowToShare(r));
  }

  public static async findAll(): Promise<ShareLink[]> {
    const res = await PostgresService.query('SELECT * FROM share_links ORDER BY created_at DESC');
    return res.rows.map(r => this.mapRowToShare(r));
  }

  public static async create(sl: ShareLink): Promise<ShareLink> {
    await PostgresService.query(`
      INSERT INTO share_links (
        id, share_token, document_id, case_id, resource_type, resource_title,
        shared_by_user_id, shared_by_name, recipient_email, recipient_name,
        recipient_org, permission, watermark_text, purpose, access_passcode_hash,
        expires_at, is_revoked, revoked_at, revoked_by, access_count, max_access_count, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      ON CONFLICT (id) DO NOTHING
    `, [
      sl.id, sl.shareToken, sl.documentId || null, sl.caseId || null,
      sl.resourceType, sl.resourceTitle, sl.sharedByUserId, sl.sharedByName,
      sl.recipientEmail, sl.recipientName, sl.recipientOrg || '', sl.permission,
      sl.watermarkText || '', sl.purpose || '', sl.accessPasscodeHash || null,
      sl.expiresAt, !!sl.isRevoked, sl.revokedAt || null, sl.revokedBy || null,
      sl.accessCount || 0, sl.maxAccessCount || null, sl.createdAt || new Date().toISOString()
    ]);
    return sl;
  }

  public static async revoke(id: string, revokedBy: string): Promise<boolean> {
    const res = await PostgresService.query(`
      UPDATE share_links SET
        is_revoked = true,
        revoked_at = CURRENT_TIMESTAMP,
        revoked_by = $2
      WHERE id = $1
    `, [id, revokedBy]);
    return (res.rowCount ?? 0) > 0;
  }

  public static async incrementAccessCount(id: string): Promise<void> {
    await PostgresService.query('UPDATE share_links SET access_count = access_count + 1 WHERE id = $1', [id]);
  }

  public static async logAccess(log: ShareAccessLog): Promise<ShareAccessLog> {
    await PostgresService.query(`
      INSERT INTO share_access_logs (id, share_id, accessed_at, ip_address, user_agent, action, outcome)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [log.id, log.shareId, log.accessedAt, log.ipAddress, log.userAgent, log.action, log.outcome]);
    return log;
  }

  public static async getAccessLogs(shareId: string): Promise<ShareAccessLog[]> {
    const res = await PostgresService.query(
      'SELECT * FROM share_access_logs WHERE share_id = $1 ORDER BY accessed_at DESC',
      [shareId]
    );
    return res.rows.map(r => this.mapRowToLog(r));
  }

  public static async count(filters: { activeOnly?: boolean } = {}): Promise<number> {
    let sql = 'SELECT COUNT(*) FROM share_links WHERE 1=1';
    if (filters.activeOnly) {
      sql += ' AND is_revoked = false AND expires_at > CURRENT_TIMESTAMP';
    }
    const res = await PostgresService.query(sql);
    return parseInt(res.rows[0].count, 10);
  }
}
