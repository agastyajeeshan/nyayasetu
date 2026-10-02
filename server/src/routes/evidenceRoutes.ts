import { Router, Response } from 'express';
import { EvidenceService } from '../services/evidenceService.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth.js';
import { EvidenceType } from '../types/index.js';

const router = Router();

// List evidence
router.get('/', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const { caseId, type, search } = req.query as Record<string, string>;
  const list = EvidenceService.listEvidence({ caseId, type, search });
  res.json(list);
});

// Register new evidence (IO, Forensic Officer, Supervisor, Admin)
router.post('/', authenticateJWT, requireRoles('investigating_officer', 'forensic_officer', 'supervisor', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { caseId, type, description, collectionLocation, collectionTimestamp, storageLocker, handlingNotes, rawSampleOrDigest, linkedDocumentIds } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!caseId || !type || !description || !collectionLocation || !storageLocker) {
      res.status(400).json({ error: 'Missing required evidence metadata.' });
      return;
    }

    const item = EvidenceService.createEvidence({
      caseId,
      type: type as EvidenceType,
      description,
      collectionLocation,
      collectionTimestamp: collectionTimestamp || new Date().toISOString(),
      storageLocker,
      handlingNotes: handlingNotes || 'Standard evidentiary preservation protocols observed.',
      rawSampleOrDigest: rawSampleOrDigest || `${description}:${Date.now()}`,
      linkedDocumentIds,
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      actorDepartment: req.user!.department,
      ipAddress: ip
    });

    res.status(201).json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get evidence detail with custody history
router.get('/:id', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const detail = EvidenceService.getEvidenceDetail(req.params.id as string);
  if (!detail) {
    res.status(404).json({ error: 'Evidence item not found.' });
    return;
  }
  res.json(detail);
});

// Transfer custody (IO, Forensic Officer, Supervisor, Court, Admin)
router.post('/:id/transfer', authenticateJWT, requireRoles('investigating_officer', 'forensic_officer', 'supervisor', 'judge', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { toCustodian, toLocation, reason, notes } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!toCustodian || !toLocation || !reason) {
      res.status(400).json({ error: 'Missing required custody transfer parameters (toCustodian, toLocation, reason).' });
      return;
    }

    const event = EvidenceService.transferCustody({
      evidenceId: req.params.id as string,
      toCustodian,
      toLocation,
      reason,
      notes,
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      actorDepartment: req.user!.department,
      ipAddress: ip
    });

    res.status(201).json(event);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
