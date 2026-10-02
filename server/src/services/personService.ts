import crypto from 'crypto';
import { db } from '../db/database.js';
import { PersonRecord, UserRole } from '../types/index.js';
import { AuditService } from './auditService.js';
import { LedgerService } from './ledgerService.js';

export class PersonService {
  /**
   * Generates a unique CPID (Criminal/Person Identification Number)
   * Format: CPID-[STATE]-[YEAR]-[RANDOM_5_DIGITS] e.g. CPID-DL-2024-88412
   */
  public static generateCpid(stateCode = 'DL', year = new Date().getFullYear()): string {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `CPID-${stateCode.toUpperCase()}-${year}-${randomNum}`;
  }

  /**
   * Get all persons with optional multi-facet filters
   */
  public static getPersons(filters?: {
    search?: string;
    locality?: string;
    district?: string;
    policeStation?: string;
    riskRating?: string;
    afisStatus?: string;
    caseId?: string;
    isVerifiedProfile?: boolean;
  }): PersonRecord[] {
    let list = [...db.persons];

    if (!filters) return list;

    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(p => 
        p.fullName.toLowerCase().includes(q) ||
        p.cpid.toLowerCase().includes(q) ||
        p.aliases.some(a => a.toLowerCase().includes(q)) ||
        p.fatherOrSpouseName.toLowerCase().includes(q) ||
        (p.primaryPhone && p.primaryPhone.includes(q)) ||
        p.policeStation.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        p.linkedCases.some(c => c.caseNumber.toLowerCase().includes(q))
      );
    }

    if (filters.locality) {
      const loc = filters.locality.toLowerCase().trim();
      list = list.filter(p => 
        p.address.toLowerCase().includes(loc) ||
        p.policeStation.toLowerCase().includes(loc) ||
        p.district.toLowerCase().includes(loc) ||
        p.state.toLowerCase().includes(loc) ||
        p.pincode.includes(loc)
      );
    }

    if (filters.district) {
      list = list.filter(p => p.district.toLowerCase() === filters.district!.toLowerCase());
    }

    if (filters.policeStation) {
      list = list.filter(p => p.policeStation.toLowerCase().includes(filters.policeStation!.toLowerCase()));
    }

    if (filters.riskRating) {
      list = list.filter(p => p.riskRating.toLowerCase() === filters.riskRating!.toLowerCase());
    }

    if (filters.afisStatus) {
      list = list.filter(p => p.biometrics.afisStatus === filters.afisStatus);
    }

    if (filters.caseId) {
      list = list.filter(p => p.linkedCases.some(c => c.caseId === filters.caseId || c.caseNumber === filters.caseId));
    }

    if (typeof filters.isVerifiedProfile === 'boolean') {
      list = list.filter(p => p.isVerifiedProfile === filters.isVerifiedProfile);
    }

    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Get person record by Internal UUID
   */
  public static getPersonById(id: string): PersonRecord | undefined {
    return db.persons.find(p => p.id === id);
  }

  /**
   * Get person record by CPID
   */
  public static getPersonByCpid(cpid: string): PersonRecord | undefined {
    return db.persons.find(p => p.cpid.toLowerCase() === cpid.toLowerCase());
  }

  /**
   * Search persons by Case Number or Case ID
   */
  public static searchPersonsByCase(caseIdentifier: string): PersonRecord[] {
    const q = caseIdentifier.toLowerCase().trim();
    return db.persons.filter(p => 
      p.linkedCases.some(c => c.caseId.toLowerCase() === q || c.caseNumber.toLowerCase().includes(q))
    );
  }

