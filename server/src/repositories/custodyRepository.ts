import { PostgresService } from '../db/postgres.js';
import { CustodyEvent, UserRole } from '../types/index.js';

export class CustodyRepository {
  public static mapRowToCustody(row: any): CustodyEvent {
    return {
      id: row.id,
      evidenceId: row.evidence_id,
      eventType: row.event_type as any,
      actorId: row.actor_id,
      actorName: row.actor_name,
      actorRole: row.actor_role as UserRole,
      fromCustodian: row.from_custodian || '',
      toCustodian: row.to_custodian || '',
      location: row.location || '',
      timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
      reason: row.reason || '',
      notes: row.notes || undefined,
      acknowledgedByDestination: Boolean(row.acknowledged_by_destination),
      acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at).toISOString() : undefined,
      hashProof: row.hash_proof,
      ledgerBlockId: row.ledger_block_id || undefined
    };
  }

  public static async findByEvidenceId(evidenceId: string): Promise<CustodyEvent[]> {
    const res = await PostgresService.query(
      'SELECT * FROM custody_events WHERE evidence_id = $1 ORDER BY timestamp ASC',
      [evidenceId]
    );
    return res.rows.map(r => this.mapRowToCustody(r));
  }

  public static async findById(id: string): Promise<CustodyEvent | null> {
    const res = await PostgresService.query('SELECT * FROM custody_events WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToCustody(res.rows[0]);
  }

  public static async create(event: CustodyEvent): Promise<CustodyEvent> {
    await PostgresService.query(`
      INSERT INTO custody_events (
        id, evidence_id, event_type, actor_id, actor_name, actor_role,
        from_custodian, to_custodian, location, timestamp, reason, notes,
        acknowledged_by_destination, acknowledged_at, hash_proof, ledger_block_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO NOTHING
    `, [
      event.id, event.evidenceId, event.eventType, event.actorId, event.actorName, event.actorRole,
      event.fromCustodian || null, event.toCustodian || null, event.location || null,
      event.timestamp || new Date().toISOString(), event.reason || null, event.notes || null,
      !!event.acknowledgedByDestination, event.acknowledgedAt || null, event.hashProof, event.ledgerBlockId || null
    ]);
    return event;
  }

  public static async acknowledge(eventId: string, acknowledgedAt: string): Promise<boolean> {
    const res = await PostgresService.query(`
      UPDATE custody_events SET
        acknowledged_by_destination = true,
        acknowledged_at = $2
      WHERE id = $1
    `, [eventId, acknowledgedAt]);
    return (res.rowCount ?? 0) > 0;
  }

  public static async findAll(): Promise<CustodyEvent[]> {
    const res = await PostgresService.query('SELECT * FROM custody_events ORDER BY timestamp DESC');
    return res.rows.map(r => this.mapRowToCustody(r));
  }

  public static async count(): Promise<number> {
    const res = await PostgresService.query('SELECT COUNT(*) FROM custody_events');
    return parseInt(res.rows[0].count, 10);
  }
}
