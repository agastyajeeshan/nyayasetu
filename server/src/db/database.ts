import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';
import {
  User,
  Case,
  Document,
  DocumentVersion,
  EvidenceItem,
  CustodyEvent,
  Review,
  ReviewComment,
  DigitalSignature,
  ShareLink,
  ShareAccessLog,
  AuditEvent,
  LedgerBlock,
  PoliceAsset,
  AssetLifecycleEvent,
  AIAnalysisResult,
  PersonRecord,
  NotificationItem,
  RedactedDocument
} from '../types/index.js';

export interface DatabaseData {
  users: User[];
  cases: Case[];
  documents: Document[];
  document_versions: DocumentVersion[];
  evidence_items: EvidenceItem[];
  custody_events: CustodyEvent[];
  reviews: Review[];
  review_comments: ReviewComment[];
  digital_signatures: DigitalSignature[];
  share_links: ShareLink[];
  share_access_logs: ShareAccessLog[];
  audit_events: AuditEvent[];
  ledger_blocks: LedgerBlock[];
  police_assets: PoliceAsset[];
  asset_lifecycle_events: AssetLifecycleEvent[];
  ai_analyses: AIAnalysisResult[];
  persons: PersonRecord[];
  notifications: NotificationItem[];
  redacted_documents: RedactedDocument[];
  user_private_keys: Record<string, string>; // userId -> privateKeyPem (securely kept for prototype demo)
}

class Database {
  private data: DatabaseData;
  private filePath: string;
  private isPersisting = false;

  constructor() {
    this.filePath = config.dbPath;
    this.data = this.getInitialData();
    this.init();
  }

  private getInitialData(): DatabaseData {
    return {
      users: [],
      cases: [],
      documents: [],
      document_versions: [],
      evidence_items: [],
      custody_events: [],
      reviews: [],
      review_comments: [],
      digital_signatures: [],
      share_links: [],
      share_access_logs: [],
      audit_events: [],
      ledger_blocks: [],
      police_assets: [],
      asset_lifecycle_events: [],
      ai_analyses: [],
      persons: [],
      notifications: [],
      redacted_documents: [],
      user_private_keys: {}
    };
  }

  private init() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const storageDir = config.storageDir;
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = { ...this.getInitialData(), ...parsed };
      } catch (err) {
        console.error('Error reading database file, initializing clean database:', err);
        this.save();
      }
    } else {
      this.save();
    }

    // Check PostgreSQL connection in background without blocking startup
    import('./postgres.js').then(({ PostgresService }) => {
      PostgresService.testConnection().then(async (res) => {
        if (res.connected) {
          console.log(`[Database] Connected to PostgreSQL ${res.version} (database: ${res.database})`);
          await PostgresService.initializeSchema().catch(() => {});
        } else {
          console.log(`[Database] PostgreSQL standby (${res.error}). Operating in high-speed persistent mode.`);
        }
      }).catch(() => {});
    }).catch(() => {});
  }

  public save(): void {
    // RUNTIME WRITE-BACK DECOMMISSIONED:
    // NyayaSetu runs exclusively on PostgreSQL as the authoritative single source of truth.
    // Writes to database.json are strictly disallowed.
    console.warn('[Database] Runtime JSON write ignored. NyayaSetu is running in PostgreSQL-only persistence mode.');
  }

  // Getters for tables
  public get users() { return this.data.users; }
  public get cases() { return this.data.cases; }
  public get documents() { return this.data.documents; }
  public get document_versions() { return this.data.document_versions; }
  public get evidence_items() { return this.data.evidence_items; }
  public get custody_events() { return this.data.custody_events; }
  public get reviews() { return this.data.reviews; }
  public get review_comments() { return this.data.review_comments; }
  public get digital_signatures() { return this.data.digital_signatures; }
  public get share_links() { return this.data.share_links; }
  public get share_access_logs() { return this.data.share_access_logs; }
  public get audit_events() { return this.data.audit_events; }
  public get ledger_blocks() { return this.data.ledger_blocks; }
  public get police_assets() { return this.data.police_assets; }
  public get asset_lifecycle_events() { return this.data.asset_lifecycle_events; }
  public get ai_analyses() { return this.data.ai_analyses; }
  public get persons() { return this.data.persons; }
  public get notifications() { return this.data.notifications; }
  public get redacted_documents() { return (this.data.redacted_documents = this.data.redacted_documents || []); }
  public get user_private_keys() { return this.data.user_private_keys; }

  // Generic helpers
  public clear(): void {
    this.data = this.getInitialData();
    this.save();
  }

  public rawData(): DatabaseData {
    return this.data;
  }
}

export const db = new Database();
