import { PostgresService } from '../db/postgres.js';
import { NotificationItem, UserRole } from '../types/index.js';

export class NotificationRepository {
  public static mapRowToNotification(row: any): NotificationItem {
    return {
      id: row.id,
      recipientUserId: row.recipient_user_id || undefined,
      recipientRole: row.recipient_role as UserRole || undefined,
      type: row.type as any,
      title: row.title,
      message: row.message,
      severity: row.severity as any,
      isRead: Boolean(row.is_read),
      actionUrl: row.action_url || undefined,
      caseId: row.case_id || undefined,
      documentId: row.document_id || undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
    };
  }

  public static async findByUserId(userId: string, role?: string): Promise<NotificationItem[]> {
    let sql = 'SELECT * FROM notifications WHERE (recipient_user_id = $1';
    const params: any[] = [userId];

    if (role) {
      params.push(role);
      sql += ` OR recipient_role = $${params.length}`;
    }
    sql += ') ORDER BY created_at DESC LIMIT 50';

    const res = await PostgresService.query(sql, params);
    return res.rows.map(r => this.mapRowToNotification(r));
  }

  public static async create(n: NotificationItem): Promise<NotificationItem> {
    await PostgresService.query(`
      INSERT INTO notifications (
        id, recipient_user_id, recipient_role, type, title, message,
        severity, is_read, action_url, case_id, document_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO NOTHING
    `, [
      n.id, n.recipientUserId || null, n.recipientRole || null,
      n.type, n.title, n.message, n.severity || 'INFO', !!n.isRead,
      n.actionUrl || null, n.caseId || null, n.documentId || null,
      n.createdAt || new Date().toISOString()
    ]);
    return n;
  }

  public static async markAsRead(id: string): Promise<boolean> {
    const res = await PostgresService.query('UPDATE notifications SET is_read = true WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  public static async markAllAsRead(userId: string): Promise<void> {
    await PostgresService.query('UPDATE notifications SET is_read = true WHERE recipient_user_id = $1', [userId]);
  }

  public static async count(): Promise<number> {
    const res = await PostgresService.query('SELECT COUNT(*) FROM notifications');
    return parseInt(res.rows[0].count, 10);
  }

  public static async countUnread(userId?: string, role?: string): Promise<number> {
    let sql = 'SELECT COUNT(*) FROM notifications WHERE is_read = false';
    const params: any[] = [];
    if (userId || role) {
      sql += ' AND (';
      if (userId && role) {
        params.push(userId, role);
        sql += 'recipient_user_id = $1 OR recipient_role = $2';
      } else if (userId) {
        params.push(userId);
        sql += 'recipient_user_id = $1';
      } else if (role) {
        params.push(role);
        sql += 'recipient_role = $1';
      }
      sql += ')';
    }
    const res = await PostgresService.query(sql, params);
    return parseInt(res.rows[0].count, 10);
  }

  public static async markAllAsReadForUser(userId?: string, role?: string): Promise<void> {
    let sql = 'UPDATE notifications SET is_read = true WHERE is_read = false';
    const params: any[] = [];
    if (userId || role) {
      sql += ' AND (';
      if (userId && role) {
        params.push(userId, role);
        sql += 'recipient_user_id = $1 OR recipient_role = $2';
      } else if (userId) {
        params.push(userId);
        sql += 'recipient_user_id = $1';
      } else if (role) {
        params.push(role);
        sql += 'recipient_role = $1';
      }
      sql += ')';
    }
    await PostgresService.query(sql, params);
  }
}
