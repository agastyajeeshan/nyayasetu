import { PostgresService } from '../db/postgres.js';
import { LedgerBlock } from '../types/index.js';

export class LedgerRepository {
  public static mapRowToBlock(row: any): LedgerBlock {
    return {
      blockIndex: Number(row.block_index),
      timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
      previousHash: row.previous_hash,
      merkleRoot: row.merkle_root,
      blockHash: row.block_hash,
      eventType: row.event_type || '',
      resourceType: row.resource_type || '',
      resourceId: row.resource_id || '',
      resourceHash: row.resource_hash || '',
      actorId: row.actor_id || '',
      actorName: row.actor_name || '',
      payload: (typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload) || {}
    };
  }

  public static async getLatestBlock(): Promise<LedgerBlock | null> {
    const res = await PostgresService.query('SELECT * FROM ledger_blocks ORDER BY block_index DESC LIMIT 1');
    if (res.rows.length === 0) return null;
    return this.mapRowToBlock(res.rows[0]);
  }

  public static async getBlockByIndex(index: number): Promise<LedgerBlock | null> {
    const res = await PostgresService.query('SELECT * FROM ledger_blocks WHERE block_index = $1', [index]);
    if (res.rows.length === 0) return null;
    return this.mapRowToBlock(res.rows[0]);
  }

  public static async getAllBlocks(limit?: number, offset?: number): Promise<LedgerBlock[]> {
    let sql = 'SELECT * FROM ledger_blocks ORDER BY block_index ASC';
    const params: any[] = [];
    if (limit) {
      params.push(limit);
      sql += ` LIMIT $${params.length}`;
    }
    if (offset) {
      params.push(offset);
      sql += ` OFFSET $${params.length}`;
    }
    const res = await PostgresService.query(sql, params);
    return res.rows.map(r => this.mapRowToBlock(r));
  }

  public static async createBlock(b: LedgerBlock): Promise<LedgerBlock> {
    await PostgresService.query(`
      INSERT INTO ledger_blocks (
        block_index, timestamp, previous_hash, merkle_root, block_hash,
        event_type, resource_type, resource_id, resource_hash, actor_id, actor_name, payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (block_index) DO NOTHING
    `, [
      b.blockIndex, b.timestamp || new Date().toISOString(), b.previousHash,
      b.merkleRoot, b.blockHash, b.eventType || null, b.resourceType || null,
      b.resourceId || null, b.resourceHash || null, b.actorId || null,
      b.actorName || null, JSON.stringify(b.payload || {})
    ]);
    return b;
  }

  public static async updateBlock(
    blockIndex: number,
    payload: any,
    blockHash: string,
    previousHash?: string,
    merkleRoot?: string
  ): Promise<boolean> {
    let sql = 'UPDATE ledger_blocks SET payload = $2, block_hash = $3';
    const params: any[] = [
      blockIndex,
      typeof payload === 'string' ? payload : JSON.stringify(payload || {}),
      blockHash
    ];
    if (previousHash) {
      params.push(previousHash);
      sql += `, previous_hash = $${params.length}`;
    }
    if (merkleRoot) {
      params.push(merkleRoot);
      sql += `, merkle_root = $${params.length}`;
    }
    sql += ' WHERE block_index = $1';
    const res = await PostgresService.query(sql, params);
    return (res.rowCount ?? 0) > 0;
  }

  public static async count(): Promise<number> {
    const res = await PostgresService.query('SELECT COUNT(*) FROM ledger_blocks');
    return parseInt(res.rows[0].count, 10);
  }
}
