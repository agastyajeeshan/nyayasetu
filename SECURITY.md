# Security Policy & Cryptographic Specifications

**NyayaSetu: Secure Document & Evidence Management Platform**  
Ministry of Home Affairs / NCRB  

---

## 1. Cryptographic Standards & Implementation Details

### A. Document Integrity & Ledger
- **Algorithm**: Cryptographic SHA-256 (`crypto.createHash('sha256')`).
- **Merkle Ledger Block Structure**:
  ```json
  {
    "blockIndex": 1042,
    "previousHash": "a8f5f...e29b",
    "timestamp": "2026-09-03T15:30:00Z",
    "eventType": "DOCUMENT_VERSION_CREATED",
    "resourceId": "DOC-2026-0819",
    "resourceHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "actorId": "USR-IO-001",
    "merkleRoot": "7b82f...91c2",
    "blockHash": "c5d1e...44a1"
  }
  ```
- **Integrity Validation Engine**: Computes the streaming hash of storage binaries and compares against the recorded ledger block. Any byte discrepancy triggers an instant `INTEGRITY_VIOLATION` alert.

### B. Digital Signature Scheme
- **Prototype Engine**: Uses RSA 2048-bit / ECDSA P-256 key pairs with SHA-256 digest signing (`crypto.sign('sha256', data, privateKey)`).
- **Binding Rule**: Signatures are mathematically bound to:
  `Digest = SHA256(DocumentVersionHash + OfficerID + Timestamp + ReviewState)`
- **Verification Rule**: `crypto.verify('sha256', Digest, publicKey, signature)` validates author identity and guarantees the document has not been altered post-signature.

### C. Password Security
- **Algorithm**: Adaptive PBKDF2 with HMAC-SHA512 (100,000 rounds) or Bcrypt (Cost 12), with a 32-byte cryptographically secure random salt (`crypto.randomBytes(32)`).
- **Policy**: Minimum 10 characters, requiring uppercase, lowercase, numeric, and special characters.

### D. File Encryption at Rest
- **Envelope Encryption**: AES-256-GCM authenticated encryption. Each file binary is encrypted with a unique Data Encryption Key (DEK), which is wrapped with the Key Encryption Key (KEK).

---

## 2. Data Classification Matrix

| Level | Classification | Examples | Retention & Handling |
| :--- | :--- | :--- | :--- |
| **L1** | **Unclassified / Public** | General gazettes, public legal notices, standard operating procedures. | Standard storage; public download allowed. |
| **L2** | **Restricted** | Internal police circulars, general case summaries, non-sensitive correspondences. | Departmental access only; watermarked preview. |
| **L3** | **Confidential** | FIRs, charge sheets, witness statements, ballistic logs, post-mortem reports. | Investigating officer, assigned team, supervisor, and prosecutor only. |
| **L4** | **Secret / Top Secret** | Protected witness identities, juvenile records, undercover officer notes, intelligence reports. | Strict legal hold; multi-officer approval required for sharing; encrypted at rest. |

---

## 3. Privacy & Human-in-the-Loop AI Policy
1. **No External PII Leakage**: Scanned documents are parsed locally without sending sensitive victim/witness data to unvetted third-party endpoints.
2. **AI Advisory Role Only**: AI entity recognition and legal section suggestions are advisory only. Officers retain sole authority to verify, accept, or reject AI-generated metadata.

---

## 4. Vulnerability Disclosure & Reporting
Security vulnerabilities should be reported directly to the Cyber & Information Security Division (C&IS) at `security@ncrb.gov.in` (Simulated contact).
