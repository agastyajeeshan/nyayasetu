import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';
import { DatabaseData } from './database.js';

const { Pool, Client } = pg;

export interface PostgresConfig {
  databaseUrl?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean;
}

export interface PostgresStats {
  connected: boolean;
  database: string;
  host: string;
  port: number;
  user: string;
  version?: string;
  tables: Record<string, number>;
  error?: string;
}

export class PostgresService {
  private static pool: pg.Pool | null = null;
  private static isConnected: boolean = false;
  private static activeConfig: PostgresConfig = {};

  /**
   * Initializes PostgreSQL connection pool
   */
  public static getPool(overrideConfig?: PostgresConfig): pg.Pool {
    if (overrideConfig) {
      if (this.pool) {
        this.pool.end().catch(() => {});
      }
      this.pool = null;
      this.activeConfig = overrideConfig;
    }

    if (!this.pool) {
      const conf = this.activeConfig;
      const connectionString = conf.databaseUrl || config.databaseUrl;

      if (connectionString) {
        this.pool = new Pool({
          connectionString,
          ssl: conf.ssl || config.pgSsl ? { rejectUnauthorized: false } : undefined,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 3000
        });
      } else {
        this.pool = new Pool({
          host: conf.host || config.pgHost,
          port: conf.port || config.pgPort,
          user: conf.user || config.pgUser,
          password: conf.password || config.pgPassword,
          database: conf.database || config.pgDatabase,
          ssl: conf.ssl || config.pgSsl ? { rejectUnauthorized: false } : undefined,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 3000
        });
      }

      this.pool.on('error', (err) => {
        console.warn('[PostgreSQL Pool Warning]', err.message);
        this.isConnected = false;
      });
    }

    return this.pool;
  }

  /**
   * Tests connection to PostgreSQL
   */
  public static async testConnection(overrideConfig?: PostgresConfig): Promise<{ connected: boolean; version?: string; database?: string; error?: string }> {
    const pool = this.getPool(overrideConfig);
    try {
      const client = await pool.connect();
      try {
        const res = await client.query('SELECT version(), current_database() as db');
        this.isConnected = true;
        return {
          connected: true,
          version: res.rows[0]?.version?.split(' ')?.[1] || 'PostgreSQL',
          database: res.rows[0]?.db
        };
      } finally {
        client.release();
      }
    } catch (err: any) {
      this.isConnected = false;
      return {
        connected: false,
        error: err.message || 'Failed to connect to PostgreSQL server'
      };
    }
  }

