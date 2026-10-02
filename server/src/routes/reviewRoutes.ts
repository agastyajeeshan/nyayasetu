import { Router, Response } from 'express';
import { ReviewService } from '../services/reviewService.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth.js';
import { ReviewStatus } from '../types/index.js';

const router = Router();

// Add review comment
router.post('/comments', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId, comment, suggestedChanges } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!documentId || !comment) {
      res.status(400).json({ error: 'Document ID and comment text are required.' });
      return;
    }

    const result = ReviewService.addComment({
      documentId,
      comment,
      suggestedChanges,
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      actorDepartment: req.user!.department,
      ipAddress: ip
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update review status (Supervisor, Prosecutor, Judge, Admin)
router.patch('/status', authenticateJWT, requireRoles('supervisor', 'prosecutor', 'judge', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId, status, feedback } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!documentId || !status) {
      res.status(400).json({ error: 'Document ID and status are required.' });
      return;
    }

    const result = ReviewService.updateReviewStatus({
      documentId,
      status: status as ReviewStatus,
      feedback,
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      actorDepartment: req.user!.department,
      ipAddress: ip
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Digitally sign document version
router.post('/sign', authenticateJWT, requireRoles('supervisor', 'investigating_officer', 'prosecutor', 'judge', 'forensic_officer', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId, versionNumber } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!documentId || !versionNumber) {
      res.status(400).json({ error: 'Document ID and versionNumber are required for digital signature.' });
      return;
    }

    const signature = ReviewService.signDocument({
      documentId,
      versionNumber: parseInt(versionNumber, 10),
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      actorAgencyId: req.user!.agencyId,
      actorDepartment: req.user!.department,
      ipAddress: ip
    });

    res.status(201).json(signature);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Verify digital signature
router.get('/signatures/:id/verify', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = ReviewService.verifySignature(req.params.id as string);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
