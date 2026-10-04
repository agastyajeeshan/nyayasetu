import { PostgresService } from '../db/postgres.js';
import { EvidenceItem, EvidenceType } from '../types/index.js';

export class EvidenceRepository {
  public static mapRowToEvidence(row: any): EvidenceItem {
    return {
      id: row.id,
      evidenceNumber: row.evidence_number,
      caseId: row.case_id,
      caseNumber: row.case_number,
      type: row.type as EvidenceType,
      description: row.description,
      collectionLocation: row.collection_location || '',
      collectionTimestamp: row.collection_timestamp ? new Date(row.collection_timestamp).toISOString() : '',
      collectorId: row.collector_id,
      collectorName: row.collector_name,
      storageLocker: row.storage_locker || '',
      currentCustodian: row.current_custodian || '',
      currentCustodianRole: row.current_custodian_role || '',
      handlingNotes: row.handling_notes || '',
      sha256Hash: row.sha256_hash,
      linkedDocumentIds: Array.isArray(row.linked_document_ids)
        ? row.linked_document_ids
        : (typeof row.linked_document_ids === 'string' ? JSON.parse(row.linked_document_ids) : []),
      isLocked: Boolean(row.is_locked),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
    };
  }

  public static async findById(id: string): Promise<EvidenceItem | null> {
    const res = await PostgresService.query('SELECT * FROM evidence_items WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToEvidence(res.rows[0]);
  }

  public static async findByEvidenceNumber(evidenceNumber: string): Promise<EvidenceItem | null> {
    const res = await PostgresService.query('SELECT * FROM evidence_items WHERE LOWER(evidence_number) = LOWER($1)', [evidenceNumber]);
    if (res.rows.length === 0) return null;
    return this.mapRowToEvidence(res.rows[0]);
  }

  public static async findByCaseId(caseId: string): Promise<EvidenceItem[]> {
    const res = await PostgresService.query('SELECT * FROM evidence_items WHERE case_id = $1 ORDER BY created_at DESC', [caseId]);
    return res.rows.map(r => this.mapRowToEvidence(r));
  }

  public static async findMany(filters: {
    caseId?: string;
    type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<EvidenceItem[]> {
    let sql = 'SELECT * FROM evidence_items WHERE 1=1';
    const params: any[] = [];

    if (filters.caseId) {
      params.push(filters.caseId);
      sql += ` AND case_id = $${params.length}`;
    }

    if (filters.type) {
      params.push(filters.type);
      sql += ` AND type = $${params.length}`;
    }

    if (filters.search) {
      params.push(`%${filters.search.toLowerCase()}%`);
      sql += ` AND (
        LOWER(evidence_number) LIKE $${params.length} OR
        LOWER(case_number) LIKE $${params.length} OR
        LOWER(description) LIKE $${params.length} OR
        LOWER(current_custodian) LIKE $${params.length} OR
        LOWER(storage_locker) LIKE $${params.length}
      )`;
    }

    sql += ' ORDER BY created_at DESC';

    if (filters.limit) {
      params.push(filters.limit);
      sql += ` LIMIT $${params.length}`;
    }

    if (filters.offset) {
      params.push(filters.offset);
      sql += ` OFFSET $${params.length}`;
    }

    const res = await PostgresService.query(sql, params);
    return res.rows.map(r => this.mapRowToEvidence(r));
  }

  public static async findAll(filters: {
    caseId?: string;
    type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<EvidenceItem[]> {
    return this.findMany(filters);
  }

  public static async create(item: EvidenceItem): Promise<EvidenceItem> {
    await PostgresService.query(`
      INSERT INTO evidence_items (
        id, evidence_number, case_id, case_number, type, description,
        collection_location, collection_timestamp, collector_id, collector_name,
        storage_locker, current_custodian, current_custodian_role, handling_notes,
        sha256_hash, linked_document_ids, is_locked, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (id) DO UPDATE SET
        storage_locker = EXCLUDED.storage_locker,
        current_custodian = EXCLUDED.current_custodian,
        current_custodian_role = EXCLUDED.current_custodian_role,
        handling_notes = EXCLUDED.handling_notes,
        sha256_hash = EXCLUDED.sha256_hash,
        linked_document_ids = EXCLUDED.linked_document_ids,
        is_locked = EXCLUDED.is_locked,
        updated_at = CURRENT_TIMESTAMP
    `, [
      item.id, item.evidenceNumber, item.caseId, item.caseNumber, item.type, item.description,
      item.collectionLocation, item.collectionTimestamp, item.collectorId, item.collectorName,
      item.storageLocker || null, item.currentCustodian || null, item.currentCustodianRole || null,
      item.handlingNotes || null, item.sha256Hash, JSON.stringify(item.linkedDocumentIds || []),
      !!item.isLocked, item.createdAt || new Date().toISOString(), item.updatedAt || new Date().toISOString()
    ]);
    return item;
  }

  public static async update(id: string, updates: Partial<EvidenceItem>): Promise<EvidenceItem | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
    await this.create(merged);
    return merged;
  }

  public static async count(): Promise<number> {
    const res = await PostgresService.query('SELECT COUNT(*) FROM evidence_items');
    return parseInt(res.rows[0].count, 10);
  }
}
