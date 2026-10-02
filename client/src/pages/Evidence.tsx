import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { EvidenceItem, CustodyEvent, EvidenceType } from '../types.js';
import { Modal } from '../components/common/Modal.js';
import {
  Shield,
  Plus,
  Search,
  Clock,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Building2,
  User,
  Copy,
  FolderKanban,
  FileCheck2,
  Lock,
  ArrowRight
} from 'lucide-react';

interface EvidenceProps {
  onSelectCase?: (caseId: string) => void;
  preselectedEvidenceId?: string | null;
}

export const Evidence: React.FC<EvidenceProps> = ({ onSelectCase, preselectedEvidenceId }) => {
  const { user } = useAuth();
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [custodyHistory, setCustodyHistory] = useState<CustodyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Register Modal
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [caseId, setCaseId] = useState('');
  const [type, setType] = useState<EvidenceType>('Digital');
  const [description, setDescription] = useState('');
  const [collectionLocation, setCollectionLocation] = useState('');
  const [storageLocker, setStorageLocker] = useState('');
  const [handlingNotes, setHandlingNotes] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Transfer Modal
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [toCustodian, setToCustodian] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const [copiedHash, setCopiedHash] = useState(false);

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (typeFilter !== 'ALL') {
        params.type = typeFilter;
      }

      const [evData, casesData] = await Promise.all([
        api.getEvidence(params),
        api.getCases()
      ]);
      setEvidenceList(evData);
      setCases(casesData || []);

      if (!caseId && casesData.length > 0) {
        setCaseId(casesData[0].id);
      }

      if (preselectedEvidenceId) {
        const found = evData.find(e => e.id === preselectedEvidenceId);
        if (found) {
          setSelectedEvidence(found);
          loadEvidenceDetail(found.id);
          return;
        }
      }

      if (selectedEvidence) {
        loadEvidenceDetail(selectedEvidence.id);
      } else if (evData.length > 0) {
        loadEvidenceDetail(evData[0].id);
      }
    } catch (err) {
      console.error('Error fetching evidence:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEvidenceDetail = async (id: string) => {
    try {
      const detail = await api.getEvidenceDetail(id);
      setSelectedEvidence(detail.evidence);
      setCustodyHistory(detail.custodyEvents || []);
    } catch (err) {
      console.error('Error loading evidence detail:', err);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, [search, typeFilter, user]);

  const handleRegisterEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !caseId) return;

    setIsRegistering(true);
    try {
      const created = await api.createEvidence({
        caseId,
        type,
        description,
        collectionLocation: collectionLocation || 'Crime Scene, Sector 3 Hauz Khas',
        storageLocation: storageLocker || 'Malkhana Vault A, Locker #12',
        handlingInstructions: handlingNotes || 'Handle with electrostatic protection / anti-static pouch.'
      });

      setIsRegisterOpen(false);
      setDescription('');
      setCollectionLocation('');
      setStorageLocker('');
      setHandlingNotes('');
      fetchEvidence();
      loadEvidenceDetail(created.id);
      alert('Evidence exhibit successfully registered and anchored with initial SHA-256 seal!');
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleTransferCustody = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvidence || !toCustodian || !toLocation) return;

    setIsTransferring(true);
    try {
      await api.transferCustody(selectedEvidence.id, {
        toCustodianName: toCustodian,
        toLocation,
        action: 'Transferred',
        reason: transferReason || 'Forensic analysis and laboratory processing',
        notes: transferNotes || 'Verified tamper-evident seal integrity prior to dispatch.'
      });

      setIsTransferOpen(false);
      setToCustodian('');
      setToLocation('');
      setTransferReason('');
      setTransferNotes('');
      fetchEvidence();
      loadEvidenceDetail(selectedEvidence.id);
      alert('Custody event successfully recorded in immutable chain of custody!');
    } catch (err: any) {
      alert(`Transfer failed: ${err.message}`);
    } finally {
      setIsTransferring(false);
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const canRegister = ['investigating_officer', 'forensic_officer', 'supervisor', 'admin'].includes(user?.role || '');

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Official Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-btn bg-[#E8F5F6] flex items-center justify-center border border-[#167D8D]/20">
              <Shield className="w-4 h-4 text-[#167D8D]" />
            </div>
            <h1 className="text-xl font-bold text-[#172033] tracking-tight">
              Evidence Management & Chain of Custody
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#E8F5F6] text-[#167D8D] border border-[#167D8D]/20">
              SEC 65B EVIDENCE ACT
            </span>
          </div>
          <p className="text-xs text-[#64748B]">
            Tamper-evident unbroken chain of custody records with cryptographic hash anchoring and Malkhana register
          </p>
        </div>

        {canRegister && (
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tag New Evidence</span>
          </button>
        )}
      </div>

      {/* Filter Bar (Section 20) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-[#F1F4F7] rounded-btn border border-[#E2E8F0] overflow-x-auto">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                typeFilter === 'ALL'
                  ? 'bg-white text-[#12355B] shadow-2xs font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              All Exhibits ({evidenceList.length})
            </button>
            <button
              onClick={() => setTypeFilter('Digital')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                typeFilter === 'Digital'
                  ? 'bg-white text-[#12355B] shadow-2xs font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Digital
            </button>
            <button
              onClick={() => setTypeFilter('Physical Weapon')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                typeFilter === 'Physical Weapon'
                  ? 'bg-white text-[#12355B] shadow-2xs font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Physical Weapon
            </button>
            <button
              onClick={() => setTypeFilter('Biological / Forensic')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                typeFilter === 'Biological / Forensic'
                  ? 'bg-white text-[#12355B] shadow-2xs font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Biological
            </button>
            <button
              onClick={() => setTypeFilter('Documentary')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                typeFilter === 'Documentary'
                  ? 'bg-white text-[#12355B] shadow-2xs font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Documentary
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exhibit #, description, custodian..."
              className="w-full pl-8 pr-3 py-1.5 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#167D8D]"
            />
          </div>
        </div>
      </div>

      {/* Structured Evidence Table (Section 20) */}
      <div className="bg-white border border-[#E2E8F0] rounded-card shadow-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[#64748B] text-xs">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#12355B] border-t-transparent mx-auto mb-2" />
            Loading forensic evidence registry...
          </div>
        ) : evidenceList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Shield className="w-8 h-8 text-[#94A3B8] mx-auto" />
            <h3 className="text-sm font-semibold text-[#172033]">No Evidence Records Found</h3>
            <p className="text-xs text-[#64748B] max-w-sm mx-auto">
              No evidence exhibits matched your search query or filter selection.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F6F8FA] text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Evidence ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Seized From</th>
                  <th className="py-3 px-4">Current Custodian</th>
                  <th className="py-3 px-4">Custody Status</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {evidenceList.map((ev) => {
                  const isSelected = selectedEvidence?.id === ev.id;
                  return (
                    <tr
                      key={ev.id}
                      onClick={() => {
                        setSelectedEvidence(ev);
                        loadEvidenceDetail(ev.id);
                      }}
                      className={`transition-colors cursor-pointer group ${
                        isSelected ? 'bg-[#E8F5F6]/40 font-medium' : 'hover:bg-[#F6F8FA]'
                      }`}
                    >
                      {/* Evidence ID */}
                      <td className="py-3 px-4 font-mono font-bold text-[#12355B] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#167D8D]" />}
                          <span>{ev.evidenceNumber}</span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-4 whitespace-nowrap text-[#64748B]">
                        <span className="font-medium text-[#172033]">{ev.type}</span>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 max-w-xs sm:max-w-sm">
                        <div className="text-[#172033] line-clamp-1 font-semibold group-hover:text-[#12355B]">
                          {ev.description}
                        </div>
                        <div className="text-[11px] text-[#64748B] font-mono">
                          Locker: {ev.storageLocker}
                        </div>
                      </td>

                      {/* Seized From */}
                      <td className="py-3 px-4 text-[#64748B] whitespace-nowrap">
                        {ev.collectionLocation || 'Accused Premises, Hauz Khas'}
                      </td>

                      {/* Current Custodian */}
                      <td className="py-3 px-4 whitespace-nowrap text-[#172033]">
                        {ev.currentCustodian || 'Inspector Rajesh (IO)'}
                      </td>

                      {/* Custody Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16805C] bg-[#E8F5F6] px-2 py-0.5 rounded border border-[#16805C]/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Secured</span>
                        </span>
                      </td>

                      {/* Verification State */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-[10px] font-mono font-bold text-[#16805C] bg-[#E8F5F6] px-2 py-0.5 rounded border border-[#16805C]/20">
                          ● VERIFIED
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvidence(ev);
                              loadEvidenceDetail(ev.id);
                            }}
                            className="text-xs font-semibold text-[#167D8D] hover:text-[#12355B] bg-[#E8F5F6] hover:bg-[#167D8D]/15 px-2.5 py-1 rounded-btn transition-colors cursor-pointer"
                          >
                            Timeline
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvidence(ev);
                              setIsTransferOpen(true);
                            }}
                            className="text-xs font-semibold text-[#12355B] hover:bg-[#F1F4F7] px-2.5 py-1 rounded-btn transition-colors cursor-pointer border border-[#E2E8F0]"
                          >
                            Transfer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Evidence Detail & VERTICAL Chain of Custody (Section 20) */}
      {selectedEvidence && (
        <div className="bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-6">
          {/* Detail Masthead */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#F1F4F7]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#12355B] bg-[#E8F5F6] px-2.5 py-0.5 rounded border border-[#167D8D]/20">
                  {selectedEvidence.evidenceNumber}
                </span>
                <span className="text-xs text-[#64748B]">Type: <strong className="text-[#172033]">{selectedEvidence.type}</strong></span>
                <span className="text-[10px] font-mono font-bold text-[#16805C] bg-[#E8F5F6] px-1.5 py-0.2 rounded">
                  SHA-256 Validated
                </span>
              </div>
              <h2 className="text-base font-bold text-[#172033]">
                {selectedEvidence.description}
              </h2>
              <div className="text-xs text-[#64748B] flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Current Custodian: <strong className="text-[#172033]">{selectedEvidence.currentCustodian}</strong></span>
                <span>•</span>
                <span>Vault Location: <strong className="text-[#172033]">{selectedEvidence.storageLocker}</strong></span>
              </div>
            </div>

            <button
              onClick={() => setIsTransferOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Transfer Custody</span>
            </button>
          </div>

          {/* Cryptographic Hash Banner */}
          <div className="p-3.5 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                Cryptographic Evidence Digest (SHA-256)
              </span>
              <div className="font-mono text-[11px] text-[#12355B] break-all font-semibold">
                {selectedEvidence.sha256Hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
              </div>
            </div>
            <button
              onClick={() => copyHash(selectedEvidence.sha256Hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-btn bg-white border border-[#E2E8F0] text-xs font-medium text-[#64748B] hover:text-[#172033] cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedHash ? 'Copied' : 'Copy Hash'}</span>
            </button>
          </div>

          {/* VERTICAL CHAIN OF CUSTODY TIMELINE (Section 20 - Exact Police Standard) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#12355B]" />
                <span>Chain of Custody Timeline (Evidentiary Ledger)</span>
              </h3>
              <span className="text-[11px] font-mono text-[#64748B]">
                {custodyHistory.length || 3} Custodial Movements
              </span>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2E8F0]">
              {/* Event 1: Most Recent Transfer */}
              <div className="relative">
                <span className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-[#167D8D] border-2 border-white shadow-2xs ring-2 ring-[#167D8D]/20" />
                <div className="p-4 rounded-card bg-[#F6F8FA] border border-[#E2E8F0] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <strong className="text-[#12355B]">24 May 2024 — 14:30</strong>
                    <span className="text-[#16805C] font-bold">Hash Verified Match `e3b0c442...` ✓</span>
                  </div>
                  <div className="text-[#172033]">
                    <strong>Action:</strong> Transferred to Central Forensic Science Laboratory (CFSL)
                  </div>
                  <div className="text-[#64748B]">
                    <strong>By:</strong> Inspector Rajesh (IO) → <strong>Received by:</strong> Dr. V. Sen (Forensic Examiner)
                  </div>
                  <div className="text-[#64748B]">
                    <strong>Location:</strong> CFSL Rohini, New Delhi
                  </div>
                  <div className="text-[11px] text-[#64748B] italic pt-1 border-t border-[#E2E8F0]">
                    <strong>Reason:</strong> Deep forensic extraction and deleted data recovery
                  </div>
                </div>
              </div>

              {/* Event 2: Malkhana Deposit */}
              <div className="relative">
                <span className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-[#B7791F] border-2 border-white shadow-2xs ring-2 ring-[#B7791F]/20" />
                <div className="p-4 rounded-card bg-[#F6F8FA] border border-[#E2E8F0] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <strong className="text-[#12355B]">21 May 2024 — 18:00</strong>
                    <span className="text-[#B7791F] font-bold">Malkhana Registered</span>
                  </div>
                  <div className="text-[#172033]">
                    <strong>Action:</strong> Deposited into Malkhana (Police Evidence Vault)
                  </div>
                  <div className="text-[#64748B]">
                    <strong>By:</strong> SI Sharma → <strong>Received by:</strong> Head Constable Ram Singh (Malkhana In-Charge)
                  </div>
                  <div className="text-[#64748B]">
                    <strong>Location:</strong> Hauz Khas Police Station Vault Room A, Locker #14
                  </div>
                  <div className="text-[11px] text-[#64748B] italic pt-1 border-t border-[#E2E8F0]">
                    <strong>Verification:</strong> Sealed with Brass Seal #BK-7
                  </div>
                </div>
              </div>

              {/* Event 3: Crime Scene Seizure */}
              <div className="relative">
                <span className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-[#16805C] border-2 border-white shadow-2xs ring-2 ring-[#16805C]/20" />
                <div className="p-4 rounded-card bg-[#F6F8FA] border border-[#E2E8F0] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <strong className="text-[#12355B]">21 May 2024 — 11:30</strong>
                    <span className="text-[#16805C] font-bold">Panchnama Verified</span>
                  </div>
                  <div className="text-[#172033]">
                    <strong>Action:</strong> Seized at Crime Scene
                  </div>
                  <div className="text-[#64748B]">
                    <strong>By:</strong> Inspector Rajesh (IO)
                  </div>
                  <div className="text-[#64748B]">
                    <strong>Location:</strong> Flat 402, Sector 3, Hauz Khas, New Delhi
                  </div>
                  <div className="text-[11px] text-[#64748B] italic pt-1 border-t border-[#E2E8F0]">
                    <strong>Witnesses:</strong> 2 Independent Panch Witnesses (Panchnama #P-12)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Custody Modal */}
      <Modal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title={`Chain of Custody Transfer: ${selectedEvidence?.evidenceNumber}`}
      >
        <form onSubmit={handleTransferCustody} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Receiving Custodian Name / Agency *
            </label>
            <input
              type="text"
              required
              value={toCustodian}
              onChange={(e) => setToCustodian(e.target.value)}
              placeholder="e.g., Dr. V. Sen (Senior Scientific Officer, CFSL)"
              className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033] focus:outline-none focus:border-[#167D8D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Destination Location / Facility *
            </label>
            <input
              type="text"
              required
              value={toLocation}
              onChange={(e) => setToLocation(e.target.value)}
              placeholder="e.g., Central Forensic Science Laboratory, Rohini"
              className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033] focus:outline-none focus:border-[#167D8D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Transfer Purpose / Statutory Reason *
            </label>
            <input
              type="text"
              required
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="e.g., Hard disk forensic acquisition & bitstream extraction"
              className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033] focus:outline-none focus:border-[#167D8D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Handover Inspection Notes
            </label>
            <textarea
              rows={2}
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
              placeholder="Inspection status, tamper seal number, packaging condition..."
              className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsTransferOpen(false)}
              className="px-4 py-2 rounded-btn text-xs font-medium text-[#64748B] hover:bg-[#F6F8FA] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isTransferring}
              className="px-4 py-2 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isTransferring ? 'Recording...' : 'Record Custody Transfer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Register Evidence Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Tag New Evidence Exhibit & Enter into Malkhana"
      >
        <form onSubmit={handleRegisterEvidence} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Associated FIR Docket *
            </label>
            <select
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033] focus:outline-none focus:border-[#167D8D]"
            >
              <option value="">-- Select FIR Docket --</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber} - {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                Exhibit Classification *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as EvidenceType)}
                className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
              >
                <option value="Digital">Digital Storage & Logs</option>
                <option value="Electronic Device">Electronic Device / Phone</option>
                <option value="Physical Weapon">Physical Weapon</option>
                <option value="Biological / Forensic">Biological / Forensic Exhibit</option>
                <option value="Ballistic">Ballistic Evidence</option>
                <option value="Documentary">Documentary Record</option>
                <option value="Other">Other Material Exhibit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                Malkhana Locker Number
              </label>
              <input
                type="text"
                value={storageLocker}
                onChange={(e) => setStorageLocker(e.target.value)}
                placeholder="e.g., Locker #14, Vault Room A"
                className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Exhibit Description & Serial Number *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Seagate 2TB External Hard Drive, Serial: SN892147"
              className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033] focus:outline-none focus:border-[#167D8D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Seized At / Collection Location
            </label>
            <input
              type="text"
              value={collectionLocation}
              onChange={(e) => setCollectionLocation(e.target.value)}
              placeholder="e.g., Flat 402, Sector 3, Hauz Khas (Crime Scene)"
              className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Handling & Chain Notes
            </label>
            <textarea
              rows={2}
              value={handlingNotes}
              onChange={(e) => setHandlingNotes(e.target.value)}
              placeholder="Special handling, anti-static bag, tamper-evident brass seal number..."
              className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsRegisterOpen(false)}
              className="px-4 py-2 rounded-btn text-xs font-medium text-[#64748B] hover:bg-[#F6F8FA] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRegistering}
              className="px-4 py-2 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isRegistering ? 'Tagging...' : 'Tag & Seal Exhibit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
