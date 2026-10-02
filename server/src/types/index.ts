export type UserRole = 
  | 'admin'
  | 'investigating_officer'
  | 'supervisor'
  | 'prosecutor'
  | 'judge'
  | 'forensic_officer'
  | 'auditor'
  | 'external_stakeholder';

export interface UserNotificationPreferences {
  caseActivity?: boolean;
  evidenceCustody?: boolean;
  integrityAlerts?: boolean;
  documentSharing?: boolean;
  documentReviews?: boolean;
  documentAlerts?: boolean;
  failedLogins?: boolean;
  faceFailures?: boolean;
  suspiciousAccess?: boolean;
}

export interface User {
  id: string;
  agencyId: string;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  department: string;
  organization: string;
  badgeNumber?: string;
  jurisdiction: string;
  isActive: boolean;
  mfaEnabled: boolean;
  mfaSecret?: string;
  failedLoginAttempts: number;
  lockedUntil?: string | null;
  publicKey?: string;
  passwordChangedAt?: string;
  faceEnrolled?: boolean;
  faceEnrolledAt?: string;
  faceTemplateHash?: string;
  notificationPreferences?: UserNotificationPreferences;
  createdAt: string;
  updatedAt: string;
}

export type CaseStatus = 
  | 'Draft'
  | 'Active Investigation'
  | 'Under Review'
  | 'Filed'
  | 'Under Trial'
  | 'Closed'
  | 'Archived';

export type CasePriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Case {
  id: string;
  caseNumber: string; // e.g. "FIR-2026-CR-089"
  title: string;
  type: string; // e.g. "Cyber Crime & Financial Fraud", "Organized Armed Crime"
  jurisdiction: string;
  policeStation: string;
  department: string;
  status: CaseStatus;
  priority: CasePriority;
  investigatingOfficerId: string;
  investigatingOfficerName: string;
  assignedTeam: string[]; // User IDs
  incidentDate: string;
  filingDate: string;
  courtName?: string;
  judgeName?: string;
  isLegalHold: boolean;
  summary: string;

  // Form I.F.1 (First Information Report) Fields
  district?: string;
  state?: string;
  firYear?: number;
  actsAndSections?: { act: string; sections: string }[];
  occurrenceDay?: string;
  occurrenceDateFrom?: string;
  occurrenceDateTo?: string;
  occurrenceTimeFrom?: string;
  occurrenceTimeTo?: string;
  informationReceivedDate?: string;
  informationReceivedTime?: string;
  generalDiaryNo?: string;
  informationType?: 'Written' | 'Oral';
  placeOfOccurrence?: string;
  distanceFromPS?: string;
  beatNo?: string;
  complainantName?: string;
  complainantFatherSpouse?: string;
  complainantDobOrAge?: string;
  complainantNationality?: string;
  complainantOccupation?: string;
  complainantAddress?: string;
  complainantPhone?: string;
  suspectDetails?: string;
  propertiesStolenOrInvolved?: string;
  totalEstimatedValue?: string;
  firContents?: string;
  officerInChargeName?: string;
  officerInChargeRank?: string;
  officerInChargeBadge?: string;

  createdAt: string;
  updatedAt: string;
}

export type DocumentCategory = 
  | 'FIR'
  | 'Police Report'
  | 'Witness Statement'
  | 'Charge Sheet'
  | 'Court Filing'
  | 'Evidence Record'
  | 'Forensic Report'
  | 'Legal Notice'
  | 'Judgment'
  | 'Correspondence'
  | 'Other';

export type ConfidentialityLevel = 
  | 'Unclassified'
  | 'Restricted'
  | 'Confidential'
  | 'Secret'
  | 'Top Secret';

export type ReviewStatus = 
  | 'Draft'
  | 'Submitted for Review'
  | 'Changes Requested'
  | 'Approved'
  | 'Signed'
  | 'Superseded';

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number; // 1, 2, 3...
  fileName: string;
  storedFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256Hash: string;
  uploadedBy: string; // User ID
  uploaderName: string;
  uploaderRole: UserRole;
  changeSummary: string;
  isEncrypted: boolean;
  encryptionKeyId?: string;
  malwareScanStatus: 'CLEAN' | 'SUSPICIOUS' | 'QUARANTINED' | 'SCANNING';
  createdAt: string;
  ledgerBlockId?: string;
}

