import { PostgresService } from '../db/postgres.js';
import { PoliceAsset, AssetLifecycleEvent, AssetType, AssetStatus } from '../types/index.js';

export class AssetRepository {
  public static mapRowToAsset(row: any): PoliceAsset {
    return {
      id: row.id,
      assetNumber: row.asset_number,
      name: row.name,
      type: row.type as AssetType,
      serialNumber: row.serial_number || '',
      department: row.department || '',
      currentCustodianId: row.current_custodian_id || undefined,
      currentCustodianName: row.current_custodian_name || undefined,
      location: row.location || '',
      condition: row.condition as any,
      purchaseDate: row.purchase_date ? new Date(row.purchase_date).toISOString() : '',
      warrantyExpiry: row.warranty_expiry ? new Date(row.warranty_expiry).toISOString() : '',
      status: row.status as AssetStatus,
      linkedCaseId: row.linked_case_id || undefined,
      linkedEvidenceId: row.linked_evidence_id || undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
    };
  }

  public static mapRowToEvent(row: any): AssetLifecycleEvent {
    return {
      id: row.id,
      assetId: row.asset_id,
      eventType: row.event_type as any,
      fromCustodian: row.from_custodian || undefined,
      toCustodian: row.to_custodian || undefined,
      actorId: row.actor_id,
      actorName: row.actor_name,
      timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
      details: row.details || '',
      condition: row.condition || '',
      location: row.location || ''
    };
  }

  public static async findById(id: string): Promise<PoliceAsset | null> {
    const res = await PostgresService.query('SELECT * FROM police_assets WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const asset = this.mapRowToAsset(res.rows[0]);
    asset.lifecycleHistory = await this.getLifecycleHistory(asset.id);
    return asset;
  }

  public static async findByAssetNumber(assetNumber: string): Promise<PoliceAsset | null> {
    const res = await PostgresService.query('SELECT * FROM police_assets WHERE LOWER(asset_number) = LOWER($1)', [assetNumber]);
    if (res.rows.length === 0) return null;
    const asset = this.mapRowToAsset(res.rows[0]);
    asset.lifecycleHistory = await this.getLifecycleHistory(asset.id);
    return asset;
  }

  public static async findByIdOrNumber(idOrNumber: string): Promise<PoliceAsset | null> {
    const res = await PostgresService.query(
      'SELECT * FROM police_assets WHERE id = $1 OR LOWER(asset_number) = LOWER($1)',
      [idOrNumber]
    );
    if (res.rows.length === 0) return null;
    const asset = this.mapRowToAsset(res.rows[0]);
    asset.lifecycleHistory = await this.getLifecycleHistory(asset.id);
    return asset;
  }

  public static async findAll(): Promise<PoliceAsset[]> {
    const res = await PostgresService.query('SELECT * FROM police_assets ORDER BY created_at DESC');
    return res.rows.map(r => this.mapRowToAsset(r));
  }

  public static async findMany(filters: {
    type?: string;
    status?: string;
    department?: string;
    search?: string;
  } = {}): Promise<PoliceAsset[]> {
    let sql = 'SELECT * FROM police_assets WHERE 1=1';
    const params: any[] = [];
    if (filters.type) {
      params.push(filters.type);
      sql += ` AND type = $${params.length}`;
    }
    if (filters.status) {
      params.push(filters.status);
      sql += ` AND status = $${params.length}`;
    }
    if (filters.department) {
      params.push(filters.department);
      sql += ` AND department = $${params.length}`;
    }
    if (filters.search) {
      params.push(`%${filters.search.toLowerCase()}%`);
      sql += ` AND (
        LOWER(asset_number) LIKE $${params.length} OR
        LOWER(name) LIKE $${params.length} OR
        LOWER(serial_number) LIKE $${params.length} OR
        LOWER(current_custodian_name) LIKE $${params.length}
      )`;
    }
    sql += ' ORDER BY created_at DESC';
    const res = await PostgresService.query(sql, params);
    return res.rows.map(r => this.mapRowToAsset(r));
  }

  public static async create(a: PoliceAsset): Promise<PoliceAsset> {
    await PostgresService.query(`
      INSERT INTO police_assets (
        id, asset_number, name, type, serial_number, department, current_custodian_id,
        current_custodian_name, location, condition, purchase_date, warranty_expiry,
        status, linked_case_id, linked_evidence_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        current_custodian_id = EXCLUDED.current_custodian_id,
        current_custodian_name = EXCLUDED.current_custodian_name,
        location = EXCLUDED.location,
        condition = EXCLUDED.condition,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
    `, [
      a.id, a.assetNumber, a.name, a.type, a.serialNumber, a.department,
      a.currentCustodianId || null, a.currentCustodianName || null, a.location,
      a.condition, a.purchaseDate || null, a.warrantyExpiry || null, a.status,
      a.linkedCaseId || null, a.linkedEvidenceId || null,
      a.createdAt || new Date().toISOString(), a.updatedAt || new Date().toISOString()
    ]);
    return a;
  }

  public static async update(id: string, updates: Partial<PoliceAsset>): Promise<PoliceAsset | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
    await this.create(merged);
    return merged;
  }

  public static async addLifecycleEvent(event: AssetLifecycleEvent): Promise<AssetLifecycleEvent> {
    await PostgresService.query(`
      INSERT INTO asset_lifecycle_events (
        id, asset_id, event_type, from_custodian, to_custodian,
        actor_id, actor_name, timestamp, details, condition, location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO NOTHING
    `, [
      event.id, event.assetId, event.eventType, event.fromCustodian || null,
      event.toCustodian || null, event.actorId, event.actorName,
      event.timestamp || new Date().toISOString(), event.details || '',
      event.condition || '', event.location || ''
    ]);
    return event;
  }

  public static async getLifecycleHistory(assetId: string): Promise<AssetLifecycleEvent[]> {
    const res = await PostgresService.query(
      'SELECT * FROM asset_lifecycle_events WHERE asset_id = $1 ORDER BY timestamp ASC',
      [assetId]
    );
    return res.rows.map(r => this.mapRowToEvent(r));
  }

  public static async count(): Promise<number> {
    const res = await PostgresService.query('SELECT COUNT(*) FROM police_assets');
    return parseInt(res.rows[0].count, 10);
  }
}
