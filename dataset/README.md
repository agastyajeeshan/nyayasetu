# NyayaSetu AI — Indian Legal & Law Enforcement Benchmark Dataset
**Problem Statement:** SIH26190 — Secure Digital Document Management System for Legal and Investigation Documents  
**Statutory Framework:** Bharatiya Nyaya Sanhita (BNS 2023), Bharatiya Nagarik Suraksha Sanhita (BNSS 2023), Bharatiya Sakshya Adhiniyam (BSA 2023)

---

## Dataset Overview
This dataset provides a verified synthetic corpus of Indian police FIR dockets, contemporaneous spot inspection Panchnamas, Central Forensic Science Laboratory (CFSL) examination reports, witness statements, digital evidence acquisition certificates under Section 63 BSA, and chain-of-custody transfer logs.

### Key Metrics
- **Total FIR Dockets:** 10
- **Document Metadata Records:** 10
- **Physical & Digital Evidence Exhibits:** 6
- **Malkhana Custody Event Logs:** 4
- **Persons of Interest (Accused/Witness/Complainant):** 4
- **Cross-Docket Criminal Syndicate Linkages:** 3
- **Full-Text Legal Corpus Files:** 4

---

## Directory Layout
```
dataset/
├── README.md                     # Dataset documentation and schema
├── cases.json & cases.csv        # Form I.F.1 FIR Dockets
├── documents.json & documents.csv# Legal document metadata & SHA-256 hashes
├── evidence.json & evidence.csv  # Forensic exhibit manifests
├── chain_of_custody.json & .csv  # Malkhana custody transfer history
├── persons.json & persons.csv    # Suspect, witness, and expert dossiers
├── syndicate_correlations.json   # Cross-case linkages (burner phones, ballistics, vehicles)
└── corpus/                       # Full-text legal documents in Markdown
    ├── CORPUS-01_FIR_2026_CRB_101.md
    ├── CORPUS-02_FIR_2026_CRB_102.md
    ├── CORPUS-03_FIR_2026_CRB_102.md
    └── CORPUS-04_FIR_2026_CRB_101.md
```

---

## Legal & Statutory Compliance
1. **Section 105 BNSS (Panchnama):** Audio-video recording logs and contemporaneous seizure documentation.
2. **Section 180 BNSS (Witness Statements):** Verbatim statements recorded during investigation.
3. **Section 63 BSA (Electronic Evidence):** Cryptographic SHA-256 bit-stream validation for digital server images and smartphone forensically acquired copies.
4. **Section 111 BNS (Organized Crime Syndicate):** Cross-jurisdiction evidentiary correlation matrices connecting burner telephone numbers, shared firearms, and getaway vehicles.