export interface Document {
  id: string;
  documentNumber: string; // e.g. "DOC-2026-0819"
  caseId: string;
  caseNumber: string;
  title: string;
  category: DocumentCategory;
  description: string;
  authorId: string;
  authorName: string;
  department: string;
  confidentiality: ConfidentialityLevel;
  currentVersionNumber: number;
  reviewStatus: ReviewStatus;
  isLegalHold: boolean;
  isDeleted: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  retentionUntil: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  versions?: DocumentVersion[];
  signatures?: DigitalSignature[];
}

export type EvidenceType = 
  | 'Digital'
  | 'Physical Weapon'
  | 'Biological / Forensic'
  | 'Documentary'
  | 'Ballistic'
  | 'Electronic Device'
  | 'Narcotic / Chemical';

export interface CustodyEvent {
  id: string;
  evidenceId: string;
  eventType: 'COLLECTION' | 'TRANSFER' | 'LAB_ANALYSIS' | 'COURT_SUBMISSION' | 'LOCKER_STORAGE' | 'INTEGRITY_CHECK';
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  fromCustodian: string;
  toCustodian: string;
  location: string;
  timestamp: string;
  reason: string;
  notes?: string;
  acknowledgedByDestination: boolean;
  acknowledgedAt?: string;
  hashProof: string;
  ledgerBlockId?: string;
}

export interface EvidenceItem {
  id: string;
  evidenceNumber: string; // e.g. "EVD-2026-0045"
  caseId: string;
  caseNumber: string;
  type: EvidenceType;
  description: string;
  collectionLocation: string;
  collectionTimestamp: string;
  collectorId: string;
  collectorName: string;
  storageLocker: string;
  currentCustodian: string;
  currentCustodianRole: string;
  handlingNotes: string;
  sha256Hash: string;
  linkedDocumentIds: string[];
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  custodyHistory?: CustodyEvent[];
}

export interface ReviewComment {
  id: string;
  reviewId: string;
  documentId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  comment: string;
  suggestedChanges?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  documentId: string;
  versionNumber: number;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: UserRole;
  status: ReviewStatus;
  feedback?: string;
  reviewedAt?: string;
  createdAt: string;
  comments?: ReviewComment[];
}

export interface DigitalSignature {
  id: string;
  documentId: string;
  versionNumber: number;
  versionHash: string;
  signerId: string;
  signerName: string;
  signerRole: UserRole;
  signerAgencyId: string;
  signatureTimestamp: string;
  signatureAlgorithm: string;
  signatureValue: string; // Base64 signature
  publicKeyCertificate: string;
  verificationStatus: 'VALID' | 'INVALID' | 'REVOKED';
  verifiedAt: string;
  ledgerBlockId: string;
}

export interface ShareLink {
  id: string;
  shareToken: string;
  documentId?: string;
  caseId?: string;
  resourceType: 'DOCUMENT' | 'CASE';
  resourceTitle: string;
  sharedByUserId: string;
  sharedByName: string;
  recipientEmail: string;
  recipientName: string;
  recipientOrg: string;
  permission: 'VIEW_ONLY' | 'DOWNLOAD_ALLOWED';
  watermarkText: string;
  purpose: string;
  accessPasscodeHash?: string;
  expiresAt: string;
  isRevoked: boolean;
  revokedAt?: string;
  revokedBy?: string;
  accessCount: number;
  maxAccessCount?: number;
  createdAt: string;
}

export interface ShareAccessLog {
  id: string;
  shareId: string;
  accessedAt: string;
  ipAddress: string;
  userAgent: string;
  action: 'PREVIEW' | 'DOWNLOAD' | 'FAILED_PASSCODE' | 'REVOKED_ATTEMPT';
  outcome: 'SUCCESS' | 'DENIED';
}

