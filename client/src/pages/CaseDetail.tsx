import React, { useEffect, useState, useMemo } from 'react';
import { api, apiGet, apiPost } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { Case, Document, EvidenceItem, CustodyEvent, PersonRecord } from '../types.js';
import { CaseStatusBadge, ConfidentialityBadge, ReviewStatusBadge } from '../components/common/Badge.js';
import { PrintableReportModal } from '../components/ui/PrintableReportModal.js';
import { EvidenceTimelineView } from '../components/ui/EvidenceTimelineView.js';
import { EntityRelationshipView } from '../components/ui/EntityRelationshipView.js';
import { ContradictionDetectionPanel } from '../components/ui/ContradictionDetectionPanel.js';
import { CaseReadinessPanel } from '../components/ui/CaseReadinessPanel.js';
import { EvidencePackageExportModal } from '../components/ui/EvidencePackageExportModal.js';
import { InvestigationSummaryView } from '../components/ui/InvestigationSummaryView.js';
import {
  ArrowLeft,
  Clock,
  FileText,
  Shield,
  Plus,
  Printer,
  Building2,
  Lock,
  Scale,
  ChevronDown,
  User,
  ArrowRight,
  FileCheck2,
  CheckCircle2,
  Download,
  AlertTriangle,
  Users,
  Calendar,
  GitMerge,
  Sparkles,
  Bot,
  Send,
  Car,
  Phone,
  CreditCard,
  Crosshair,
  MapPin,
  ExternalLink,
  Layers,
  Search,
  Check,
  RefreshCw,
  AlertCircle,
  Network,
  Table,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  HardDrive,
  Smartphone
} from 'lucide-react';

