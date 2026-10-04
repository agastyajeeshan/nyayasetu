import { Router, Response } from 'express';
import { AuditService } from '../services/auditService.js';
import { LedgerService } from '../services/ledgerService.js';
import { LedgerRepository } from '../repositories/ledgerRepository.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Query append-only audit logs (Accessible to all authorized investigation & legal roles)
router.get('/logs', authenticateJWT, requireRoles('auditor', 'admin', 'supervisor', 'investigating_officer', 'prosecutor', 'judge', 'forensic_officer'), async (req: AuthenticatedRequest, res: Response) => {
  const { 
    actorId, 
    user, 
    role, 
    caseId, 
    documentId, 
    evidenceId, 
    resourceType, 
    resourceId, 
    action, 
    actionCategory, 
    isSecurityEvent, 
    outcome, 
    startDate, 
    endDate, 
    search, 
    limit, 
    offset 
  } = req.query as Record<string, string>;

  const result = await AuditService.queryLogs({
    actorId,
    user,
    role,
    caseId,
    documentId,
    evidenceId,
    resourceType,
    resourceId,
    action,
    actionCategory,
    isSecurityEvent: isSecurityEvent === 'true' || isSecurityEvent === '1',
    outcome,
    startDate,
    endDate,
    search,
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined
  });
  res.json(result);
});

// View ledger blocks (Auditor, Admin)
router.get('/ledger', authenticateJWT, requireRoles('auditor', 'admin', 'supervisor', 'judge'), async (req: AuthenticatedRequest, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  const totalBlocks = await LedgerRepository.count();
  const blocks = await LedgerRepository.getAllBlocks(limit, offset);
  res.json({
    totalBlocks,
    blocks
  });
});

// Verify complete ledger integrity (Auditor, Admin)
router.get('/ledger/verify', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const result = await LedgerService.verifyLedgerIntegrity();
  res.json(result);
});

// Simulate tampering on a ledger block (for demo evaluation)
router.post('/ledger/simulate-tamper', authenticateJWT, requireRoles('admin', 'auditor'), async (req: AuthenticatedRequest, res: Response) => {
  const { blockIndex, fakeField } = req.body;
  const total = await LedgerRepository.count();
  const index = typeof blockIndex === 'number' ? blockIndex : (total > 1 ? 1 : 0);
  
  const success = await LedgerService.simulateTamper(index, {
    unauthorizedModification: fakeField || 'FORGED_AUTHORIZATION_RECORD_SIMULATED',
    tamperedBy: req.user!.name
  });

  if (!success) {
    res.status(400).json({ error: 'Failed to simulate tamper on specified block index.' });
    return;
  }

  res.json({
    success: true,
    tamperedBlockIndex: index,
    message: `Block #${index} payload tampered in database. Trigger "Verify Ledger" to witness real-time Merkle and hash-chain fault isolation!`
  });
});

// Repair ledger
router.post('/ledger/repair', authenticateJWT, requireRoles('admin', 'auditor'), async (req: AuthenticatedRequest, res: Response) => {
  await LedgerService.repairLedger();
  const verify = await LedgerService.verifyLedgerIntegrity();
  res.json({
    success: true,
    message: 'Ledger integrity verified and repaired.',
    verification: verify
  });
});

export default router;