  /**
   * Ensures the database exists (connects to default 'postgres' database to create if needed)
   */
  public static async ensureDatabaseExists(): Promise<boolean> {
    const targetDb = this.activeConfig.database || config.pgDatabase;
    if (!targetDb || targetDb === 'postgres') return true;

    try {
      const client = new Client({
        host: this.activeConfig.host || config.pgHost,
        port: this.activeConfig.port || config.pgPort,
        user: this.activeConfig.user || config.pgUser,
        password: this.activeConfig.password || config.pgPassword,
        database: 'postgres',
        connectionTimeoutMillis: 3000
      });
      await client.connect();
      const checkRes = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDb]);
      if (checkRes.rowCount === 0) {
        console.log(`[PostgreSQL] Database '${targetDb}' not found. Creating database...`);
        await client.query(`CREATE DATABASE "${targetDb}"`);
        console.log(`[PostgreSQL] Database '${targetDb}' created successfully.`);
      }
      await client.end();
      return true;
    } catch (err: any) {
      console.warn('[PostgreSQL ensureDatabaseExists Notice]:', err.message);
      return false;
    }
  }

  /**
   * Initializes relational schema from schema.sql
   */
  public static async initializeSchema(): Promise<{ success: boolean; error?: string }> {
    const pool = this.getPool();
    try {
      const schemaPath = path.resolve(process.cwd(), 'server', 'src', 'db', 'schema.sql');
      const altPath = path.resolve(process.cwd(), 'src', 'db', 'schema.sql');
      const targetPath = fs.existsSync(schemaPath) ? schemaPath : altPath;

      if (!fs.existsSync(targetPath)) {
        throw new Error(`Schema file not found at ${schemaPath}`);
      }

      const sql = fs.readFileSync(targetPath, 'utf8');
      await pool.query(sql);
      console.log('[PostgreSQL] Database schema verified and initialized.');
      return { success: true };
    } catch (err: any) {
      console.error('[PostgreSQL Schema Error]:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Ingests / Synchronizes all records from in-memory database to PostgreSQL
   */
  public static async syncAllFromMemory(data: DatabaseData): Promise<{ success: boolean; synced: Record<string, number>; error?: string }> {
    const pool = this.getPool();
    const synced: Record<string, number> = {
      users: 0,
      cases: 0,
      documents: 0,
      evidence_items: 0,
      custody_events: 0,
      persons: 0,
      audit_events: 0,
      ledger_blocks: 0
    };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Users
      for (const u of data.users) {
        await client.query(`
          INSERT INTO users (
            id, agency_id, name, email, password_hash, salt, role, department, 
            organization, badge_number, jurisdiction, is_active, mfa_enabled, 
            mfa_secret, failed_login_attempts, locked_until, public_key, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (id) DO UPDATE SET
            agency_id = EXCLUDED.agency_id,
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            badge_number = EXCLUDED.badge_number,
            updated_at = CURRENT_TIMESTAMP
        `, [
          u.id, u.agencyId, u.name, u.email, u.passwordHash, u.salt, u.role,
          u.department, u.organization, u.badgeNumber, u.jurisdiction,
          u.isActive, u.mfaEnabled, u.mfaSecret, u.failedLoginAttempts || 0,
          u.lockedUntil || null, u.publicKey || null, u.createdAt, u.updatedAt
        ]);
        synced.users++;
      }

      // 2. Cases
      for (const c of data.cases) {
        await client.query(`
          INSERT INTO cases (
            id, case_number, title, type, jurisdiction, police_station, department,
            status, priority, investigating_officer_id, investigating_officer_name,
            assigned_team, incident_date, filing_date, court_name, judge_name,
            is_legal_hold, summary, district, state, fir_year, acts_and_sections,
            complainant_name, complainant_address, complainant_phone,
            properties_stolen_or_involved, suspect_details, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 
            $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
          )
          ON CONFLICT (id) DO UPDATE SET
            case_number = EXCLUDED.case_number,
            title = EXCLUDED.title,
            status = EXCLUDED.status,
            priority = EXCLUDED.priority,
            updated_at = CURRENT_TIMESTAMP
        `, [
          c.id, c.caseNumber, c.title, c.type, c.jurisdiction, c.policeStation, c.department,
          c.status, c.priority, c.investigatingOfficerId, c.investigatingOfficerName,
          JSON.stringify(c.assignedTeam || []), c.incidentDate || null, c.filingDate || null,
          c.courtName || null, c.judgeName || null, !!c.isLegalHold, c.summary || null,
          c.district || null, c.state || null, c.firYear || null,
          JSON.stringify(c.actsAndSections || []), c.complainantName || null,
          c.complainantAddress || null, c.complainantPhone || null,
          c.propertiesStolenOrInvolved || null, c.suspectDetails || null,
          c.createdAt, c.updatedAt
        ]);
        synced.cases++;
      }

      // 3. Documents
      for (const d of data.documents) {
        await client.query(`
          INSERT INTO documents (
            id, document_number, case_id, case_number, title, category, description,
            author_id, author_name, department, confidentiality, current_version_number,
            review_status, is_legal_hold, is_deleted, tags, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            review_status = EXCLUDED.review_status,
            updated_at = CURRENT_TIMESTAMP
        `, [
          d.id, d.documentNumber, d.caseId, d.caseNumber, d.title, d.category, d.description || null,
          d.authorId, d.authorName, d.department, d.confidentiality, d.currentVersionNumber || 1,
          d.reviewStatus, !!d.isLegalHold, !!d.isDeleted, JSON.stringify(d.tags || []),
          d.createdAt, d.updatedAt
        ]);
        synced.documents++;
      }

      // 4. Evidence Items
      for (const e of data.evidence_items) {
        await client.query(`
          INSERT INTO evidence_items (
            id, evidence_number, case_id, case_number, type, description,
            collection_location, collection_timestamp, collector_id, collector_name,
            storage_locker, current_custodian, current_custodian_role, handling_notes,
            sha256_hash, linked_document_ids, is_locked, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (id) DO UPDATE SET
            storage_locker = EXCLUDED.storage_locker,
            sha256_hash = EXCLUDED.sha256_hash,
            updated_at = CURRENT_TIMESTAMP
        `, [
          e.id, e.evidenceNumber, e.caseId, e.caseNumber, e.type, e.description,
          e.collectionLocation, e.collectionTimestamp, e.collectorId, e.collectorName,
          e.storageLocker || null, e.currentCustodian || null, e.currentCustodianRole || null,
          e.handlingNotes || null, e.sha256Hash, JSON.stringify(e.linkedDocumentIds || []),
          !!e.isLocked, e.createdAt, e.updatedAt
        ]);
        synced.evidence_items++;
      }

      // 5. Custody Events
      for (const ce of data.custody_events) {
        await client.query(`
          INSERT INTO custody_events (
            id, evidence_id, event_type, actor_id, actor_name, actor_role,
            from_custodian, to_custodian, location, timestamp, reason, notes,
            acknowledged_by_destination, hash_proof, ledger_block_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (id) DO NOTHING
        `, [
          ce.id, ce.evidenceId, ce.eventType, ce.actorId, ce.actorName, ce.actorRole,
          ce.fromCustodian || null, ce.toCustodian || null, ce.location || null,
          ce.timestamp, ce.reason || null, ce.notes || null,
          !!ce.acknowledgedByDestination, ce.hashProof, ce.ledgerBlockId || null
        ]);
        synced.custody_events++;
      }

      // 6. Persons
      for (const p of data.persons) {
        await client.query(`
          INSERT INTO persons (
            id, cpid, full_name, aliases, father_or_spouse_name, gender,
            dob_or_age, nationality, primary_phone, biometrics, address,
            police_station, district, state, pincode, risk_rating,
            primary_crime_type, modus_operandi, gang_or_syndicate_affiliation,
            previous_convictions_count, linked_cases, is_verified_profile, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
            $17, $18, $19, $20, $21, $22, $23, $24
          )
          ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            linked_cases = EXCLUDED.linked_cases,
            updated_at = CURRENT_TIMESTAMP
        `, [
          p.id, p.cpid || null, p.fullName, JSON.stringify(p.aliases || []),
          p.fatherOrSpouseName || null, p.gender || null, p.dobOrAge || null,
          p.nationality || null, p.primaryPhone || null, JSON.stringify(p.biometrics || {}),
          p.address || null, p.policeStation || null, p.district || null, p.state || null,
          p.pincode || null, p.riskRating || null, p.primaryCrimeType || null,
          p.modusOperandi || null, p.gangOrSyndicateAffiliation || null,
          p.previousConvictionsCount || 0, JSON.stringify(p.linkedCases || []),
          !!p.isVerifiedProfile, p.createdAt, p.updatedAt
        ]);
        synced.persons++;
      }

      // 7. Audit Events
      for (const a of data.audit_events.slice(-500)) {
        await client.query(`
          INSERT INTO audit_events (
            id, timestamp, actor_id, actor_name, actor_role, organization,
            department, action, resource_type, resource_id, resource_name,
            details, outcome, ip_address, user_agent, ledger_block_index, integrity_hash
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO NOTHING
        `, [
          a.id, a.timestamp, a.actorId, a.actorName, a.actorRole, a.organization || null,
          a.department || null, a.action, a.resourceType, a.resourceId || null,
          a.resourceName || null, a.details || null, a.outcome, a.ipAddress || null,
          a.userAgent || null, a.ledgerBlockIndex || null, a.integrityHash || null
        ]);
        synced.audit_events++;
      }

      // 8. Ledger Blocks
      for (const b of data.ledger_blocks.slice(-500)) {
        await client.query(`
          INSERT INTO ledger_blocks (
            block_index, timestamp, previous_hash, merkle_root, block_hash,
            event_type, resource_type, resource_id, actor_id, payload
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (block_index) DO NOTHING
        `, [
          b.blockIndex, b.timestamp, b.previousHash, b.merkleRoot, b.blockHash,
          b.eventType || null, b.resourceType || null, b.resourceId || null,
          b.actorId || null, JSON.stringify(b.payload || {})
        ]);
        synced.ledger_blocks++;
      }

      await client.query('COMMIT');
      return { success: true, synced };
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[PostgreSQL Sync Error]:', err.message);
      return { success: false, synced, error: err.message };
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves diagnostic metrics and row counts from PostgreSQL
   */
  public static async getStats(): Promise<PostgresStats> {
    const conf = this.activeConfig;
    const stats: PostgresStats = {
      connected: false,
      database: conf.database || config.pgDatabase,
      host: conf.host || config.pgHost,
      port: conf.port || config.pgPort,
      user: conf.user || config.pgUser,
      tables: {}
    };

    try {
      const connTest = await this.testConnection();
      if (!connTest.connected) {
        stats.error = connTest.error;
        return stats;
      }

      stats.connected = true;
      stats.version = connTest.version;
      stats.database = connTest.database || stats.database;

      const pool = this.getPool();
      const tablesToCheck = ['users', 'cases', 'documents', 'evidence_items', 'custody_events', 'persons', 'audit_events', 'ledger_blocks'];
      for (const tbl of tablesToCheck) {
        try {
          const res = await pool.query(`SELECT COUNT(*) FROM ${tbl}`);
          stats.tables[tbl] = parseInt(res.rows[0].count, 10);
        } catch {
          stats.tables[tbl] = 0;
        }
      }
    } catch (err: any) {
      stats.connected = false;
      stats.error = err.message;
    }

    return stats;
  }
}
