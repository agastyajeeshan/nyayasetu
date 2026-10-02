import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from './database.js';
import { CryptoService } from '../services/cryptoService.js';
import {
  User,
  UserRole,
  Case,
  CaseStatus,
  CasePriority,
  Document,
  DocumentVersion,
  DocumentCategory,
  ConfidentialityLevel,
  EvidenceItem,
  EvidenceType,
  CustodyEvent,
  PersonRecord,
  AuditEvent,
  LedgerBlock
} from '../types/index.js';

export interface CSVLoaderStats {
  users: number;
  cases: number;
  documents: number;
  documentVersions: number;
  evidenceItems: number;
  custodyEvents: number;
  persons: number;
  auditEvents: number;
  ledgerBlocks: number;
  durationMs: number;
}

/**
 * High performance RFC 4180 CSV parser
 */
function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  return rows;
}

function safeJSON<T>(val: string | undefined, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

function mapUserRole(r: string): UserRole {
  const lower = (r || '').toLowerCase();
  if (lower.includes('investigat')) return 'investigating_officer';
  if (lower.includes('station house') || lower.includes('sho') || lower.includes('supervisor')) return 'supervisor';
  if (lower.includes('forensic')) return 'forensic_officer';
  if (lower.includes('prosecut')) return 'prosecutor';
  if (lower.includes('judge') || lower.includes('magistrate')) return 'judge';
  if (lower.includes('clerk') || lower.includes('audit')) return 'auditor';
  if (lower.includes('admin')) return 'admin';
  return 'investigating_officer';
}

function mapDocumentCategory(c: string): DocumentCategory {
  const lower = (c || '').toLowerCase();
  if (lower.includes('fir')) return 'FIR';
  if (lower.includes('seizure') || lower.includes('memo') || lower.includes('panchnama')) return 'Evidence Record';
  if (lower.includes('medical') || lower.includes('forensic') || lower.includes('postmortem')) return 'Forensic Report';
  if (lower.includes('statement')) return 'Witness Statement';
  if (lower.includes('charge')) return 'Charge Sheet';
  if (lower.includes('court') || lower.includes('bail') || lower.includes('remand')) return 'Court Filing';
  if (lower.includes('judgment') || lower.includes('order')) return 'Judgment';
  return 'Police Report';
}

function mapEvidenceType(t: string): EvidenceType {
  const lower = (t || '').toLowerCase();
  if (lower.includes('phone') || lower.includes('device') || lower.includes('laptop')) return 'Electronic Device';
  if (lower.includes('harddrive') || lower.includes('digital')) return 'Digital';
  if (lower.includes('blood') || lower.includes('dna') || lower.includes('biological')) return 'Biological / Forensic';
  if (lower.includes('weapon') || lower.includes('firearm') || lower.includes('knife')) return 'Physical Weapon';
  if (lower.includes('paper') || lower.includes('document')) return 'Documentary';
  if (lower.includes('ballistic')) return 'Ballistic';
  if (lower.includes('narcotic') || lower.includes('chemical')) return 'Narcotic / Chemical';
  return 'Digital';
}

function mapCustodyEventType(e: string): CustodyEvent['eventType'] {
  const lower = (e || '').toLowerCase();
  if (lower.includes('seizure')) return 'COLLECTION';
  if (lower.includes('malkhana') || lower.includes('transfer')) return 'TRANSFER';
  if (lower.includes('lab')) return 'LAB_ANALYSIS';
  if (lower.includes('court')) return 'COURT_SUBMISSION';
  if (lower.includes('locker') || lower.includes('storage')) return 'LOCKER_STORAGE';
  return 'TRANSFER';
}

/**
 * Locates the CSV directory across standard locations
 */
export function findCSVDirectory(): string | null {
  const candidates = [
    process.env.CSV_DATASET_DIR,
    path.resolve(process.cwd(), '..', '..', '..', 'csv'),
    path.resolve(process.cwd(), '..', '..', 'csv'),
    path.resolve(process.cwd(), '..', 'csv'),
    path.resolve(process.cwd(), 'csv'),
    'C:\\Users\\hp\\OneDrive\\Desktop\\New folder (3)\\csv',
    'C:/Users/hp/OneDrive/Desktop/New folder (3)/csv'
  ].filter(Boolean) as string[];

  for (const dir of candidates) {
    if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'cases.csv'))) {
      return dir;
    }
  }
  return null;
}

