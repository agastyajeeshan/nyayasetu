import { PostgresService } from '../db/postgres.js';
import { DigitalSignature, UserRole } from '../types/index.js';

export class SignatureRepository {
  public static mapRowToSignature(row: any): DigitalSignature {
    return {
      id: row.id,
      documentId: row.document_id,
      versionNumber: Number(row.version_number),
      versionHash: row.version_hash,
      signerId: row.signer_id,
      signerName: row.signer_name,
      signerRole: row.signer_role as UserRole,
      signerAgencyId: row.signer_agency_id,
      signatureTimestamp: row.signature_timestamp ? new Date(row.signature_timestamp).toISOString() : new Date().toISOString(),
      signatureAlgorithm: row.signature_algorithm,
      signatureValue: row.signature_value,
      publicKeyCertificate: row.public_key_certificate,
      verificationStatus: row.verification_status as any,
      verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : '',
      ledgerBlockId: row.ledger_block_id || ''
    };
  }

  public static async findByDocId(documentId: string): Promise<DigitalSignature[]> {
    const res = await PostgresService.query(
      'SELECT * FROM digital_signatures WHERE document_id = $1 ORDER BY signature_timestamp ASC',
      [documentId]
    );
    return res.rows.map(r => this.mapRowToSignature(r));
  }

  public static async findById(id: string): Promise<DigitalSignature | null> {
    const res = await PostgresService.query('SELECT * FROM digital_signatures WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToSignature(res.rows[0]);
  }

  public static async create(s: DigitalSignature): Promise<DigitalSignature> {
    await PostgresService.query(`
      INSERT INTO digital_signatures (
        id, document_id, version_number, version_hash, signer_id, signer_name,
        signer_role, signer_agency_id, signature_timestamp, signature_algorithm,
        signature_value, public_key_certificate, verification_status, verified_at, ledger_block_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO NOTHING
    `, [
      s.id, s.documentId, s.versionNumber, s.versionHash, s.signerId, s.signerName,
      s.signerRole, s.signerAgencyId, s.signatureTimestamp || new Date().toISOString(),
      s.signatureAlgorithm, s.signatureValue, s.publicKeyCertificate,
      s.verificationStatus, s.verifiedAt || null, s.ledgerBlockId || null
    ]);
    return s;
  }

  public static async findAll(): Promise<DigitalSignature[]> {
    const res = await PostgresService.query('SELECT * FROM digital_signatures ORDER BY signature_timestamp DESC');
    return res.rows.map(r => this.mapRowToSignature(r));
  }

  public static async count(): Promise<number> {
    const res = await PostgresService.query('SELECT COUNT(*) FROM digital_signatures');
    return parseInt(res.rows[0].count, 10);
  }
}
