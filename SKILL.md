---
name: secure-dms
description: Secure Digital Document Management System (DMS) for law enforcement agencies, courts, prosecutors, and forensic investigators.
---

# Secure Digital Document Management System (DMS) Skill & Runbook

## Overview
This skill guides the development, verification, security enforcement, and operational procedures for **NyayaSetu** — a secure, tamper-evident Document Management and Chain-of-Custody system built for Ministry of Home Affairs (NCRB) Problem Statement 26190.

## Core Architecture Principles
1. **Least Privilege & Role-Based Access Control (RBAC)**:
   - 8 distinct roles: `admin`, `investigating_officer`, `supervisor`, `prosecutor`, `judge`, `forensic_officer`, `auditor`, `external_stakeholder`.
   - Resource-level authorization: Case and document access are strictly restricted by tenant, station, department, and assignment.

2. **Cryptographic Integrity & Append-Only Merkle Ledger**:
   - Every document version computes a SHA-256 hash upon upload.
   - Hash chains link document versions and audit events into a tamper-evident Merkle ledger.
   - Live integrity verification recomputes file hashes and compares them against ledger anchors.

3. **Immutable Chain of Custody**:
   - Forensic evidence records enforce an append-only timeline of custody transfers.
   - Past custody events can never be edited or deleted; corrections are new recorded events.

4. **Digital Signature Protocol**:
   - Reviewers approve versions with cryptographic digital signatures binding officer identity, agency certificate, timestamp, and version SHA-256 hash.

5. **Privacy-Aware AI Integration**:
   - OCR and metadata extraction operate within privacy boundaries.
   - All AI insights are clearly flagged as "AI-Generated (Human Review Required)" with source references and editable fields.

6. **Decoupled Police Asset Lifecycle Module**:
   - Equipment and weapon tracking operates in a separate modular register, linkable to cases without weakening DMS evidence integrity.

## Development & Verification Runbook
- **Backend**: Express + TypeScript + SQLite + Node.js crypto
- **Frontend**: React + Vite + TypeScript + Lucide Icons + GovTech Design System
- **Testing**: Automated test suite for RBAC, hash verification, tamper detection, custody immutability, and sharing revocation.
