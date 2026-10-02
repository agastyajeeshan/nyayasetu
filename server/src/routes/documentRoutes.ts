import { Router, Response } from 'express';
import multer from 'multer';
import { DocumentService } from '../services/documentService.js';
import { StorageService } from '../services/storageService.js';
import { db } from '../db/database.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth.js';
import { AuditService } from '../services/auditService.js';
import { DocumentCategory, ConfidentialityLevel } from '../types/index.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const router = Router();

// Search & list documents
router.get('/', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const { caseId, category, confidentiality, reviewStatus, search, limit, offset } = req.query as Record<string, string>;
  const result = DocumentService.searchDocuments(
    { id: req.user!.id, role: req.user!.role, department: req.user!.department },
    {
      caseId,
      category,
      confidentiality,
      reviewStatus,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined
    }
  );
  res.json(result);
});

// Upload new document (v1)
router.post('/', authenticateJWT, requireRoles('investigating_officer', 'supervisor', 'forensic_officer', 'prosecutor', 'admin'), upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'File binary is required for document upload.' });
      return;
    }

    const { caseId, title, category, description, confidentiality, retentionYears, tags } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!caseId || !title || !category) {
      res.status(400).json({ error: 'Missing required metadata (caseId, title, category).' });
      return;
    }

    const validation = StorageService.validateFile(file.originalname, file.mimetype, file.size);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const newDoc = await DocumentService.createDocument({
      caseId,
      title,
      category: category as DocumentCategory,
      description: description || '',
      confidentiality: (confidentiality as ConfidentialityLevel) || 'Confidential',
      retentionYears: retentionYears ? parseInt(retentionYears, 10) : 10,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : [],
      fileBuffer: file.buffer,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      actorDepartment: req.user!.department,
      ipAddress: ip
    });

    res.status(201).json(newDoc);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to upload document' });
  }
});

// Upload new version (v2, v3...)
router.post('/:id/version', authenticateJWT, requireRoles('investigating_officer', 'supervisor', 'forensic_officer', 'prosecutor', 'admin'), upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'File binary is required for new version.' });
      return;
    }

    const { changeSummary } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!changeSummary) {
      res.status(400).json({ error: 'Change summary is required when uploading a new version.' });
      return;
    }

    const validation = StorageService.validateFile(file.originalname, file.mimetype, file.size);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const newVersion = await DocumentService.uploadNewVersion({
      documentId: req.params.id as string,
      changeSummary,
      fileBuffer: file.buffer,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      actorDepartment: req.user!.department,
      ipAddress: ip
    });

    res.status(201).json(newVersion);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to upload version' });
  }
});

// Get document detail
router.get('/:id', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const detail = DocumentService.getDocumentDetail(req.params.id as string);
  if (!detail) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }
  res.json(detail);
});

// Preview document file
router.get('/:id/preview/:versionNumber?', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const docId = req.params.id as string;
    const doc = db.documents.find(d => d.id === docId && !d.isDeleted);
    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    const versionNum = req.params.versionNumber ? parseInt(req.params.versionNumber as string, 10) : doc.currentVersionNumber;
    const version = db.document_versions.find(v => v.documentId === doc.id && v.versionNumber === versionNum);
    if (!version) {
      res.status(404).json({ error: `Version v${versionNum} not found.` });
      return;
    }

    const buffer = await StorageService.readFile(version.storedFileName, version.isEncrypted);

    AuditService.log({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      organization: 'Ministry of Home Affairs',
      department: req.user!.department,
      action: 'DOCUMENT_PREVIEWED',
      resourceType: 'DOCUMENT',
      resourceId: doc.id,
      resourceName: `${doc.documentNumber} (v${versionNum})`,
      details: `Document ${doc.documentNumber} v${versionNum} previewed by ${req.user!.name}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
      recordToLedger: false
    });

    res.setHeader('Content-Type', version.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${version.fileName}"`);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error reading preview' });
  }
});

