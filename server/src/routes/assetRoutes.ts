import { Router, Response } from 'express';
import { AssetService } from '../services/assetService.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth.js';
import { AssetType, AssetStatus } from '../types/index.js';

const router = Router();

// List police assets
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, status, department, search } = req.query as Record<string, string>;
    const assets = await AssetService.listAssets({ type, status, department, search });
    res.json(assets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Register new asset (Supervisor, Admin)
router.post('/', authenticateJWT, requireRoles('supervisor', 'admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, type, serialNumber, department, location, condition, purchaseDate, warrantyExpiry, currentCustodianName, linkedCaseId, linkedEvidenceId } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!name || !type || !serialNumber || !location) {
      res.status(400).json({ error: 'Missing required asset fields (name, type, serialNumber, location).' });
      return;
    }

    const asset = await AssetService.createAsset({
      name,
      type: type as AssetType,
      serialNumber,
      department: department || req.user!.department,
      location,
      condition,
      purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
      warrantyExpiry: warrantyExpiry || new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currentCustodianName,
      linkedCaseId,
      linkedEvidenceId,
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      actorDepartment: req.user!.department,
      ipAddress: ip
    });

    res.status(201).json(asset);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get asset detail with lifecycle history
router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const detail = await AssetService.getAssetDetail(req.params.id as string);
    if (!detail) {
      res.status(404).json({ error: 'Asset not found.' });
      return;
    }
    res.json(detail);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update asset lifecycle status
router.patch('/:id/status', authenticateJWT, requireRoles('supervisor', 'investigating_officer', 'forensic_officer', 'admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, eventType, toCustodian, location, condition, details } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!status || !eventType || !details) {
      res.status(400).json({ error: 'Status, eventType, and details are required.' });
      return;
    }

    const updated = await AssetService.updateAssetStatus({
      assetId: req.params.id as string,
      status: status as AssetStatus,
      eventType,
      toCustodian,
      location,
      condition,
      details,
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      actorDepartment: req.user!.department,
      ipAddress: ip
    });

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