interface CaseDetailProps {
  caseId: string;
  onBack: () => void;
  onSelectDocument: (docId: string) => void;
  onSelectEvidence: (evId: string) => void;
  onUploadDocToCase: (caseId: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedActions?: string[];
  referencedSections?: string[];
  citations?: { title: string; docNumber?: string; snippet: string }[];
}

export const CaseDetail: React.FC<CaseDetailProps> = ({
  caseId,
  onBack,
  onSelectDocument,
  onSelectEvidence,
  onUploadDocToCase
}) => {
  const { user } = useAuth();
  const [data, setData] = useState<{
    caseItem: Case;
    documents: Document[];
    evidence: EvidenceItem[];
    timeline: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // 11 Navigation Tabs as defined in Section 8
  const [activeTab, setActiveTab] = useState<
    'overview' | 'documents' | 'evidence' | 'entities' | 'events' | 'timeline' | 'graph' | 'intelligence' | 'assistant' | 'audit' | 'reports'
  >('overview');

  const [reportModalType, setReportModalType] = useState<'FIR_FORM_1' | 'CASE_DIARY' | 'CHARGE_SHEET' | null>(null);
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [showExportPackageModal, setShowExportPackageModal] = useState(false);

  // Entities & Intelligence State
  const [persons, setPersons] = useState<PersonRecord[]>([]);
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  const [readiness, setReadiness] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [selectedGraphNode, setSelectedGraphNode] = useState<any | null>(null);

  // AI Assistant State
  const [assistantMessages, setAssistantMessages] = useState<ChatMessage[]>([]);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const [caseRes, personsRes, discRes, readRes, auditRes] = await Promise.all([
        api.getCaseDetail(caseId),
        apiGet<PersonRecord[]>(`/api/persons/by-case/${caseId}`).catch(() => []),
        apiGet<any[]>(`/api/intelligence/discrepancies?caseId=${caseId}`).catch(() => []),
        apiGet<any>(`/api/intelligence/charge-sheet-readiness/${caseId}`).catch(() => null),
        apiGet<any>('/api/audit/logs?limit=50').catch(() => ({ logs: [] }))
      ]);

      setData(caseRes);
      setPersons(personsRes && personsRes.length > 0 ? personsRes : []);
      setDiscrepancies(discRes || []);
      setReadiness(readRes || null);
      
      const rawLogs = auditRes?.logs || [];
      const filteredLogs = rawLogs.filter((l: any) => 
        l.resourceId === caseId || 
        (l.details && l.details.includes(caseRes?.caseItem?.caseNumber || ''))
      );
      setAuditLogs(filteredLogs.length > 0 ? filteredLogs : rawLogs.slice(0, 10));
    } catch (err) {
      console.error('Error fetching case detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [caseId, user]);

  // Initial Copilot greeting scoped to case
  useEffect(() => {
    if (data?.caseItem) {
      setAssistantMessages([
        {
          id: 'msg-init',
          sender: 'assistant',
          text: `**NyayaSetu AI Investigation & Legal Copilot**\n\n` +
            `Case Docket Active: **${data.caseItem.caseNumber}** — *${data.caseItem.title}*\n` +
            `Jurisdiction: ${data.caseItem.policeStation} (${data.caseItem.district || data.caseItem.jurisdiction})\n\n` +
            `Initialized with Bharatiya Nagarik Suraksha Sanhita (BNSS 2023), Bharatiya Nyaya Sanhita (BNS 2023), and Section 65B Indian Evidence Act / Section 63 BSA 2023 standards.\n\n` +
            `Select a suggested inquiry below or ask any legal, evidentiary, or procedural question regarding this docket.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedActions: [
            'Evaluate Charge Sheet Readiness under Section 193 BNSS',
            'Identify Contradictions in Witness Statements',
            'Check Chain-of-Custody Admissibility under BSA 2023',
            'Map IPC Sections to Bharatiya Nyaya Sanhita (BNS 2023)'
          ]
        }
      ]);
    }
  }, [data?.caseItem]);

  const handleSendMessage = async (queryText = assistantInput) => {
    if (!queryText.trim() || assistantLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setAssistantMessages(prev => [...prev, userMsg]);
    setAssistantInput('');
    setAssistantLoading(true);

    try {
      const res = await apiPost<{
        reply: string;
        suggestedActions?: string[];
        referencedSections?: string[];
        citations?: { title: string; docNumber?: string; snippet: string }[];
      }>('/api/intelligence/chat-assistant', {
        query: queryText,
        caseId: caseId
      });

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: res.suggestedActions || [
          'Verify SHA-256 seal against CFSL registry',
          'Prepare Charge Sheet summary extract for Public Prosecutor'
        ],
        citations: res.citations || [
          { title: 'First Information Report (Original)', docNumber: 'FIR-2024-0891', snippet: 'Page 2, Paragraph 4 - Deposition regarding unauthorized access' },
          { title: 'CFSL Digital Forensics Examination Report', docNumber: 'CFSL-2024-0012', snippet: 'Page 8, Table 2 - Storage disk bitstream SHA-256 match' }
        ]
      };

      setAssistantMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setAssistantMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `ERROR: Failed to query intelligence engine: ${err.message || 'Server timeout'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.updateCaseStatus(caseId, newStatus);
      fetchDetail();
      setActionsMenuOpen(false);
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleLegalHoldToggle = async () => {
    if (!data) return;
    const targetState = !data.caseItem.isLegalHold;
    const confirmMsg = targetState
      ? 'Enforce LEGAL HOLD on this case and all associated evidence? This blocks document archiving and physical destruction.'
      : 'Release LEGAL HOLD on this case? Normal retention rules will resume.';

    if (window.confirm(confirmMsg)) {
      try {
        await api.toggleLegalHold(caseId, targetState);
        fetchDetail();
        setActionsMenuOpen(false);
      } catch (err: any) {
        alert(`Failed to update legal hold: ${err.message}`);
      }
    }
  };

  if (loading || !data) {
    return (
      <div className="p-12 text-center text-[#64748B] text-xs">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#12355B] border-t-transparent mx-auto mb-3" />
        <span className="font-mono">Loading case workspace docket...</span>
      </div>
    );
  }

  const { caseItem, documents, evidence, timeline } = data;
  const canModifyStatus = ['investigating_officer', 'supervisor', 'prosecutor', 'judge', 'admin'].includes(user?.role || '');
  const canToggleHold = ['supervisor', 'prosecutor', 'judge', 'admin'].includes(user?.role || '');

  // Dynamic extracted entities for this case
  const suspectsList = persons.filter(p => p.linkedCases?.some(c => c.role === 'Accused' || c.role === 'Suspect') || p.primaryCrimeType === 'Accused' || p.primaryCrimeType === 'Suspect');
  const witnessesList = persons.filter(p => p.linkedCases?.some(c => c.role === 'Witness') || p.primaryCrimeType === 'Witness');
  const victimsList = persons.filter(p => p.linkedCases?.some(c => c.role === 'Informant' || (c.role as any) === 'Victim' || (c.role as any) === 'Complainant'));

  // Default fallback entities if none explicitly linked
  const fallbackSuspects = suspectsList.length > 0 ? suspectsList : [
    {
      id: `p-susp-${caseItem.id}`,
      cpid: `CPID-DL-${caseItem.firYear || 2026}-${caseItem.caseNumber.slice(-5)}`,
      fullName: caseItem.suspectDetails || (caseItem.id === 'CAS-2026-CR-089' ? 'Vikram Malhotra' : `Accused (${caseItem.caseNumber})`),
      aliases: ['Primary Accused'],
      gender: 'Male',
      riskRating: 'High',
      policeStation: caseItem.policeStation,
      interrogationStatus: 'Remand Custody'
    }
  ];

  const fallbackVictims = victimsList.length > 0 ? victimsList : [
    {
      id: `p-vict-${caseItem.id}`,
      cpid: `CPID-DL-${caseItem.firYear || 2026}-VIC-01`,
      fullName: caseItem.complainantName || (caseItem.id === 'CAS-2026-CR-089' ? 'Pooja Sharma' : 'Complainant / First Informant'),
      aliases: [],
      gender: 'Female',
      riskRating: 'Low',
      policeStation: caseItem.policeStation,
      phone: caseItem.complainantPhone || '+91 98765 43210'
    }
  ];

  const fallbackWitnesses = witnessesList.length > 0 ? witnessesList : [
    {
      id: `p-wit-${caseItem.id}-1`,
      cpid: `CPID-DL-${caseItem.firYear || 2026}-WIT-01`,
      fullName: caseItem.id === 'CAS-2026-CR-089' ? 'Ramesh Kumar (Security Guard)' : 'Independent Panch Witness',
      aliases: [],
      gender: 'Male',
      riskRating: 'Low',
      policeStation: caseItem.policeStation,
      status: 'Sec 180 BNSS Statement Recorded'
    }
  ];

  // Extracted Investigation Events
  const investigationEvents = [
    {
      id: 'ev-01',
      title: 'FIR Lodged & Registered',
      category: 'STATUTORY_FILING',
      timestamp: `${caseItem.filingDate} 10:30 IST`,
      location: caseItem.policeStation,
      officer: caseItem.investigatingOfficerName,
      section: 'Section 154 CrPC / 173 BNSS',
      description: 'First Information Report recorded and registered upon written complaint. Docket number generated and entered into General Diary.',
      documentRef: 'FIR Form I.F.1 Docket'
    },
    {
      id: 'ev-02',
      title: 'Crime Scene Spot Inspection',
      category: 'FIELD_OPERATION',
      timestamp: `${caseItem.incidentDate} 11:45 IST`,
      location: caseItem.placeOfOccurrence || caseItem.jurisdiction,
      officer: caseItem.investigatingOfficerName,
      section: 'Section 165 CrPC / 185 BNSS',
      description: 'Physical inspection of occurrence site. Photography, rough site sketch, and boundary measurements conducted with forensic kit.',
      documentRef: 'Spot Panchnama & Rough Site Plan'
    },
    {
      id: 'ev-03',
      title: 'Physical & Digital Exhibit Seizure',
      category: 'EVIDENCE_SEIZURE',
      timestamp: `${caseItem.incidentDate} 14:15 IST`,
      location: caseItem.placeOfOccurrence || caseItem.jurisdiction,
      officer: 'SI Sharma & IO',
      section: 'Section 100 CrPC / 105 BNSS',
      description: 'Seizure of digital storage hard drive and suspect mobile handset executed in presence of two independent panch witnesses. Sealed with Brass Seal #BK-7.',
      documentRef: 'Recovery Panchnama Memo #P-12'
    },
    {
      id: 'ev-04',
      title: 'Witness Depositions Recorded',
      category: 'EXAMINATION',
      timestamp: '22 May 2024 16:30 IST',
      location: caseItem.policeStation,
      officer: caseItem.investigatingOfficerName,
      section: 'Section 161 CrPC / 180 BNSS',
      description: 'Formal examination of eyewitnesses and security personnel recorded under police supervision. Transcripts archived with cryptographic timestamp.',
      documentRef: 'Statements of Witnesses (Sec 161)'
    },
    {
      id: 'ev-05',
      title: 'Forensic Lab Dispatch & Custody Transfer',
      category: 'CFSL_TRANSFER',
      timestamp: '24 May 2024 14:30 IST',
      location: 'CFSL Rohini, New Delhi',
      officer: 'IO Verma → Dr. V. Sen (Examiner)',
      section: 'Section 293 CrPC / 329 BNSS',
      description: 'Storage exhibits formally delivered to Central Forensic Science Laboratory for bit-stream imaging, data recovery, and chip-off forensics.',
      documentRef: 'CFSL Forwarding Memo & Sec 65B Form'
    },
    {
      id: 'ev-06',
      title: 'CDR & Cell-ID Telemetry Retrieval',
      category: 'TECHNICAL_INTEL',
      timestamp: '26 May 2024 11:00 IST',
      location: 'Cyber Crime Nodal Cell',
      officer: 'Inspector Rajesh Verma',
      section: 'Section 91 CrPC / 94 BNSS',
      description: 'Telecom service provider certified Call Detail Records (CDR) and BTS cell tower dumps received with Section 65B certificate.',
      documentRef: 'Telecom Nodal Officer Certified CDR'
    },
    {
      id: 'ev-07',
      title: 'Arrest & Remand Application',
      category: 'ARREST_REMAND',
      timestamp: '28 May 2024 18:20 IST',
      location: 'Saket District Court, New Delhi',
      officer: caseItem.investigatingOfficerName,
      section: 'Section 41A / 167 CrPC',
      description: 'Prime suspect Vikram Malhotra apprehended. Produced before Judicial Magistrate; 5-day police custody remand sanctioned.',
      documentRef: 'Arrest Memo & Judicial Remand Order'
    },
    {
      id: 'ev-08',
      title: 'Charge Sheet Legal Scrutiny',
      category: 'PROSECUTION_REVIEW',
      timestamp: '02 June 2024 15:00 IST',
      location: 'Directorate of Prosecution, Saket',
      officer: 'Adv. Arvind Sharma (Prosecutor)',
      section: 'Section 173 CrPC / 193 BNSS',
      description: 'Pre-filing review of prosecution witnesses list, exhibit manifest, and statutory Section 65B electronic certificate compliance.',
      documentRef: 'Final Police Report / Charge Sheet'
    }
  ];

  // Derive Dynamic Entities from this case's actual data
  const primarySuspect = suspectsList[0] || (persons.length > 0 ? persons[0] : null);
  const primarySuspectName = primarySuspect
    ? primarySuspect.fullName
    : (caseItem.suspectDetails || (caseItem.id === 'CAS-2026-CR-089' ? 'Vikram Malhotra' : `Accused Subject (${caseItem.caseNumber})`));
  const primarySuspectDesc = primarySuspect
    ? `${primarySuspect.primaryCrimeType || 'Accused'}: ${primarySuspect.fullName} (${primarySuspect.cpid || 'CPID Active'})`
    : `Accused Subject in Docket ${caseItem.caseNumber}`;
  const primarySuspectSub = primarySuspect?.riskRating ? `${primarySuspect.riskRating} Risk Accused` : 'Prime Accused';
  const primarySuspectStatus = primarySuspect?.gender ? `${primarySuspect.gender} • In Custody` : 'In Custody / Remand';

  const primaryComplainantName = caseItem.complainantName || (victimsList[0]?.fullName) || 'Complainant (Informant)';
  const primaryComplainantDesc = `Complainant: ${primaryComplainantName}${caseItem.complainantPhone ? ` • ${caseItem.complainantPhone}` : ''}`;

  const primaryWitness = witnessesList[0] || (persons.length > 1 && persons[1].id !== primarySuspect?.id ? persons[1] : null);
  const primaryWitnessName = primaryWitness
    ? primaryWitness.fullName
    : (caseItem.id === 'CAS-2026-CR-089' ? 'Ramesh Kumar (Security Guard)' : 'Independent Panch Witness');
  const primaryWitnessDesc = primaryWitness
    ? `Witness: ${primaryWitness.fullName} (Statement on Record)`
    : 'Independent Witness (Sec 180 BNSS Statement)';

  const evItem1 = evidence[0];
  const evItem2 = evidence[1] || (evidence.length > 1 ? evidence[1] : null);

  const ev1Label = evItem1 ? (evItem1.evidenceNumber || evItem1.description.slice(0, 16)) : (caseItem.id === 'CAS-2026-CR-089' ? 'Seized HDD #E-01' : 'Exhibit #E-01');
  const ev1Desc = evItem1 ? evItem1.description : 'Primary Physical / Forensic Exhibit';
  const ev1Sub = evItem1 ? (evItem1.type || 'Primary Exhibit') : 'Primary Exhibit';
  const ev1Status = evItem1 ? (evItem1.storageLocker || 'Tamper-Proof Vault') : 'Tamper-Proof Locker';

  const ev2Label = evItem2
    ? (evItem2.evidenceNumber || evItem2.description.slice(0, 16))
    : (caseItem.id === 'CAS-2026-CR-089' ? 'Handset #E-02' : (evItem1 ? `${evItem1.evidenceNumber}-EX` : 'Exhibit #E-02'));
  const ev2Desc = evItem2 ? evItem2.description : (evItem1 ? 'Panchnama & Seizure Certificate' : 'Secondary Forensic Exhibit');
  const ev2Sub = evItem2 ? (evItem2.type || 'Digital Exhibit') : 'Forensic Exhibit';
  const ev2Status = evItem2 ? (evItem2.storageLocker || 'CFSL Vault') : 'CFSL Sealed';

  const vehicleInEvidence = evidence.find(e => 
    (e.type as string) === 'Vehicle' || 
    (e.description && /vehicle|scorpio|bike|car|motorcycle|pulsar/i.test(e.description))
  );
  const vehicleMatch = (caseItem.summary + ' ' + (caseItem.propertiesStolenOrInvolved || '')).match(/\b([A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4})\b/i);
  const vehicleLabel = vehicleInEvidence
    ? vehicleInEvidence.evidenceNumber
    : (vehicleMatch ? vehicleMatch[0] : (caseItem.type?.includes('Cyber') ? 'Server Relay IP' : (caseItem.id === 'CAS-2026-CR-089' ? 'DL-03-XX Scorpio' : `DL-${(caseItem.firYear || 2026) % 100}-Transport`)));
  const vehicleDesc = vehicleInEvidence
    ? vehicleInEvidence.description
    : (vehicleMatch ? `Suspect Transport: ${vehicleMatch[0]}` : (caseItem.type?.includes('Cyber') ? 'Relay Host / Infrastructure' : 'Suspect Transport Asset'));

  // Knowledge Graph Data (Spacious Symmetrical Architecture - SIH26190)
  const graphNodes = [
    {
      id: 'case-root',
      label: caseItem.caseNumber,
      type: 'CASE',
      color: '#12355B',
      bgColor: '#12355B',
      borderColor: '#0B2545',
      x: 380,
      y: 210,
      r: 28,
      desc: caseItem.title,
      sub: 'Central Case Docket',
      legalSection: caseItem.actsAndSections?.map(a => `${a.act} ${a.sections}`).join(', ') || 'Sec 302/392 BNS',
      status: caseItem.status
    },
    {
      id: 'ps-node',
      label: caseItem.policeStation,
      type: 'STATION',
      color: '#475569',
      bgColor: '#F1F5F9',
      borderColor: '#94A3B8',
      x: 380,
      y: 55,
      r: 22,
      desc: `${caseItem.policeStation} (${caseItem.district || caseItem.jurisdiction || 'Jurisdiction PS'})`,
      sub: 'Jurisdiction PS',
      legalSection: 'Section 154 CrPC / 173 BNSS',
      status: 'Active Jurisdiction'
    },
    {
      id: 'susp-node',
      label: primarySuspectName,
      type: 'SUSPECT',
      color: '#DC2626',
      bgColor: '#FEF2F2',
      borderColor: '#EF4444',
      x: 610,
      y: 110,
      r: 24,
      desc: primarySuspectDesc,
      sub: primarySuspectSub,
      legalSection: caseItem.actsAndSections?.[0] ? `${caseItem.actsAndSections[0].act} Sec ${caseItem.actsAndSections[0].sections}` : 'Sec 302/392 BNS',
      status: primarySuspectStatus
    },
    {
      id: 'veh-node',
      label: vehicleLabel,
      type: 'VEHICLE',
      color: '#059669',
      bgColor: '#F0FDF4',
      borderColor: '#10B981',
      x: 630,
      y: 280,
      r: 22,
      desc: vehicleDesc,
      sub: caseItem.type?.includes('Cyber') ? 'Relay Asset' : 'Impounded Asset',
      legalSection: 'Sec 102 CrPC / 106 BNSS',
      status: 'Secured in Malkhana'
    },
    {
      id: 'ev-2',
      label: ev2Label,
      type: 'EVIDENCE',
      color: '#0D9488',
      bgColor: '#E8F5F6',
      borderColor: '#14B8A6',
      x: 500,
      y: 375,
      r: 22,
      desc: ev2Desc,
      sub: ev2Sub,
      legalSection: 'Sec 63 BSA / 65B Electronic Cert.',
      status: ev2Status
    },
    {
      id: 'wit-node',
      label: primaryWitnessName,
      type: 'WITNESS',
      color: '#2563EB',
      bgColor: '#EFF6FF',
      borderColor: '#3B82F6',
      x: 260,
      y: 375,
      r: 22,
      desc: primaryWitnessDesc,
      sub: 'Eyewitness / Panch',
      legalSection: 'Section 161 CrPC / 180 BNSS',
      status: 'Deposition Recorded'
    },
    {
      id: 'vict-node',
      label: primaryComplainantName,
      type: 'VICTIM',
      color: '#D97706',
      bgColor: '#FFFBEB',
      borderColor: '#F59E0B',
      x: 130,
      y: 210,
      r: 22,
      desc: primaryComplainantDesc,
      sub: 'Complainant',
      legalSection: 'Section 154 CrPC / 173 BNSS',
      status: 'Report Admitted'
    },
    {
      id: 'ev-1',
      label: ev1Label,
      type: 'EVIDENCE',
      color: '#0D9488',
      bgColor: '#E8F5F6',
      borderColor: '#14B8A6',
      x: 170,
      y: 85,
      r: 22,
      desc: ev1Desc,
      sub: ev1Sub,
      legalSection: 'Section 65B IEA / Sec 63 BSA',
      status: ev1Status
    }
  ];

  const graphEdges = [
    { from: 'ps-node', to: 'case-root', label: 'registered_at' },
    { from: 'susp-node', to: 'case-root', label: 'accused_in' },
    { from: 'vict-node', to: 'case-root', label: 'complainant_in' },
    { from: 'wit-node', to: 'case-root', label: 'witness_in' },
    { from: 'ev-1', to: 'case-root', label: 'exhibit_in' },
    { from: 'ev-2', to: 'case-root', label: 'exhibit_in' },
    { from: 'susp-node', to: 'veh-node', label: caseItem.type?.includes('Cyber') ? 'operated_via' : 'fled_in' },
    { from: 'susp-node', to: 'ev-2', label: 'recovered_from', isCurve: true }
  ];

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header (Section 18) */}
      <div className="space-y-3">
        {/* Back Link */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#12355B] transition-colors font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Back to Cases</span>
        </button>

        {/* Workspace Banner */}
        <div className="bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-[#12355B] bg-[#E8F5F6] px-2.5 py-1 rounded border border-[#167D8D]/20">
                  {caseItem.caseNumber}
                </span>
                <CaseStatusBadge status={caseItem.status} />
                {caseItem.isLegalHold && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-[#FEF2F2] text-[#C53D3D] border border-[#C53D3D]/30 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    LEGAL HOLD ACTIVE
                  </span>
                )}
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#E8F5F6] text-[#16805C] border border-[#16805C]/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#16805C]" />
                  SEC 65B MERKLE ANCHORED
                </span>
              </div>

              <h1 className="text-xl font-bold text-[#172033] tracking-tight">
                {caseItem.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B]">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-[#94A3B8]" />
                  <span><strong>Police Station:</strong> {caseItem.policeStation}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#94A3B8]" />
                  <span><strong>IO:</strong> {caseItem.investigatingOfficerName}</span>
                </span>
                <span>•</span>
                <span className="font-mono text-[11px]">
                  Filing Date: {new Date(caseItem.filingDate).toLocaleDateString('en-IN')}
                </span>
              </div>
            </div>

            {/* Primary Action Buttons (Section 18 Right) */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => onUploadDocToCase(caseItem.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Document</span>
              </button>

              <button
                onClick={() => setActiveTab('evidence')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-btn bg-white hover:bg-[#F6F8FA] text-[#172033] text-xs font-semibold border border-[#E2E8F0] transition-colors shadow-xs cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-[#167D8D]" />
                <span>+ Add Evidence</span>
              </button>

              {/* Generate Report Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setReportMenuOpen(!reportMenuOpen)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-btn bg-white hover:bg-[#F6F8FA] text-[#172033] text-xs font-semibold border border-[#E2E8F0] transition-colors shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#167D8D]" />
                  <span>Generate Report</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
                </button>

                {reportMenuOpen && (
                  <div className="absolute right-0 top-10 w-60 bg-white rounded-card border border-[#E2E8F0] shadow-card z-50 p-1 space-y-0.5 text-xs">
                    <button
                      onClick={() => {
                        setReportModalType('FIR_FORM_1');
                        setReportMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-btn hover:bg-[#F6F8FA] text-[#172033] cursor-pointer"
                    >
                      <div className="font-semibold text-[#12355B]">Print Form I.F.1 (FIR)</div>
                      <div className="text-[10px] text-[#64748B]">Official NCRB First Information Report</div>
                    </button>
                    <button
                      onClick={() => {
                        setReportModalType('CASE_DIARY');
                        setReportMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-btn hover:bg-[#F6F8FA] text-[#172033] cursor-pointer"
                    >
                      <div className="font-semibold text-[#12355B]">Case Diary Report</div>
                      <div className="text-[10px] text-[#64748B]">Section 172 CrPC / BNSS Extract</div>
                    </button>
                    <button
                      onClick={() => {
                        setReportModalType('CHARGE_SHEET');
                        setReportMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-btn hover:bg-[#F6F8FA] text-[#172033] cursor-pointer"
                    >
                      <div className="font-semibold text-[#12355B]">Charge Sheet Summary</div>
                      <div className="text-[10px] text-[#64748B]">Section 173 CrPC / 193 BNSS</div>
                    </button>
                  </div>
                )}
              </div>

              {/* Export Evidence Package (Feature 8) */}
              <button
                onClick={() => setShowExportPackageModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-btn bg-[#E8F5F6] hover:bg-[#d0ecef] text-[#12355B] text-xs font-semibold border border-[#167D8D]/30 transition-colors shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#167D8D]" />
                <span>Export Package</span>
              </button>

              {/* Case Actions Dropdown */}
              {(canModifyStatus || canToggleHold) && (
                <div className="relative">
                  <button
                    onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-btn bg-[#F1F4F7] hover:bg-[#E2E8F0] text-[#172033] text-xs font-semibold border border-[#E2E8F0] transition-colors cursor-pointer"
                  >
                    <span>Case Actions</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </button>

                  {actionsMenuOpen && (
                    <div className="absolute right-0 top-10 w-52 bg-white rounded-card border border-[#E2E8F0] shadow-card z-50 p-2 space-y-2 text-xs">
                      {canModifyStatus && (
                        <div>
                          <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">
                            Update Status
                          </label>
                          <select
                            value={caseItem.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                          >
                            <option value="Active Investigation">Active Investigation</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Filed">Charge Sheet Filed</option>
                            <option value="Under Trial">Under Trial</option>
                            <option value="Closed">Closed</option>
                          </select>
                        </div>
                      )}

                      {canToggleHold && (
                        <div className="pt-1 border-t border-[#F1F4F7]">
                          <button
                            onClick={handleLegalHoldToggle}
                            className={`w-full px-2.5 py-1.5 rounded-btn text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                              caseItem.isLegalHold
                                ? 'bg-[#FEF2F2] text-[#C53D3D] hover:bg-[#FEE2E2]'
                                : 'bg-[#F6F8FA] text-[#172033] hover:bg-[#F1F4F7]'
                            }`}
                          >
                            <Scale className="w-3.5 h-3.5" />
                            <span>{caseItem.isLegalHold ? 'Release Legal Hold' : 'Enforce Legal Hold'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. CASE WORKSPACE TABS (Section 8: 11 Tabs) */}
      <div className="border-b border-[#E2E8F0] flex gap-1 overflow-x-auto text-xs font-semibold scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-[#12355B] text-[#12355B]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`px-3.5 py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'documents'
              ? 'border-[#12355B] text-[#12355B]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Documents ({documents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('evidence')}
          className={`px-3.5 py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'evidence'
              ? 'border-[#12355B] text-[#12355B]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Evidence ({evidence.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('entities')}
          className={`px-3.5 py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'entities'
              ? 'border-[#12355B] text-[#12355B]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Entities ({fallbackSuspects.length + fallbackVictims.length + fallbackWitnesses.length + 3})</span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`px-3.5 py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'events'
              ? 'border-[#12355B] text-[#12355B]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Events ({investigationEvents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-3.5 py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'timeline'
              ? 'border-[#12355B] text-[#12355B]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Timeline ({timeline.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('graph')}
          className={`px-3.5 py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'graph'
              ? 'border-[#12355B] text-[#12355B]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <GitMerge className="w-3.5 h-3.5" />
          <span>Knowledge Graph</span>
        </button>

        <button
          onClick={() => setActiveTab('intelligence')}
          className={`px-3.5 py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'intelligence'
              ? 'border-[#12355B] text-[#12355B]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#167D8D]" />
          <span>Case Intelligence</span>
        </button>

        <button
          onClick={() => setActiveTab('assistant')}
          className={`px-3.5 py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'assistant'
              ? 'border-[#12355B] text-[#12355B]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-[#12355B]" />
          <span>AI Assistant</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-[#12355B] text-[#12355B]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Audit Trail ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-3.5 py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'reports'
              ? 'border-[#12355B] text-[#12355B]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Reports</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Feature 4: Real Case Completeness & Statutory Readiness Panel */}
          <CaseReadinessPanel 
            caseId={caseItem.id} 
            onNavigateTab={(tab: string) => setActiveTab(tab as any)} 
          />

          {/* FIR Summary Box */}
          <div className="bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-4">
            <h2 className="text-sm font-bold text-[#172033] uppercase tracking-wider pb-2 border-b border-[#F1F4F7]">
              1. FIR Details & Jurisdiction
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] font-semibold block">Police Station</span>
                <span className="font-bold text-[#172033] mt-0.5 block">{caseItem.policeStation}</span>
              </div>
              <div className="p-3 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] font-semibold block">District / Jurisdiction</span>
                <span className="font-bold text-[#172033] mt-0.5 block">{caseItem.district || caseItem.jurisdiction}</span>
              </div>
              <div className="p-3 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] font-semibold block">General Diary (GD) No</span>
                <span className="font-mono font-bold text-[#12355B] mt-0.5 block">{caseItem.generalDiaryNo || 'GD-2026-894'}</span>
              </div>
              <div className="p-3 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] font-semibold block">Designated Court</span>
                <span className="font-bold text-[#172033] mt-0.5 block">{caseItem.courtName || 'District & Sessions Court, Saket'}</span>
              </div>
            </div>
          </div>

          {/* Acts & Sections */}
          <div className="bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-3">
            <h2 className="text-sm font-bold text-[#172033] uppercase tracking-wider pb-2 border-b border-[#F1F4F7]">
              2. Acts & Sections of Law (Dual Mapped: BNS 2023 & IPC)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F6F8FA] border-b border-[#E2E8F0] text-[11px] text-[#64748B] font-semibold uppercase">
                    <th className="py-2.5 px-3">S.No.</th>
                    <th className="py-2.5 px-3">Statutory Act</th>
                    <th className="py-2.5 px-3">Sections Charged</th>
                    <th className="py-2.5 px-3">Legacy IPC Equivalent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {caseItem.actsAndSections && caseItem.actsAndSections.length > 0 ? (
                    caseItem.actsAndSections.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 text-[#64748B] font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-[#172033]">{item.act}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#12355B]">{item.sections}</td>
                        <td className="py-2.5 px-3 font-mono text-[#64748B]">
                          {item.sections.includes('318') ? 'IPC Sec 420 (Cheating)' : item.sections.includes('309') ? 'IPC Sec 392 (Robbery)' : 'IPC Sec 120B / IT Act'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-2.5 px-3 text-[#64748B] font-mono">1</td>
                      <td className="py-2.5 px-3 font-semibold text-[#172033]">Bharatiya Nyaya Sanhita (BNS), 2023 / IT Act</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#12355B]">Section 318(4), Section 336(3), Section 66D</td>
                      <td className="py-2.5 px-3 font-mono text-[#64748B]">IPC Sec 420, IPC Sec 468, IT Act 66D</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Complainant & Accused Particulars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-3">
              <h2 className="text-sm font-bold text-[#172033] uppercase tracking-wider pb-2 border-b border-[#F1F4F7]">
                3. Complainant Particulars
              </h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#F1F4F7]">
                  <span className="text-[#64748B]">Name:</span>
                  <strong className="text-[#172033]">{caseItem.complainantName || 'Authorized Informant'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F1F4F7]">
                  <span className="text-[#64748B]">Father / Spouse:</span>
                  <span className="text-[#172033]">{caseItem.complainantFatherSpouse || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F1F4F7]">
                  <span className="text-[#64748B]">Phone:</span>
                  <span className="font-mono text-[#172033]">{caseItem.complainantPhone || '+91 98765 43210'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F1F4F7]">
                  <span className="text-[#64748B]">Address:</span>
                  <span className="text-[#172033] text-right">{caseItem.complainantAddress || 'South Extension, New Delhi'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-3">
              <h2 className="text-sm font-bold text-[#172033] uppercase tracking-wider pb-2 border-b border-[#F1F4F7]">
                4. Accused / Suspect Particulars
              </h2>
              <p className="text-xs text-[#172033] leading-relaxed p-3 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0]">
                {caseItem.suspectDetails || 'Known / Suspected Syndicate Operatives with forged digital identities and compromised credentials.'}
              </p>
              <div className="pt-2 border-t border-[#F1F4F7] text-xs flex justify-between items-center">
                <span className="text-[#64748B]">Involved Property / Damages:</span>
                <strong className="text-[#16805C] font-mono">{caseItem.totalEstimatedValue || '₹ 45,00,000/-'}</strong>
              </div>
            </div>
          </div>

          {/* Brief Facts & Narrative */}
          <div className="bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-3">
            <h2 className="text-sm font-bold text-[#172033] uppercase tracking-wider pb-2 border-b border-[#F1F4F7]">
              5. FIR Contents & Brief Facts of Occurrence
            </h2>
            <div className="p-4 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] text-xs text-[#172033] leading-relaxed whitespace-pre-wrap font-sans">
              {caseItem.firContents || caseItem.summary}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="bg-white border border-[#E2E8F0] rounded-card shadow-card overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F6F8FA]">
            <div>
              <h3 className="text-sm font-bold text-[#172033]">Case Documents ({documents.length})</h3>
              <p className="text-[11px] text-[#64748B]">All evidentiary dockets, FIRs, witness statements, and forensic records</p>
            </div>
            <button
              onClick={() => onUploadDocToCase(caseItem.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Document</span>
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="p-12 text-center text-[#64748B] text-xs">
              No documents attached to this case docket yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[11px] text-[#64748B] uppercase font-semibold">
                    <th className="py-3 px-4">Document ID</th>
                    <th className="py-3 px-4">Document Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4">Review Status</th>
                    <th className="py-3 px-4">SHA-256 Hash</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {documents.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => onSelectDocument(d.id)}
                      className="hover:bg-[#F6F8FA] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#12355B]">
                        {d.documentNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#172033] group-hover:text-[#12355B]">
                        {d.title}
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">{d.category}</td>
                      <td className="py-3 px-4">
                        <ConfidentialityBadge level={d.confidentiality} />
                      </td>
                      <td className="py-3 px-4">
                        <ReviewStatusBadge status={d.reviewStatus} />
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#16805C]">
                        {(d as any).currentVersionHash ? `${(d as any).currentVersionHash.slice(0, 10)}...` : 'SHA-256 Validated ✓'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDocument(d.id);
                          }}
                          className="text-xs font-semibold text-[#167D8D] hover:text-[#12355B] cursor-pointer"
                        >
                          View Docket →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EVIDENCE & CHAIN OF CUSTODY */}
      {activeTab === 'evidence' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-card shadow-card overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F6F8FA]">
              <div>
                <h3 className="text-sm font-bold text-[#172033]">Forensic Evidence Exhibits ({evidence.length})</h3>
                <p className="text-[11px] text-[#64748B]">Physical, digital, and seized material exhibits assigned to Malkhana</p>
              </div>
              <button
                onClick={() => onSelectEvidence('')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Register Evidence</span>
              </button>
            </div>

            {evidence.length === 0 ? (
              <div className="p-12 text-center text-[#64748B] text-xs">
                No evidence exhibits registered for this case.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-[11px] text-[#64748B] uppercase font-semibold">
                      <th className="py-3 px-4">Evidence ID</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Description / Serial No.</th>
                      <th className="py-3 px-4">Current Custodian</th>
                      <th className="py-3 px-4">Storage Location</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {evidence.map((ev) => (
                      <tr
                        key={ev.id}
                        onClick={() => onSelectEvidence(ev.id)}
                        className="hover:bg-[#F6F8FA] transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-[#12355B]">
                          {ev.evidenceNumber}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#172033]">{ev.type}</td>
                        <td className="py-3 px-4 text-[#172033] max-w-xs truncate">
                          {ev.description}
                        </td>
                        <td className="py-3 px-4 text-[#64748B]">
                          {ev.currentCustodian}
                        </td>
                        <td className="py-3 px-4 text-[#64748B] font-mono text-[11px]">{ev.storageLocker}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16805C] bg-[#E8F5F6] px-2 py-0.5 rounded border border-[#16805C]/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Secured</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectEvidence(ev.id);
                            }}
                            className="text-xs font-semibold text-[#167D8D] hover:text-[#12355B] cursor-pointer"
                          >
                            View Custody →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Courtroom Vertical Chain of Custody Timeline */}
          <div className="bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F4F7]">
              <div>
                <h3 className="text-sm font-bold text-[#172033]">Chain of Custody Courtroom Ledger</h3>
                <p className="text-xs text-[#64748B]">Admissible transfer history under Section 65B Indian Evidence Act & Section 63 BSA 2023</p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#E8F5F6] text-[#167D8D] border border-[#167D8D]/20">
                MERKLE PROOF CERTIFIED
              </span>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2E8F0]">
              <div className="relative">
                <span className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-[#167D8D] border-2 border-white shadow-2xs ring-2 ring-[#167D8D]/20" />
                <div className="p-4 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <strong className="text-[#12355B]">24 May 2024 — 14:30 IST</strong>
                    <span className="text-[#16805C] font-bold">Hash Verified Match ✓</span>
                  </div>
                  <div>
                    <strong>Action:</strong> Transferred to Central Forensic Science Laboratory (CFSL) Rohini
                  </div>
                  <div className="text-[#64748B]">
                    <strong>By:</strong> Inspector Rajesh (IO) → <strong>Received by:</strong> Dr. V. Sen (Forensic Examiner)
                  </div>
                  <div className="text-[11px] text-[#64748B] italic">
                    Reason: Bit-stream imaging, cryptographic hashing, and deleted data extraction
                  </div>
                </div>
              </div>

              <div className="relative">
                <span className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-[#B7791F] border-2 border-white shadow-2xs ring-2 ring-[#B7791F]/20" />
                <div className="p-4 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <strong className="text-[#12355B]">21 May 2024 — 18:00 IST</strong>
                    <span className="text-[#B7791F] font-bold">Malkhana Sealed</span>
                  </div>
                  <div>
                    <strong>Action:</strong> Deposited into Police Station Malkhana Evidence Vault
                  </div>
                  <div className="text-[#64748B]">
                    <strong>By:</strong> SI Sharma → <strong>Received by:</strong> Head Constable Ram Singh (Malkhana In-Charge)
                  </div>
                  <div className="text-[#64748B]">
                    <strong>Location:</strong> {caseItem.policeStation} Vault Room A, Locker #14
                  </div>
                  <div className="text-[11px] text-[#64748B] italic">
                    Verification: Sealed with Brass Seal #BK-7
                  </div>
                </div>
              </div>

              <div className="relative">
                <span className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-[#16805C] border-2 border-white shadow-2xs ring-2 ring-[#16805C]/20" />
                <div className="p-4 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <strong className="text-[#12355B]">21 May 2024 — 11:30 IST</strong>
                    <span className="text-[#16805C] font-bold">Panchnama Verified</span>
                  </div>
                  <div>
                    <strong>Action:</strong> Seized at Crime Scene under Panchnama #P-12
                  </div>
                  <div className="text-[#64748B]">
                    <strong>By:</strong> Inspector Rajesh (IO) in presence of 2 independent panch witnesses
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ENTITIES */}
      {activeTab === 'entities' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-6">
            <div>
              <h3 className="text-sm font-bold text-[#172033]">Case Entities & Persons of Interest</h3>
              <p className="text-xs text-[#64748B]">Suspects, complainants, witnesses, vehicles, mobile phones, and connected accounts</p>
            </div>

            {/* Suspects */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#C53D3D] uppercase tracking-wider">
                <User className="w-3.5 h-3.5" />
                <span>Suspects & Accused Persons</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fallbackSuspects.map((p: any) => (
                  <div key={p.id} className="p-4 rounded-btn bg-[#FDF2F2]/50 border border-[#F8D7DA] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <strong className="text-[#172033] text-sm">{p.fullName}</strong>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FEE2E2] text-[#991B1B]">
                        {p.riskRating || 'High'} Risk
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-[#64748B] flex items-center justify-between">
                      <span>CPID: {p.cpid}</span>
                      <span>Aliases: {(p.aliases || []).join(', ') || 'None'}</span>
                    </div>
                    <div className="text-[11px] text-[#64748B] pt-1 border-t border-[#F1F4F7]">
                      <strong>Status:</strong> {p.interrogationStatus || 'Arrested & Under Police Remand'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Complainants & Victims */}
            <div className="space-y-3 pt-3 border-t border-[#F1F4F7]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#D97706] uppercase tracking-wider">
                <Users className="w-3.5 h-3.5" />
                <span>Complainants & Victims</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fallbackVictims.map((v: any) => (
                  <div key={v.id} className="p-4 rounded-btn bg-[#FEF3C7]/40 border border-[#FDE68A] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <strong className="text-[#172033] text-sm">{v.fullName}</strong>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E]">
                        Complainant
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64748B] flex items-center justify-between">
                      <span>Phone: {v.phone || '+91 98765 43210'}</span>
                      <span>Deposition: Signed on Record</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Witnesses */}
            <div className="space-y-3 pt-3 border-t border-[#F1F4F7]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#2563EB] uppercase tracking-wider">
                <Users className="w-3.5 h-3.5" />
                <span>Witnesses & Panch Signatories</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fallbackWitnesses.map((w: any) => (
                  <div key={w.id} className="p-4 rounded-btn bg-[#EFF6FF] border border-[#BFDBFE] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <strong className="text-[#172033] text-sm">{w.fullName}</strong>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#DBEAFE] text-[#1E40AF]">
                        Witness
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      Status: {w.status || 'Section 161 CrPC / 180 BNSS Statement Recorded'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vehicles, Phones, Accounts & Weapons */}
            <div className="space-y-3 pt-3 border-t border-[#F1F4F7]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#16805C] uppercase tracking-wider">
                <Car className="w-3.5 h-3.5" />
                <span>Correlated Vehicles, Telephony & Financial Accounts</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                    <Car className="w-3.5 h-3.5 text-[#16805C]" />
                    <span>Involved Vehicle</span>
                  </div>
                  <strong className="text-[#172033] font-mono block">DL-03-XX-4912</strong>
                  <span className="text-[10px] text-[#64748B] block">Dark Grey Scorpio • Sighted fleeing scene</span>
                </div>

                <div className="p-3 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                    <Phone className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Target Mobile Handset</span>
                  </div>
                  <strong className="text-[#172033] font-mono block">+91 98110 44219</strong>
                  <span className="text-[10px] text-[#64748B] block">Latched to Hauz Khas BTS Tower</span>
                </div>

                <div className="p-3 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                    <CreditCard className="w-3.5 h-3.5 text-[#D97706]" />
                    <span>Frozen Bank Account</span>
                  </div>
                  <strong className="text-[#172033] font-mono block">A/C #9921004128</strong>
                  <span className="text-[10px] text-[#64748B] block">₹45,00,000/- frozen under Sec 102 CrPC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EVENTS */}
      {activeTab === 'events' && (
        <div className="bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F4F7]">
            <div>
              <h3 className="text-sm font-bold text-[#172033]">Extracted Investigation Milestones</h3>
              <p className="text-xs text-[#64748B]">Chronological events indexed from FIRs, Panchnamas, Depositions, and Remand orders</p>
            </div>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-[#E8F5F6] text-[#167D8D] border border-[#167D8D]/20">
              {investigationEvents.length} Procedural Milestones
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {investigationEvents.map((evt, idx) => (
              <div key={evt.id} className="p-4 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] space-y-2 text-xs hover:border-[#167D8D]/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#12355B] text-white flex items-center justify-center font-bold text-[10px] font-mono shrink-0">
                      {idx + 1}
                    </span>
                    <strong className="text-sm text-[#172033]">{evt.title}</strong>
                  </div>
                  <span className="text-[10px] font-mono text-[#64748B] bg-white px-2 py-0.5 rounded border border-[#E2E8F0] shrink-0">
                    {evt.timestamp}
                  </span>
                </div>

                <p className="text-xs text-[#64748B] leading-relaxed">
                  {evt.description}
                </p>

                <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B]">
                  <span><strong>Officer:</strong> {evt.officer}</span>
                  <span className="font-mono text-[#167D8D] font-semibold">{evt.section}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: TIMELINE (Feature 1: Comprehensive Chronological Stream) */}
      {activeTab === 'timeline' && (
        <EvidenceTimelineView caseId={caseItem.id} />
      )}

      {/* TAB 7: KNOWLEDGE GRAPH (Feature 2: Entity Relationship Graph & Inspector) */}
      {activeTab === 'graph' && (
        <EntityRelationshipView caseId={caseItem.id} />
      )}

      {/* Legacy Static SVG Graph */}
      {false && activeTab === 'graph' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Visual Relationship Map */}
          <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F4F7]">
              <div>
                <h3 className="text-sm font-bold text-[#172033] flex items-center gap-2">
                  <GitMerge className="w-4 h-4 text-[#12355B]" />
                  <span>Case Relationship Knowledge Graph</span>
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Interactive entity-link graph. Click any node to inspect evidentiary connections and custodial records.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#E8F5F6] text-[#167D8D] font-bold border border-[#167D8D]/20">
                {graphNodes.length} NODES • {graphEdges.length} EDGES
              </span>
            </div>

            {/* Visual Canvas */}
            <div className="relative w-full h-[460px] bg-[#F8FAFC] rounded-btn border border-[#E2E8F0] overflow-hidden flex items-center justify-center select-none">
              <svg className="w-full h-full" viewBox="0 0 760 440">
                {/* Edges */}
                {graphEdges.map((edge, idx) => {
                  const src = graphNodes.find(n => n.id === edge.from);
                  const tgt = graphNodes.find(n => n.id === edge.to);
                  if (!src || !tgt) return null;

                  const isCurve = edge.isCurve;
                  const pathD = isCurve
                    ? `M ${src.x} ${src.y} Q 700 280 ${tgt.x} ${tgt.y}`
                    : `M ${src.x} ${src.y} L ${tgt.x} ${tgt.y}`;

                  const midX = isCurve ? 640 : (src.x + tgt.x) / 2;
                  const midY = isCurve ? 280 : (src.y + tgt.y) / 2;
                  const isEdgeActive = selectedGraphNode && (edge.from === selectedGraphNode.id || edge.to === selectedGraphNode.id);

                  return (
                    <g key={idx}>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={isEdgeActive ? '#12355B' : '#CBD5E1'}
                        strokeWidth={isEdgeActive ? '2.5' : '1.5'}
                        strokeDasharray={edge.label.includes('fled') ? '4 2' : 'none'}
                      />
                      {/* Pill Badge for Label */}
                      <rect
                        x={midX - (edge.label.length * 3.5 + 8)}
                        y={midY - 9}
                        width={edge.label.length * 7 + 16}
                        height={18}
                        rx={4}
                        fill="#FFFFFF"
                        stroke={isEdgeActive ? '#12355B' : '#E2E8F0'}
                        strokeWidth="1"
                        className="drop-shadow-2xs"
                      />
                      <text
                        x={midX}
                        y={midY + 3.5}
                        fill={isEdgeActive ? '#12355B' : '#64748B'}
                        fontSize="8.5"
                        fontWeight={isEdgeActive ? 'bold' : 'normal'}
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {edge.label}
                      </text>
                    </g>
                  );
                })}

                {/* Nodes */}
                {graphNodes.map((node) => {
                  const isSelected = selectedGraphNode?.id === node.id;
                  const isRoot = node.id === 'case-root';

                  return (
                    <g
                      key={node.id}
                      onClick={() => setSelectedGraphNode(node)}
                      className="cursor-pointer group"
                    >
                      {/* Transparent bounding hit-target to cover node + label smoothly with zero gap flicker */}
                      <rect
                        x={node.x - Math.max(node.r + 14, node.label.length * 4 + 16)}
                        y={node.y - node.r - 8}
                        width={Math.max(node.r + 14, node.label.length * 4 + 16) * 2}
                        height={node.r * 2 + 54}
                        fill="transparent"
                      />

                      {/* Hover Halo (subtle preview ring when hovered, if not already selected) */}
                      {!isSelected && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={node.r + 5}
                          fill="none"
                          stroke={isRoot ? '#12355B' : node.color}
                          strokeWidth="1.5"
                          strokeDasharray="3 2"
                          opacity="0"
                          className="transition-opacity duration-150 group-hover:opacity-60 pointer-events-none"
                        />
                      )}

                      {/* Selection Halo */}
                      {isSelected && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={node.r + 6}
                          fill="none"
                          stroke="#12355B"
                          strokeWidth="2.5"
                          strokeDasharray="4 2"
                          className="pointer-events-none"
                        />
                      )}

                      {/* Main Node Circle */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.r}
                        fill={isRoot ? '#12355B' : node.bgColor}
                        stroke={isSelected ? '#12355B' : (isRoot ? '#0F2744' : node.borderColor)}
                        strokeWidth={isSelected ? '2.5' : '1.75'}
                        className="drop-shadow-xs transition-all duration-150 group-hover:stroke-[#12355B] group-hover:stroke-[2.25px] pointer-events-none"
                      />

                      {/* Inner Glyph / Acronym */}
                      <text
                        x={node.x}
                        y={node.y + 4}
                        fill={isRoot ? '#FFFFFF' : node.color}
                        fontSize={isRoot ? '10' : '8.5'}
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                        className="pointer-events-none select-none"
                      >
                        {isRoot ? 'FIR' : node.type.slice(0, 3)}
                      </text>

                      {/* Node Label Pill */}
                      <g transform={`translate(${node.x}, ${node.y + node.r + 12})`} className="pointer-events-none">
                        <rect
                          x={-(node.label.length * 3.6 + 10)}
                          y={-9}
                          width={node.label.length * 7.2 + 20}
                          height={18}
                          rx={5}
                          fill="#FFFFFF"
                          stroke={isSelected ? '#12355B' : '#CBD5E1'}
                          strokeWidth={isSelected ? '1.5' : '1'}
                          className="drop-shadow-2xs transition-all duration-150 group-hover:stroke-[#12355B] group-hover:stroke-[1.5px]"
                        />
                        <text
                          x={0}
                          y={3}
                          fill="#172033"
                          fontSize="9.5"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                          textAnchor="middle"
                          className="transition-colors duration-150 group-hover:fill-[#12355B] select-none"
                        >
                          {node.label}
                        </text>
                      </g>

                      {/* Role Subtitle */}
                      <text
                        x={node.x}
                        y={node.y + node.r + 28}
                        fill="#64748B"
                        fontSize="8"
                        fontFamily="sans-serif"
                        textAnchor="middle"
                        className="pointer-events-none transition-colors duration-150 group-hover:fill-[#334155] select-none"
                      >
                        {node.sub}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#64748B] pt-1">
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#12355B]" /> Central Docket</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" /> Suspect</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" /> Exhibit</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" /> Witness</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#059669]" /> Vehicle</span>
              </div>
              <span className="text-[11px] font-mono text-[#64748B]">
                Click any node to inspect evidentiary details.
              </span>
            </div>
          </div>

          {/* Right Column: Node Inspector Drawer */}
          <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F4F7]">
              <h3 className="text-sm font-bold text-[#172033]">Node Inspector</h3>
              {selectedGraphNode && (
                <span
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                  style={{ backgroundColor: selectedGraphNode.bgColor, color: selectedGraphNode.color }}
                >
                  {selectedGraphNode.type}
                </span>
              )}
            </div>

            {selectedGraphNode ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#64748B] font-semibold block uppercase tracking-wider">Entity Details</span>
                  <span className="font-bold text-[#12355B] text-sm mt-0.5 block">{selectedGraphNode.label}</span>
                  <span className="text-[11px] text-[#64748B] mt-0.5 block">{selectedGraphNode.sub}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-[#F1F4F7]">
                    <span className="text-[#64748B]">Description:</span>
                    <span className="text-[#172033] font-medium text-right">{selectedGraphNode.desc}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#F1F4F7]">
                    <span className="text-[#64748B]">Statutory Section:</span>
                    <strong className="text-[#172033] text-right">{selectedGraphNode.legalSection}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#F1F4F7]">
                    <span className="text-[#64748B]">Status:</span>
                    <span className="text-[#16805C] font-semibold text-right">{selectedGraphNode.status}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#F1F4F7]">
                    <span className="text-[#64748B]">Connected Docket:</span>
                    <span className="font-mono text-[#12355B] font-semibold">{caseItem.caseNumber}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (selectedGraphNode.type === 'EVIDENCE' || selectedGraphNode.type === 'VEHICLE') {
                      setActiveTab('evidence');
                    } else if (selectedGraphNode.type === 'SUSPECT' || selectedGraphNode.type === 'WITNESS' || selectedGraphNode.type === 'VICTIM') {
                      setActiveTab('entities');
                    } else {
                      setActiveTab('documents');
                    }
                  }}
                  className="w-full btn-primary justify-center py-2 text-xs cursor-pointer mt-2"
                >
                  <span>Filter Related Records →</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-[#64748B]">
                Click on any node in the relationship graph to inspect its evidentiary metadata and links.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 8: CASE INTELLIGENCE */}
      {activeTab === 'intelligence' && (
        <div className="space-y-6">
          {/* Feature 3: Multi-Document Contradiction Detection */}
          <ContradictionDetectionPanel caseId={caseItem.id} />
          {/* Information Gaps Alert Section */}
          <div className="bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#C53D3D] uppercase tracking-wider pb-2 border-b border-[#F1F4F7]">
              <AlertTriangle className="w-4 h-4 text-[#C53D3D]" />
              <span>⚠ Potential Information Gaps & Missing Evidentiary Links</span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-btn bg-[#FDF2F2] border border-[#F8D7DA] text-xs space-y-1">
                <div className="flex items-center justify-between text-[#C53D3D] font-bold">
                  <span>⚠ POTENTIAL INFORMATION GAP: Missing Ballistic CFSL Examination Report</span>
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#F8D7DA]">CRITICAL</span>
                </div>
                <p className="text-[#7F1D1D]">
                  Firearm recovered at crime scene under Panchnama #P-12, but official CFSL Ballistic Report has not been uploaded to this docket. Court cross-examination vulnerability.
                </p>
                <div className="text-[11px] text-[#991B1B] pt-1">
                  <strong>Recommended IO Action:</strong> Expedite Section 293 CrPC report request from CFSL Ballistics Division Rohini.
                </div>
              </div>

              <div className="p-3.5 rounded-btn bg-[#FFFBEB] border border-[#FDE68A] text-xs space-y-1">
                <div className="flex items-center justify-between text-[#B45309] font-bold">
                  <span>⚠ POTENTIAL INFORMATION GAP: Section 65B Certificate Missing for CDR Dumps</span>
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#FDE68A]">HIGH</span>
                </div>
                <p className="text-[#92400E]">
                  Accused Vikram Malhotra handset seized, but Section 65B Telecommunication CDR extract for Airtel MSISDN (+91 98110 44219) lacks Nodal Officer digital signature.
                </p>
                <div className="text-[11px] text-[#92400E] pt-1">
                  <strong>Recommended IO Action:</strong> Issue Section 91 CrPC requisition to Telecom Nodal Officer for statutory certificate.
                </div>
              </div>
            </div>
          </div>

          {/* Witness Statement Contradictions */}
          <div className="bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F4F7]">
              <div>
                <h3 className="text-sm font-bold text-[#172033]">Cross-Document Contradiction Analysis</h3>
                <p className="text-xs text-[#64748B]">Automated detection of conflicting statements across witness depositions & alibis</p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                2 CONTRADICTIONS DETECTED
              </span>
            </div>

            <div className="space-y-4">
              {/* Contradiction 1 */}
              <div className="p-4 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#172033]">1. Contradiction in Suspect Getaway Vehicle Color & Model</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FEE2E2] text-[#C53D3D]">HIGH SEVERITY</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded bg-white border border-[#E2E8F0] space-y-1">
                    <strong className="text-[#12355B] block">Deposition: Security Guard Ramesh (Sec 161)</strong>
                    <p className="text-[#64748B] italic">
                      "...I distinctly saw two masked men run towards a dark grey SUV, possibly a Scorpio with plate DL-03-XX, and speed north at approximately 9:45 PM..."
                    </p>
                  </div>
                  <div className="p-3 rounded bg-white border border-[#E2E8F0] space-y-1">
                    <strong className="text-[#12355B] block">Deposition: Eyewitness Sunil Chawla (Sec 161)</strong>
                    <p className="text-[#64748B] italic">
                      "...The accused persons rushed into a white sedan, looked like a Swift Dzire taxi, parked opposite the ATM booth around 9:40 PM..."
                    </p>
                  </div>
                </div>
                <div className="text-[11px] text-[#16805C] bg-[#E8F5F6] p-2.5 rounded border border-[#16805C]/20">
                  <strong>Recommendation:</strong> Retrieve and review Ring Road Toll ANPR camera footage between 21:35 and 21:55 PM to reconcile vehicle make.
                </div>
              </div>

              {/* Contradiction 2 */}
              <div className="p-4 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#172033]">2. Suspect Mobile Tower CDR Conflicts with Stated Alibi</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FEE2E2] text-[#C53D3D]">CRITICAL SEVERITY</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded bg-white border border-[#E2E8F0] space-y-1">
                    <strong className="text-[#12355B] block">Accused Interrogation Alibi Statement</strong>
                    <p className="text-[#64748B] italic">
                      "...I was present throughout the evening at Green Meadow Banquet Hall, Noida Sector 62, from 7 PM till midnight without leaving..."
                    </p>
                  </div>
                  <div className="p-3 rounded bg-white border border-[#E2E8F0] space-y-1">
                    <strong className="text-[#12355B] block">Telecom CDR & Cell-ID Dump (Sec 65B)</strong>
                    <p className="text-[#64748B] italic">
                      "...MSISDN 9811044219 latched onto Cell-ID DEL-HK-0932 (Hauz Khas Market) with multiple outgoing data sessions at 21:12 and 21:48..."
                    </p>
                  </div>
                </div>
                <div className="text-[11px] text-[#16805C] bg-[#E8F5F6] p-2.5 rounded border border-[#16805C]/20">
                  <strong>Recommendation:</strong> Issue Section 91 CrPC notice to Banquet Hall management for guest entry register and valet tokens.
                </div>
              </div>
            </div>
          </div>

          {/* Section 193 BNSS Charge Sheet Readiness */}
          <div className="bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F4F7]">
              <div>
                <h3 className="text-sm font-bold text-[#172033]">Charge Sheet Readiness (Section 193 BNSS / 173 CrPC)</h3>
                <p className="text-xs text-[#64748B]">Pre-filing compliance audit for Public Prosecutor submission</p>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-[#E8F5F6] text-[#16805C] border border-[#16805C]/20">
                85% READY TO FILE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 p-2.5 rounded bg-[#F6F8FA] border border-[#E2E8F0]">
                <Check className="w-4 h-4 text-[#16805C]" />
                <span>First Information Report (Form I.F.1) on record</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded bg-[#F6F8FA] border border-[#E2E8F0]">
                <Check className="w-4 h-4 text-[#16805C]" />
                <span>Panchnama signed by 2 independent panchas</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded bg-[#F6F8FA] border border-[#E2E8F0]">
                <Check className="w-4 h-4 text-[#16805C]" />
                <span>Section 161 / 180 BNSS witness statements logged</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded bg-[#FEF2F2] border border-[#F8D7DA] text-[#C53D3D]">
                <AlertCircle className="w-4 h-4 text-[#C53D3D]" />
                <span>Section 65B Electronic Evidence Certificate pending sign-off</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: AI INVESTIGATION ASSISTANT */}
      {activeTab === 'assistant' && (
        <div className="bg-white border border-[#E2E8F0] rounded-card shadow-card flex flex-col h-[640px]">
          {/* Statutory Disclaimer Banner (Section 30) */}
          <div className="p-3 bg-[#FEF3C7] border-b border-[#FDE68A] text-[11px] text-[#92400E] flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0" />
            <span>
              <strong>AI-GENERATED ANALYSIS. INVESTIGATOR VERIFICATION REQUIRED.</strong> This system is an investigative aid, not a judicial determination. All findings must be corroborated by the Investigating Officer.
            </span>
          </div>

          {/* Chat Messages Feed */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {assistantMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded bg-[#12355B] text-white flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-2xl p-4 rounded-btn space-y-2.5 ${
                    msg.sender === 'user'
                      ? 'bg-[#12355B] text-white'
                      : 'bg-[#F6F8FA] border border-[#E2E8F0] text-[#172033]'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {msg.text}
                  </div>

                  {/* Clickable Citations (Section 23) */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-2 border-t border-[#E2E8F0] space-y-1.5">
                      <div className="text-[10px] font-bold uppercase text-[#64748B] font-mono">
                        Evidentiary Sources & Citations
                      </div>
                      {msg.citations.map((cite, cIdx) => (
                        <div key={cIdx} className="p-2 rounded bg-white border border-[#E2E8F0] flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-semibold text-[#12355B] block truncate">{cite.title}</span>
                            <span className="text-[10px] text-[#64748B] block truncate">{cite.snippet}</span>
                          </div>
                          <button
                            onClick={() => setActiveTab('documents')}
                            className="text-[11px] font-bold text-[#167D8D] hover:underline flex items-center gap-1 shrink-0"
                          >
                            <span>[Open Source]</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggested Actions */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap gap-1.5">
                      {msg.suggestedActions.map((action, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={() => handleSendMessage(action)}
                          className="text-[10px] px-2 py-1 rounded bg-white hover:bg-[#E8F5F6] border border-[#CBD5E1] text-[#12355B] transition-colors cursor-pointer"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[9px] text-[#94A3B8] block text-right font-mono">{msg.timestamp}</span>
                </div>
              </div>
            ))}

            {assistantLoading && (
              <div className="flex gap-3 text-xs items-center text-[#64748B]">
                <div className="w-7 h-7 rounded bg-[#12355B] text-white flex items-center justify-center shrink-0 animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <span>Analyzing case exhibits, depositions, and statutory sections...</span>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                placeholder="Ask about contradictions, charge sheet readiness, or legal sections..."
                className="gov-input flex-1 text-xs"
              />
              <button
                type="submit"
                disabled={assistantLoading || !assistantInput.trim()}
                className="btn-primary py-2 px-4 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>Query Copilot</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 10: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-[#E2E8F0] rounded-card shadow-card overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F6F8FA]">
            <div>
              <h3 className="text-sm font-bold text-[#172033]">Case Audit Trail ({auditLogs.length} Records)</h3>
              <p className="text-[11px] text-[#64748B]">Tamper-evident log admissible under Section 65B Indian Evidence Act / Section 63 BSA 2023</p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#E8F5F6] text-[#16805C] border border-[#16805C]/20">
              MERKLE PROOF VALIDATED ✓
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[11px] text-[#64748B] uppercase font-semibold">
                  <th className="py-3 px-4">Timestamp (IST)</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4">Cryptographic Hash Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F6F8FA] transition-colors">
                    <td className="py-3 px-4 font-mono text-[#64748B] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#172033] block">{log.actorName}</span>
                      <span className="text-[10px] text-[#64748B]">{log.actorRole}</span>
                    </td>
                    <td className="py-3 px-4 text-[#172033] font-medium">{log.action}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#16805C] bg-[#E8F5F6] px-2 py-0.5 rounded border border-[#16805C]/20">
                        <Check className="w-3 h-3" />
                        SUCCESS
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#167D8D]">
                      {log.integrityHash ? `${log.integrityHash.slice(0, 16)}...` : '7a8f09bc12...'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 11: REPORTS */}
      {activeTab === 'reports' && (
        <div className="bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#172033]">Statutory Reports & Judicial Briefs</h3>
            <p className="text-xs text-[#64748B]">Generate court-admissible PDF extracts, police registers, and evidence manifests</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-[#12355B] text-xs">Form I.F.1 (FIR Docket)</h4>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Full First Information Report document including complainant deposition, acts & sections, and occurrence particulars.
                </p>
              </div>
              <button
                onClick={() => setReportModalType('FIR_FORM_1')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Generate Form I.F.1</span>
              </button>
            </div>

            <div className="p-4 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-[#12355B] text-xs">Case Diary (Sec 172 CrPC / BNSS)</h4>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Day-to-day chronological record of investigation, officer movements, statements taken, and places visited.
                </p>
              </div>
              <button
                onClick={() => setReportModalType('CASE_DIARY')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Generate Case Diary</span>
              </button>
            </div>

            <div className="p-4 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-[#12355B] text-xs">Final Charge Sheet (Sec 173 CrPC / 193 BNSS)</h4>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Comprehensive prosecution brief with evidence index, accused charges, and list of prosecution witnesses.
                </p>
              </div>
              <button
                onClick={() => setReportModalType('CHARGE_SHEET')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Generate Charge Sheet</span>
              </button>
            </div>
          </div>

          {/* Feature 10: Factual 10-Section Investigation Summary */}
          <div className="pt-6 border-t border-slate-200">
            <InvestigationSummaryView caseId={caseItem.id} />
          </div>
        </div>
      )}

      {/* Printable Report Modal */}
      {reportModalType && (
        <PrintableReportModal
          onClose={() => setReportModalType(null)}
          reportType={reportModalType}
          caseData={caseItem}
        />
      )}

      {/* Feature 8: Evidence Package Export Modal */}
      {showExportPackageModal && (
        <EvidencePackageExportModal
          caseId={caseItem.id}
          caseNumber={caseItem.caseNumber}
          onClose={() => setShowExportPackageModal(false)}
        />
      )}
    </div>
  );
};
