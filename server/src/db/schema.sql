-- ==========================================================
-- NYAYASETU AI - Enterprise PostgreSQL Database Schema
-- Ministry of Home Affairs / NCRB Compliance (SIH26190)
-- Section 65B BSA & Merkle Ledger Integrity Standards
-- ==========================================================

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  agency_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role VARCHAR(64) NOT NULL,
  department VARCHAR(255),
  organization VARCHAR(255),
  badge_number VARCHAR(64),
  jurisdiction TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(64),
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  public_key TEXT,
  phone VARCHAR(64),
  password_changed_at TIMESTAMPTZ,
  face_enrolled BOOLEAN DEFAULT FALSE,
  face_enrolled_at TIMESTAMPTZ,
  face_template_hash TEXT,
  notification_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_agency_id ON users(agency_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. User Private Keys (keystore)
CREATE TABLE IF NOT EXISTS user_private_keys (
  user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  private_key TEXT NOT NULL
);

-- 3. Cases (including FIR Form I.F.1 fields)
CREATE TABLE IF NOT EXISTS cases (
  id VARCHAR(64) PRIMARY KEY,
  case_number VARCHAR(128) NOT NULL UNIQUE,
  title TEXT NOT NULL,
  type VARCHAR(128) NOT NULL,
  jurisdiction TEXT,
  police_station VARCHAR(255),
  department VARCHAR(255),
  status VARCHAR(64) NOT NULL,
  priority VARCHAR(32) NOT NULL,
  investigating_officer_id VARCHAR(64),
  investigating_officer_name VARCHAR(255),
  assigned_team JSONB DEFAULT '[]'::jsonb,
  incident_date TIMESTAMPTZ,
  filing_date TIMESTAMPTZ,
  court_name VARCHAR(255),
  judge_name VARCHAR(255),
  is_legal_hold BOOLEAN DEFAULT FALSE,
  summary TEXT,
  district VARCHAR(128),
  state VARCHAR(128),
  fir_year INT,
  acts_and_sections JSONB DEFAULT '[]'::jsonb,
  occurrence_day VARCHAR(64),
  occurrence_date_from TIMESTAMPTZ,
  occurrence_date_to TIMESTAMPTZ,
  occurrence_time_from VARCHAR(64),
  occurrence_time_to VARCHAR(64),
  information_received_date TIMESTAMPTZ,
  information_received_time VARCHAR(64),
  general_diary_no VARCHAR(128),
  information_type VARCHAR(64),
  place_of_occurrence TEXT,
  distance_from_ps VARCHAR(128),
  beat_no VARCHAR(64),
  complainant_name VARCHAR(255),
  complainant_father_spouse VARCHAR(255),
  complainant_dob_or_age VARCHAR(64),
  complainant_nationality VARCHAR(64),
  complainant_occupation VARCHAR(128),
  complainant_address TEXT,
  complainant_phone VARCHAR(64),
  suspect_details TEXT,
  properties_stolen_or_involved TEXT,
  total_estimated_value VARCHAR(128),
  fir_contents TEXT,
  officer_in_charge_name VARCHAR(255),
  officer_in_charge_rank VARCHAR(128),
  officer_in_charge_badge VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON cases(case_number);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_io ON cases(investigating_officer_id);

-- 4. Documents
CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR(64) PRIMARY KEY,
  document_number VARCHAR(128),
  case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
  case_number VARCHAR(128),
  title TEXT NOT NULL,
  category VARCHAR(64) NOT NULL,
  description TEXT,
  author_id VARCHAR(64),
  author_name VARCHAR(255),
  department VARCHAR(255),
  confidentiality VARCHAR(64),
  current_version_number INT DEFAULT 1,
  review_status VARCHAR(64),
  is_legal_hold BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by VARCHAR(64),
  retention_until TIMESTAMPTZ,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_review_status ON documents(review_status);

-- 5. Document Versions
CREATE TABLE IF NOT EXISTS document_versions (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) REFERENCES documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  file_name VARCHAR(255),
  stored_file_name VARCHAR(255),
  mime_type VARCHAR(128),
  file_size_bytes BIGINT DEFAULT 0,
  sha256_hash VARCHAR(128) NOT NULL,
  uploaded_by VARCHAR(64),
  uploader_name VARCHAR(255),
  uploader_role VARCHAR(64),
  change_summary TEXT,
  is_encrypted BOOLEAN DEFAULT TRUE,
  encryption_key_id VARCHAR(128),
  malware_scan_status VARCHAR(64),
  ledger_block_id VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_doc_versions_doc_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_hash ON document_versions(sha256_hash);

-- 6. Evidence Items
CREATE TABLE IF NOT EXISTS evidence_items (
  id VARCHAR(64) PRIMARY KEY,
  evidence_number VARCHAR(128) NOT NULL,
  case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
  case_number VARCHAR(128),
  type VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  collection_location VARCHAR(255),
  collection_timestamp TIMESTAMPTZ,
  collector_id VARCHAR(64),
  collector_name VARCHAR(255),
  storage_locker VARCHAR(128),
  current_custodian VARCHAR(255),
  current_custodian_role VARCHAR(64),
  handling_notes TEXT,
  sha256_hash VARCHAR(128) NOT NULL,
  linked_document_ids JSONB DEFAULT '[]'::jsonb,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence_items(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_hash ON evidence_items(sha256_hash);

-- 7. Custody Events
CREATE TABLE IF NOT EXISTS custody_events (
  id VARCHAR(64) PRIMARY KEY,
  evidence_id VARCHAR(64) REFERENCES evidence_items(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  actor_id VARCHAR(64) NOT NULL,
  actor_name VARCHAR(255) NOT NULL,
  actor_role VARCHAR(64) NOT NULL,
  from_custodian VARCHAR(255),
  to_custodian VARCHAR(255),
  location VARCHAR(255),
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  notes TEXT,
  acknowledged_by_destination BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  hash_proof VARCHAR(128) NOT NULL,
  ledger_block_id VARCHAR(128)
);
CREATE INDEX IF NOT EXISTS idx_custody_evidence_id ON custody_events(evidence_id);

-- 8. Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) REFERENCES documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  reviewer_id VARCHAR(64) NOT NULL,
  reviewer_name VARCHAR(255) NOT NULL,
  reviewer_role VARCHAR(64) NOT NULL,
  status VARCHAR(64) NOT NULL,
  feedback TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reviews_doc_id ON reviews(document_id);

-- 9. Review Comments
CREATE TABLE IF NOT EXISTS review_comments (
  id VARCHAR(64) PRIMARY KEY,
  review_id VARCHAR(64) REFERENCES reviews(id) ON DELETE CASCADE,
  document_id VARCHAR(64) REFERENCES documents(id) ON DELETE CASCADE,
  author_id VARCHAR(64) NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  author_role VARCHAR(64) NOT NULL,
  comment TEXT NOT NULL,
  suggested_changes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_review_comments_review_id ON review_comments(review_id);

-- 10. Digital Signatures
CREATE TABLE IF NOT EXISTS digital_signatures (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) REFERENCES documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  version_hash VARCHAR(128) NOT NULL,
  signer_id VARCHAR(64) NOT NULL,
  signer_name VARCHAR(255) NOT NULL,
  signer_role VARCHAR(64) NOT NULL,
  signer_agency_id VARCHAR(64) NOT NULL,
  signature_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  signature_algorithm VARCHAR(64) NOT NULL,
  signature_value TEXT NOT NULL,
  public_key_certificate TEXT NOT NULL,
  verification_status VARCHAR(64) NOT NULL,
  verified_at TIMESTAMPTZ,
  ledger_block_id VARCHAR(128)
);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_doc_id ON digital_signatures(document_id);

-- 11. Share Links
CREATE TABLE IF NOT EXISTS share_links (
  id VARCHAR(64) PRIMARY KEY,
  share_token VARCHAR(128) NOT NULL UNIQUE,
  document_id VARCHAR(64),
  case_id VARCHAR(64),
  resource_type VARCHAR(64) NOT NULL,
  resource_title TEXT NOT NULL,
  shared_by_user_id VARCHAR(64) NOT NULL,
  shared_by_name VARCHAR(255) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255) NOT NULL,
  recipient_org VARCHAR(255),
  permission VARCHAR(64) NOT NULL,
  watermark_text TEXT,
  purpose TEXT,
  access_passcode_hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  revoked_by VARCHAR(64),
  access_count INT DEFAULT 0,
  max_access_count INT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(share_token);

-- 12. Share Access Logs
CREATE TABLE IF NOT EXISTS share_access_logs (
  id VARCHAR(64) PRIMARY KEY,
  share_id VARCHAR(64) REFERENCES share_links(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(64) NOT NULL,
  user_agent TEXT NOT NULL,
  action VARCHAR(64) NOT NULL,
  outcome VARCHAR(64) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_share_access_logs_share_id ON share_access_logs(share_id);

-- 13. Audit Events
CREATE TABLE IF NOT EXISTS audit_events (
  id VARCHAR(64) PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  actor_id VARCHAR(64) NOT NULL,
  actor_name VARCHAR(255) NOT NULL,
  actor_role VARCHAR(64) NOT NULL,
  organization VARCHAR(255),
  department VARCHAR(255),
  action VARCHAR(128) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id VARCHAR(128),
  resource_name VARCHAR(255),
  details TEXT,
  outcome VARCHAR(32) NOT NULL,
  ip_address VARCHAR(64),
  user_agent TEXT,
  ledger_block_index BIGINT,
  integrity_hash VARCHAR(128)
);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_events(resource_type, resource_id);

-- 14. Ledger Blocks
CREATE TABLE IF NOT EXISTS ledger_blocks (
  block_index BIGINT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  previous_hash VARCHAR(128) NOT NULL,
  merkle_root VARCHAR(128) NOT NULL,
  block_hash VARCHAR(128) NOT NULL UNIQUE,
  event_type VARCHAR(64),
  resource_type VARCHAR(64),
  resource_id VARCHAR(128),
  resource_hash VARCHAR(128),
  actor_id VARCHAR(64),
  actor_name VARCHAR(255),
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ledger_hash ON ledger_blocks(block_hash);

-- 15. Police Assets
CREATE TABLE IF NOT EXISTS police_assets (
  id VARCHAR(64) PRIMARY KEY,
  asset_number VARCHAR(128) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(64) NOT NULL,
  serial_number VARCHAR(128),
  department VARCHAR(255),
  current_custodian_id VARCHAR(64),
  current_custodian_name VARCHAR(255),
  location VARCHAR(255),
  condition VARCHAR(64),
  purchase_date TIMESTAMPTZ,
  warranty_expiry TIMESTAMPTZ,
  status VARCHAR(64) NOT NULL,
  linked_case_id VARCHAR(64),
  linked_evidence_id VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_assets_asset_number ON police_assets(asset_number);

-- 16. Asset Lifecycle Events
CREATE TABLE IF NOT EXISTS asset_lifecycle_events (
  id VARCHAR(64) PRIMARY KEY,
  asset_id VARCHAR(64) REFERENCES police_assets(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  from_custodian VARCHAR(255),
  to_custodian VARCHAR(255),
  actor_id VARCHAR(64) NOT NULL,
  actor_name VARCHAR(255) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  details TEXT,
  condition VARCHAR(64),
  location VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_asset_events_asset_id ON asset_lifecycle_events(asset_id);

-- 17. AI Analyses
CREATE TABLE IF NOT EXISTS ai_analyses (
  document_id VARCHAR(64) PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  extracted_text TEXT,
  ocr_confidence NUMERIC(5, 2) DEFAULT 0,
  suggested_category VARCHAR(64),
  summary TEXT,
  entities JSONB DEFAULT '{}'::jsonb,
  timeline_events JSONB DEFAULT '[]'::jsonb,
  is_human_verified BOOLEAN DEFAULT FALSE,
  analyzed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 18. Persons
CREATE TABLE IF NOT EXISTS persons (
  id VARCHAR(64) PRIMARY KEY,
  cpid VARCHAR(128) UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  aliases JSONB DEFAULT '[]'::jsonb,
  father_or_spouse_name VARCHAR(255),
  gender VARCHAR(32),
  dob_or_age VARCHAR(64),
  nationality VARCHAR(64),
  primary_phone VARCHAR(64),
  identification_marks JSONB DEFAULT '[]'::jsonb,
  biometrics JSONB DEFAULT '{}'::jsonb,
  address TEXT,
  police_station VARCHAR(255),
  district VARCHAR(128),
  state VARCHAR(128),
  pincode VARCHAR(32),
  risk_rating VARCHAR(32),
  primary_crime_type VARCHAR(255),
  modus_operandi TEXT,
  gang_or_syndicate_affiliation VARCHAR(255),
  previous_convictions_count INT DEFAULT 0,
  linked_cases JSONB DEFAULT '[]'::jsonb,
  is_verified_profile BOOLEAN DEFAULT FALSE,
  verification_authority VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_persons_cpid ON persons(cpid);
CREATE INDEX IF NOT EXISTS idx_persons_name ON persons(full_name);

-- 19. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  recipient_user_id VARCHAR(64),
  recipient_role VARCHAR(64),
  type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(32) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  case_id VARCHAR(64),
  document_id VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_user_id, is_read);

-- 20. Redacted Documents
CREATE TABLE IF NOT EXISTS redacted_documents (
  id VARCHAR(64) PRIMARY KEY,
  original_document_id VARCHAR(64) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  original_version_number INTEGER NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  redacted_file_name VARCHAR(255) NOT NULL,
  stored_file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  sha256_hash VARCHAR(64) NOT NULL,
  created_by VARCHAR(64) NOT NULL REFERENCES users(id),
  creator_name VARCHAR(150) NOT NULL,
  creator_role VARCHAR(50) NOT NULL,
  redacted_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  export_purpose VARCHAR(255),
  ledger_block_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_redacted_doc ON redacted_documents(original_document_id);