export interface LedgerBlock {
  blockIndex: number;
  previousHash: string;
  timestamp: string;
  eventType: string;
  resourceType: string;
  resourceId: string;
  resourceHash: string;
  actorId: string;
  actorName: string;
  payload: Record<string, any>;
  merkleRoot: string;
  blockHash: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  organization: string;
  department: string;
  action: string;
  resourceType: 'CASE' | 'DOCUMENT' | 'EVIDENCE' | 'SHARE' | 'AUTH' | 'USER' | 'ASSET' | 'LEDGER';
  resourceId: string;
  resourceName?: string;
  details: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  ipAddress: string;
  userAgent?: string;
  ledgerBlockIndex?: number;
  integrityHash: string;
}

export type AssetType = 
  | 'Vehicle'
  | 'Firearm'
  | 'Forensic Equipment'
  | 'Wireless Radio / Comms'
  | 'Body Camera'
  | 'Protective Gear'
  | 'Drone / Surveillance';

export type AssetStatus = 
  | 'Registered'
  | 'Assigned'
  | 'In Transit'
  | 'Under Maintenance'
  | 'Lost/Stolen'
  | 'Retired'
  | 'Disposed';

export interface AssetLifecycleEvent {
  id: string;
  assetId: string;
  eventType: 'REGISTRATION' | 'ASSIGNMENT' | 'RETURN' | 'MAINTENANCE_LOG' | 'INSPECTION' | 'STATUS_CHANGE';
  fromCustodian?: string;
  toCustodian?: string;
  actorId: string;
  actorName: string;
  timestamp: string;
  details: string;
  condition: string;
  location: string;
}

export interface PoliceAsset {
  id: string;
  assetNumber: string; // e.g. "AST-DEL-2026-091"
  name: string;
  type: AssetType;
  serialNumber: string;
  department: string;
  currentCustodianId?: string;
  currentCustodianName?: string;
  location: string;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Requires Repair' | 'Damaged';
  purchaseDate: string;
  warrantyExpiry: string;
  status: AssetStatus;
  linkedCaseId?: string;
  linkedEvidenceId?: string;
  createdAt: string;
  updatedAt: string;
  lifecycleHistory?: AssetLifecycleEvent[];
}

export interface AIAnalysisResult {
  documentId: string;
  extractedText: string;
  ocrConfidence: number;
  suggestedCategory: DocumentCategory;
  summary: string;
  entities: {
    suspects: string[];
    victims: string[];
    officers: string[];
    locations: string[];
    legalSections: { code: string; title: string; confidence: number }[];
    dates: string[];
    weapons?: string[];
    vehicles?: string[];
    financials?: string[];
  };
  timelineEvents: { timestamp: string; event: string; sourceSnippet: string }[];
  isHumanVerified: boolean;
  analyzedAt: string;
}

