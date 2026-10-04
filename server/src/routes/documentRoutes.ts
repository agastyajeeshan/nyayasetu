import { Router, Response } from 'express';
import multer from 'multer';
import { DocumentService } from '../services/documentService.js';
import { StorageService } from '../services/storageService.js';
import { DocumentRepository } from '../repositories/documentRepository.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth.js';
import { AuditService } from '../services/auditService.js';
import { DocumentCategory, ConfidentialityLevel } from '../types/index.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const router = Router();

// Search & list documents
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { caseId, category, confidentiality, reviewStatus, search, limit, offset } = req.query as Record<string, string>;
    const result = await DocumentService.searchDocuments(
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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

    let parsedTags: string[] = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch {
        parsedTags = String(tags).split(',').map(t => t.trim());
      }
    }

    const newDoc = await DocumentService.createDocument({
      caseId,
      title,
      category: category as DocumentCategory,
      description: description || '',
      confidentiality: (confidentiality as ConfidentialityLevel) || 'Confidential',
      retentionYears: retentionYears ? parseInt(retentionYears, 10) : 10,
      tags: parsedTags,
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
    res.status(500).json({ error: err.message });
  }
});

// Upload new version (v2, v3...)
router.post('/:id/versions', authenticateJWT, requireRoles('investigating_officer', 'supervisor', 'forensic_officer', 'prosecutor', 'admin'), upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'File binary is required for uploading a new version.' });
      return;
    }

    const { changeSummary } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!changeSummary) {
      res.status(400).json({ error: 'Mandatory change summary must be provided for version audit.' });
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
    res.status(500).json({ error: err.message });
  }
});

// Get document detail
router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const detail = await DocumentService.getDocumentDetail(req.params.id as string);
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
    const doc = await DocumentRepository.findById(docId);
    if (!doc || doc.isDeleted) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    const versionNum = req.params.versionNumber ? parseInt(req.params.versionNumber as string, 10) : doc.currentVersionNumber;
    const versions = await DocumentRepository.findVersionsByDocId(doc.id);
    const version = versions.find(v => v.versionNumber === versionNum);
    if (!version) {
      res.status(404).json({ error: `Version v${versionNum} not found.` });
      return;
    }

    const buffer = await StorageService.readFile(version.storedFileName, version.isEncrypted);

    await AuditService.log({
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
    const doc = await DocumentRepository.findById(docId);
    if (!doc || doc.isDeleted) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    // Role check for high confidentiality
    if ((doc.confidentiality === 'Secret' || doc.confidentiality === 'Top Secret') && req.user!.role === 'external_stakeholder') {
      res.status(403).json({ error: 'Download permission denied for Secret/Top-Secret documents.' });
      return;
    }

    const versionNum = req.params.versionNumber ? parseInt(req.params.versionNumber as string, 10) : doc.currentVersionNumber;
    const versions = await DocumentRepository.findVersionsByDocId(doc.id);
    const version = versions.find(v => v.versionNumber === versionNum);
    if (!version) {
      res.status(404).json({ error: `Version v${versionNum} not found.` });
      return;
    }

    const buffer = await StorageService.readFile(version.storedFileName, version.isEncrypted);

    await AuditService.log({
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

    await AuditService.log({
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
    const doc = await DocumentRepository.findById(docId);
    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    const versions = await DocumentRepository.findVersionsByDocId(doc.id);
    const version = versions.find(v => v.versionNumber === doc.currentVersionNumber);
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
router.delete('/:id', authenticateJWT, requireRoles('investigating_officer', 'supervisor', 'admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    await DocumentService.softDeleteDocument(req.params.id as string, {
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
router.get('/:id/redacted-copies', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const list = await DocumentService.getRedactedCopies(req.params.id as string);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// FEATURE 6: Download Redacted Copy File
router.get('/redacted/:redactedId/download', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const record = await DocumentRepository.findRedactedById(req.params.redactedId as string);
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
