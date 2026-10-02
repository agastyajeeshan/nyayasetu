# Threat Model & Risk Analysis (STRIDE & OWASP)

**System:** NyayaSetu (Ministry of Home Affairs - NCRB)  
**Classification:** Restricted / Confidential Legal & Police Information  
**Standard:** Microsoft STRIDE Model & OWASP ASVS v4.0  

---

## 1. System Assets & Trust Boundaries

### Critical Assets
1. **Case Files & Investigation Records**: FIRs, charge sheets, witness statements, crime scene photos.
2. **Forensic Evidence & Chain of Custody**: Ballistics reports, DNA analysis, digital forensics, physical locker logs.
3. **Cryptographic Ledger & Audit Logs**: Hash-chained records of all uploads, views, approvals, signatures, and transfers.
4. **Digital Signatures & Signing Keys**: Officer certificates and private keys used for binding legal authenticity.
5. **PII and Sensitive Identity Data**: Victims, protected witnesses, juveniles, and informants.

### Trust Boundaries
- **TB-1: External Client to API Gateway / Web Server**: Browser client connecting over TLS/HTTPS.
- **TB-2: Application Layer to Storage & Database**: Server process reading/writing SQLite relational records and encrypted object storage.
- **TB-3: Police Intranet to External Stakeholders**: Expiring, watermarked share tokens provided to external legal counsel or judicial reviewers.
- **TB-4: Application Layer to AI & OCR Engine**: Data sanitization boundary for text extraction and classification.

---

## 2. Threat Matrix (STRIDE Analysis)

| Threat ID | Threat Category | Threat Scenario | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **T-01** | **Spoofing** | Attacker attempts to impersonate an Investigating Officer or Supervisor using brute-force credentials. | High | Adaptive PBKDF2/Bcrypt password hashing, MFA challenge requirement, failed-login lockout (5 attempts / 15-min cooldown), secure HTTP-only session cookies. |
| **T-02** | **Tampering** | Rogue insider or compromised admin modifies an uploaded FIR or forensic report binary in storage. | Critical | SHA-256 hash computed upon initial upload and anchored into an append-only cryptographic ledger. Interactive verification re-hashes storage binaries in real time, alerting on any bit mismatch. |
| **T-03** | **Repudiation** | An officer approves or rejects a charge sheet and later claims they never performed the action. | High | Cryptographic digital signatures binding the reviewer's private key, certificate, timestamp, and version hash. Append-only audit logs record IP, device, and actor. |
| **T-04** | **Information Disclosure** | Unauthorized officer accesses confidential evidence of a sensitive Women Safety case via URL parameter guessing (IDOR). | Critical | Dual-layer authorization: RBAC + Resource-level Ownership validation. Officers only query cases belonging to their assigned station/jurisdiction or direct assignment. |
| **T-05** | **Denial of Service** | Malicious actor floods upload or search endpoints with massive files or regex queries. | Medium | Strict payload size limits (50MB max), MIME-type and magic-number validation, API rate-limiting per IP/token, and paginated queries. |
| **T-06** | **Elevation of Privilege** | An Investigating Officer alters their role to System Administrator or forces an evidence deletion. | Critical | Server-side role enforcement on all API routes. Soft-delete only with retention lock; evidence and audit records have zero DELETE/UPDATE API endpoints. |
| **T-07** | **Sharing Exfiltration** | An external stakeholder retains access to an evidence link indefinitely or forwards it. | High | Time-bounded expiring share links, view-only watermarked previews, download permission gates, access-count caps, and instant one-click revocation. |
| **T-08** | **Malicious Uploads** | Attacker uploads an executable or script disguised as a PDF or image. | High | Validation of file extensions, MIME types, magic-byte inspection, malware scan abstraction layer, and storage outside of the public web root. |

---

## 3. Residual Risks & Production Hardening Roadmap
1. **Hardware Security Module (HSM)**: In production, officer digital signing keys and KMS master keys should reside in FIPS 140-2 Level 3 HSMs rather than software keystores.
2. **Decentralized Enterprise Blockchain**: Transition the internal Merkle ledger to a multi-agency consortium blockchain (e.g., Hyperledger Besu/Fabric connecting MHA, High Courts, and State Police).
3. **Advanced Biometric / e-Pramaan Auth**: Integrate National Identity e-Sign / e-Pramaan single-sign-on for Indian government operations.
