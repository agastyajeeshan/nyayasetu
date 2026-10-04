import { v4 as uuidv4 } from 'uuid';
import { AssetRepository } from '../repositories/assetRepository.js';
import { AuditService } from './auditService.js';
import { PoliceAsset, AssetLifecycleEvent, AssetType, AssetStatus, UserRole } from '../types/index.js';

export interface CreateAssetParams {
  name: string;
  type: AssetType;
  serialNumber: string;
  department: string;
  location: string;
  condition?: 'Excellent' | 'Good' | 'Fair' | 'Requires Repair' | 'Damaged';
  purchaseDate: string;
  warrantyExpiry: string;
  currentCustodianId?: string;
  currentCustodianName?: string;
  linkedCaseId?: string;
  linkedEvidenceId?: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  actorDepartment: string;
  ipAddress: string;
}

export interface UpdateAssetStatusParams {
  assetId: string;
  status: AssetStatus;
  eventType: 'ASSIGNMENT' | 'RETURN' | 'MAINTENANCE_LOG' | 'INSPECTION' | 'STATUS_CHANGE';
  toCustodian?: string;
  location?: string;
  condition?: string;
  details: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  actorDepartment: string;
  ipAddress: string;
}

export class AssetService {
  /**
   * Registers a new police asset in PostgreSQL
   */
  public static async createAsset(params: CreateAssetParams): Promise<PoliceAsset> {
    const assetId = `AST-${Date.now()}-${uuidv4().slice(0, 6)}`;
    const count = await AssetRepository.count();
    const assetNumber = `AST-DEL-${new Date().getFullYear()}-${count + 101}`;

    const asset: PoliceAsset = {
      id: assetId,
      assetNumber,
      name: params.name,
      type: params.type,
      serialNumber: params.serialNumber,
      department: params.department,
      currentCustodianId: params.currentCustodianId,
      currentCustodianName: params.currentCustodianName || 'Armory / Equipment Locker',
      location: params.location,
      condition: params.condition || 'Excellent',
      purchaseDate: params.purchaseDate,
      warrantyExpiry: params.warrantyExpiry,
      status: 'Registered',
      linkedCaseId: params.linkedCaseId,
      linkedEvidenceId: params.linkedEvidenceId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await AssetRepository.create(asset);

    const initEvent: AssetLifecycleEvent = {
      id: `ALC-${Date.now()}-${uuidv4().slice(0, 6)}`,
      assetId,
      eventType: 'REGISTRATION',
      actorId: params.actorId,
      actorName: params.actorName,
      timestamp: new Date().toISOString(),
      details: `Asset registered into police inventory: ${asset.name} (S/N: ${asset.serialNumber})`,
      condition: asset.condition,
      location: asset.location,
      toCustodian: asset.currentCustodianName
    };

    await AssetRepository.addLifecycleEvent(initEvent);

    await AuditService.log({
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      organization: 'Ministry of Home Affairs',
      department: params.actorDepartment,
      action: 'ASSET_REGISTERED',
      resourceType: 'ASSET',
      resourceId: asset.id,
      resourceName: `${asset.assetNumber}: ${asset.name}`,
      details: `New police asset ${asset.assetNumber} (${asset.type}) registered at ${asset.location}`,
      outcome: 'SUCCESS',
      ipAddress: params.ipAddress
    });

    return asset;
  }

  /**
   * Updates asset lifecycle status (Assign, Maintenance, Return, Inspect) in PostgreSQL
   */
  public static async updateAssetStatus(params: UpdateAssetStatusParams): Promise<PoliceAsset> {
    const asset = await AssetRepository.findById(params.assetId);
    if (!asset) throw new Error('Asset not found.');

    const oldStatus = asset.status;
    const oldCustodian = asset.currentCustodianName;

    const updated = await AssetRepository.update(asset.id, {
      status: params.status,
      currentCustodianName: params.toCustodian || asset.currentCustodianName,
      location: params.location || asset.location,
      condition: (params.condition as any) || asset.condition,
      updatedAt: new Date().toISOString()
    });

    const event: AssetLifecycleEvent = {
      id: `ALC-${Date.now()}-${uuidv4().slice(0, 6)}`,
      assetId: asset.id,
      eventType: params.eventType,
      fromCustodian: oldCustodian,
      toCustodian: params.toCustodian || asset.currentCustodianName,
      actorId: params.actorId,
      actorName: params.actorName,
      timestamp: new Date().toISOString(),
      details: params.details,
      condition: params.condition || asset.condition,
      location: params.location || asset.location
    };

    await AssetRepository.addLifecycleEvent(event);

    await AuditService.log({
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      organization: 'Ministry of Home Affairs',
      department: params.actorDepartment,
      action: 'ASSET_STATUS_UPDATED',
      resourceType: 'ASSET',
      resourceId: asset.id,
      resourceName: asset.assetNumber,
      details: `Asset ${asset.assetNumber} status changed from '${oldStatus}' to '${params.status}'. Details: ${params.details}`,
      outcome: 'SUCCESS',
      ipAddress: params.ipAddress
    });

    return updated || asset;
  }

  /**
   * Retrieves asset detail with lifecycle history from PostgreSQL
   */
  public static async getAssetDetail(assetId: string): Promise<{ asset: PoliceAsset; history: AssetLifecycleEvent[] } | null> {
    const asset = await AssetRepository.findByIdOrNumber(assetId);
    if (!asset) return null;

    const history = asset.lifecycleHistory || (await AssetRepository.getLifecycleHistory(asset.id));
    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return { asset, history };
  }

  /**
   * Lists assets with filters from PostgreSQL
   */
  public static async listAssets(filters: { type?: string; status?: string; department?: string; search?: string }): Promise<PoliceAsset[]> {
    return await AssetRepository.findMany(filters);
  }
}
