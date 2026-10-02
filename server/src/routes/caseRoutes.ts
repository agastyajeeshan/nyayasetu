import { Router, Response } from 'express';
import { CaseService } from '../services/caseService.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get cases (filtered by role and search)
router.get('/', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const { status, priority, search } = req.query as Record<string, string>;
  const cases = CaseService.getCases(req.user!, { status, priority, search });
  res.json(cases);
});

// Create new case (IO, Supervisor, Admin)
router.post('/', authenticateJWT, requireRoles('investigating_officer', 'supervisor', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  const { 
    title, 
    type, 
    jurisdiction, 
    policeStation, 
    department, 
    priority, 
    investigatingOfficerId, 
    assignedTeam, 
    incidentDate, 
    filingDate, 
    courtName, 
    judgeName, 
    summary,
    // Form I.F.1
    district,
    state,
    firYear,
    actsAndSections,
    occurrenceDay,
    occurrenceDateFrom,
    occurrenceDateTo,
    occurrenceTimeFrom,
    occurrenceTimeTo,
    informationReceivedDate,
    informationReceivedTime,
    generalDiaryNo,
    informationType,
    placeOfOccurrence,
    distanceFromPS,
    beatNo,
    complainantName,
    complainantFatherSpouse,
    complainantDobOrAge,
    complainantNationality,
    complainantOccupation,
    complainantAddress,
    complainantPhone,
    suspectDetails,
    propertiesStolenOrInvolved,
    totalEstimatedValue,
    firContents,
    officerInChargeName,
    officerInChargeRank,
    officerInChargeBadge
  } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  const effectiveJurisdiction = jurisdiction || district || policeStation;

  if (!title || !type || !effectiveJurisdiction || !policeStation || !incidentDate) {
    res.status(400).json({ error: 'Missing required case fields (title, type, jurisdiction/district, policeStation, incidentDate).' });
    return;
  }

  const newCase = CaseService.createCase({
    title,
    type,
    jurisdiction: effectiveJurisdiction,
    policeStation,
    department: department || req.user!.department,
    priority: priority || 'Medium',
    investigatingOfficerId: investigatingOfficerId || req.user!.id,
    assignedTeam,
    incidentDate,
    filingDate,
    courtName,
    judgeName,
    summary: summary || title,
    
    // Form I.F.1
    district: district || effectiveJurisdiction,
    state,
    firYear,
    actsAndSections,
    occurrenceDay,
    occurrenceDateFrom,
    occurrenceDateTo,
    occurrenceTimeFrom,
    occurrenceTimeTo,
    informationReceivedDate,
    informationReceivedTime,
    generalDiaryNo,
    informationType,
    placeOfOccurrence,
    distanceFromPS,
    beatNo,
    complainantName,
    complainantFatherSpouse,
    complainantDobOrAge,
    complainantNationality,
    complainantOccupation,
    complainantAddress,
    complainantPhone,
    suspectDetails,
    propertiesStolenOrInvolved,
    totalEstimatedValue,
    firContents,
    officerInChargeName,
    officerInChargeRank,
    officerInChargeBadge,

    actorId: req.user!.id,
    actorName: req.user!.name,
    actorRole: req.user!.role,
    ipAddress: ip
  });

  res.status(201).json(newCase);
});

// Get case detail by ID
router.get('/:id', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const detail = CaseService.getCaseById(req.params.id as string);
  if (!detail) {
    res.status(404).json({ error: 'Case not found.' });
    return;
  }
  res.json(detail);
});

// Update case status
router.patch('/:id/status', authenticateJWT, requireRoles('investigating_officer', 'supervisor', 'prosecutor', 'judge', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!status) {
    res.status(400).json({ error: 'Status is required.' });
    return;
  }

  const updated = CaseService.updateCaseStatus(req.params.id as string, status, {
    id: req.user!.id,
    name: req.user!.name,
    role: req.user!.role,
    ip
  });

  if (!updated) {
    res.status(404).json({ error: 'Case not found.' });
    return;
  }

  res.json(updated);
});

// Toggle Legal Hold (Supervisor, Prosecutor, Judge, Admin)
router.patch('/:id/legal-hold', authenticateJWT, requireRoles('supervisor', 'prosecutor', 'judge', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  const { isLegalHold } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (typeof isLegalHold !== 'boolean') {
    res.status(400).json({ error: 'isLegalHold must be a boolean.' });
    return;
  }

  const updated = CaseService.toggleLegalHold(req.params.id as string, isLegalHold, {
    id: req.user!.id,
    name: req.user!.name,
    role: req.user!.role,
    ip
  });

  if (!updated) {
    res.status(404).json({ error: 'Case not found.' });
    return;
  }

  res.json(updated);
});

// FEATURE 1: Comprehensive Evidence & Investigation Timeline
router.get('/:id/timeline', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  try {
    const timeline = CaseService.getComprehensiveTimeline(req.params.id as string);
    res.json(timeline);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// FEATURE 4: Case Completeness / Readiness Evaluation
router.get('/:id/readiness', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  try {
    const report = CaseService.calculateCaseReadiness(req.params.id as string);
    res.json(report);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// FEATURE 8: Secure Evidence Package Export
router.post('/:id/export-package', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const options = {
      includeCaseInfo: req.body.includeCaseInfo !== false,
      includeDocuments: req.body.includeDocuments !== false,
      includeEvidence: req.body.includeEvidence !== false,
      includeCustodyHistory: req.body.includeCustodyHistory !== false,
      includeAuditTrail: req.body.includeAuditTrail !== false,
      includeSignatures: req.body.includeSignatures !== false,
      includeIntegrityManifest: req.body.includeIntegrityManifest !== false
    };

    const result = await CaseService.generateEvidencePackage(req.params.id as string, options, {
      id: req.user!.id,
      name: req.user!.name,
      role: req.user!.role,
      ip
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.send(result.buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// FEATURE 10: Investigation Summary (Statutory Source Citations)
router.get('/:id/investigation-summary', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  try {
    const summary = CaseService.generateInvestigationSummary(req.params.id as string);
    res.json(summary);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

export default router;
