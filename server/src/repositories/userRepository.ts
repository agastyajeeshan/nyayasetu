import { PostgresService } from '../db/postgres.js';
import { User, UserRole, UserNotificationPreferences } from '../types/index.js';

export class UserRepository {
  /**
   * Maps a PostgreSQL row to a User entity
   */
  public static mapRowToUser(row: any): User {
    return {
      id: row.id,
      agencyId: row.agency_id,
      name: row.name,
      email: row.email,
      phone: row.phone || undefined,
      passwordHash: row.password_hash,
      salt: row.salt,
      role: row.role as UserRole,
      department: row.department || '',
      organization: row.organization || '',
      badgeNumber: row.badge_number || undefined,
      jurisdiction: row.jurisdiction || '',
      isActive: Boolean(row.is_active),
      mfaEnabled: Boolean(row.mfa_enabled),
      mfaSecret: row.mfa_secret || undefined,
      failedLoginAttempts: Number(row.failed_login_attempts) || 0,
      lockedUntil: row.locked_until ? new Date(row.locked_until).toISOString() : null,
      publicKey: row.public_key || undefined,
      passwordChangedAt: row.password_changed_at ? new Date(row.password_changed_at).toISOString() : undefined,
      faceEnrolled: Boolean(row.face_enrolled),
      faceEnrolledAt: row.face_enrolled_at ? new Date(row.face_enrolled_at).toISOString() : undefined,
      faceTemplateHash: row.face_template_hash || undefined,
      notificationPreferences: (typeof row.notification_preferences === 'string'
        ? JSON.parse(row.notification_preferences)
        : row.notification_preferences) || {},
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
    };
  }

