import { Router, Response } from 'express';
import { AuditService } from '../services/auditService.js';
import { LedgerService } from '../services/ledgerService.js';
import { db } from '../db/database.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Query append-only audit logs (Accessible to all authorized investigation & legal roles)
router.get('/logs', authenticateJWT, requireRoles('auditor', 'admin', 'supervisor', 'investigating_officer', 'prosecutor', 'judge', 'forensic_officer'), (req: AuthenticatedRequest, res: Response) => {
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

  const result = AuditService.queryLogs({
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
router.get('/ledger', authenticateJWT, requireRoles('auditor', 'admin', 'supervisor', 'judge'), (req: AuthenticatedRequest, res: Response) => {
  res.json({
    totalBlocks: db.ledger_blocks.length,
    blocks: db.ledger_blocks
  });
});

// Verify complete ledger integrity (Auditor, Admin)
router.get('/ledger/verify', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const result = LedgerService.verifyLedgerIntegrity();
  res.json(result);
});

// Simulate tampering on a ledger block (for demo evaluation)
router.post('/ledger/simulate-tamper', authenticateJWT, requireRoles('admin', 'auditor'), (req: AuthenticatedRequest, res: Response) => {
  const { blockIndex, fakeField } = req.body;
  const index = typeof blockIndex === 'number' ? blockIndex : (db.ledger_blocks.length > 1 ? 1 : 0);
  
  const success = LedgerService.simulateTamper(index, {
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
router.post('/ledger/repair', authenticateJWT, requireRoles('admin', 'auditor'), (req: AuthenticatedRequest, res: Response) => {
  LedgerService.repairLedger();
  const verify = LedgerService.verifyLedgerIntegrity();
  res.json({
    success: true,
    message: 'Ledger integrity verified and repaired.',
    verification: verify
  });
});

export default router;