export interface PersonRecord {
  id: string;
  cpid: string; // Internal Person ID e.g. "CPID-DL-2024-88412"
  fullName: string;
  aliases: string[];
  fatherOrSpouseName: string;
  gender: 'Male' | 'Female' | 'Other';
  dobOrAge: string;
  nationality: string;
  primaryPhone?: string;
  identificationMarks: string[];
  biometrics: {
    afisStatus: 'VERIFIED' | 'PENDING' | 'NOT_ENROLLED';
    irisEnrolled: boolean;
    dnaReferenceId?: string;
    mugshotUrl?: string;
  };
  address: string;
  policeStation: string;
  district: string;
  state: string;
  pincode: string;
  riskRating: 'Low' | 'Moderate' | 'High' | 'Critical';
  primaryCrimeType?: string; // e.g. "Snatching & Robbery", "Armed Robbery & Extortion", "Cyber Fraud & Phishing", "Vehicle Theft"
  modusOperandi?: string; // e.g. "Pillion rider gold chain snatching on black Pulsar bike"
  gangOrSyndicateAffiliation?: string;
  previousConvictionsCount: number;
  linkedCases: {
    caseId: string;
    caseNumber: string;
    role: 'Accused' | 'Suspect' | 'Witness' | 'Victim' | 'Informant';
    sectionCharges?: string;
    status: string;
  }[];
  isVerifiedProfile: boolean;
  verificationAuthority?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrossCaseCorrelation {
  id: string;
  entityType: 'PERSON' | 'PHONE' | 'VEHICLE' | 'WEAPON' | 'BANK_ACCOUNT' | 'LOCATION';
  entityValue: string;
  matchedCaseIds: string[];
  matchedCaseNumbers: string[];
  confidenceScore: number;
  description: string;
  detectedAt: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'case' | 'person' | 'evidence' | 'location' | 'vehicle' | 'phone' | 'document' | 'event' | 'organization';
  group: string;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: 'involved_in' | 'owns' | 'recovered_at' | 'witnessed' | 'communicated_with' | 'co_accused' | 'appears_in' | 'references' | 'exhibit_in' | 'occurred_at' | 'registered_at' | 'milestone_in' | 'documented_in';
}

export interface DiscrepancyReport {
  id: string;
  caseId: string;
  caseNumber: string;
  type: 'WITNESS_CONTRADICTION' | 'ALIBI_CONFLICT' | 'TIMELINE_GAP' | 'SEIZURE_MISMATCH';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  title: string;
  description: string;
  conflictingSources: {
    documentId: string;
    documentTitle: string;
    snippet: string;
  }[];
  recommendation: string;
  detectedAt: string;
}

export interface SemanticSearchResult {
  id: string;
  resourceType: 'CASE' | 'DOCUMENT' | 'EVIDENCE' | 'PERSON';
  title: string;
  subtitle: string;
  caseNumber?: string;
  snippet: string;
  relevanceScore: number;
  tags: string[];
  metadata: Record<string, any>;
  actionUrl: string;
}

export interface NotificationItem {
  id: string;
  recipientUserId?: string;
  recipientRole?: UserRole;
  type: 'CUSTODY_TRANSFER' | 'SIGNATURE_REQUEST' | 'TAMPER_ALERT' | 'AI_CROSS_MATCH' | 'LEGAL_HOLD' | 'SHARE_ACCESS';
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  isRead: boolean;
  actionUrl?: string;
  caseId?: string;
  documentId?: string;
  createdAt: string;
}

// Feature 6: Secure PII Redaction
export interface RedactedItem {
  id: string;
  field: string;
  type: 'PHONE' | 'EMAIL' | 'AADHAAR' | 'ADDRESS' | 'PAN' | 'NAME' | 'OTHER';
  originalText: string;
  maskedText: string;
  startIndex?: number;
  endIndex?: number;
  reason?: string;
  isConfirmed: boolean;
}

export interface RedactedDocument {
  id: string;
  originalDocumentId: string;
  originalVersionNumber: number;
  originalFileName: string;
  redactedFileName: string;
  storedFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256Hash: string;
  createdBy: string;
  creatorName: string;
  creatorRole: UserRole;
  createdAt: string;
  redactedItems: RedactedItem[];
  exportPurpose?: string;
  ledgerBlockId?: string;
}

// Feature 1: Evidence Timeline
export type TimelineEventType = 
  | 'CASE_CREATED'
  | 'INCIDENT_OCCURRED'
  | 'DOCUMENT_UPLOAD'
  | 'VERSION_CHANGE'
  | 'EVIDENCE_REGISTRATION'
  | 'CUSTODY_TRANSFER'
  | 'DOCUMENT_ACCESS'
  | 'DOCUMENT_VERIFIED'
  | 'DIGITAL_SIGNATURE'
  | 'INVESTIGATION_EVENT';

export interface TimelineEventItem {
  id: string;
  timestamp: string;
  dateFormatted: string;
  timeFormatted: string;
  eventType: TimelineEventType;
  title: string;
  description: string;
  actor: {
    id?: string;
    name: string;
    role: string;
  };
  relatedEntity?: {
    type: 'DOCUMENT' | 'EVIDENCE' | 'CASE' | 'PERSON';
    id: string;
    name: string;
    number?: string;
  };
  integrityStatus: 'VERIFIED' | 'ANCHORED' | 'PENDING' | 'WARNING' | 'UNVERIFIED';
  hashProof?: string;
  badgeType: 'blue' | 'green' | 'purple' | 'amber' | 'cyan' | 'red';
}

// Feature 4: Case Completeness / Readiness
export interface ReadinessCheckItem {
  key: string;
  label: string;
  category: string;
  status: 'COMPLETE' | 'WARNING' | 'MISSING';
  message: string;
  navigationTarget: {
    tab: string;
    subId?: string;
    action?: string;
  };
}

export interface CaseReadinessReport {
  caseId: string;
  caseNumber: string;
  isReadyForFiling: boolean;
  completenessScore: number; // 0 to 100 actual calculation
  summaryText: string;
  checks: ReadinessCheckItem[];
  generatedAt: string;
}

// Feature 5: Document Version Comparison
export interface VersionMetadataDiff {
  field: string;
  v1Value: string | number;
  v2Value: string | number;
  hasChanged: boolean;
}

export interface VersionTextDiffLine {
  type: 'ADDED' | 'REMOVED' | 'UNCHANGED';
  lineA?: number;
  lineB?: number;
  content: string;
}

export interface VersionDiffResult {
  documentId: string;
  documentTitle: string;
  v1Number: number;
  v2Number: number;
  v1Hash: string;
  v2Hash: string;
  v1CreatedAt: string;
  v2CreatedAt: string;
  v1Uploader: string;
  v2Uploader: string;
  changeSummaryV2: string;
  metadataDiffs: VersionMetadataDiff[];
  textDiffs: VersionTextDiffLine[];
  summaryOfChanges: string[];
}

// Feature 3: Contradiction Detection
export interface ContradictionSource {
  documentId: string;
  documentTitle: string;
  documentNumber?: string;
  pageOrSection?: string;
  snippet: string;
}

export interface ContradictionItem {
  id: string;
  caseId: string;
  caseNumber: string;
  title: string;
  category: 'DATES' | 'NAMES' | 'LOCATIONS' | 'EVIDENCE_IDS' | 'EVENT_DESCRIPTIONS' | 'STATEMENTS';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  sourceA: ContradictionSource;
  sourceB: ContradictionSource;
  conflictingInformation: string;
  potentialDescription: string; // "Potential contradiction detected: ..."
  status: 'PENDING_REVIEW' | 'INVESTIGATOR_NOTED' | 'RECONCILED';
  investigatorNotes?: string;
  detectedAt: string;
}

// Feature 7: Evidence Integrity Center
export interface IntegrityReportItem {
  id: string;
  resourceType: 'DOCUMENT' | 'EVIDENCE';
  resourceId: string;
  resourceNumber: string;
  resourceTitle: string;
  caseId: string;
  caseNumber: string;
  sha256Hash: string;
  computedHash?: string;
  digitalSignatureStatus: 'SIGNED' | 'UNSIGNED' | 'VALID' | 'REVOKED' | 'NOT_APPLICABLE';
  signatureCount: number;
  merkleStatus: 'ANCHORED' | 'PENDING' | 'INTEGRITY_FAILURE';
  ledgerBlockIndex?: number;
  lastVerified: string;
  currentStatus: 'VERIFIED' | 'WARNING' | 'INTEGRITY_FAILURE';
  tamperDetails?: {
    expectedHash: string;
    currentHash: string;
    affectedLedgerBlock?: number;
    verificationTimestamp: string;
  };
}

// Feature 8: Evidence Package Export
export interface EvidencePackageOptions {
  includeCaseInfo: boolean;
  includeDocuments: boolean;
  includeEvidence: boolean;
  includeCustodyHistory: boolean;
  includeAuditTrail: boolean;
  includeSignatures: boolean;
  includeIntegrityManifest: boolean;
}

