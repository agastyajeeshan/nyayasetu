import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { PostgresService } from '../db/postgres.js';
import { DocumentRepository } from '../repositories/documentRepository.js';
import { AuthService } from '../services/authService.js';
import { CryptoService } from '../services/cryptoService.js';
import { LedgerService } from '../services/ledgerService.js';
import { StorageService } from '../services/storageService.js';
import { CaseService } from '../services/caseService.js';
import { DocumentService } from '../services/documentService.js';
import { EvidenceService } from '../services/evidenceService.js';
import { ReviewService } from '../services/reviewService.js';
import { ShareService } from '../services/shareService.js';

describe('NyayaSetu End-to-End Security & Functional Test Suite (PostgreSQL Persistence)', () => {
  before(async () => {
    const conn = await PostgresService.testConnection();
    assert.strictEqual(conn.connected, true, 'PostgreSQL connection must be active for tests');
    await PostgresService.initializeSchema();
  });

  // 1. Authentication & Security Tests
  describe('1. Authentication & Identity Management', () => {
    test('Successful authentication for authorized Investigating Officer with Officer ID & Password', async () => {
      // 1. Direct login with Officer ID and password
      const result = await AuthService.login('USR-IO-01', 'NyayaSetu@2026!', '127.0.0.1');
      assert.ok(result.auth, 'Direct login with Officer ID must return auth token');
      assert.strictEqual(result.auth?.user.role, 'investigating_officer');

      // 2. MFA Challenge mode
      const mfaChallenge = await AuthService.login('USR-IO-01', 'NyayaSetu@2026!', '127.0.0.1', true);
      assert.ok(mfaChallenge.requiresMfa && mfaChallenge.mfaChallengeToken, 'MFA challenge mode must issue challenge token');
      const mfaResult = await AuthService.verifyMfa(mfaChallenge.mfaChallengeToken!, '123456');
      assert.ok(mfaResult.auth?.accessToken, 'Valid MFA verification should return JWT token');
      assert.strictEqual(mfaResult.auth?.user.role, 'investigating_officer');
    });

    test('Rejection of invalid password with non-sensitive error', async () => {
      const result = await AuthService.login('io.verma@delhipolice.gov.in', 'WrongPassword123!', '127.0.0.1');
      assert.ok(result.error, 'Error message must be returned');
      assert.ok(!result.auth, 'No token should be issued');
    });

    test('Password verification rejects plaintext comparison and utilizes PBKDF2 salt matching', () => {
      const salt = CryptoService.generateSalt();
      const hash = CryptoService.hashPassword('SuperSecret@2026', salt);
      assert.ok(CryptoService.verifyPassword('SuperSecret@2026', salt, hash), 'Valid password must verify');
      assert.ok(!CryptoService.verifyPassword('SuperSecret@2025', salt, hash), 'Tampered password must fail');
    });
  });

  // 2. Cryptographic Ledger & Hash Chain Tests
  describe('2. Merkle Ledger & Cryptographic Integrity', () => {
    test('Ledger verifies all blocks from genesis to tip in PostgreSQL', async () => {
      const verify = await LedgerService.verifyLedgerIntegrity();
      assert.strictEqual(verify.isValid, true, 'Clean ledger must pass cryptographic verification');
      assert.ok(verify.totalBlocks >= 3, 'Ledger must have seeded blocks');
    });

    test('Merkle Root computation produces consistent deterministic digests', () => {
      const h1 = CryptoService.sha256('DataLeaf1');
      const h2 = CryptoService.sha256('DataLeaf2');
      const root1 = CryptoService.computeMerkleRoot([h1, h2]);
      const root2 = CryptoService.computeMerkleRoot([h1, h2]);
      assert.strictEqual(root1, root2, 'Merkle roots must be strictly deterministic');
    });

    test('Tamper simulation on ledger is immediately detected', async () => {
      const verifyInitial = await LedgerService.verifyLedgerIntegrity();
      assert.strictEqual(verifyInitial.isValid, true);

      // Tamper block #1
      await LedgerService.simulateTamper(1, { rogueModification: 'UNAUTHORIZED_DATA_INJECTED' });
      const verifyTampered = await LedgerService.verifyLedgerIntegrity();
      assert.strictEqual(verifyTampered.isValid, false, 'Tampered ledger MUST fail verification');
      assert.strictEqual(verifyTampered.brokenBlockIndex, 1, 'Tamper index must isolate to block 1');

      // Repair
      await LedgerService.repairLedger();
      const verifyRepaired = await LedgerService.verifyLedgerIntegrity();
      assert.strictEqual(verifyRepaired.isValid, true, 'Repaired ledger must pass verification');
    });
  });

  // 3. Document Management & Versioning Immutability
  describe('3. Document Versioning & Tamper Detection', () => {
    let testDocId: string;

    test('Upload document creates Version 1 with computed SHA-256 hash in PostgreSQL', async () => {
      const testContent = Buffer.from('TEST INVESTIGATION MEMORANDUM: Incident verification at CP', 'utf-8');
      const doc = await DocumentService.createDocument({
        caseId: 'CAS-2026-001',
        title: 'Test Incident Verification Memo',
        category: 'Police Report',
        description: 'Test report for versioning verification',
        confidentiality: 'Confidential',
        fileBuffer: testContent,
        originalFileName: 'Incident_Memo_v1.pdf',
        mimeType: 'application/pdf',
        actorId: 'USR-IO-01',
        actorName: 'Inspector Rajesh Verma',
        actorRole: 'investigating_officer',
        actorDepartment: 'Crime Branch Special Cell',
        ipAddress: '127.0.0.1'
      });

      assert.ok(doc.id, 'Document ID must be generated');
      assert.strictEqual(doc.currentVersionNumber, 1);
      testDocId = doc.id;

      const integrity = await DocumentService.verifyDocumentIntegrity(doc.id, 1);
      assert.strictEqual(integrity.matches, true, 'Stored binary must match SHA-256 hash');
      assert.strictEqual(integrity.computedHash, CryptoService.sha256(testContent));
    });

    test('Uploading updated file creates Version 2 without overwriting Version 1', async () => {
      const v2Content = Buffer.from('TEST INVESTIGATION MEMORANDUM: Additional witness deposed at CP (V2)', 'utf-8');
      const v2 = await DocumentService.uploadNewVersion({
        documentId: testDocId,
        changeSummary: 'Added witness deposition details',
        fileBuffer: v2Content,
        originalFileName: 'Incident_Memo_v2.pdf',
        mimeType: 'application/pdf',
        actorId: 'USR-IO-01',
        actorName: 'Inspector Rajesh Verma',
        actorRole: 'investigating_officer',
        actorDepartment: 'Crime Branch Special Cell',
        ipAddress: '127.0.0.1'
      });

      assert.strictEqual(v2.versionNumber, 2);

      // Verify both v1 and v2 exist independently in PostgreSQL and storage
      const detail = await DocumentService.getDocumentDetail(testDocId);
      assert.ok(detail);
      assert.strictEqual(detail.versions.length, 2);
      assert.strictEqual(detail.document.currentVersionNumber, 2);

      const checkV1 = await DocumentService.verifyDocumentIntegrity(testDocId, 1);
      const checkV2 = await DocumentService.verifyDocumentIntegrity(testDocId, 2);
      assert.strictEqual(checkV1.matches, true, 'Version 1 binary must remain untouched and valid');
      assert.strictEqual(checkV2.matches, true, 'Version 2 binary must be valid');
      assert.notStrictEqual(checkV1.computedHash, checkV2.computedHash, 'Version 1 and Version 2 hashes must differ');
    });

    test('Binary tampering on storage file fails integrity verification immediately', async () => {
      const versions = await DocumentRepository.findVersionsByDocId(testDocId);
      const v1 = versions.find(v => v.versionNumber === 1);
      assert.ok(v1);

      // Simulate byte corruption
      await StorageService.simulateBinaryTamper(v1.storedFileName);

      const tamperedCheck = await DocumentService.verifyDocumentIntegrity(testDocId, 1);
      assert.strictEqual(tamperedCheck.matches, false, 'Tampered file on disk MUST fail integrity check');
    });
  });

  // 4. Evidence Management & Chain of Custody
  describe('4. Forensic Evidence & Immutable Chain of Custody', () => {
    let testEvId: string;

    test('Creates evidence item with initial collection custody record in PostgreSQL', async () => {
      const ev = await EvidenceService.createEvidence({
        caseId: 'CAS-2026-001',
        type: 'Digital',
        description: 'Seized Encrypted USB Drive containing shell scripts',
        collectionLocation: 'Cyber Cafe Connaught Place',
        collectionTimestamp: new Date().toISOString(),
        storageLocker: 'Special Cell Digital Evidence Vault',
        handlingNotes: 'Bagged in anti-static Faraday pouch #FAR-902',
        rawSampleOrDigest: 'RAW_DIGEST_USB_DRIVE_001',
        actorId: 'USR-IO-01',
        actorName: 'Inspector Rajesh Verma',
        actorRole: 'investigating_officer',
        actorDepartment: 'Crime Branch Special Cell',
        ipAddress: '127.0.0.1'
      });

      assert.ok(ev.id);
      testEvId = ev.id;

      const detail = await EvidenceService.getEvidenceDetail(ev.id);
      assert.ok(detail);
      assert.strictEqual(detail.custodyHistory.length, 1);
      assert.strictEqual(detail.custodyHistory[0].eventType, 'COLLECTION');
    });

    test('Transfer of custody appends immutable event without modifying past history in PostgreSQL', async () => {
      const transferEvent = await EvidenceService.transferCustody({
        evidenceId: testEvId,
        toCustodian: 'Dr. Ramesh Rao (CFSL Cyber Lab)',
        toLocation: 'CFSL Digital Forensics Lab Station 2',
        reason: 'Bit-stream forensic acquisition & memory extraction',
        notes: 'Handed over in sealed condition',
        actorId: 'USR-IO-01',
        actorName: 'Inspector Rajesh Verma',
        actorRole: 'investigating_officer',
        actorDepartment: 'Crime Branch Special Cell',
        ipAddress: '127.0.0.1'
      });

      assert.ok(transferEvent.id);
      assert.strictEqual(transferEvent.eventType, 'TRANSFER');

      const detail = await EvidenceService.getEvidenceDetail(testEvId);
      assert.ok(detail);
      assert.strictEqual(detail.custodyHistory.length, 2, 'Must have exactly 2 chronological events');
      assert.strictEqual(detail.evidence.currentCustodian, 'Dr. Ramesh Rao (CFSL Cyber Lab)');
    });
  });

  // 5. Digital Signatures & Cryptographic Binding
  describe('5. Digital Signature & Verification Protocol', () => {
    test('Digitally signs document version and validates cryptographic authenticity in PostgreSQL', async () => {
      const signature = await ReviewService.signDocument({
        documentId: 'DOC-2026-001',
        versionNumber: 1,
        actorId: 'USR-SUP-01',
        actorName: 'ACP Sunita Mehta',
        actorRole: 'supervisor',
        actorAgencyId: 'DEL-ACP-108',
        actorDepartment: 'Crime Branch Special Cell',
        ipAddress: '127.0.0.1'
      });

      assert.ok(signature.id);
      assert.strictEqual(signature.versionNumber, 1);

      const verification = await ReviewService.verifySignature(signature.id);
      assert.strictEqual(verification.isValid, true, 'Digital signature must cryptographically verify');
      assert.strictEqual(verification.isVersionCurrent, true);
    });
  });

  // 6. Controlled Expiring Sharing & Revocation
  describe('6. Controlled Collaboration & Expiring Sharing', () => {
    let testShareId: string;
    let testToken: string;

    test('Creates expiring share link with watermark and access constraints in PostgreSQL', async () => {
      const share = await ShareService.createShare({
        documentId: 'DOC-2026-001',
        recipientEmail: 'prosecutor.sharma@delhi.gov.in',
        recipientName: 'Adv. Arvind Sharma',
        recipientOrg: 'Directorate of Prosecution',
        permission: 'VIEW_ONLY',
        expiresInHours: 24,
        purpose: 'Charge sheet drafting review',
        actorId: 'USR-IO-01',
        actorName: 'Inspector Rajesh Verma',
        actorRole: 'investigating_officer',
        actorDepartment: 'Crime Branch Special Cell',
        ipAddress: '127.0.0.1'
      });

      assert.ok(share.id);
      assert.ok(share.shareToken);
      testShareId = share.id;
      testToken = share.shareToken;

      const access = await ShareService.accessSharedResource(testToken);
      assert.strictEqual(access.success, true, 'Valid share link must grant access');
      assert.ok(access.resource);
    });

    test('Instant revocation immediately denies subsequent access attempts in PostgreSQL', async () => {
      await ShareService.revokeShare(testShareId, {
        id: 'USR-IO-01',
        name: 'Inspector Rajesh Verma',
        role: 'investigating_officer',
        ip: '127.0.0.1'
      });

      const access = await ShareService.accessSharedResource(testToken);
      assert.strictEqual(access.success, false, 'Revoked share link MUST deny access');
      assert.ok(access.error?.includes('revoked'));
    });
  });

  // 7. Legal Hold Protection
  describe('7. Legal Hold & Deletion Safeguards', () => {
    test('Legal hold prevents soft-deletion of critical case documents in PostgreSQL', async () => {
      const doc = (await DocumentRepository.findById('DOC-2026-001')) || (await DocumentRepository.findByDocNumber('DOC-2026-001'));
      assert.ok(doc);
      assert.strictEqual(doc.isLegalHold, true);

      await assert.rejects(async () => {
        await DocumentService.softDeleteDocument(doc.id, {
          id: 'USR-IO-01',
          name: 'Inspector Rajesh Verma',
          role: 'investigating_officer',
          ip: '127.0.0.1'
        });
      }, /LEGAL HOLD/, 'Deleting a document under Legal Hold must be blocked');
    });
  });
});
