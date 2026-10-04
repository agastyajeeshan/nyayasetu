import { PostgresService } from '../db/postgres.js';
import {
  Document,
  DocumentVersion,
  DocumentCategory,
  ConfidentialityLevel,
  ReviewStatus,
  RedactedDocument,
  UserRole
} from '../types/index.js';

export class DocumentRepository {
  public static mapRowToDocument(row: any): Document {
    return {
      id: row.id,
      documentNumber: row.document_number,
      caseId: row.case_id,
      caseNumber: row.case_number,
      title: row.title,
      category: row.category as DocumentCategory,
      description: row.description || '',
      authorId: row.author_id,
      authorName: row.author_name,
      department: row.department || '',
      confidentiality: row.confidentiality as ConfidentialityLevel,
      currentVersionNumber: Number(row.current_version_number) || 1,
      reviewStatus: row.review_status as ReviewStatus,
      isLegalHold: Boolean(row.is_legal_hold),
      isDeleted: Boolean(row.is_deleted),
      deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
      deletedBy: row.deleted_by || null,
      retentionUntil: row.retention_until ? new Date(row.retention_until).toISOString() : '',
      tags: Array.isArray(row.tags)
        ? row.tags
        : (typeof row.tags === 'string' ? JSON.parse(row.tags) : []),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
    };
  }

  public static mapRowToVersion(row: any): DocumentVersion {
    return {
      id: row.id,
      documentId: row.document_id,
      versionNumber: Number(row.version_number),
      fileName: row.file_name,
      storedFileName: row.stored_file_name,
      mimeType: row.mime_type,
      fileSizeBytes: Number(row.file_size_bytes) || 0,
      sha256Hash: row.sha256_hash,
      uploadedBy: row.uploaded_by,
      uploaderName: row.uploader_name,
      uploaderRole: row.uploader_role as UserRole,
      changeSummary: row.change_summary || '',
      isEncrypted: Boolean(row.is_encrypted),
      encryptionKeyId: row.encryption_key_id || undefined,
      malwareScanStatus: row.malware_scan_status as any,
      ledgerBlockId: row.ledger_block_id || undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
    };
  }

  public static mapRowToRedacted(row: any): RedactedDocument {
    return {
      id: row.id,
      originalDocumentId: row.original_document_id,
      originalVersionNumber: Number(row.original_version_number),
      originalFileName: row.original_file_name,
      redactedFileName: row.redacted_file_name,
      storedFileName: row.stored_file_name,
      mimeType: row.mime_type,
      fileSizeBytes: Number(row.file_size_bytes) || 0,
      sha256Hash: row.sha256_hash,
      createdBy: row.created_by,
      creatorName: row.creator_name,
      creatorRole: row.creator_role as UserRole,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      redactedItems: Array.isArray(row.redacted_items)
        ? row.redacted_items
        : (typeof row.redacted_items === 'string' ? JSON.parse(row.redacted_items) : []),
      exportPurpose: row.export_purpose || undefined,
      ledgerBlockId: row.ledger_block_id || undefined
    };
  }

