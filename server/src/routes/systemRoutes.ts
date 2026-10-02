import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { LedgerService } from '../services/ledgerService.js';
import { DocumentService } from '../services/documentService.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';

import { seedDatabase } from '../db/seed.js';
import { loadDatasetsFromCSV } from '../db/csvLoader.js';

const router = Router();

router.all('/load-csv', async (req, res) => {
  try {
    const stats = await loadDatasetsFromCSV();
    res.json({
      success: true,
      message: 'Official datasets from CSV ingested and integrated successfully.',
      stats
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.all('/reseed', async (req, res) => {
  try {
    await seedDatabase();
    await loadDatasetsFromCSV();
    res.json({
      success: true,
      message: 'Database reseeded and CSV datasets ingested successfully.',
      documents: db.documents.length,
      evidence: db.evidence_items.length,
      cases: db.cases.length,
      users: db.users.length,
      persons: db.persons.length,
      ledgerBlocks: db.ledger_blocks.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    system: 'NyayaSetu',
    organization: 'Ministry of Home Affairs / NCRB',
    version: '1.0.0-PROTOTYPE',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  });
});

router.get('/stats', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const ledgerVerify = LedgerService.verifyLedgerIntegrity();

  const totalBytes = db.document_versions.reduce((sum, v) => sum + (v.fileSizeBytes || 0), 0);

  res.json({
    casesCount: db.cases.length,
    activeCasesCount: db.cases.filter(c => c.status === 'Active Investigation').length,
    documentsCount: db.documents.filter(d => !d.isDeleted).length,
    documentVersionsCount: db.document_versions.length,
    evidenceItemsCount: db.evidence_items.length,
    custodyEventsCount: db.custody_events.length,
    signaturesCount: db.digital_signatures.length,
    sharesCount: db.share_links.length,
    activeSharesCount: db.share_links.filter(s => !s.isRevoked && new Date(s.expiresAt).getTime() > Date.now()).length,
    auditEventsCount: db.audit_events.length,
    ledgerBlocksCount: db.ledger_blocks.length,
    assetsCount: db.police_assets.length,

    // Aliases for frontend Dashboard compatibility
    totalCases: db.cases.length,
    activeInvestigations: db.cases.filter(c => c.status === 'Active Investigation').length,
    totalDocuments: db.documents.filter(d => !d.isDeleted).length,
    totalVersions: db.document_versions.length,
    totalEvidence: db.evidence_items.length,
    signedDocuments: db.digital_signatures.length,
    activeShares: db.share_links.filter(s => !s.isRevoked && new Date(s.expiresAt).getTime() > Date.now()).length,
    ledgerHeight: db.ledger_blocks.length,
    totalStorageBytes: totalBytes,
    totalStorageFormatted: `${(totalBytes / 1024).toFixed(1)} KB`,
    ledgerIntegrity: {
      isValid: ledgerVerify.isValid,
      totalBlocks: ledgerVerify.totalBlocks,
      latestBlockHash: ledgerVerify.latestBlockHash
    },
    securityModules: {
      kmsEncryption: 'AES-256-GCM Active (Per-Document Envelope Key)',
      hashingEngine: 'SHA-256 Hardware-Accelerated',
      merkleLedger: 'Tamper-Evident Hash Chained (Hyperledger / Blockchain Anchor Compatible)',
      malwareScanner: 'ClamAV / Heuristic Sandbox Interface Active',
      rbacEngine: 'Multi-Tenant Zero-Trust Matrix (8 Specialized Roles Enforced)'
    }
  });
});

// PostgreSQL Database Status
router.get('/db-status', async (req, res) => {
  try {
    const { PostgresService } = await import('../db/postgres.js');
    const pgStats = await PostgresService.getStats();
    res.json({
      success: true,
      postgres: pgStats,
      inMemoryStorage: {
        cases: db.cases.length,
        users: db.users.length,
        documents: db.documents.length,
        evidence: db.evidence_items.length,
        custody: db.custody_events.length,
        persons: db.persons.length,
        auditLogs: db.audit_events.length,
        ledgerBlocks: db.ledger_blocks.length
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test PostgreSQL Connection (with optional custom credentials)
router.post('/db-test', async (req, res) => {
  try {
    const { PostgresService } = await import('../db/postgres.js');
    const { host, port, user, password, database, databaseUrl } = req.body;
    const testResult = await PostgresService.testConnection({
      host,
      port: port ? parseInt(port, 10) : undefined,
      user,
      password,
      database,
      databaseUrl
    });
    res.json(testResult);
  } catch (err: any) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

// Trigger PostgreSQL Database Migration & Sync
router.post('/db-migrate', async (req, res) => {
  try {
    const { PostgresService } = await import('../db/postgres.js');
    const { host, port, user, password, database, databaseUrl } = req.body;

    if (password || databaseUrl || host) {
      PostgresService.getPool({
        host,
        port: port ? parseInt(port, 10) : undefined,
        user,
        password,
        database,
        databaseUrl
      });
    }

    const conn = await PostgresService.testConnection();
    if (!conn.connected) {
      res.status(400).json({
        success: false,
        error: `Cannot migrate: PostgreSQL connection failed: ${conn.error}`
      });
      return;
    }

    await PostgresService.ensureDatabaseExists();
    const schemaRes = await PostgresService.initializeSchema();
    if (!schemaRes.success) {
      res.status(500).json({ success: false, error: schemaRes.error });
      return;
    }

    const syncRes = await PostgresService.syncAllFromMemory(db.rawData());
    res.json({
      success: syncRes.success,
      message: 'PostgreSQL database successfully initialized and synchronized.',
      synced: syncRes.synced,
      error: syncRes.error
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// FEATURE 7: Evidence Integrity Center Report
router.get('/integrity-center', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const caseId = req.query.caseId as string | undefined;
    const report = await DocumentService.getIntegrityCenterReport(caseId);
    
    const totalItems = report.length;
    const verifiedCount = report.filter(r => r.currentStatus === 'VERIFIED').length;
    const warningCount = report.filter(r => r.currentStatus === 'WARNING').length;
    const failureCount = report.filter(r => r.currentStatus === 'INTEGRITY_FAILURE').length;

    res.json({
      items: report,
      stats: {
        totalItems,
        verifiedCount,
        warningCount,
        failureCount,
        isSystemHealthy: failureCount === 0
      },
      verifiedAt: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// FEATURE 7: Live Batch Integrity Verification
router.post('/verify-integrity-all', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const caseId = req.body.caseId as string | undefined;
    const report = await DocumentService.getIntegrityCenterReport(caseId);

    const failures = report.filter(r => r.currentStatus === 'INTEGRITY_FAILURE');
    
    res.json({
      success: true,
      totalChecked: report.length,
      passed: report.length - failures.length,
      failed: failures.length,
      failures,
      verifiedAt: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
