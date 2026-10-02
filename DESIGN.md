# NyayaSetu — Next-Generation GovTech Master Design Specification (DESIGN.md)

> **SIH 2026 Grand Finale Standard** · *National Legal & Evidentiary Intelligence Platform*  
> **Ecosystem:** Ministry of Home Affairs (MHA) · National Crime Records Bureau (NCRB) · State Police Forces · Directorate of Prosecution · e-Courts & High Courts · Central Forensic Science Laboratories (CFSL)  
> **Design Thesis:** *Government-Grade Credibility × Modern Product Design × AI-Powered Intelligence*  
> **Visual Benchmark:** Inspired by [Refero Design Styles](https://styles.refero.design/) (Linear, AuthKit, Superhuman, Monad, Raycast, Palantir Foundry, Stripe & Apple-grade ergonomics).

---

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                  │
│                              NYAYASETU · न्यायसेतु                                                │
│                 NATIONAL SECURE DOCUMENT & EVIDENTIARY INTELLIGENCE GRID                         │
│                                                                                                  │
│       ┌──────────────────────────────────────────────────────────────────────────────────┐       │
│       │   GOVERNMENT CREDIBILITY  ×  MODERN PRODUCT DESIGN  ×  ADVANCED AI INTELLIGENCE  │       │
│       └──────────────────────────────────────────────────────────────────────────────────┘       │
│                                                                                                  │
│   ┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐   │
│   │    SOVEREIGN ESSENCE      │  │    MODERN PRODUCT UX      │  │   INTELLIGENCE PLATFORM   │   │
│   │                           │  │                           │  │                           │   │
│   │ • Constitutional Authority│  │ • Clean Bento Grid Layouts│  │ • Cross-Doc Graph Analysis│   │
│   │ • Section 65B IEA & BSA   │  │ • Fluid Collapsible Sidebar│ │ • Real-Time Merkle Ledger │   │
│   │ • IT Act Sec 3A PKI Seals │  │ • Command Palette (Ctrl+K)│  │ • Automated NER & Timelines│  │
│   │ • Bilingual Nomenclature  │  │ • Soft Depth & Glassmorphism│ • BNS/IPC Dual Mapping     │   │
│   └───────────────────────────┘  └───────────────────────────┘  └───────────────────────────┘   │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Executive Vision: Evolving Government UI to Next-Gen Product UX

Traditional government portals suffer from rigid table-heavy layouts, cluttered navigation, heavy double-borders, and decorative official stamps that obstruct workflow efficiency. 

**NyayaSetu evolves government identity into a high-performance modern product.** It blends the authority and trust of sovereign Indian institutions with the interaction speed, visual sophistication, and ergonomics of world-class SaaS platforms.

### 1.1 The Evolution Paradigm

| Legacy Government Portal (Avoid) | Modern GovTech Product: NyayaSetu (Embrace) |
|---|---|
| Heavy rectangular double-borders & boxy cards | **Layered surfaces, soft elevation, and 1px hairline translucent borders** |
| Chunky, dated rubber stamps & heavy seals | **Sleek cryptographic verification pills, status micro-dots, and badge chips** |
| Cluttered multi-tier top navigation headers | **Minimalist header + ChatGPT-style collapsible left sidebar + `Ctrl+K` spotlight** |
| Static, information-only web pages | **Interactive workspaces, split-pane inspectors, live filters, and data graphs** |
| Generic Bootstrap-style tables with tiny text | **Modern data grids with inline actions, avatar chips, and monospace hashes** |
| Overpowering full-width tricolor stripes | **Subtle sovereign accents (micro-tricolor indicator, Ashoka emblem badge)** |
| Inflexible dark or harsh stark white layouts | **Curated dual-theme design system (Dark Cyber Grid & Light Parchment Ivory)** |

---

## 2. Color Architecture & Surface Hierarchy

NyayaSetu employs a curated, high-contrast palette calibrated for mission-critical investigation environments.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SURFACE ELEVATION MATRIX                                       │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   LEVEL 0 (Canvas)     ───▶   #090d16 (Dark)  /  #f8fafc (Light Slate)  /  #f8f6f1 (Light Ivory) │
│   LEVEL 1 (Card/Panel) ───▶   #0f172a (Dark)  /  #ffffff (Light Mode)   /  #ffffff (Parchment)   │
│   LEVEL 2 (Raised/Pop) ───▶   #1e293b (Dark)  /  #f1f5f9 (Light Mode)   /  #f0ede5 (Warm Cream)  │
│   LEVEL 3 (Overlay)    ───▶   #334155 (Dark)  /  #e2e8f0 (Light Mode)   /  #e8e0d4 (Sandstone)   │
│                                                                                                  │
│   HAIRLINE BORDERS     ───▶   rgba(255,255,255,0.08) (Dark)  /  rgba(0,0,0,0.06) (Light)        │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Core Color Tokens

| Token Name | Hex Code | Role & Semantics | Visual Application |
|---|---|---|---|
| `--ns-brand-navy` | `#0f172a` / `#1a3c6e` | Sovereign Authority & Primary Typography | Top headers, primary headings, dark brand surfaces |
| `--ns-chakra-blue` | `#2563eb` / `#3b82f6` | Judicial Intelligence & Interactive Focus | Active tabs, primary CTAs, links, interactive highlights |
| `--ns-saffron-action`| `#ea580c` / `#f97316` | Sovereign Energy & Urgent Interventions | Primary action accents, critical status, alert tags |
| `--ns-emerald-ledger`| `#10b981` / `#138808` | Cryptographic Integrity & Verification | Merkle valid state, signed certificates, approved status |
| `--ns-amber-custody` | `#f59e0b` / `#b8860b` | Forensic Custody & Legal Hold | Custody transfers, pending approvals, evidence tags |
| `--ns-crimson-risk`  | `#ef4444` / `#dc2626` | Security Alert & Tamper Isolation | Merkle tamper alert, classified restricted records |
| `--ns-canvas-dark`   | `#090d16` | Investigation Operations Canvas | Dark mode background (Cyber Crime & Forensics) |
| `--ns-canvas-light`  | `#f8f6f1` / `#f8fafc` | Judicial & Administrative Canvas | Light mode background (GIGW 3.0 & Court Mode) |

---

## 3. Editorial Typography Scale & Monospace Standard

A dual-typeface strategy ensures clean readability for high-density judicial text alongside monospace precision for cryptographic proofs.

### 3.1 Type Families
- **Primary UI & Headings:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif` (Ultra-clean modern geometry).
- **Institutional & Devanagari:** `Noto Serif Devanagari`, `Plus Jakarta Sans` (Authoritative legal display).
- **Cryptographic & Telemetry:** `JetBrains Mono`, `Geist Mono`, `ui-monospace` (FIR numbers, SHA-256 hashes, CPIDs, timestamps).

### 3.2 Typographic Hierarchy Table

| Level | Size | Weight | Tracking | Usage |
|---|---|---|---|---|
| **Display Hero** | `2.5rem` (`40px`) | `800` (Extra Bold) | `-0.03em` | Main dashboard titles, portal gateway branding |
| **Section Title** | `1.5rem` (`24px`) | `700` (Bold) | `-0.02em` | Module titles (Evidence Vault, Case Workspace) |
| **Card Header** | `1.0rem` (`16px`) | `600` (Semi Bold) | `-0.01em` | Bento card titles, dossier headers, modal titles |
| **Body Primary** | `0.875rem` (`14px`)| `400` / `500` (Regular) | `0` | Investigation notes, document summaries, metadata |
| **Micro Caption** | `0.75rem` (`12px`) | `500` (Medium) | `+0.01em` | Status indicators, custody transfer stamps, badge labels |
| **Mono Proof** | `0.6875rem` (`11px`)| `600` (Mono Semi) | `0` | SHA-256 digests, Merkle root, CPID: `DEL-2026-CRIM-001` |

---

## 4. Modern Component Architecture (Refero-Inspired)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 NYAYASETU WORKSPACE TOPOLOGY                                     │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   [ NS ]  NYAYASETU • National Legal & Evidence Grid    [Ctrl+K Search...]    [Role: Insp. Verma] │
│  ┌──────────┬─────────────────────────────────────────────────────────────────────────────────┐  │
│  │ ⚡ Dash   │ ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐    │  │
│  │ 📁 Cases  │ │ Active Cases: 24     │  │ Cryptographic Ledger │  │ AI Intelligence Feed │    │  │
│  │ 📄 Docs   │ │ +12% this month      │  │ All 18 Blocks Valid  │  │ 3 Contradictions     │    │  │
│  │ 🔒 Vault  │ └──────────────────────┘  └──────────────────────┘  └──────────────────────┘    │  │
│  │ 👥 Criminal│ ┌──────────────────────────────────────────────────┐  ┌───────────────────┐    │  │
│  │ 🤖 Copilot│ │ Case Evidence Graph & Cross-Case Links           │  │ Locality Heatmap  │    │  │
│  │ 🔗 Share  │ │ FIR-101 ──▶ CPID-001 (Monu) ──▶ FIR-103 (Rohini) │  │ Snatching: 38%    │    │  │
│  │ 🛡️ Audit  │ └──────────────────────────────────────────────────┘  └───────────────────┘    │  │
│  │          │                                                                                 │  │
│  │ [◀ Collapse]                                                                               │  │
│  └──────────┴─────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 ChatGPT-Style Collapsible Fluid Sidebar
- **Expanded State (`240px`):** Clean navigation items with active glow pills, role badge, quick stats, keyboard shortcut hint (`Ctrl+[` or `Ctrl+B`).
- **Collapsed State (`64px`):** Icon-only rail with sleek floating tooltip flyouts on hover.
- **Micro-Interaction:** Smooth cubic-bezier transition (`transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1)`).

### 4.2 Spotlight Command Palette (`Ctrl+K`)
- Replaces cluttered top navigation menus with a modern macOS/Raycast-style spotlight modal.
- Fast fuzzy search across Cases, FIRs, Criminal Dossiers, Documents, Cryptographic Blocks, and Police Assets.
- Keyboard navigation with `↑`, `↓`, `Enter`, and `Esc`.

### 4.3 Bento Grid Layout System
- Modular information cards that adapt fluidly between 1, 2, 3, and 4 columns.
- **Glassmorphism & Depth:** Backdrop blur (`backdrop-blur-md`), subtle radial gradient highlight in card corners, and 1px borders (`border-slate-200/80` or `border-zinc-800/50`).
- Interactive hover lifts (`transform: translateY(-2px)` + soft drop-shadow).

### 4.4 Modern Verification Chips (Replacing Heavy Rubber Stamps)
Instead of large, diagonal, messy rubber stamp graphics:
- **Verified Ledger Chip:** `[ ● SHA-256 SEC 65B ANCHORED ]` (Soft emerald background, crisp green dot, monospace hash snippet).
- **Confidential Restricted Chip:** `[ 🔒 RESTRICTED • IO ONLY ]` (Sleek crimson pill with subtle glow).
- **Judicial Seal Chip:** `[ ⚖️ DIGITAL PKI SIGNED • RSA-2048 ]` (Deep navy / chakra blue badge with officer certificate link).

### 4.5 Interactive Criminal Dossier & Locality Crime Checker
- **Criminal Profile Cards:** High-contrast layout with internal CPID (`CPID-2026-001`), known aliases, crime categorization badges, risk levels (`HIGH / CRITICAL / MODERATE`), active gang affiliations, and linked FIR count.
- **Locality Crime Checker for Police Stations:** Interactive station picker (Hauz Khas, Connaught Place, Lajpat Nagar, Rohini) with dynamic crime-type distribution bars (Snatching, Robbery, Cyber Extortion, Assault) to pinpoint active criminal gangs in real time.

### 4.6 AI Copilot & Cross-Document Graph
- **Split-Pane Workspace:** Document preview on the left; AI Copilot analysis (contradiction detection, IPC/BNS cross-referencing, timeline synthesis) on the right.
- **Confidence Scoring:** Explicit visual tags (`AI-Generated • 94% Confidence • Human Review Required`).

---

## 5. Micro-Interactions, Physics & Motion Design

NyayaSetu uses natural physics-based animations inspired by Linear and Superhuman to keep the platform feeling instantaneous and alive.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   MOTION TOKENS & PHYSICS                                        │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   TRANSITION TYPE       SPRING PARAMETERS             APPLICATION                                │
│   ────────────────────────────────────────────────────────────────────────────────────────       │
│   Sidebar Slide         stiffness: 380, damping: 30   Collapsible left navigation                │
│   Modal & Spotlight     stiffness: 400, damping: 28   Ctrl+K Command Palette, Dossier Modals     │
│   Card Hover Lift       duration: 150ms ease-out      Bento grid cards, criminal dossier tiles   │
│   Tab / Filter Switch   duration: 200ms ease-in-out   Crime category filters, role switcher      │
│   Pulse Verification    duration: 2s infinite ease    Active Merkle ledger synchronization node  │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. GIGW 3.0 & Sovereign Standards Reconciliation

Modern product design strengthens compliance with national government frameworks:

1. **GIGW 3.0 Accessibility:** High contrast text ratios (> 7:1 for headers, > 4.5:1 for body), full keyboard accessibility, clear focus rings (`focus:ring-2 focus:ring-blue-500`), and screen reader ARIA landmarks.
2. **Indian Evidence Act (Sec 65B) & Bharatiya Sakshya Adhiniyam (Sec 63):** Cryptographic SHA-256 hash chains, exportable statutory JSON audit trails, and non-repudiation timestamps.
3. **Information Technology Act (Sec 3A, 43, 66):** RSA 2048-bit digital signature certificates binding officer identities to document versions.
4. **Digital Personal Data Protection (DPDP) Act 2023:** Automated PII masking for Aadhaar, PAN, phone numbers, and protected witness identities.

---

## 7. Developer & Implementation Guidelines

When building or refining any view in NyayaSetu:

1. **Always use Predefined Design Tokens:** Rely on the layered surface system (`bg-[#f8f6f1]` / `bg-white` / `border-[#e2dcd2]` in Light; `bg-[#090d16]` / `bg-[#0f172a]` / `border-zinc-800` in Dark).
2. **Never Use Chunky Boxy Borders:** Replace heavy `border-2 border-black` styles with refined `border border-slate-200/80` or `border-[#e2dcd2]`.
3. **Ensure Instant Keyboard Navigation:** Support `Ctrl+K` for global search and `Ctrl+[` / `Ctrl+B` for sidebar toggle.
4. **Keep Typography Crisp:** Maintain strict visual separation between display serif headings, clean sans-serif UI body, and monospace cryptographic proofs.
5. **Preserve GovTech Authority:** Integrate official badges, department markers, and Section 65B hash anchors into elegant, modern component cards.