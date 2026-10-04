import crypto from 'crypto';
import { PersonRepository } from '../repositories/personRepository.js';
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
   * Get all persons from PostgreSQL with optional multi-facet filters
   */
  public static async getPersons(filters?: {
    search?: string;
    locality?: string;
    district?: string;
    policeStation?: string;
    riskRating?: string;
    afisStatus?: string;
    caseId?: string;
    isVerifiedProfile?: boolean;
  }): Promise<PersonRecord[]> {
    return await PersonRepository.findMany(filters);
  }

  /**
   * Get person record by Internal UUID from PostgreSQL
   */
  public static async getPersonById(id: string): Promise<PersonRecord | null> {
    return await PersonRepository.findById(id);
  }

  /**
   * Get person record by CPID from PostgreSQL
   */
  public static async getPersonByCpid(cpid: string): Promise<PersonRecord | null> {
    return await PersonRepository.findByCpid(cpid);
  }

  /**
   * Search persons by Case Number or Case ID in PostgreSQL
   */
  public static async searchPersonsByCase(caseIdentifier: string): Promise<PersonRecord[]> {
    return await PersonRepository.findByCase(caseIdentifier);
  }

  /**
   * Create a new Criminal/Person Dossier in PostgreSQL
   */
  public static async createPerson(
    data: Omit<PersonRecord, 'id' | 'createdAt' | 'updatedAt' | 'cpid'> & { cpid?: string },
    actor: { id: string; name: string; role: UserRole; ip: string }
  ): Promise<PersonRecord> {
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

    await PersonRepository.create(newPerson);

    // Log in append-only ledger & audit trail
    await LedgerService.createBlock({
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

    await AuditService.log({
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
   * Update existing person record in PostgreSQL
   */
  public static async updatePerson(
    id: string,
    data: Partial<PersonRecord>,
    actor: { id: string; name: string; role: UserRole; ip: string }
  ): Promise<PersonRecord | null> {
    const existing = await PersonRepository.findById(id);
    if (!existing) return null;

    const updated = await PersonRepository.update(id, data);
    if (!updated) return null;

    await AuditService.log({
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
   * Link a case to a person in PostgreSQL
   */
  public static async linkCaseToPerson(
    personId: string,
    caseLink: {
      caseId: string;
      caseNumber: string;
      role: 'Accused' | 'Suspect' | 'Witness' | 'Victim' | 'Informant';
      sectionCharges?: string;
      status: string;
    },
    actor: { id: string; name: string; role: UserRole; ip: string }
  ): Promise<PersonRecord | null> {
    const person = await this.getPersonById(personId);
    if (!person) return null;

    const existingLinkIdx = person.linkedCases.findIndex(c => c.caseId === caseLink.caseId);
    const updatedLinks = [...person.linkedCases];
    if (existingLinkIdx >= 0) {
      updatedLinks[existingLinkIdx] = caseLink;
    } else {
      updatedLinks.push(caseLink);
    }

    const updated = await PersonRepository.update(person.id, { linkedCases: updatedLinks });

    await AuditService.log({
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

    return updated;
  }
}
