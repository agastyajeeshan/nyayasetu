import { Router, Response } from 'express';
import { PersonService } from '../services/personService.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get persons (filtered by search, locality, district, police station, risk rating, caseId)
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, locality, district, policeStation, riskRating, afisStatus, caseId, isVerifiedProfile } = req.query as Record<string, string>;
    const persons = await PersonService.getPersons({
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Search persons by case number or ID
router.get('/by-case/:caseId', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await PersonService.searchPersonsByCase(req.params.caseId as string);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single person by ID
router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const person = (await PersonService.getPersonById(req.params.id as string)) || (await PersonService.getPersonByCpid(req.params.id as string));
    if (!person) {
      res.status(404).json({ error: 'Person record not found.' });
      return;
    }
    res.json(person);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new Criminal / Person record
router.post('/', authenticateJWT, requireRoles('investigating_officer', 'supervisor', 'admin', 'forensic_officer'), async (req: AuthenticatedRequest, res: Response) => {
  try {
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

    const person = await PersonService.createPerson({
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update person record
router.patch('/:id', authenticateJWT, requireRoles('investigating_officer', 'supervisor', 'admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const updated = await PersonService.updatePerson(req.params.id as string, req.body, {
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Link case to person
router.post('/:id/link-case', authenticateJWT, requireRoles('investigating_officer', 'supervisor', 'admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { caseId, caseNumber, role, sectionCharges, status } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!caseId || !caseNumber || !role) {
      res.status(400).json({ error: 'Missing required case link parameters (caseId, caseNumber, role).' });
      return;
    }

    const updated = await PersonService.linkCaseToPerson(req.params.id as string, {
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
