# Project Assumptions and Scope Reconciliation

**Project:** NyayaSetu — Secure Digital Document Management & Chain-of-Custody System  
**Organization:** Ministry of Home Affairs / National Crime Records Bureau (NCRB) — Women Safety Division  
**Problem Statement ID:** 26190  

---

## 1. Scope Reconciliation: DMS Core vs. Police Asset Lifecycle

### Analysis of Problem Statement Requirements
The core problem statement emphasizes a **Secure Digital Document Management System (DMS)** for law-enforcement agencies, courts, legal departments, and investigative organizations. It specifically addresses challenges surrounding:
- Fragmented physical storage and paper workflows.
- Tampering, missing document versions, and evidentiary integrity risks.
- Lack of auditability and broken chains of custody.
- Secure collaboration between Investigating Officers, Police Supervisors, Prosecutors, Judges, and Forensic Experts.

The prompt notes an additional expected-solution mention regarding **police asset lifecycle management** (monitoring police assets like vehicles, firearms, body cameras, and forensic kits).

### Architectural Decision & Resolution
1. **DMS as Primary Mission-Critical Scope**:
   The core DMS (case management, document versioning, SHA-256 integrity verification, Merkle ledger, digital signatures, evidence chain-of-custody, role-based access control, privacy-aware AI, and audit logging) forms the foundational backbone of the application.
2. **Police Asset Register as a Decoupled, Extensible Module**:
   A dedicated **Police Asset Register** module is implemented alongside the DMS. It provides full lifecycle tracking (Registered, Assigned, In Transit, Under Maintenance, Lost/Stolen, Retired, Disposed), assignment logs, and maintenance records.
3. **Strict Separation of Evidentiary and Asset Data**:
   To ensure that police asset operations never pollute or degrade evidentiary integrity, assets link to cases or evidence strictly through immutable relational reference IDs without granting direct write access to case files or chain-of-custody records.

---

## 2. Technical & Security Assumptions

### A. Authentication and Authorization
- **Credential Storage**: Uses adaptive cryptographic hashing (PBKDF2/Bcrypt with high iteration rounds and unique per-user salts). Plaintext passwords are never persisted or logged.
- **Multi-Factor Authentication (MFA)**: A simulated Time-Based One-Time Password (TOTP) / SMS OTP flow is built into the prototype login flow, demonstrating step-up authentication.
- **Least Privilege RBAC**: The system supports 8 distinct roles:
  1. `System Administrator`
  2. `Investigating Officer`
  3. `Police Supervisor`
  4. `Legal Officer / Prosecutor`
  5. `Court / Judicial Reviewer`
  6. `Forensic Officer`
  7. `Auditor / Compliance Officer`
  8. `External Stakeholder` (revocable temporary share)
- **Resource-Level Authorization**: Direct Object Reference (IDOR) protection is enforced server-side on all queries by validating tenant, station, department, and assigned case IDs.

### B. Cryptographic Integrity & Ledger
- **SHA-256 Document Hashing**: Uploaded binaries compute an immediate SHA-256 hash before storage.
- **Append-Only Merkle Hash Chain**: Every document version, signature, and custody transition is appended as a block containing `previousBlockHash`, `timestamp`, `eventType`, `payloadHash`, and `merkleRoot`.
- **Blockchain Anchoring Abstraction**: In production, blocks are periodically anchored to a permissioned ledger (such as Hyperledger Fabric or Polygon Private Subnet). In this prototype, an in-memory/SQLite cryptographic ledger service demonstrates end-to-end integrity proof generation, hash validation, and tamper-simulation detection.
- **Tamper Detection Simulation**: An interactive live verification tool recalculates binary hashes directly from storage and highlights integrity status with a pass/fail cryptographic verdict.

### C. Digital Signatures & Review Workflow
- **Prototype Signature Abstraction**: Simulates agency-issued X.509 PKI certificates using RSA/ECDSA key pairs and SHA-256 digest binding. 
- **Evidentiary Binding**: Signatures are cryptographically locked to the specific document version hash. Any modification to a document produces a new version and invalidates previous signatures.
- **Disclaimer**: Prototype signatures demonstrate cryptographic workflows and are clearly labeled as prototype digital proofs rather than legally certified e-Sign / Aadhaar e-Sign tokens.

### D. Privacy-Aware AI Integration
- **Privacy Boundary**: Document processing and OCR simulation run locally or through strict isolation boundaries without transmitting unredacted PII to external public LLM APIs.
- **Human-in-the-Loop Requirement**: AI extractions (e.g., IPC/BNS legal sections, witness entity recognition, incident summaries) are explicitly badged as "AI-Generated" and require manual verification and approval by the Investigating Officer before inclusion in formal filings.

### E. Storage and Encryption
- **Object Storage Abstraction**: Files are managed through an abstract storage provider (`StorageProvider` interface) preventing path traversal.
- **Envelope Encryption**: Demonstrates AES-256-GCM symmetric encryption for files at rest with per-file encryption keys and simulated key-management service (KMS).

---

## 3. Reversible Defaults
- Default database: SQLite with WAL (Write-Ahead Logging) mode and foreign-key constraints for portable, reproducible zero-dependency prototyping.
- Default demo credentials: Seeded test accounts representing all 8 roles across Delhi Police Crime Branch, Central Forensic Science Lab, and District Court.