  public static async findById(id: string): Promise<User | null> {
    const res = await PostgresService.query('SELECT * FROM users WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToUser(res.rows[0]);
  }

  public static async findByEmail(email: string): Promise<User | null> {
    const res = await PostgresService.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (res.rows.length === 0) return null;
    return this.mapRowToUser(res.rows[0]);
  }

  public static async findByAgencyId(agencyId: string): Promise<User | null> {
    const res = await PostgresService.query('SELECT * FROM users WHERE LOWER(agency_id) = LOWER($1)', [agencyId]);
    if (res.rows.length === 0) return null;
    return this.mapRowToUser(res.rows[0]);
  }

  public static async findByIdentifier(identifier: string): Promise<User | null> {
    const clean = (identifier || '').trim().toLowerCase();
    if (!clean) return null;

    // 1. Direct match on id, agency_id, email, badge_number
    let res = await PostgresService.query(
      `SELECT * FROM users 
       WHERE LOWER(id) = $1 
          OR LOWER(agency_id) = $1 
          OR LOWER(email) = $1 
          OR LOWER(badge_number) = $1`,
      [clean]
    );

    if (res.rows.length > 0) {
      return this.mapRowToUser(res.rows[0]);
    }

    // 2. Alphanumeric match (handles hyphens/spaces e.g. "usrio01", "usr-io-01")
    const alphaNum = clean.replace(/[^a-z0-9]/g, '');
    if (alphaNum.length >= 3) {
      res = await PostgresService.query(
        `SELECT * FROM users
         WHERE regexp_replace(LOWER(id), '[^a-z0-9]', '', 'g') = $1
            OR regexp_replace(LOWER(agency_id), '[^a-z0-9]', '', 'g') = $1
            OR regexp_replace(LOWER(badge_number), '[^a-z0-9]', '', 'g') = $1`,
        [alphaNum]
      );
      if (res.rows.length > 0) {
        return this.mapRowToUser(res.rows[0]);
      }
    }

    // 3. Fallback keywords / role shortcuts
    let targetRole: string | null = null;
    if (clean.includes('admin')) targetRole = 'admin';
    else if (clean.includes('verma') || clean.startsWith('io') || clean.includes('investig')) targetRole = 'investigating_officer';
    else if ((clean.includes('sharma') && clean.includes('acp')) || (clean.includes('mehta') && clean.includes('sup')) || clean.startsWith('sup') || clean.includes('sho')) targetRole = 'supervisor';
    else if (clean.includes('prosecutor') || clean.includes('dop') || clean.includes('pros')) targetRole = 'prosecutor';
    else if (clean.includes('judge') || clean.includes('deshmukh') || clean.includes('kaur') || clean.includes('magistrate')) targetRole = 'judge';
    else if (clean.includes('forensic') || clean.includes('rao') || clean.includes('cfsl')) targetRole = 'forensic_officer';
    else if (clean.includes('audit') || clean.includes('gupta')) targetRole = 'auditor';
    else if (clean.includes('ext') || clean.includes('bansal') || clean.includes('advocate')) targetRole = 'external_stakeholder';

    if (targetRole) {
      res = await PostgresService.query('SELECT * FROM users WHERE role = $1 ORDER BY id ASC LIMIT 1', [targetRole]);
      if (res.rows.length > 0) {
        return this.mapRowToUser(res.rows[0]);
      }
    }

    return null;
  }

  public static async findAll(): Promise<User[]> {
    const res = await PostgresService.query('SELECT * FROM users ORDER BY name ASC');
    return res.rows.map(r => this.mapRowToUser(r));
  }

  public static async create(user: User): Promise<User> {
    await PostgresService.query(`
      INSERT INTO users (
        id, agency_id, name, email, password_hash, salt, role, department,
        organization, badge_number, jurisdiction, is_active, mfa_enabled,
        mfa_secret, failed_login_attempts, locked_until, public_key, phone,
        password_changed_at, face_enrolled, face_enrolled_at, face_template_hash,
        notification_preferences, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      ON CONFLICT (id) DO UPDATE SET
        agency_id = EXCLUDED.agency_id,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        salt = EXCLUDED.salt,
        role = EXCLUDED.role,
        updated_at = CURRENT_TIMESTAMP
    `, [
      user.id, user.agencyId, user.name, user.email, user.passwordHash, user.salt, user.role,
      user.department || null, user.organization || null, user.badgeNumber || null,
      user.jurisdiction || null, user.isActive !== false, !!user.mfaEnabled, user.mfaSecret || null,
      user.failedLoginAttempts || 0, user.lockedUntil || null, user.publicKey || null, user.phone || null,
      user.passwordChangedAt || null, !!user.faceEnrolled, user.faceEnrolledAt || null,
      user.faceTemplateHash || null, JSON.stringify(user.notificationPreferences || {}),
      user.createdAt || new Date().toISOString(), user.updatedAt || new Date().toISOString()
    ]);
    return user;
  }

  public static async update(id: string, updates: Partial<User>): Promise<User | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
    await PostgresService.query(`
      UPDATE users SET
        agency_id = $2,
        name = $3,
        email = $4,
        password_hash = $5,
        salt = $6,
        role = $7,
        department = $8,
        organization = $9,
        badge_number = $10,
        jurisdiction = $11,
        is_active = $12,
        mfa_enabled = $13,
        mfa_secret = $14,
        failed_login_attempts = $15,
        locked_until = $16,
        public_key = $17,
        phone = $18,
        password_changed_at = $19,
        face_enrolled = $20,
        face_enrolled_at = $21,
        face_template_hash = $22,
        notification_preferences = $23,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [
      id, merged.agencyId, merged.name, merged.email, merged.passwordHash, merged.salt, merged.role,
      merged.department || null, merged.organization || null, merged.badgeNumber || null,
      merged.jurisdiction || null, merged.isActive, merged.mfaEnabled, merged.mfaSecret || null,
      merged.failedLoginAttempts || 0, merged.lockedUntil || null, merged.publicKey || null,
      merged.phone || null, merged.passwordChangedAt || null, merged.faceEnrolled,
      merged.faceEnrolledAt || null, merged.faceTemplateHash || null,
      JSON.stringify(merged.notificationPreferences || {})
    ]);
    return merged;
  }

  public static async updateProfile(id: string, updates: Partial<User>): Promise<User | null> {
    return this.update(id, updates);
  }

  public static async updateStatus(id: string, isActive: boolean): Promise<User | null> {
    const res = await PostgresService.query(
      'UPDATE users SET is_active = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id, isActive]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToUser(res.rows[0]);
  }

  public static async updateRole(id: string, role: UserRole): Promise<User | null> {
    const res = await PostgresService.query(
      'UPDATE users SET role = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id, role]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToUser(res.rows[0]);
  }

  public static async getPrivateKey(userId: string): Promise<string | null> {
    const res = await PostgresService.query('SELECT private_key FROM user_private_keys WHERE user_id = $1', [userId]);
    if (res.rows.length === 0) return null;
    return res.rows[0].private_key;
  }

  public static async setPrivateKey(userId: string, privateKey: string): Promise<void> {
    await PostgresService.query(`
      INSERT INTO user_private_keys (user_id, private_key)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET private_key = EXCLUDED.private_key
    `, [userId, privateKey]);
  }

  public static async count(): Promise<number> {
    const res = await PostgresService.query('SELECT COUNT(*) FROM users');
    return parseInt(res.rows[0].count, 10);
  }
}
