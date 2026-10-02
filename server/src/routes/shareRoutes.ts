import { Router, Response } from 'express';
import { ShareService } from '../services/shareService.js';
import { db } from '../db/database.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// List active shares created by user or all for admin
router.get('/', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  let list = [...db.share_links];
  if (req.user!.role !== 'admin') {
    list = list.filter(s => s.sharedByUserId === req.user!.id);
  }
  res.json(list);
});

// Create expiring share link (IO, Supervisor, Prosecutor, Admin)
router.post('/', authenticateJWT, requireRoles('investigating_officer', 'supervisor', 'prosecutor', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId, caseId, recipientEmail, recipientName, recipientOrg, permission, expiresInHours, passcode, purpose, watermarkText } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!recipientEmail || !recipientName || !recipientOrg || !purpose) {
      res.status(400).json({ error: 'Missing required share recipient fields (recipientEmail, recipientName, recipientOrg, purpose).' });
      return;
    }

    const share = ShareService.createShare({
      documentId,
      caseId,
      recipientEmail,
      recipientName,
      recipientOrg,
      permission: permission || 'VIEW_ONLY',
      expiresInHours: expiresInHours ? parseInt(expiresInHours, 10) : 48,
      passcode,
      purpose,
      watermarkText,
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      actorDepartment: req.user!.department,
      ipAddress: ip
    });

    res.status(201).json(share);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Access shared resource via token (Public endpoint with token authentication)
router.post('/access/:token', (req, res) => {
  const { passcode } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const ua = req.headers['user-agent'] || 'Unknown';

  const result = ShareService.accessSharedResource(req.params.token as string, passcode, ip, ua);
  if (!result.success) {
    res.status(403).json({ error: result.error });
    return;
  }

  res.json(result);
});

// Revoke share link
router.delete('/:id', authenticateJWT, requireRoles('investigating_officer', 'supervisor', 'prosecutor', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    ShareService.revokeShare(req.params.id as string, {
      id: req.user!.id,
      name: req.user!.name,
      role: req.user!.role,
      ip
    });
    res.json({ success: true, message: 'Share link revoked immediately.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