// Download document file
router.get('/:id/download/:versionNumber?', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const docId = req.params.id as string;
    const doc = db.documents.find(d => d.id === docId && !d.isDeleted);
    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    // Role check for high confidentiality
    if ((doc.confidentiality === 'Secret' || doc.confidentiality === 'Top Secret') && req.user!.role === 'external_stakeholder') {
      res.status(403).json({ error: 'Download permission denied for Secret/Top-Secret documents.' });
      return;
    }

    const versionNum = req.params.versionNumber ? parseInt(req.params.versionNumber as string, 10) : doc.currentVersionNumber;
    const version = db.document_versions.find(v => v.documentId === doc.id && v.versionNumber === versionNum);
    if (!version) {
      res.status(404).json({ error: `Version v${versionNum} not found.` });
      return;
    }

    const buffer = await StorageService.readFile(version.storedFileName, version.isEncrypted);

    AuditService.log({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      organization: 'Ministry of Home Affairs',
      department: req.user!.department,
      action: 'DOCUMENT_DOWNLOADED',
      resourceType: 'DOCUMENT',
      resourceId: doc.id,
      resourceName: `${doc.documentNumber} (v${versionNum})`,
      details: `Document binary ${doc.documentNumber} v${versionNum} downloaded by ${req.user!.name}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1'
    });

    res.setHeader('Content-Type', version.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${version.fileName}"`);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error downloading file' });
  }
});

// Verify cryptographic integrity
router.post('/:id/verify-integrity', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const docId = req.params.id as string;
    const { versionNumber } = req.body;
    const result = await DocumentService.verifyDocumentIntegrity(docId, versionNumber ? parseInt(versionNumber, 10) : undefined);

    AuditService.log({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      organization: 'Ministry of Home Affairs',
      department: req.user!.department,
      action: 'INTEGRITY_VERIFICATION_CHECK',
      resourceType: 'DOCUMENT',
      resourceId: docId,
      details: `Integrity check for document ${docId}: ${result.matches ? 'PASSED (Cryptographically Valid)' : 'FAILED (Tampering Detected!)'}`,
      outcome: result.matches ? 'SUCCESS' : 'FAILURE',
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Integrity verification failed' });
  }
});

// Simulate tampering on stored binary (for live test demo)
router.post('/:id/simulate-tamper', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const docId = req.params.id as string;
    const doc = db.documents.find(d => d.id === docId);
    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    const version = db.document_versions.find(v => v.documentId === doc.id && v.versionNumber === doc.currentVersionNumber);
    if (!version) {
      res.status(404).json({ error: 'Version not found.' });
      return;
    }

    const tampered = await StorageService.simulateBinaryTamper(version.storedFileName);
    res.json({
      success: tampered,
      message: 'Binary file in storage has been intentionally modified on disk. Now trigger "Verify Integrity" to watch the cryptographic tamper detection trigger!'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Soft delete document
router.delete('/:id', authenticateJWT, requireRoles('investigating_officer', 'supervisor', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    DocumentService.softDeleteDocument(req.params.id as string, {
      id: req.user!.id,
      name: req.user!.name,
      role: req.user!.role,
      ip
    });
    res.json({ success: true, message: 'Document soft-deleted and marked in retention ledger.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// FEATURE 5: Document Version Comparison
router.get('/:id/compare-versions', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const docId = req.params.id as string;
    const v1 = req.query.v1 ? parseInt(req.query.v1 as string, 10) : undefined;
    const v2 = req.query.v2 ? parseInt(req.query.v2 as string, 10) : undefined;
    const diff = await DocumentService.compareVersions(docId, v1, v2);
    res.json(diff);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// FEATURE 6: Detect PII in Document
router.post('/:id/detect-pii', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const docId = req.params.id as string;
    const { versionNumber } = req.body;
    const detected = await DocumentService.detectPII(docId, versionNumber);
    res.json({ detected, totalFound: detected.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// FEATURE 6: Create Confirmed Redacted Derivative
router.post('/:id/create-redacted', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const docId = req.params.id as string;
    const { versionNumber, selectedRedactions, customTerms, exportPurpose } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const redacted = await DocumentService.createRedactedDerivative({
      documentId: docId,
      versionNumber: versionNumber || 1,
      selectedRedactions: selectedRedactions || [],
      customTerms,
      exportPurpose,
      actor: {
        id: req.user!.id,
        name: req.user!.name,
        role: req.user!.role,
        ip
      }
    });

    res.status(201).json(redacted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// FEATURE 6: Get Redacted Copies for Document
router.get('/:id/redacted-copies', authenticateJWT, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const list = DocumentService.getRedactedCopies(req.params.id as string);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// FEATURE 6: Download Redacted Copy File
router.get('/redacted/:redactedId/download', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const record = db.redacted_documents.find(r => r.id === req.params.redactedId);
    if (!record) {
      res.status(404).json({ error: 'Redacted file record not found.' });
      return;
    }

    const buffer = await StorageService.readFile(record.storedFileName, true);
    res.setHeader('Content-Type', record.mimeType || 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${record.redactedFileName}"`);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
