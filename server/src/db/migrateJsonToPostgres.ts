import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:jeeshan@123@localhost:5433/nyayasetu_db';

const pool = new pg.Pool({
  connectionString,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

async function migrate() {
  console.log('====================================================');
  console.log(' NYAYASETU AI - FULL POSTGRESQL DATA MIGRATION      ');
  console.log(' Single Source of Truth Initializer                ');
  console.log('====================================================');
  console.log(`Connecting to: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);

  const client = await pool.connect();
  try {
    const test = await client.query('SELECT version(), current_database();');
    console.log(`✓ Connected to ${test.rows[0].version.split(' ')[0]} ${test.rows[0].version.split(' ')[1]} (DB: ${test.rows[0].current_database})`);

    // Ensure schema
    const schemaPath = path.resolve(process.cwd(), 'src', 'db', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(sql);
      await client.query('ALTER TABLE ledger_blocks ALTER COLUMN payload TYPE TEXT;');
      console.log('✓ Relational schema verified.');
    }

    // Read database.json
    const dbPath = path.resolve(process.cwd(), 'data', 'database.json');
    if (!fs.existsSync(dbPath)) {
      console.error(`❌ Source database file not found at ${dbPath}`);
      process.exit(1);
    }

    console.log(`Reading source file: ${dbPath}...`);
    const raw = fs.readFileSync(dbPath, 'utf8');
    const data: any = JSON.parse(raw);

    const counts: Record<string, number> = {};

    // Helper for chunking
    function chunkArray<T>(arr: T[], size: number): T[][] {
      const chunks: T[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    }

    console.log('\nBeginning data migration...');

    // 1. USERS
    if (Array.isArray(data.users) && data.users.length > 0) {
      console.log(`Migrating ${data.users.length} users...`);
      await client.query('BEGIN');
      for (const u of data.users) {
        await client.query(`
          INSERT INTO users (
            id, agency_id, name, email, password_hash, salt, role, department, 
            organization, badge_number, jurisdiction, is_active, mfa_enabled, 
            mfa_secret, failed_login_attempts, locked_until, public_key, phone,
            password_changed_at, face_enrolled, face_enrolled_at, face_template_hash,
            notification_preferences, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
          ON CONFLICT (id) DO UPDATE SET
            agency_id = EXCLUDED.agency_id,
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            salt = EXCLUDED.salt,
            role = EXCLUDED.role,
            badge_number = EXCLUDED.badge_number,
            updated_at = CURRENT_TIMESTAMP
        `, [
          u.id, u.agencyId, u.name, u.email, u.passwordHash, u.salt, u.role,
          u.department, u.organization, u.badgeNumber, u.jurisdiction,
          u.isActive !== false, !!u.mfaEnabled, u.mfaSecret || null, u.failedLoginAttempts || 0,
          u.lockedUntil || null, u.publicKey || null, u.phone || null,
          u.passwordChangedAt || null, !!u.faceEnrolled, u.faceEnrolledAt || null,
          u.faceTemplateHash || null, JSON.stringify(u.notificationPreferences || {}),
          u.createdAt || new Date().toISOString(), u.updatedAt || new Date().toISOString()
        ]);
      }
      await client.query('COMMIT');
      counts.users = data.users.length;
      console.log(`✓ ${counts.users} users migrated.`);
    }

    // 2. USER PRIVATE KEYS
    if (data.user_private_keys && typeof data.user_private_keys === 'object') {
      const keys = Object.entries(data.user_private_keys) as [string, string][];
      console.log(`Migrating ${keys.length} user private keys...`);
      await client.query('BEGIN');
      for (const [userId, privateKey] of keys) {
        await client.query(`
          INSERT INTO user_private_keys (user_id, private_key)
          VALUES ($1, $2)
          ON CONFLICT (user_id) DO UPDATE SET private_key = EXCLUDED.private_key
        `, [userId, privateKey]);
      }
      await client.query('COMMIT');
      counts.user_private_keys = keys.length;
      console.log(`✓ ${counts.user_private_keys} user private keys migrated.`);
    }

    // 3. CASES
    if (Array.isArray(data.cases) && data.cases.length > 0) {
      console.log(`Migrating ${data.cases.length} cases...`);
      await client.query('BEGIN');
      for (const c of data.cases) {
        await client.query(`
          INSERT INTO cases (
            id, case_number, title, type, jurisdiction, police_station, department,
            status, priority, investigating_officer_id, investigating_officer_name,
            assigned_team, incident_date, filing_date, court_name, judge_name,
            is_legal_hold, summary, district, state, fir_year, acts_and_sections,
            occurrence_day, occurrence_date_from, occurrence_date_to, occurrence_time_from, occurrence_time_to,
            information_received_date, information_received_time, general_diary_no, information_type,
            place_of_occurrence, distance_from_ps, beat_no, complainant_name, complainant_father_spouse,
            complainant_dob_or_age, complainant_nationality, complainant_occupation, complainant_address,
            complainant_phone, suspect_details, properties_stolen_or_involved, total_estimated_value,
            fir_contents, officer_in_charge_name, officer_in_charge_rank, officer_in_charge_badge,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
            $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
            $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44,
            $45, $46, $47, $48, $49, $50
          )
          ON CONFLICT (id) DO UPDATE SET
            case_number = EXCLUDED.case_number,
            title = EXCLUDED.title,
            status = EXCLUDED.status,
            priority = EXCLUDED.priority,
            updated_at = CURRENT_TIMESTAMP
        `, [
          c.id, c.caseNumber, c.title, c.type, c.jurisdiction, c.policeStation, c.department,
          c.status, c.priority, c.investigatingOfficerId, c.investigatingOfficerName,
          JSON.stringify(c.assignedTeam || []), c.incidentDate || null, c.filingDate || null,
          c.courtName || null, c.judgeName || null, !!c.isLegalHold, c.summary || null,
          c.district || null, c.state || null, c.firYear || null,
          JSON.stringify(c.actsAndSections || []), c.occurrenceDay || null,
          c.occurrenceDateFrom || null, c.occurrenceDateTo || null,
          c.occurrenceTimeFrom || null, c.occurrenceTimeTo || null,
          c.informationReceivedDate || null, c.informationReceivedTime || null,
          c.generalDiaryNo || null, c.informationType || null,
          c.placeOfOccurrence || null, c.distanceFromPS || null, c.beatNo || null,
          c.complainantName || null, c.complainantFatherSpouse || null,
          c.complainantDobOrAge || null, c.complainantNationality || null,
          c.complainantOccupation || null, c.complainantAddress || null,
          c.complainantPhone || null, c.suspectDetails || null,
          c.propertiesStolenOrInvolved || null, c.totalEstimatedValue || null,
          c.firContents || null, c.officerInChargeName || null,
          c.officerInChargeRank || null, c.officerInChargeBadge || null,
          c.createdAt || new Date().toISOString(), c.updatedAt || new Date().toISOString()
        ]);
      }
      await client.query('COMMIT');
      counts.cases = data.cases.length;
      console.log(`✓ ${counts.cases} cases migrated.`);
    }

    // 4. DOCUMENTS
    if (Array.isArray(data.documents) && data.documents.length > 0) {
      console.log(`Migrating ${data.documents.length} documents...`);
      await client.query('BEGIN');
      for (const d of data.documents) {
        await client.query(`
          INSERT INTO documents (
            id, document_number, case_id, case_number, title, category, description,
            author_id, author_name, department, confidentiality, current_version_number,
            review_status, is_legal_hold, is_deleted, deleted_at, deleted_by, retention_until,
            tags, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            review_status = EXCLUDED.review_status,
            current_version_number = EXCLUDED.current_version_number,
            is_deleted = EXCLUDED.is_deleted,
            updated_at = CURRENT_TIMESTAMP
        `, [
          d.id, d.documentNumber, d.caseId, d.caseNumber, d.title, d.category, d.description || null,
          d.authorId, d.authorName, d.department, d.confidentiality, d.currentVersionNumber || 1,
          d.reviewStatus, !!d.isLegalHold, !!d.isDeleted, d.deletedAt || null, d.deletedBy || null,
          d.retentionUntil || null, JSON.stringify(d.tags || []),
          d.createdAt || new Date().toISOString(), d.updatedAt || new Date().toISOString()
        ]);
      }
      await client.query('COMMIT');
      counts.documents = data.documents.length;
      console.log(`✓ ${counts.documents} documents migrated.`);
    }

    // 5. DOCUMENT VERSIONS
    if (Array.isArray(data.document_versions) && data.document_versions.length > 0) {
      console.log(`Migrating ${data.document_versions.length} document versions...`);
      await client.query('BEGIN');
      for (const v of data.document_versions) {
        await client.query(`
          INSERT INTO document_versions (
            id, document_id, version_number, file_name, stored_file_name,
            mime_type, file_size_bytes, sha256_hash, uploaded_by, uploader_name,
            uploader_role, change_summary, is_encrypted, encryption_key_id,
            malware_scan_status, ledger_block_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO NOTHING
        `, [
          v.id, v.documentId, v.versionNumber, v.fileName, v.storedFileName,
          v.mimeType, v.fileSizeBytes || 0, v.sha256Hash, v.uploadedBy, v.uploaderName,
          v.uploaderRole, v.changeSummary || '', v.isEncrypted !== false, v.encryptionKeyId || null,
          v.malwareScanStatus || 'CLEAN', v.ledgerBlockId || null, v.createdAt || new Date().toISOString()
        ]);
      }
      await client.query('COMMIT');
      counts.document_versions = data.document_versions.length;
      console.log(`✓ ${counts.document_versions} document versions migrated.`);
    }

    // 6. EVIDENCE ITEMS
    if (Array.isArray(data.evidence_items) && data.evidence_items.length > 0) {
      console.log(`Migrating ${data.evidence_items.length} evidence items...`);
      await client.query('BEGIN');
      for (const e of data.evidence_items) {
        await client.query(`
          INSERT INTO evidence_items (
            id, evidence_number, case_id, case_number, type, description,
            collection_location, collection_timestamp, collector_id, collector_name,
            storage_locker, current_custodian, current_custodian_role, handling_notes,
            sha256_hash, linked_document_ids, is_locked, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (id) DO UPDATE SET
            storage_locker = EXCLUDED.storage_locker,
            current_custodian = EXCLUDED.current_custodian,
            sha256_hash = EXCLUDED.sha256_hash,
            updated_at = CURRENT_TIMESTAMP
        `, [
          e.id, e.evidenceNumber, e.caseId, e.caseNumber, e.type, e.description,
          e.collectionLocation, e.collectionTimestamp, e.collectorId, e.collectorName,
          e.storageLocker || null, e.currentCustodian || null, e.currentCustodianRole || null,
          e.handlingNotes || null, e.sha256Hash, JSON.stringify(e.linkedDocumentIds || []),
          !!e.isLocked, e.createdAt || new Date().toISOString(), e.updatedAt || new Date().toISOString()
        ]);
      }
      await client.query('COMMIT');
      counts.evidence_items = data.evidence_items.length;
      console.log(`✓ ${counts.evidence_items} evidence items migrated.`);
    }

    // 7. CUSTODY EVENTS
    if (Array.isArray(data.custody_events) && data.custody_events.length > 0) {
      console.log(`Migrating ${data.custody_events.length} custody events...`);
      await client.query('BEGIN');
      for (const ce of data.custody_events) {
        await client.query(`
          INSERT INTO custody_events (
            id, evidence_id, event_type, actor_id, actor_name, actor_role,
            from_custodian, to_custodian, location, timestamp, reason, notes,
            acknowledged_by_destination, acknowledged_at, hash_proof, ledger_block_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (id) DO NOTHING
        `, [
          ce.id, ce.evidenceId, ce.eventType, ce.actorId, ce.actorName, ce.actorRole,
          ce.fromCustodian || null, ce.toCustodian || null, ce.location || null,
          ce.timestamp || new Date().toISOString(), ce.reason || null, ce.notes || null,
          !!ce.acknowledgedByDestination, ce.acknowledgedAt || null, ce.hashProof, ce.ledgerBlockId || null
        ]);
      }
      await client.query('COMMIT');
      counts.custody_events = data.custody_events.length;
      console.log(`✓ ${counts.custody_events} custody events migrated.`);
    }

    // 8. DIGITAL SIGNATURES
    if (Array.isArray(data.digital_signatures) && data.digital_signatures.length > 0) {
      console.log(`Migrating ${data.digital_signatures.length} digital signatures...`);
      await client.query('BEGIN');
      for (const s of data.digital_signatures) {
        await client.query(`
          INSERT INTO digital_signatures (
            id, document_id, version_number, version_hash, signer_id, signer_name,
            signer_role, signer_agency_id, signature_timestamp, signature_algorithm,
            signature_value, public_key_certificate, verification_status, verified_at, ledger_block_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (id) DO NOTHING
        `, [
          s.id, s.documentId, s.versionNumber, s.versionHash, s.signerId, s.signerName,
          s.signerRole, s.signerAgencyId, s.signatureTimestamp || new Date().toISOString(),
          s.signatureAlgorithm, s.signatureValue, s.publicKeyCertificate,
          s.verificationStatus, s.verifiedAt || null, s.ledgerBlockId || null
        ]);
      }
      await client.query('COMMIT');
      counts.digital_signatures = data.digital_signatures.length;
      console.log(`✓ ${counts.digital_signatures} digital signatures migrated.`);
    }

    // 9. SHARE LINKS
    if (Array.isArray(data.share_links) && data.share_links.length > 0) {
      console.log(`Migrating ${data.share_links.length} share links...`);
      await client.query('BEGIN');
      for (const sl of data.share_links) {
        await client.query(`
          INSERT INTO share_links (
            id, share_token, document_id, case_id, resource_type, resource_title,
            shared_by_user_id, shared_by_name, recipient_email, recipient_name,
            recipient_org, permission, watermark_text, purpose, access_passcode_hash,
            expires_at, is_revoked, revoked_at, revoked_by, access_count, max_access_count, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
          ON CONFLICT (id) DO NOTHING
        `, [
          sl.id, sl.shareToken, sl.documentId || null, sl.caseId || null,
          sl.resourceType, sl.resourceTitle, sl.sharedByUserId, sl.sharedByName,
          sl.recipientEmail, sl.recipientName, sl.recipientOrg || '', sl.permission,
          sl.watermarkText || '', sl.purpose || '', sl.accessPasscodeHash || null,
          sl.expiresAt, !!sl.isRevoked, sl.revokedAt || null, sl.revokedBy || null,
          sl.accessCount || 0, sl.maxAccessCount || null, sl.createdAt || new Date().toISOString()
        ]);
      }
      await client.query('COMMIT');
      counts.share_links = data.share_links.length;
      console.log(`✓ ${counts.share_links} share links migrated.`);
    }

    // 10. POLICE ASSETS
    if (Array.isArray(data.police_assets) && data.police_assets.length > 0) {
      console.log(`Migrating ${data.police_assets.length} police assets...`);
      await client.query('BEGIN');
      for (const a of data.police_assets) {
        await client.query(`
          INSERT INTO police_assets (
            id, asset_number, name, type, serial_number, department, current_custodian_id,
            current_custodian_name, location, condition, purchase_date, warranty_expiry,
            status, linked_case_id, linked_evidence_id, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP
        `, [
          a.id, a.assetNumber, a.name, a.type, a.serialNumber, a.department,
          a.currentCustodianId || null, a.currentCustodianName || null, a.location,
          a.condition, a.purchaseDate || null, a.warrantyExpiry || null, a.status,
          a.linkedCaseId || null, a.linkedEvidenceId || null,
          a.createdAt || new Date().toISOString(), a.updatedAt || new Date().toISOString()
        ]);
      }
      await client.query('COMMIT');
      counts.police_assets = data.police_assets.length;
      console.log(`✓ ${counts.police_assets} police assets migrated.`);
    }

    // 11. PERSONS
    if (Array.isArray(data.persons) && data.persons.length > 0) {
      console.log(`Migrating ${data.persons.length} persons...`);
      await client.query('BEGIN');
      for (const p of data.persons) {
        await client.query(`
          INSERT INTO persons (
            id, cpid, full_name, aliases, father_or_spouse_name, gender,
            dob_or_age, nationality, primary_phone, identification_marks,
            biometrics, address, police_station, district, state, pincode,
            risk_rating, primary_crime_type, modus_operandi, gang_or_syndicate_affiliation,
            previous_convictions_count, linked_cases, is_verified_profile,
            verification_authority, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
            $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
          )
          ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            linked_cases = EXCLUDED.linked_cases,
            updated_at = CURRENT_TIMESTAMP
        `, [
          p.id, p.cpid || null, p.fullName, JSON.stringify(p.aliases || []),
          p.fatherOrSpouseName || null, p.gender || null, p.dobOrAge || null,
          p.nationality || null, p.primaryPhone || null, JSON.stringify(p.identificationMarks || []),
          JSON.stringify(p.biometrics || {}), p.address || null, p.policeStation || null,
          p.district || null, p.state || null, p.pincode || null, p.riskRating || null,
          p.primaryCrimeType || null, p.modusOperandi || null, p.gangOrSyndicateAffiliation || null,
          p.previousConvictionsCount || 0, JSON.stringify(p.linkedCases || []),
          !!p.isVerifiedProfile, p.verificationAuthority || null,
          p.createdAt || new Date().toISOString(), p.updatedAt || new Date().toISOString()
        ]);
      }
      await client.query('COMMIT');
      counts.persons = data.persons.length;
      console.log(`✓ ${counts.persons} persons migrated.`);
    }

    // 12. AI ANALYSES
    if (Array.isArray(data.ai_analyses) && data.ai_analyses.length > 0) {
      console.log(`Migrating ${data.ai_analyses.length} AI analyses...`);
      await client.query('BEGIN');
      for (const a of data.ai_analyses) {
        await client.query(`
          INSERT INTO ai_analyses (
            document_id, extracted_text, ocr_confidence, suggested_category,
            summary, entities, timeline_events, is_human_verified, analyzed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (document_id) DO UPDATE SET
            extracted_text = EXCLUDED.extracted_text,
            summary = EXCLUDED.summary,
            entities = EXCLUDED.entities,
            timeline_events = EXCLUDED.timeline_events,
            analyzed_at = EXCLUDED.analyzed_at
        `, [
          a.documentId, a.extractedText || '', a.ocrConfidence || 0,
          a.suggestedCategory || null, a.summary || '',
          JSON.stringify(a.entities || {}), JSON.stringify(a.timelineEvents || []),
          !!a.isHumanVerified, a.analyzedAt || new Date().toISOString()
        ]);
      }
      await client.query('COMMIT');
      counts.ai_analyses = data.ai_analyses.length;
      console.log(`✓ ${counts.ai_analyses} AI analyses migrated.`);
    }

    // 13. NOTIFICATIONS
    if (Array.isArray(data.notifications) && data.notifications.length > 0) {
      console.log(`Migrating ${data.notifications.length} notifications...`);
      await client.query('BEGIN');
      for (const n of data.notifications) {
        await client.query(`
          INSERT INTO notifications (
            id, recipient_user_id, recipient_role, type, title, message,
            severity, is_read, action_url, case_id, document_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO NOTHING
        `, [
          n.id, n.recipientUserId || null, n.recipientRole || null,
          n.type, n.title, n.message, n.severity || 'INFO', !!n.isRead,
          n.actionUrl || null, n.caseId || null, n.documentId || null,
          n.createdAt || new Date().toISOString()
        ]);
      }
      await client.query('COMMIT');
      counts.notifications = data.notifications.length;
      console.log(`✓ ${counts.notifications} notifications migrated.`);
    }

    // 14. AUDIT EVENTS (4,899 records in batches of 500)
    if (Array.isArray(data.audit_events) && data.audit_events.length > 0) {
      console.log(`Migrating all ${data.audit_events.length} audit events in batches...`);
      const chunks = chunkArray(data.audit_events, 500);
      let batchNum = 0;
      for (const chunk of chunks) {
        batchNum++;
        await client.query('BEGIN');
        for (const a of (chunk as any[])) {
          await client.query(`
            INSERT INTO audit_events (
              id, timestamp, actor_id, actor_name, actor_role, organization,
              department, action, resource_type, resource_id, resource_name,
              details, outcome, ip_address, user_agent, ledger_block_index, integrity_hash
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            ON CONFLICT (id) DO NOTHING
          `, [
            a.id, a.timestamp || new Date().toISOString(), a.actorId, a.actorName,
            a.actorRole, a.organization || null, a.department || null, a.action,
            a.resourceType, a.resourceId || null, a.resourceName || null,
            a.details || null, a.outcome || 'SUCCESS', a.ipAddress || null,
            a.userAgent || null, a.ledgerBlockIndex || null, a.integrityHash || null
          ]);
        }
        await client.query('COMMIT');
      }
      counts.audit_events = data.audit_events.length;
      console.log(`✓ ${counts.audit_events} audit events migrated.`);
    }

    // 15. LEDGER BLOCKS (25,001 records in batches of 1,000)
    if (Array.isArray(data.ledger_blocks) && data.ledger_blocks.length > 0) {
      console.log(`Migrating all ${data.ledger_blocks.length} ledger blocks in batches...`);
      const chunks = chunkArray(data.ledger_blocks, 1000);
      let batchNum = 0;
      for (const chunk of chunks) {
        batchNum++;
        await client.query('BEGIN');
        for (const b of (chunk as any[])) {
          await client.query(`
            INSERT INTO ledger_blocks (
              block_index, timestamp, previous_hash, merkle_root, block_hash,
              event_type, resource_type, resource_id, resource_hash, actor_id, actor_name, payload
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (block_index) DO UPDATE SET
              previous_hash = EXCLUDED.previous_hash,
              merkle_root = EXCLUDED.merkle_root,
              block_hash = EXCLUDED.block_hash,
              payload = EXCLUDED.payload
          `, [
            b.blockIndex, b.timestamp, b.previousHash, b.merkleRoot, b.blockHash,
            b.eventType || null, b.resourceType || null, b.resourceId || null,
            b.resourceHash || null, b.actorId || null, b.actorName || null,
            JSON.stringify(b.payload || {})
          ]);
        }
        await client.query('COMMIT');
        if (batchNum % 5 === 0 || batchNum === chunks.length) {
          console.log(`  Processed ${Math.min(batchNum * 1000, data.ledger_blocks.length)} / ${data.ledger_blocks.length} blocks...`);
        }
      }
      counts.ledger_blocks = data.ledger_blocks.length;
      console.log(`✓ ${counts.ledger_blocks} ledger blocks migrated.`);
    }

    console.log('\n====================================================');
    console.log('       MIGRATION TO POSTGRESQL SUCCESSFUL!          ');
    console.log('====================================================');
    console.table(counts);

  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n❌ Fatal migration error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
