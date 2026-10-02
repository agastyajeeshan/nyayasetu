import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { Case, CasePriority } from '../types.js';
import { CaseStatusBadge } from '../components/common/Badge.js';
import { Modal } from '../components/common/Modal.js';
import {
  FolderKanban,
  Plus,
  Search,
  Building2,
  User as UserIcon,
  Clock,
  ArrowRight,
  Filter,
  Shield,
  FileText
} from 'lucide-react';

interface CasesProps {
  onSelectCase: (caseId: string) => void;
}

export const Cases: React.FC<CasesProps> = ({ onSelectCase }) => {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [stationFilter, setStationFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Form I.F.1 Registration Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'general' | 'acts' | 'occurrence' | 'complainant' | 'suspects' | 'narrative'>('general');

  // Form I.F.1 Fields
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('Cyber Crime & Financial Fraud');
  const [newDistrict, setNewDistrict] = useState('South District, New Delhi');
  const [newStation, setNewStation] = useState('Hauz Khas Crime Branch');
  const [newDepartment, setNewDepartment] = useState('Crime Branch Special Cell');
  const [newPriority, setNewPriority] = useState<CasePriority>('High');
  const [newGeneralDiaryNo, setNewGeneralDiaryNo] = useState(`GD-2026-${Math.floor(Math.random() * 800 + 100)}`);
  const [newInformationType, setNewInformationType] = useState<'Written' | 'Oral'>('Written');

  // Acts & Sections
  const [act1Name, setAct1Name] = useState('Bharatiya Nyaya Sanhita (BNS), 2023');
  const [act1Sections, setAct1Sections] = useState('Section 318(4) [Cheating], Section 336(3) [Forgery]');
  const [act2Name, setAct2Name] = useState('Information Technology Act, 2000');
  const [act2Sections, setAct2Sections] = useState('Section 66, Section 66C, Section 66D');

  // Occurrence & Place
  const [newOccurrenceDay, setNewOccurrenceDay] = useState('Thursday');
  const [newIncidentDate, setNewIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [newOccurrenceTimeFrom, setNewOccurrenceTimeFrom] = useState('14:30 Hrs');
  const [newOccurrenceTimeTo, setNewOccurrenceTimeTo] = useState('17:00 Hrs');
  const [newPlaceOfOccurrence, setNewPlaceOfOccurrence] = useState('Sector 3 Commercial Arcade, Hauz Khas');
  const [newDistanceFromPS, setNewDistanceFromPS] = useState('2.5 KM East');
  const [newBeatNo, setNewBeatNo] = useState('Beat No. 4');

  // Complainant Details
  const [newComplainantName, setNewComplainantName] = useState('');
  const [newComplainantFatherSpouse, setNewComplainantFatherSpouse] = useState('');
  const [newComplainantAge, setNewComplainantAge] = useState('35 Years');
  const [newComplainantNationality, setNewComplainantNationality] = useState('Indian');
  const [newComplainantOccupation, setNewComplainantOccupation] = useState('');
  const [newComplainantAddress, setNewComplainantAddress] = useState('');
  const [newComplainantPhone, setNewComplainantPhone] = useState('');

  // Suspects & Property
  const [newSuspectDetails, setNewSuspectDetails] = useState('');
  const [newPropertiesStolen, setNewPropertiesStolen] = useState('');
  const [newTotalValue, setNewTotalValue] = useState('');

  // FIR Narrative Statement
  const [newSummary, setNewSummary] = useState('');
  const [newFirContents, setNewFirContents] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ACTIVE') params.status = 'Active Investigation';
        else if (statusFilter === 'CHARGE_SHEET') params.status = 'Filed';
        else if (statusFilter === 'CLOSED') params.status = 'Closed';
      }
      if (stationFilter) params.policeStation = stationFilter;

      const data = await api.getCases(params);
      setCases(data);
    } catch (err) {
      console.error('Error fetching cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [search, statusFilter, stationFilter, user]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newStation.trim()) {
      setFormError('Please enter Case Title and Police Station.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    const actsList = [];
    if (act1Name && act1Sections) {
      actsList.push({ act: act1Name, sections: act1Sections });
    }
    if (act2Name && act2Sections) {
      actsList.push({ act: act2Name, sections: act2Sections });
    }

    try {
      const created = await api.createCase({
        title: newTitle,
        type: newType,
        jurisdiction: newDistrict,
        district: newDistrict,
        state: 'Delhi (NCT)',
        policeStation: newStation,
        department: newDepartment,
        priority: newPriority,
        incidentDate: newIncidentDate,
        summary: newSummary || newTitle,

        // Form I.F.1 fields
        generalDiaryNo: newGeneralDiaryNo,
        informationType: newInformationType,
        actsAndSections: actsList,
        occurrenceDay: newOccurrenceDay,
        occurrenceDateFrom: newIncidentDate,
        occurrenceDateTo: newIncidentDate,
        occurrenceTimeFrom: newOccurrenceTimeFrom,
        occurrenceTimeTo: newOccurrenceTimeTo,
        informationReceivedDate: new Date().toISOString().split('T')[0],
        informationReceivedTime: '18:30 Hrs',
        placeOfOccurrence: newPlaceOfOccurrence,
        distanceFromPS: newDistanceFromPS,
        beatNo: newBeatNo,
        complainantName: newComplainantName || 'Authorized Complainant',
        complainantFatherSpouse: newComplainantFatherSpouse,
        complainantDobOrAge: newComplainantAge,
        complainantNationality: newComplainantNationality,
        complainantOccupation: newComplainantOccupation,
        complainantAddress: newComplainantAddress,
        complainantPhone: newComplainantPhone,
        suspectDetails: newSuspectDetails,
        propertiesStolenOrInvolved: newPropertiesStolen,
        totalEstimatedValue: newTotalValue,
        firContents: newFirContents || newSummary || newTitle,
        officerInChargeName: user?.name || 'Inspector Rajesh Verma',
        officerInChargeRank: 'Station House Officer / Inspector',
        officerInChargeBadge: user?.badgeNumber || 'DP-CRB-108'
      });

      setIsModalOpen(false);
      resetForm();
      fetchCases();
      onSelectCase(created.id);
    } catch (err: any) {
      setFormError(err.message || 'Failed to register FIR');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewTitle('');
    setNewSummary('');
    setNewFirContents('');
    setNewComplainantName('');
    setNewComplainantFatherSpouse('');
    setNewComplainantAddress('');
    setNewComplainantPhone('');
    setNewSuspectDetails('');
    setNewPropertiesStolen('');
    setNewTotalValue('');
    setFormError(null);
    setModalTab('general');
  };

  const canCreateCase = user?.role === 'investigating_officer' || user?.role === 'supervisor' || user?.role === 'admin';

  // Counts for pills
  const totalCount = cases.length;
  const activeCount = cases.filter(c => c.status === 'Active Investigation' || (c.status as string) === 'Active').length;
  const filedCount = cases.filter(c => c.status === 'Filed' || (c.status as string) === 'Charge Sheet Filed' || c.status === 'Under Review').length;
  const closedCount = cases.filter(c => c.status === 'Closed').length;

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header (Section 16) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-btn bg-[#E8F5F6] flex items-center justify-center border border-[#167D8D]/20">
              <FolderKanban className="w-4 h-4 text-[#167D8D]" />
            </div>
            <h1 className="text-xl font-bold text-[#172033] tracking-tight">
              Case & FIR Management
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#F1F4F7] text-[#12355B] border border-[#E2E8F0]">
              FORM I.F.1 / BNSS
            </span>
          </div>
          <p className="text-xs text-[#64748B]">
            Central judicial dockets, crime records, and procedural investigation containers
          </p>
        </div>

        {canCreateCase && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Register New FIR</span>
          </button>
        )}
      </div>

      {/* Filter Bar (Section 16 Filter Pills & Search) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-[#F1F4F7] rounded-btn border border-[#E2E8F0] overflow-x-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-[#12355B] shadow-2xs font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white text-[#12355B] shadow-2xs font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('CHARGE_SHEET')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'CHARGE_SHEET'
                  ? 'bg-white text-[#12355B] shadow-2xs font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Charge Sheet Filed ({filedCount})
            </button>
            <button
              onClick={() => setStatusFilter('CLOSED')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'CLOSED'
                  ? 'bg-white text-[#12355B] shadow-2xs font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Closed ({closedCount})
            </button>
          </div>

          {/* Search Box & Station Dropdown */}
          <div className="flex items-center gap-2 flex-1 sm:max-w-md w-full">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search FIR number, complainant, or accused..."
                className="w-full pl-8 pr-3 py-1.5 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#167D8D]"
              />
            </div>

            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033] focus:outline-none focus:border-[#167D8D]"
            >
              <option value="">All Stations</option>
              <option value="Hauz Khas Crime Branch">Hauz Khas Crime Branch</option>
              <option value="Cyber Cell Special Unit">Cyber Cell Special Unit</option>
              <option value="Connaught Place PS">Connaught Place PS</option>
            </select>
          </div>
        </div>
      </div>

      {/* Structured Case Table (Section 16) */}
      <div className="bg-white border border-[#E2E8F0] rounded-card shadow-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[#64748B] text-xs">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#12355B] border-t-transparent mx-auto mb-2" />
            Loading FIR records...
          </div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FolderKanban className="w-8 h-8 text-[#94A3B8] mx-auto" />
            <h3 className="text-sm font-semibold text-[#172033]">No Case Records Found</h3>
            <p className="text-xs text-[#64748B] max-w-sm mx-auto">
              No cases matched the selected filters or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F6F8FA] text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Case ID / FIR</th>
                  <th className="py-3 px-4">Case Title / Offense</th>
                  <th className="py-3 px-4">Police Station / Unit</th>
                  <th className="py-3 px-4">Investigating Officer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {(() => {
                  const totalPages = Math.ceil(cases.length / pageSize) || 1;
                  const paginatedCases = cases.slice((currentPage - 1) * pageSize, currentPage * pageSize);

                  return paginatedCases.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => onSelectCase(c.id)}
                      className="hover:bg-[#F6F8FA] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#12355B] whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{c.caseNumber}</span>
                          {c.isLegalHold && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FEF2F2] text-[#C53D3D] border border-[#C53D3D]/30 font-bold">
                              HOLD
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-xs sm:max-w-md">
                        <div className="font-semibold text-[#172033] group-hover:text-[#12355B] line-clamp-1">
                          {c.title}
                        </div>
                        <div className="text-[11px] text-[#64748B] line-clamp-1 mt-0.5">
                          {c.type}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-[#64748B] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#94A3B8]" />
                          <span>{c.policeStation}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-[#172033] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-[#94A3B8]" />
                          <span>{c.investigatingOfficerName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <CaseStatusBadge status={c.status} />
                      </td>

                      <td className="py-3 px-4 text-[#64748B] whitespace-nowrap font-mono text-[11px]">
                        {new Date(c.updatedAt || c.filingDate).toLocaleDateString('en-IN')}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCase(c.id);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#167D8D] hover:text-[#12355B] bg-[#E8F5F6] hover:bg-[#167D8D]/15 px-2.5 py-1 rounded-btn transition-colors cursor-pointer"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {cases.length > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#64748B]">
            <div>
              Showing <span className="font-semibold text-[#172033]">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-[#172033]">{Math.min(currentPage * pageSize, cases.length)}</span> of{' '}
              <span className="font-semibold text-[#172033]">{cases.length.toLocaleString()}</span> dockets
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded bg-white border border-[#CBD5E1] text-[#12355B] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                « First
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded bg-white border border-[#CBD5E1] text-[#12355B] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                ‹ Prev
              </button>
              <span className="px-3 py-1 font-mono text-[#172033] font-bold">
                Page {currentPage} of {Math.ceil(cases.length / pageSize) || 1}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(cases.length / pageSize) || 1, p + 1))}
                disabled={currentPage >= (Math.ceil(cases.length / pageSize) || 1)}
                className="px-2.5 py-1 rounded bg-white border border-[#CBD5E1] text-[#12355B] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                Next ›
              </button>
              <button
                onClick={() => setCurrentPage(Math.ceil(cases.length / pageSize) || 1)}
                disabled={currentPage >= (Math.ceil(cases.length / pageSize) || 1)}
                className="px-2.5 py-1 rounded bg-white border border-[#CBD5E1] text-[#12355B] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                Last »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form I.F.1 Registration Modal (Section 17) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="FORM I.F.1 — FIRST INFORMATION REPORT (FIR)"
      >
        <form onSubmit={handleCreateCase} className="space-y-4">
          <div className="text-xs text-[#64748B] -mt-1 border-b border-[#E2E8F0] pb-2">
            Integrated Police Station Investigation Docket under Section 154 Cr.P.C. / Section 173 BNSS, 2023.
          </div>

          {/* Form Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#F1F4F7] rounded-btn border border-[#E2E8F0] overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setModalTab('general')}
              className={`px-3 py-1 rounded font-medium cursor-pointer transition-colors ${modalTab === 'general' ? 'bg-white text-[#12355B] font-semibold shadow-2xs' : 'text-[#64748B]'}`}
            >
              1. General
            </button>
            <button
              type="button"
              onClick={() => setModalTab('acts')}
              className={`px-3 py-1 rounded font-medium cursor-pointer transition-colors ${modalTab === 'acts' ? 'bg-white text-[#12355B] font-semibold shadow-2xs' : 'text-[#64748B]'}`}
            >
              2. Acts & Sections
            </button>
            <button
              type="button"
              onClick={() => setModalTab('occurrence')}
              className={`px-3 py-1 rounded font-medium cursor-pointer transition-colors ${modalTab === 'occurrence' ? 'bg-white text-[#12355B] font-semibold shadow-2xs' : 'text-[#64748B]'}`}
            >
              3. Occurrence & Place
            </button>
            <button
              type="button"
              onClick={() => setModalTab('complainant')}
              className={`px-3 py-1 rounded font-medium cursor-pointer transition-colors ${modalTab === 'complainant' ? 'bg-white text-[#12355B] font-semibold shadow-2xs' : 'text-[#64748B]'}`}
            >
              4. Complainant
            </button>
            <button
              type="button"
              onClick={() => setModalTab('suspects')}
              className={`px-3 py-1 rounded font-medium cursor-pointer transition-colors ${modalTab === 'suspects' ? 'bg-white text-[#12355B] font-semibold shadow-2xs' : 'text-[#64748B]'}`}
            >
              5. Suspects & Property
            </button>
            <button
              type="button"
              onClick={() => setModalTab('narrative')}
              className={`px-3 py-1 rounded font-medium cursor-pointer transition-colors ${modalTab === 'narrative' ? 'bg-white text-[#12355B] font-semibold shadow-2xs' : 'text-[#64748B]'}`}
            >
              6. FIR Narrative
            </button>
          </div>

          {formError && (
            <div className="p-3 bg-[#FEF2F2] border border-[#C53D3D]/30 text-[#C53D3D] rounded-btn text-xs">
              {formError}
            </div>
          )}

          {/* TAB 1: General Info */}
          {modalTab === 'general' && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  FIR / Case Title <span className="text-[#C53D3D]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., State vs Unknown - Cyber Extortion & Ransomware Attack"
                  className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033] focus:outline-none focus:border-[#167D8D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Offense Category
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                  >
                    <option value="Cyber Crime & Financial Fraud">Cyber Crime & Financial Fraud</option>
                    <option value="Criminal Breach of Trust & Cheating">Criminal Breach of Trust</option>
                    <option value="Forgery & Electronic Records">Forgery & Electronic Records</option>
                    <option value="Homicide & Violent Crime">Homicide & Violent Crime</option>
                    <option value="Narcotics & Controlled Substances">Narcotics & Drugs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Priority Level
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as CasePriority)}
                    className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Police Station <span className="text-[#C53D3D]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newStation}
                    onChange={(e) => setNewStation(e.target.value)}
                    className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    District / Jurisdiction
                  </label>
                  <input
                    type="text"
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Acts & Sections */}
          {modalTab === 'acts' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#F6F8FA] rounded-btn border border-[#E2E8F0] space-y-2">
                <div className="font-semibold text-[#12355B]">Primary Statute 1</div>
                <input
                  type="text"
                  value={act1Name}
                  onChange={(e) => setAct1Name(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                />
                <input
                  type="text"
                  value={act1Sections}
                  onChange={(e) => setAct1Sections(e.target.value)}
                  placeholder="Sections (e.g., Section 318(4), Section 336(3))"
                  className="w-full px-3 py-1.5 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                />
              </div>

              <div className="p-3 bg-[#F6F8FA] rounded-btn border border-[#E2E8F0] space-y-2">
                <div className="font-semibold text-[#12355B]">Secondary Statute 2</div>
                <input
                  type="text"
                  value={act2Name}
                  onChange={(e) => setAct2Name(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                />
                <input
                  type="text"
                  value={act2Sections}
                  onChange={(e) => setAct2Sections(e.target.value)}
                  placeholder="Sections (e.g., Section 66, Section 66C)"
                  className="w-full px-3 py-1.5 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Occurrence & Place */}
          {modalTab === 'occurrence' && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Date of Occurrence
                  </label>
                  <input
                    type="date"
                    value={newIncidentDate}
                    onChange={(e) => setNewIncidentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Day of Week
                  </label>
                  <input
                    type="text"
                    value={newOccurrenceDay}
                    onChange={(e) => setNewOccurrenceDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  Place of Occurrence (Address / Coordinates)
                </label>
                <input
                  type="text"
                  value={newPlaceOfOccurrence}
                  onChange={(e) => setNewPlaceOfOccurrence(e.target.value)}
                  className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Distance & Direction from Police Station
                  </label>
                  <input
                    type="text"
                    value={newDistanceFromPS}
                    onChange={(e) => setNewDistanceFromPS(e.target.value)}
                    className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Beat Number
                  </label>
                  <input
                    type="text"
                    value={newBeatNo}
                    onChange={(e) => setNewBeatNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Complainant */}
          {modalTab === 'complainant' && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Complainant Name
                  </label>
                  <input
                    type="text"
                    value={newComplainantName}
                    onChange={(e) => setNewComplainantName(e.target.value)}
                    placeholder="Full legal name"
                    className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Father's / Spouse's Name
                  </label>
                  <input
                    type="text"
                    value={newComplainantFatherSpouse}
                    onChange={(e) => setNewComplainantFatherSpouse(e.target.value)}
                    className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={newComplainantPhone}
                    onChange={(e) => setNewComplainantPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Age / Nationality
                  </label>
                  <input
                    type="text"
                    value={`${newComplainantAge} / ${newComplainantNationality}`}
                    onChange={(e) => setNewComplainantAge(e.target.value)}
                    className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={newComplainantAddress}
                  onChange={(e) => setNewComplainantAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                />
              </div>
            </div>
          )}

          {/* TAB 5: Suspects & Property */}
          {modalTab === 'suspects' && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  Suspect / Accused Particulars (Known / Unknown)
                </label>
                <textarea
                  rows={2}
                  value={newSuspectDetails}
                  onChange={(e) => setNewSuspectDetails(e.target.value)}
                  placeholder="Names, physical traits, digital aliases, IP origins..."
                  className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  Properties Stolen / Involved (if any)
                </label>
                <input
                  type="text"
                  value={newPropertiesStolen}
                  onChange={(e) => setNewPropertiesStolen(e.target.value)}
                  placeholder="e.g., Cryptographic wallet balances, hard drives..."
                  className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  Estimated Total Value (INR)
                </label>
                <input
                  type="text"
                  value={newTotalValue}
                  onChange={(e) => setNewTotalValue(e.target.value)}
                  placeholder="e.g., ₹ 45,00,000"
                  className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                />
              </div>
            </div>
          )}

          {/* TAB 6: FIR Narrative */}
          {modalTab === 'narrative' && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  Brief Facts / Incident Summary
                </label>
                <input
                  type="text"
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Brief synopsis for Case Register index"
                  className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1">
                  First Information Contents (Full Deposition / Statement)
                </label>
                <textarea
                  rows={5}
                  value={newFirContents}
                  onChange={(e) => setNewFirContents(e.target.value)}
                  placeholder="Detailed chronological statement transcribed by the Complainant or Station Duty Officer..."
                  className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                />
              </div>
            </div>
          )}

          {/* Modal Action Buttons (Section 17: Ghost Cancel + Navy Register) */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-btn text-xs font-medium text-[#64748B] hover:bg-[#F6F8FA] hover:text-[#172033] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isSubmitting ? 'Registering Docket...' : 'Register FIR Docket'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