/**
 * Loads and merges datasets from CSV directory into the database
 */
export async function loadDatasetsFromCSV(customDir?: string): Promise<CSVLoaderStats> {
  const t0 = Date.now();
  const csvDir = customDir || findCSVDirectory();

  if (!csvDir) {
    throw new Error('CSV datasets directory not found. Please verify the folder location.');
  }

  console.log(`[CSV-LOADER] Ingesting official datasets from: ${csvDir}`);

  // 1. Password credentials for imported officers
  const defaultPassword = 'NyayaSetu@2026!';
  const defaultSalt = CryptoService.generateSalt();
  const defaultPasswordHash = CryptoService.hashPassword(defaultPassword, defaultSalt);

  // 2. Ingest Users
  const userMap = new Map<string, User>();
  // Seed existing demo users into map
  db.users.forEach(u => userMap.set(u.id, u));

  const usersFile = path.join(csvDir, 'users.csv');
  if (fs.existsSync(usersFile)) {
    const rawUsers = parseCSV(fs.readFileSync(usersFile, 'utf-8'));
    for (let i = 1; i < rawUsers.length; i++) {
      const r = rawUsers[i];
      if (!r[0]) continue;
      if (!userMap.has(r[0])) {
        const u: User = {
          id: r[0],
          agencyId: r[4] || r[0],
          name: r[1],
          email: r[2],
          passwordHash: defaultPasswordHash,
          salt: defaultSalt,
          role: mapUserRole(r[3]),
          department: 'Crime & Special Investigation',
          organization: 'Delhi Police',
          badgeNumber: r[4],
          jurisdiction: r[5] || 'Delhi NCT',
          isActive: r[6] === 'true',
          mfaEnabled: r[7] === 'true',
          mfaSecret: '123456',
          failedLoginAttempts: 0,
          createdAt: r[8] || new Date().toISOString(),
          updatedAt: r[9] || new Date().toISOString()
        };
        db.users.push(u);
        userMap.set(u.id, u);
      }
    }
  }
  console.log(`[CSV-LOADER] Users active in database: ${db.users.length}`);

  // 3. Ingest Cases
  const caseMap = new Map<string, Case>();
  db.cases.forEach(c => caseMap.set(c.id, c));

  const casesFile = path.join(csvDir, 'cases.csv');
  if (fs.existsSync(casesFile)) {
    const rawCases = parseCSV(fs.readFileSync(casesFile, 'utf-8'));
    for (let i = 1; i < rawCases.length; i++) {
      const r = rawCases[i];
      if (!r[0]) continue;
      if (!caseMap.has(r[0])) {
        const c: Case = {
          id: r[0],
          caseNumber: r[1],
          title: r[2],
          type: r[3],
          jurisdiction: r[4],
          policeStation: r[5],
          department: r[6],
          status: (r[7] as CaseStatus) || 'Active Investigation',
          priority: (r[8] as CasePriority) || 'High',
          investigatingOfficerId: r[9],
          investigatingOfficerName: r[10],
          assignedTeam: safeJSON(r[11], [r[9]]),
          incidentDate: r[12],
          filingDate: r[13],
          courtName: r[14],
          judgeName: r[15],
          isLegalHold: r[16] === 'true',
          summary: r[17],
          district: r[18],
          state: r[19],
          firYear: parseInt(r[20], 10) || 2026,
          actsAndSections: safeJSON(r[21], [{ act: 'BNS, 2023', sections: '318(4), 336' }]),
          complainantName: r[22],
          complainantAddress: r[23],
          complainantPhone: r[24],
          createdAt: r[25] || new Date().toISOString(),
          updatedAt: r[26] || new Date().toISOString()
        };
        db.cases.push(c);
        caseMap.set(c.id, c);
      }
    }
  }
  console.log(`[CSV-LOADER] Cases active in database: ${db.cases.length}`);

  // 4. Ingest Document Versions
  const docVersionMap = new Map<string, DocumentVersion[]>();
  db.document_versions.forEach(v => {
    if (!docVersionMap.has(v.documentId)) docVersionMap.set(v.documentId, []);
    docVersionMap.get(v.documentId)!.push(v);
  });

  const versionsFile = path.join(csvDir, 'document_versions.csv');
  const existingVersionIds = new Set(db.document_versions.map(v => v.id));
  if (fs.existsSync(versionsFile)) {
    const rawVersions = parseCSV(fs.readFileSync(versionsFile, 'utf-8'));
    for (let i = 1; i < rawVersions.length; i++) {
      const r = rawVersions[i];
      if (!r[0]) continue;
      if (!existingVersionIds.has(r[0])) {
        const ver: DocumentVersion = {
          id: r[0],
          documentId: r[1],
          versionNumber: parseInt(r[2], 10) || 1,
          fileName: r[3],
          storedFileName: `${r[0]}.pdf`,
          fileSizeBytes: parseInt(r[4], 10) || 1024,
          mimeType: r[5] || 'application/pdf',
          sha256Hash: r[6],
          changeSummary: r[7] || 'Filed & Verified in Docket',
          uploadedBy: r[8],
          uploaderName: r[9] || 'Investigating Officer',
          uploaderRole: 'investigating_officer',
          isEncrypted: false,
          malwareScanStatus: 'CLEAN',
          createdAt: r[10] || new Date().toISOString(),
          ledgerBlockId: r[12]
        };
        db.document_versions.push(ver);
        existingVersionIds.add(ver.id);
        if (!docVersionMap.has(ver.documentId)) docVersionMap.set(ver.documentId, []);
        docVersionMap.get(ver.documentId)!.push(ver);
      }
    }
  }
  console.log(`[CSV-LOADER] Document versions active in database: ${db.document_versions.length}`);

  // 5. Ingest Documents
  const existingDocIds = new Set(db.documents.map(d => d.id));
  const docsFile = path.join(csvDir, 'documents.csv');
  if (fs.existsSync(docsFile)) {
    const rawDocs = parseCSV(fs.readFileSync(docsFile, 'utf-8'));
    for (let i = 1; i < rawDocs.length; i++) {
      const r = rawDocs[i];
      if (!r[0]) continue;
      if (!existingDocIds.has(r[0])) {
        const caseObj = caseMap.get(r[1]);
        const vers = docVersionMap.get(r[0]) || [];
        const latestVer = vers[vers.length - 1];

        const doc: Document = {
          id: r[0],
          documentNumber: r[0],
          caseId: r[1],
          caseNumber: caseObj ? caseObj.caseNumber : r[1],
          title: r[2],
          category: mapDocumentCategory(r[3]),
          description: r[2],
          authorId: latestVer ? latestVer.uploadedBy : (caseObj ? caseObj.investigatingOfficerId : 'USR-00001'),
          authorName: latestVer ? latestVer.uploaderName : (caseObj ? caseObj.investigatingOfficerName : 'Officer'),
          department: caseObj ? caseObj.department : 'Crime Investigation',
          confidentiality: (r[4] as ConfidentialityLevel) || 'Confidential',
          currentVersionNumber: parseInt(r[5], 10) || 1,
          reviewStatus: 'Approved',
          isLegalHold: caseObj ? caseObj.isLegalHold : false,
          isDeleted: r[9] === 'true',
          retentionUntil: '2045-12-31T23:59:59Z',
          tags: safeJSON(r[8], []),
          createdAt: r[10] || new Date().toISOString(),
          updatedAt: r[11] || new Date().toISOString()
        };
        db.documents.push(doc);
        existingDocIds.add(doc.id);
      }
    }
  }
  console.log(`[CSV-LOADER] Documents active in database: ${db.documents.length}`);

  // 6. Ingest Evidence Items
  const existingEvidenceIds = new Set(db.evidence_items.map(e => e.id));
  const evFile = path.join(csvDir, 'evidence_items.csv');
  if (fs.existsSync(evFile)) {
    const rawEv = parseCSV(fs.readFileSync(evFile, 'utf-8'));
    for (let i = 1; i < rawEv.length; i++) {
      const r = rawEv[i];
      if (!r[0]) continue;
      if (!existingEvidenceIds.has(r[0])) {
        const caseObj = caseMap.get(r[1]);
        const ev: EvidenceItem = {
          id: r[0],
          evidenceNumber: r[2] || r[0],
          caseId: r[1],
          caseNumber: caseObj ? caseObj.caseNumber : r[1],
          description: r[3],
          type: mapEvidenceType(r[4]),
          collectionLocation: r[6],
          collectionTimestamp: r[5] || new Date().toISOString(),
          collectorId: r[7],
          collectorName: userMap.get(r[7])?.name || 'Investigating Officer',
          storageLocker: `${r[9]} (${r[10]})`,
          currentCustodian: userMap.get(r[8])?.name || 'Evidence Malkhana Custodian',
          currentCustodianRole: 'Forensic Custodian',
          handlingNotes: `Barcode: ${r[11]} | Security Seal: ${r[12]} | Operational Status: ${r[13]}`,
          sha256Hash: crypto.createHash('sha256').update((r[11] || '') + (r[12] || '')).digest('hex'),
          linkedDocumentIds: [],
          isLocked: false,
          createdAt: r[5] || new Date().toISOString(),
          updatedAt: r[5] || new Date().toISOString()
        };
        db.evidence_items.push(ev);
        existingEvidenceIds.add(ev.id);
      }
    }
  }
  console.log(`[CSV-LOADER] Evidence items active in database: ${db.evidence_items.length}`);

  // 7. Ingest Custody Events
  const existingCustodyIds = new Set(db.custody_events.map(c => c.id));
  const custodyFile = path.join(csvDir, 'custody_events.csv');
  if (fs.existsSync(custodyFile)) {
    const rawCustody = parseCSV(fs.readFileSync(custodyFile, 'utf-8'));
    for (let i = 1; i < rawCustody.length; i++) {
      const r = rawCustody[i];
      if (!r[0]) continue;
      if (!existingCustodyIds.has(r[0])) {
        const cust: CustodyEvent = {
          id: r[0],
          evidenceId: r[1],
          eventType: mapCustodyEventType(r[3]),
          actorId: r[5],
          actorName: r[9] || userMap.get(r[5])?.name || 'Custodian',
          actorRole: 'investigating_officer',
          fromCustodian: userMap.get(r[5])?.name || r[5],
          toCustodian: userMap.get(r[6])?.name || r[6],
          location: 'Central Malkhana / Forensic Repository',
          timestamp: r[4] || new Date().toISOString(),
          reason: r[7] || 'Custody transfer',
          notes: `Seal Verified: ${r[8]} | Officer: ${r[9]}`,
          acknowledgedByDestination: true,
          acknowledgedAt: r[4] || new Date().toISOString(),
          hashProof: r[10] || 'VERIFIED-MERKLE-BLOCK',
          ledgerBlockId: r[10]
        };
        db.custody_events.push(cust);
        existingCustodyIds.add(cust.id);
      }
    }
  }
  console.log(`[CSV-LOADER] Custody events active in database: ${db.custody_events.length}`);

  // 8. Ingest Persons
  const existingPersonIds = new Set(db.persons.map(p => p.id));
  const personsFile = path.join(csvDir, 'persons.csv');
  if (fs.existsSync(personsFile)) {
    const rawPersons = parseCSV(fs.readFileSync(personsFile, 'utf-8'));
    for (let i = 1; i < rawPersons.length; i++) {
      const r = rawPersons[i];
      if (!r[0]) continue;
      if (!existingPersonIds.has(r[0])) {
        const linkedCaseIds = safeJSON<string[]>(r[9], []);
        const linkedCases = linkedCaseIds.map(cid => {
          const c = caseMap.get(cid);
          return {
            caseId: cid,
            caseNumber: c ? c.caseNumber : cid,
            role: (r[10] || 'Suspect') as any,
            sectionCharges: c && c.actsAndSections && c.actsAndSections[0] 
              ? `${c.actsAndSections[0].act} Sec ${c.actsAndSections[0].sections}` 
              : 'BNS 2023 Sec 318(4)',
            status: c ? c.status : 'Active Investigation'
          };
        });

        const p: PersonRecord = {
          id: r[0],
          cpid: r[1],
          fullName: r[2],
          aliases: safeJSON(r[3], []),
          fatherOrSpouseName: 'Guardian Not Specified',
          gender: (r[4] as any) || 'Other',
          dobOrAge: r[5] || '32 Years',
          nationality: r[6] || 'Indian',
          primaryPhone: safeJSON<string[]>(r[8], [''])[0] || '',
          identificationMarks: ['Identity Verified via CCTNS'],
          biometrics: {
            afisStatus: 'VERIFIED',
            irisEnrolled: true,
            dnaReferenceId: r[7] || undefined
          },
          address: 'Delhi Metropolitan Area',
          policeStation: 'Cyber Crime Police Station',
          district: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
          riskRating: r[11] === 'Medium' ? 'Moderate' : ((r[11] as any) || 'Moderate'),
          primaryCrimeType: r[10] || 'Under Investigation',
          gangOrSyndicateAffiliation: 'Syndicate Profile Attached',
          previousConvictionsCount: 1,
          linkedCases,
          isVerifiedProfile: true,
          verificationAuthority: 'Delhi Police CCTNS Network',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        db.persons.push(p);
        existingPersonIds.add(p.id);
      }
    }
  }
  console.log(`[CSV-LOADER] Persons active in database: ${db.persons.length}`);

  // 9. Ingest Audit Events
  const existingAuditIds = new Set(db.audit_events.map(a => a.id));
  const auditFile = path.join(csvDir, 'audit_events.csv');
  if (fs.existsSync(auditFile)) {
    const rawAudit = parseCSV(fs.readFileSync(auditFile, 'utf-8'));
    for (let i = 1; i < rawAudit.length; i++) {
      const r = rawAudit[i];
      if (!r[0]) continue;
      if (!existingAuditIds.has(r[0])) {
        const aud: AuditEvent = {
          id: r[0],
          timestamp: r[1] || new Date().toISOString(),
          actorId: r[2] || 'SYSTEM',
          actorName: r[3] || 'Investigating Officer',
          actorRole: mapUserRole(r[4]),
          organization: 'Delhi Police',
          department: 'Crime Branch',
          action: r[5] || 'OPERATION',
          resourceType: (r[6] as any) || 'CASE',
          resourceId: r[7] || '',
          resourceName: `${r[6] || 'ENTITY'}: ${r[7] || ''}`,
          details: `${r[5]} on ${r[6]} ${r[7]} for case docket ${r[8]}`,
          outcome: r[10] === 'SUCCESS' ? 'SUCCESS' : 'FAILURE',
          ipAddress: r[9] || '127.0.0.1',
          integrityHash: r[12] || crypto.randomBytes(32).toString('hex')
        };
        db.audit_events.push(aud);
        existingAuditIds.add(aud.id);
      }
    }
  }
  console.log(`[CSV-LOADER] Audit events active in database: ${db.audit_events.length}`);

  // 10. Ingest Ledger Blocks
  const existingBlockIndices = new Set(db.ledger_blocks.map(b => b.blockIndex));
  const ledgerFile = path.join(csvDir, 'ledger_blocks.csv');
  if (fs.existsSync(ledgerFile)) {
    const rawLedger = parseCSV(fs.readFileSync(ledgerFile, 'utf-8'));
    for (let i = 1; i < rawLedger.length; i++) {
      const r = rawLedger[i];
      if (!r[0]) continue;
      const blockIdx = parseInt(r[1], 10) || 0;
      if (!existingBlockIndices.has(blockIdx)) {
        const blk: LedgerBlock = {
          blockIndex: blockIdx,
          previousHash: r[6],
          timestamp: r[2] || new Date().toISOString(),
          eventType: r[3] || 'EVIDENTIARY_LOG',
          resourceType: 'ENTITY',
          resourceId: r[4],
          resourceHash: r[5],
          actorId: 'SYSTEM-CRYPTO-ENGINE',
          actorName: 'NyayaSetu Cryptographic Ledger Engine',
          payload: { entityId: r[4], payloadHash: r[5] },
          merkleRoot: r[8],
          blockHash: r[7]
        };
        db.ledger_blocks.push(blk);
        existingBlockIndices.add(blockIdx);
      }
    }
    // Sort ledger blocks strictly by blockIndex
    db.ledger_blocks.sort((a, b) => a.blockIndex - b.blockIndex);
  }
  console.log(`[CSV-LOADER] Ledger blocks active in database: ${db.ledger_blocks.length}`);

  // Persist to disk
  console.log('[CSV-LOADER] Persisting integrated database to storage...');
  db.save();

  const durationMs = Date.now() - t0;
  console.log(`[CSV-LOADER] Successfully completed in ${durationMs}ms`);

  return {
    users: db.users.length,
    cases: db.cases.length,
    documents: db.documents.length,
    documentVersions: db.document_versions.length,
    evidenceItems: db.evidence_items.length,
    custodyEvents: db.custody_events.length,
    persons: db.persons.length,
    auditEvents: db.audit_events.length,
    ledgerBlocks: db.ledger_blocks.length,
    durationMs
  };
}