  /**
   * Create a new Criminal/Person Dossier
   */
  public static createPerson(
    data: Omit<PersonRecord, 'id' | 'createdAt' | 'updatedAt' | 'cpid'> & { cpid?: string },
    actor: { id: string; name: string; role: UserRole; ip: string }
  ): PersonRecord {
    const stateCode = data.state ? data.state.slice(0, 2).toUpperCase() : 'DL';
    const cpid = data.cpid || this.generateCpid(stateCode);

    const newPerson: PersonRecord = {
      id: crypto.randomUUID(),
      cpid,
      fullName: data.fullName,
      aliases: data.aliases || [],
      fatherOrSpouseName: data.fatherOrSpouseName || 'Unknown',
      gender: data.gender || 'Male',
      dobOrAge: data.dobOrAge || '30 Yrs',
      nationality: data.nationality || 'Indian',
      primaryPhone: data.primaryPhone,
      identificationMarks: data.identificationMarks || [],
      biometrics: data.biometrics || {
        afisStatus: 'NOT_ENROLLED',
        irisEnrolled: false
      },
      address: data.address || 'Address Not Disclosed',
      policeStation: data.policeStation,
      district: data.district,
      state: data.state || 'Delhi',
      pincode: data.pincode || '110001',
      riskRating: data.riskRating || 'Moderate',
      gangOrSyndicateAffiliation: data.gangOrSyndicateAffiliation,
      previousConvictionsCount: data.previousConvictionsCount || 0,
      linkedCases: data.linkedCases || [],
      isVerifiedProfile: typeof data.isVerifiedProfile === 'boolean' ? data.isVerifiedProfile : true,
      verificationAuthority: data.verificationAuthority || `${actor.name} (${actor.role})`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.persons.push(newPerson);
    db.save();

    // Log in append-only ledger & audit trail
    const block = LedgerService.createBlock({
      eventType: 'PERSON_RECORD_REGISTERED',
      resourceType: 'USER',
      resourceId: newPerson.id,
      resourceHash: crypto.createHash('sha256').update(JSON.stringify(newPerson)).digest('hex'),
      actorId: actor.id,
      actorName: actor.name,
      payload: {
        cpid: newPerson.cpid,
        name: newPerson.fullName,
        policeStation: newPerson.policeStation,
        district: newPerson.district
      }
    });

    AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      organization: 'NCRB / Police HQ',
      department: 'Criminal Records Bureau',
      action: 'PERSON_DOSSIER_CREATED',
      resourceType: 'USER',
      resourceId: newPerson.id,
      resourceName: `${newPerson.fullName} (${newPerson.cpid})`,
      details: `Created verified criminal record dossier for ${newPerson.fullName} with CPID ${newPerson.cpid}`,
      outcome: 'SUCCESS',
      ipAddress: actor.ip
    });

    return newPerson;
  }

  /**
   * Update existing person record
   */
  public static updatePerson(
    id: string,
    data: Partial<PersonRecord>,
    actor: { id: string; name: string; role: UserRole; ip: string }
  ): PersonRecord | null {
    const idx = db.persons.findIndex(p => p.id === id);
    if (idx === -1) return null;

    const existing = db.persons[idx];
    const updated: PersonRecord = {
      ...existing,
      ...data,
      id: existing.id,
      cpid: existing.cpid, // CPID remains immutable
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };

    db.persons[idx] = updated;
    db.save();

    AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      organization: 'NCRB / Police HQ',
      department: 'Criminal Records Bureau',
      action: 'PERSON_DOSSIER_UPDATED',
      resourceType: 'USER',
      resourceId: updated.id,
      resourceName: `${updated.fullName} (${updated.cpid})`,
      details: `Updated dossier information for ${updated.fullName} (${updated.cpid})`,
      outcome: 'SUCCESS',
      ipAddress: actor.ip
    });

    return updated;
  }

  /**
   * Link a case to a person
   */
  public static linkCaseToPerson(
    personId: string,
    caseLink: {
      caseId: string;
      caseNumber: string;
      role: 'Accused' | 'Suspect' | 'Witness' | 'Victim' | 'Informant';
      sectionCharges?: string;
      status: string;
    },
    actor: { id: string; name: string; role: UserRole; ip: string }
  ): PersonRecord | null {
    const person = this.getPersonById(personId);
    if (!person) return null;

    // Check if already linked
    const existingLinkIdx = person.linkedCases.findIndex(c => c.caseId === caseLink.caseId);
    if (existingLinkIdx >= 0) {
      person.linkedCases[existingLinkIdx] = caseLink;
    } else {
      person.linkedCases.push(caseLink);
    }

    person.updatedAt = new Date().toISOString();
    db.save();

    AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      organization: 'Police Dept',
      department: 'Investigation Wing',
      action: 'PERSON_LINKED_TO_CASE',
      resourceType: 'CASE',
      resourceId: caseLink.caseId,
      resourceName: caseLink.caseNumber,
      details: `Linked person ${person.fullName} (${person.cpid}) as ${caseLink.role} to case ${caseLink.caseNumber}`,
      outcome: 'SUCCESS',
      ipAddress: actor.ip
    });

    return person;
  }
}

