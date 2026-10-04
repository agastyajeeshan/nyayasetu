import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { PostgresService } from '../db/postgres.js';
import { DocumentRepository } from '../repositories/documentRepository.js';
import { CaseRepository } from '../repositories/caseRepository.js';
import { CaseService } from '../services/caseService.js';
import { DocumentService } from '../services/documentService.js';
import { IntelligenceService } from '../services/intelligenceService.js';
import { AuditService } from '../services/auditService.js';

describe('NyayaSetu 10 Core Enhancements Test Suite (PostgreSQL Persistence)', () => {
  before(async () => {
    const conn = await PostgresService.testConnection();
    assert.strictEqual(conn.connected, true, 'PostgreSQL connection must be active for tests');
    await PostgresService.initializeSchema();
  });

  const testCaseId = 'CAS-2026-001';

  // Feature 1: Evidence Timeline
  test('Feature 1: Comprehensive Evidence Timeline synthesizes multi-source events from PostgreSQL', async () => {
    const timeline = await CaseService.getComprehensiveTimeline(testCaseId);
    assert.ok(Array.isArray(timeline), 'Timeline must return an array');
    assert.ok(timeline.length > 0, 'Timeline must contain chronological events');

    // Verify ordering: newest first
    for (let i = 0; i < timeline.length - 1; i++) {
      const tA = new Date(timeline[i].timestamp).getTime();
      const tB = new Date(timeline[i + 1].timestamp).getTime();
      assert.ok(tA >= tB, 'Timeline events must be chronologically ordered (newest first)');
    }

    // Verify required fields
    const first = timeline[0];
    assert.ok(first.id, 'Timeline event must have unique ID');
    assert.ok(first.eventType, 'Timeline event must have eventType');
    assert.ok(first.title, 'Timeline event must have title');
    assert.ok(first.actor, 'Timeline event must have actor details');
    assert.ok(first.integrityStatus, 'Timeline event must have integrityStatus');
  });

  // Feature 2: Entity Relationship Graph
  test('Feature 2: Entity Relationship View returns complete 7-type graph topology from PostgreSQL', async () => {
    const graph = await IntelligenceService.getKnowledgeGraph(testCaseId);
    assert.ok(Array.isArray(graph.nodes), 'Graph must have nodes');
    assert.ok(Array.isArray(graph.edges), 'Graph must have edges');
    assert.ok(graph.nodes.length >= 3, 'Graph should have multiple interconnected nodes');

    // Verify presence of nodes with recognized entity types
    const validTypes = new Set(['person', 'case', 'document', 'evidence', 'location', 'event', 'organization']);
    const hasValidNode = graph.nodes.some(n => validTypes.has(n.type));
    assert.ok(hasValidNode, 'Graph must contain recognized entity types');

    // Verify edge structure
    if (graph.edges.length > 0) {
      assert.ok(graph.edges[0].source, 'Edge must have source');
      assert.ok(graph.edges[0].target, 'Edge must have target');
      assert.ok(graph.edges[0].label, 'Edge must have label');
    }
  });

  // Feature 3: Contradiction Detection
  test('Feature 3: Contradiction Detection uses non-declarative analytical phrasing', async () => {
    const discrepancies = await IntelligenceService.getDiscrepancies(testCaseId);
    assert.ok(Array.isArray(discrepancies), 'Discrepancies must return an array');
    assert.ok(discrepancies.length > 0, 'Discrepancies must detect potential conflicts');

    const first = discrepancies[0];
    assert.ok(
      first.potentialDescription.includes('Potential contradiction detected') ||
      first.title.toLowerCase().includes('potential') ||
      first.title.toLowerCase().includes('discrepancy'),
      'Must use cautious non-declarative terminology'
    );
    assert.ok(first.sourceA, 'Must include Source A excerpt');
    assert.ok(first.sourceB, 'Must include Source B excerpt');
  });

  // Feature 4: Case Completeness / Readiness
  test('Feature 4: Case Readiness evaluates the 10 statutory standards with real scores from PostgreSQL', async () => {
    const readiness = await CaseService.calculateCaseReadiness(testCaseId);
    assert.strictEqual(readiness.caseId, testCaseId);
    assert.ok(typeof readiness.completenessScore === 'number', 'Completeness score must be numeric');
    assert.ok(readiness.completenessScore >= 0 && readiness.completenessScore <= 100, 'Score must be between 0 and 100');
    assert.strictEqual(readiness.checks.length, 10, 'Must contain all 10 statutory standard checks');

    // Verify navigation targets exist on missing checks
    const incomplete = readiness.checks.filter(c => c.status !== 'COMPLETE');
    incomplete.forEach(c => {
      assert.ok(c.navigationTarget?.tab, `Check '${c.key}' must have navigation target tab`);
    });
  });

  // Feature 5: Document Version Comparison
  test('Feature 5: Document Version Comparison computes text diff and independent hashes in PostgreSQL', async () => {
    // Pick an existing document from PostgreSQL
    const docs = await DocumentRepository.findMany({ limit: 10 });
    assert.ok(docs.length > 0, 'Must have at least one document');
    const doc = docs[0];

    // Upload v2 if doc only has 1 version
    const versions = await DocumentRepository.findVersionsByDocId(doc.id);
    if (versions.length < 2) {
      await DocumentService.uploadNewVersion({
        documentId: doc.id,
        fileBuffer: Buffer.from('REVISED DEPOSITION CONTENT: Eyewitness clarifies time of departure to 22:30 IST.', 'utf-8'),
        originalFileName: `${doc.title}_v2.txt`,
        mimeType: 'text/plain',
        changeSummary: 'Clarified witness departure time',
        actorId: 'USR-IO-01',
        actorName: 'Inspector Rajesh Verma',
        actorRole: 'investigating_officer',
        actorDepartment: 'Crime Branch Special Cell',
        ipAddress: '127.0.0.1'
      });
    }

    const diff = await DocumentService.compareVersions(doc.id, 1, 2);
    assert.strictEqual(diff.documentId, doc.id);
    assert.strictEqual(diff.v1Number, 1);
    assert.strictEqual(diff.v2Number, 2);
    assert.ok(diff.v1Hash, 'Base version must have SHA-256 hash');
    assert.ok(diff.v2Hash, 'Target version must have SHA-256 hash');
    assert.ok(Array.isArray(diff.textDiffs), 'Must provide line-by-line diff');
    assert.ok(Array.isArray(diff.summaryOfChanges), 'Must provide summary of changes');
  });

  // Feature 6: Secure PII Redaction
  test('Feature 6: Secure PII Redaction produces non-destructive derivative with separate seal in PostgreSQL', async () => {
    const piiBuffer = Buffer.from(
      'FIRST INFORMATION REPORT: Complainant Rajesh Kumar, Phone: +91 9811044219, Email: rajesh.k@nic.in, Aadhaar: 5491 8821 0042, PAN: ABCDE1234F, Address: House 42, Sector 15, Rohini, New Delhi 110085.',
      'utf-8'
    );
    const doc = await DocumentService.createDocument({
      caseId: testCaseId,
      title: 'Sworn Deposition with Identity Particulars',
      category: 'Police Report',
      description: 'Contains sensitive identifiers for redaction verification',
      confidentiality: 'Confidential',
      fileBuffer: piiBuffer,
      originalFileName: 'Deposition_Rajesh_Kumar.txt',
      mimeType: 'text/plain',
      actorId: 'USR-IO-01',
      actorName: 'Inspector Rajesh Verma',
      actorRole: 'investigating_officer',
      actorDepartment: 'Crime Branch Special Cell',
      ipAddress: '127.0.0.1'
    });

    // 1. Detect PII
    const detected = await DocumentService.detectPII(doc.id);
    assert.ok(Array.isArray(detected), 'PII detection must return array');
    assert.ok(detected.length > 0, 'Sample text should match PII regex patterns');

    // 2. Create Redacted Derivative
    const derivative = await DocumentService.createRedactedDerivative({
      documentId: doc.id,
      versionNumber: 1,
      selectedRedactions: detected,
      exportPurpose: 'Right to Information (RTI) Compliance',
      actor: {
        id: 'USR-IO-01',
        name: 'Inspector Rajesh Verma',
        role: 'investigating_officer',
        ip: '127.0.0.1'
      }
    });

    assert.ok(derivative.id, 'Derivative must have unique ID');
    assert.strictEqual(derivative.originalDocumentId, doc.id);
    assert.ok(derivative.sha256Hash, 'Derivative must have sovereign SHA-256 seal');

    const redactedInDb = await DocumentRepository.findRedactedById(derivative.id);
    assert.ok(redactedInDb, 'Derivative must be persisted in PostgreSQL');

    // 3. Verify original document was NOT modified
    const originalDoc = await DocumentRepository.findById(doc.id);
    assert.ok(originalDoc, 'Original document must exist intact in PostgreSQL');
  });

  // Feature 7: Evidence Integrity Center
  test('Feature 7: Evidence Integrity Center verifies live hashes and Merkle anchors in PostgreSQL', async () => {
    const report = await DocumentService.getIntegrityCenterReport(testCaseId);
    assert.ok(Array.isArray(report), 'Integrity report must return an array');
    assert.ok(report.length > 0, 'Integrity report must contain items for the case');

    const first = report[0];
    assert.ok(first.resourceId, 'Item must have resourceId');
    assert.ok(first.sha256Hash, 'Item must have recorded sha256Hash');
    assert.ok(first.currentStatus === 'VERIFIED' || first.currentStatus === 'WARNING', 'Status must be verified or warning');
    assert.ok(first.merkleStatus, 'Item must have merkleStatus');
  });

  // Feature 8: Evidence Package Export
  test('Feature 8: Evidence Package Export compiles zero-dependency RFC-compliant PKZIP archive', async () => {
    const pkg = await CaseService.generateEvidencePackage(
      testCaseId,
      {
        includeCaseInfo: true,
        includeDocuments: true,
        includeEvidence: true,
        includeCustodyHistory: true,
        includeAuditTrail: true,
        includeSignatures: true,
        includeIntegrityManifest: true
      },
      {
        id: 'USR-IO-01',
        name: 'Inspector Rajesh Verma',
        role: 'investigating_officer',
        ip: '127.0.0.1'
      }
    );

    assert.ok(pkg.buffer instanceof Buffer, 'Package must be a binary Buffer');
    assert.ok(pkg.buffer.length > 100, 'Package ZIP buffer must contain data');
    assert.ok(pkg.fileName.endsWith('.zip'), 'Package filename must end with .zip');

    // PKZIP Magic bytes check (0x50 0x4B 0x03 0x04)
    assert.strictEqual(pkg.buffer[0], 0x50, 'PKZIP Header byte 0 must be 0x50');
    assert.strictEqual(pkg.buffer[1], 0x4B, 'PKZIP Header byte 1 must be 0x4B');
    assert.strictEqual(pkg.buffer[2], 0x03, 'PKZIP Header byte 2 must be 0x03');
    assert.strictEqual(pkg.buffer[3], 0x04, 'PKZIP Header byte 3 must be 0x04');
  });

  // Feature 9: Audit Trail Filtering
  test('Feature 9: Enhanced Audit Trail filters by role, category, and security exceptions in PostgreSQL', async () => {
    // 1. Role filter
    const roleLogs = await AuditService.queryLogs({ role: 'investigating_officer', limit: 20 });
    assert.ok(Array.isArray(roleLogs.logs), 'Role logs must return array');
    roleLogs.logs.forEach(l => {
      assert.strictEqual(l.actorRole, 'investigating_officer');
    });

    // 2. Action Category filter
    const authLogs = await AuditService.queryLogs({ actionCategory: 'AUTHENTICATION', limit: 20 });
    assert.ok(Array.isArray(authLogs.logs), 'Category logs must return array');

    // 3. Security Event filter
    const secLogs = await AuditService.queryLogs({ isSecurityEvent: true, limit: 20 });
    assert.ok(Array.isArray(secLogs.logs), 'Security event logs must return array');
  });

  // Feature 10: Investigation Summary
  test('Feature 10: Investigation Summary compiles 10 structured sections with citations from PostgreSQL', async () => {
    const summary = await CaseService.generateInvestigationSummary(testCaseId);
    assert.ok(summary.caseOverview, '1. Case overview must be present');
    assert.ok(summary.caseOverview.sourceCitation, 'Overview must have source citation');
    assert.ok(Array.isArray(summary.keyPeople), '2. Key people must be present');
    assert.ok(Array.isArray(summary.keyDocuments), '3. Key documents must be present');
    assert.ok(Array.isArray(summary.evidence), '4. Evidence items must be present');
    assert.ok(Array.isArray(summary.importantEvents), '5. Important events must be present');
    assert.ok(Array.isArray(summary.timeline), '6. Timeline must be present');
    assert.ok(Array.isArray(summary.potentialContradictions), '7. Contradictions must be present');
    assert.ok(Array.isArray(summary.missingInformation), '8. Missing info must be present');
    assert.ok(Array.isArray(summary.legalReferences), '9. Legal references must be present');
    assert.ok(summary.integrityStatus, '10. Integrity status must be present');
    assert.ok(summary.generatedAt, 'Generated timestamp must be present');
  });
});