  public static async findById(id: string): Promise<Document | null> {
    const res = await PostgresService.query('SELECT * FROM documents WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToDocument(res.rows[0]);
  }

  public static async findByIdOrNumber(idOrNumber: string): Promise<Document | null> {
    const res = await PostgresService.query(
      'SELECT * FROM documents WHERE id = $1 OR LOWER(document_number) = LOWER($1)',
      [idOrNumber]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToDocument(res.rows[0]);
  }

  public static async findByDocNumber(docNumber: string): Promise<Document | null> {
    const res = await PostgresService.query('SELECT * FROM documents WHERE LOWER(document_number) = LOWER($1)', [docNumber]);
    if (res.rows.length === 0) return null;
    return this.mapRowToDocument(res.rows[0]);
  }

  public static async findByCaseId(caseId: string, includeDeleted: boolean = false): Promise<Document[]> {
    let sql = 'SELECT * FROM documents WHERE case_id = $1';
    if (!includeDeleted) {
      sql += ' AND is_deleted = false';
    }
    sql += ' ORDER BY created_at DESC';
    const res = await PostgresService.query(sql, [caseId]);
    return res.rows.map(r => this.mapRowToDocument(r));
  }

  public static async findMany(filters: {
    caseId?: string;
    category?: string;
    confidentiality?: string;
    reviewStatus?: string;
    search?: string;
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<Document[]> {
    let sql = 'SELECT * FROM documents WHERE 1=1';
    const params: any[] = [];

    if (!filters.includeDeleted) {
      sql += ' AND is_deleted = false';
    }

    if (filters.caseId) {
      params.push(filters.caseId);
      sql += ` AND case_id = $${params.length}`;
    }

    if (filters.category) {
      params.push(filters.category);
      sql += ` AND category = $${params.length}`;
    }

    if (filters.confidentiality) {
      params.push(filters.confidentiality);
      sql += ` AND confidentiality = $${params.length}`;
    }

    if (filters.reviewStatus) {
      params.push(filters.reviewStatus);
      sql += ` AND review_status = $${params.length}`;
    }

    if (filters.search) {
      params.push(`%${filters.search.toLowerCase()}%`);
      sql += ` AND (
        LOWER(title) LIKE $${params.length} OR
        LOWER(document_number) LIKE $${params.length} OR
        LOWER(case_number) LIKE $${params.length} OR
        LOWER(author_name) LIKE $${params.length} OR
        LOWER(description) LIKE $${params.length}
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
    return res.rows.map(r => this.mapRowToDocument(r));
  }

  public static async create(doc: Document): Promise<Document> {
    await PostgresService.query(`
      INSERT INTO documents (
        id, document_number, case_id, case_number, title, category, description,
        author_id, author_name, department, confidentiality, current_version_number,
        review_status, is_legal_hold, is_deleted, deleted_at, deleted_by, retention_until,
        tags, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        confidentiality = EXCLUDED.confidentiality,
        current_version_number = EXCLUDED.current_version_number,
        review_status = EXCLUDED.review_status,
        is_legal_hold = EXCLUDED.is_legal_hold,
        is_deleted = EXCLUDED.is_deleted,
        deleted_at = EXCLUDED.deleted_at,
        deleted_by = EXCLUDED.deleted_by,
        tags = EXCLUDED.tags,
        updated_at = CURRENT_TIMESTAMP
    `, [
      doc.id, doc.documentNumber, doc.caseId, doc.caseNumber, doc.title, doc.category,
      doc.description || null, doc.authorId, doc.authorName, doc.department || null,
      doc.confidentiality, doc.currentVersionNumber || 1, doc.reviewStatus,
      !!doc.isLegalHold, !!doc.isDeleted, doc.deletedAt || null, doc.deletedBy || null,
      doc.retentionUntil || null, JSON.stringify(doc.tags || []),
      doc.createdAt || new Date().toISOString(), doc.updatedAt || new Date().toISOString()
    ]);
    return doc;
  }

  public static async update(id: string, updates: Partial<Document>): Promise<Document | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
    await this.create(merged);
    return merged;
  }

  public static async softDelete(id: string, deletedBy: string): Promise<boolean> {
    const res = await PostgresService.query(`
      UPDATE documents SET
        is_deleted = true,
        deleted_at = CURRENT_TIMESTAMP,
        deleted_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id, deletedBy]);
    return (res.rowCount ?? 0) > 0;
  }

  public static async restore(id: string): Promise<boolean> {
    const res = await PostgresService.query(`
      UPDATE documents SET
        is_deleted = false,
        deleted_at = NULL,
        deleted_by = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  public static async setLegalHold(id: string, isHold: boolean): Promise<boolean> {
    const res = await PostgresService.query(
      'UPDATE documents SET is_legal_hold = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id, isHold]
    );
    return (res.rowCount ?? 0) > 0;
  }

  public static async count(filters: { notDeleted?: boolean } = {}): Promise<number> {
    let sql = 'SELECT COUNT(*) FROM documents WHERE 1=1';
    if (filters.notDeleted) {
      sql += ' AND is_deleted = false';
    }
    const res = await PostgresService.query(sql);
    return parseInt(res.rows[0].count, 10);
  }

  // --- Document Versions ---
  public static async findVersionById(id: string): Promise<DocumentVersion | null> {
    const res = await PostgresService.query('SELECT * FROM document_versions WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToVersion(res.rows[0]);
  }

  public static async findVersionsByDocId(docId: string): Promise<DocumentVersion[]> {
    const res = await PostgresService.query(
      'SELECT * FROM document_versions WHERE document_id = $1 ORDER BY version_number ASC',
      [docId]
    );
    return res.rows.map(r => this.mapRowToVersion(r));
  }

  public static async findAllVersions(): Promise<DocumentVersion[]> {
    const res = await PostgresService.query('SELECT * FROM document_versions ORDER BY created_at DESC');
    return res.rows.map(r => this.mapRowToVersion(r));
  }

  public static async createVersion(v: DocumentVersion): Promise<DocumentVersion> {
    await PostgresService.query(`
      INSERT INTO document_versions (
        id, document_id, version_number, file_name, stored_file_name,
        mime_type, file_size_bytes, sha256_hash, uploaded_by, uploader_name,
        uploader_role, change_summary, is_encrypted, encryption_key_id,
        malware_scan_status, ledger_block_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO NOTHING
    `, [
      v.id, v.documentId, v.versionNumber, v.fileName, v.storedFileName,
      v.mimeType, v.fileSizeBytes || 0, v.sha256Hash, v.uploadedBy, v.uploaderName,
      v.uploaderRole, v.changeSummary || '', v.isEncrypted !== false, v.encryptionKeyId || null,
      v.malwareScanStatus || 'CLEAN', v.ledgerBlockId || null, v.createdAt || new Date().toISOString()
    ]);
    return v;
  }

  public static async countVersions(): Promise<number> {
    const res = await PostgresService.query('SELECT COUNT(*) FROM document_versions');
    return parseInt(res.rows[0].count, 10);
  }

  public static async getTotalStorageBytes(): Promise<number> {
    const res = await PostgresService.query('SELECT COALESCE(SUM(file_size_bytes), 0) AS total FROM document_versions');
    return Number(res.rows[0].total) || 0;
  }

  // --- Redacted Documents ---
  public static async createRedacted(redacted: RedactedDocument): Promise<RedactedDocument> {
    await PostgresService.query(`
      INSERT INTO redacted_documents (
        id, original_document_id, original_version_number, original_file_name,
        redacted_file_name, stored_file_name, mime_type, file_size_bytes,
        sha256_hash, created_by, creator_name, creator_role, redacted_items,
        export_purpose, ledger_block_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO NOTHING
    `, [
      redacted.id, redacted.originalDocumentId, redacted.originalVersionNumber,
      redacted.originalFileName, redacted.redactedFileName, redacted.storedFileName,
      redacted.mimeType, redacted.fileSizeBytes, redacted.sha256Hash,
      redacted.createdBy, redacted.creatorName, redacted.creatorRole,
      JSON.stringify(redacted.redactedItems || []), redacted.exportPurpose || null,
      redacted.ledgerBlockId || null, redacted.createdAt || new Date().toISOString()
    ]);
    return redacted;
  }

  public static async findRedactedByDocId(docId: string): Promise<RedactedDocument[]> {
    const res = await PostgresService.query(
      'SELECT * FROM redacted_documents WHERE original_document_id = $1 ORDER BY created_at DESC',
      [docId]
    );
    return res.rows.map(r => this.mapRowToRedacted(r));
  }

  public static async findRedactedById(id: string): Promise<RedactedDocument | null> {
    const res = await PostgresService.query(
      'SELECT * FROM redacted_documents WHERE id = $1',
      [id]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToRedacted(res.rows[0]);
  }
}
