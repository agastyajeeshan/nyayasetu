import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
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
   * Registers a new police asset
   */
  public static createAsset(params: CreateAssetParams): PoliceAsset {
    const assetId = `AST-${Date.now()}-${uuidv4().slice(0, 6)}`;
    const assetNumber = `AST-DEL-${new Date().getFullYear()}-${db.police_assets.length + 101}`;

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

    db.police_assets.unshift(asset);

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

    db.asset_lifecycle_events.push(initEvent);
    db.save();

    AuditService.log({
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
   * Updates asset lifecycle status (Assign, Maintenance, Return, Inspect)
   */
  public static updateAssetStatus(params: UpdateAssetStatusParams): PoliceAsset {
    const asset = db.police_assets.find(a => a.id === params.assetId);
    if (!asset) throw new Error('Asset not found.');

    const oldStatus = asset.status;
    const oldCustodian = asset.currentCustodianName;

    asset.status = params.status;
    if (params.toCustodian) asset.currentCustodianName = params.toCustodian;
    if (params.location) asset.location = params.location;
    if (params.condition) asset.condition = params.condition as any;
    asset.updatedAt = new Date().toISOString();

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
      condition: asset.condition,
      location: asset.location
    };

    db.asset_lifecycle_events.push(event);
    db.save();

    AuditService.log({
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

    return asset;
  }

  /**
   * Retrieves asset detail with lifecycle history
   */
  public static getAssetDetail(assetId: string): { asset: PoliceAsset; history: AssetLifecycleEvent[] } | null {
    const asset = db.police_assets.find(a => a.id === assetId || a.assetNumber === assetId);
    if (!asset) return null;

    const history = db.asset_lifecycle_events
      .filter(e => e.assetId === asset.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return { asset, history };
  }

  /**
   * Lists assets with filters
   */
  public static listAssets(filters: { type?: string; status?: string; department?: string; search?: string }): PoliceAsset[] {
    let list = [...db.police_assets];

    if (filters.type) {
      list = list.filter(a => a.type === filters.type);
    }
    if (filters.status) {
      list = list.filter(a => a.status === filters.status);
    }
    if (filters.department) {
      list = list.filter(a => a.department === filters.department);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(a =>
        a.assetNumber.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.serialNumber.toLowerCase().includes(q) ||
        (a.currentCustodianName && a.currentCustodianName.toLowerCase().includes(q))
      );
    }

    return list;
  }
}
