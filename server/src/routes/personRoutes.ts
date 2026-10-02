import { Router, Response } from 'express';
import { PersonService } from '../services/personService.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get persons (filtered by search, locality, district, police station, risk rating, caseId)
router.get('/', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const { search, locality, district, policeStation, riskRating, afisStatus, caseId, isVerifiedProfile } = req.query as Record<string, string>;
  const persons = PersonService.getPersons({
    search,
    locality,
    district,
    policeStation,
    riskRating,
    afisStatus,
    caseId,
    isVerifiedProfile: isVerifiedProfile !== undefined ? isVerifiedProfile === 'true' : undefined
  });
  res.json(persons);
});

// Search persons by case number or ID
router.get('/by-case/:caseId', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const list = PersonService.searchPersonsByCase(req.params.caseId as string);
  res.json(list);
});

// Get single person by ID
router.get('/:id', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const person = PersonService.getPersonById(req.params.id as string) || PersonService.getPersonByCpid(req.params.id as string);
  if (!person) {
    res.status(404).json({ error: 'Person record not found.' });
    return;
  }
  res.json(person);
});

// Create new Criminal / Person record
router.post('/', authenticateJWT, requireRoles('investigating_officer', 'supervisor', 'admin', 'forensic_officer'), (req: AuthenticatedRequest, res: Response) => {
  const {
    fullName,
    aliases,
    fatherOrSpouseName,
    gender,
    dobOrAge,
    nationality,
    primaryPhone,
    identificationMarks,
    biometrics,
    address,
    policeStation,
    district,
    state,
    pincode,
    riskRating,
    gangOrSyndicateAffiliation,
    previousConvictionsCount,
    linkedCases,
    isVerifiedProfile,
    verificationAuthority,
    cpid
  } = req.body;

  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!fullName || !policeStation || !district) {
    res.status(400).json({ error: 'Missing required fields (fullName, policeStation, district).' });
    return;
  }

  const person = PersonService.createPerson({
    fullName,
    aliases: aliases || [],
    fatherOrSpouseName: fatherOrSpouseName || 'Unknown',
    gender: gender || 'Male',
    dobOrAge: dobOrAge || '30 Yrs',
    nationality: nationality || 'Indian',
    primaryPhone,
    identificationMarks: identificationMarks || [],
    biometrics: biometrics || { afisStatus: 'NOT_ENROLLED', irisEnrolled: false },
    address: address || 'Not Disclosed',
    policeStation,
    district,
    state: state || 'Delhi',
    pincode: pincode || '110001',
    riskRating: riskRating || 'Moderate',
    gangOrSyndicateAffiliation,
    previousConvictionsCount: previousConvictionsCount ? Number(previousConvictionsCount) : 0,
    linkedCases: linkedCases || [],
    isVerifiedProfile: isVerifiedProfile !== undefined ? Boolean(isVerifiedProfile) : true,
    verificationAuthority: verificationAuthority || `${req.user!.name} (${req.user!.role})`,
    cpid
  }, {
    id: req.user!.id,
    name: req.user!.name,
    role: req.user!.role,
    ip
  });

  res.status(201).json(person);
});

// Update person record
router.patch('/:id', authenticateJWT, requireRoles('investigating_officer', 'supervisor', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const updated = PersonService.updatePerson(req.params.id as string, req.body, {
    id: req.user!.id,
    name: req.user!.name,
    role: req.user!.role,
    ip
  });

  if (!updated) {
    res.status(404).json({ error: 'Person record not found.' });
    return;
  }

  res.json(updated);
});

// Link case to person
router.post('/:id/link-case', authenticateJWT, requireRoles('investigating_officer', 'supervisor', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  const { caseId, caseNumber, role, sectionCharges, status } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!caseId || !caseNumber || !role) {
    res.status(400).json({ error: 'Missing required case link parameters (caseId, caseNumber, role).' });
    return;
  }

  const updated = PersonService.linkCaseToPerson(req.params.id as string, {
    caseId,
    caseNumber,
    role,
    sectionCharges,
    status: status || 'Active'
  }, {
    id: req.user!.id,
    name: req.user!.name,
    role: req.user!.role,
    ip
  });

  if (!updated) {
    res.status(404).json({ error: 'Person record not found.' });
    return;
  }

  res.json(updated);
});

export default router;
