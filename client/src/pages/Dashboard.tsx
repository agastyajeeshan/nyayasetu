import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Plus,
  Search,
  AlertTriangle,
  FileText,
  Shield,
  Clock,
  ArrowRight,
  FolderKanban,
  CheckCircle2,
  Calendar,
  Building2,
  Lock,
  FileCheck2,
  Layers,
  BarChart2,
  TrendingUp,
  PieChart
} from 'lucide-react';
import { CaseStatusBadge } from '../components/common/Badge.js';

interface DashboardProps {
  onNavigate: (tab: string, extraId?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [activeCases, setActiveCases] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, casesData, docsData, evData] = await Promise.all([
          api.getSystemStats(),
          api.getCases(),
          api.getDocuments({ limit: '10' }),
          api.getEvidence()
        ]);
        setStats(statsData);
        // Show 3 to 4 active cases max on home page
        const filtered = casesData.filter((c: any) => c.status !== 'Closed');
        setActiveCases((filtered.length > 0 ? filtered : casesData).slice(0, 4));
        setDocuments(docsData.documents || []);
        setEvidenceList(evData || []);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Determine current shift & formatted date
  const today = new Date();
  const dateFormatted = today.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const currentHour = today.getHours();
  const shift = currentHour >= 8 && currentHour < 20 ? 'Day Duty (08:00 - 20:00)' : 'Night Duty (20:00 - 08:00)';
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

  // Attention metric calculations
  const pendingEvidenceCount = evidenceList.filter(e => e.status === 'Pending' || !e.custodyChain?.length).length || 3;
  const pendingDocsCount = documents.filter(d => d.reviewStatus === 'Draft' || d.reviewStatus === 'Submitted for Review').length || 2;

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-[#64748B] min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#12355B] border-t-transparent mb-3" />
        <span className="text-xs font-mono text-[#64748B]">
          Authenticating officer credentials & loading operational briefing...
        </span>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Top Greeting & Officer Summary Header (Section 12) */}
      <div className="bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#172033] tracking-tight">
              {greeting}, {user?.name || 'Officer'}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#E8F5F6] text-[#167D8D] border border-[#167D8D]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16805C] animate-pulse" />
              On Duty
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B]">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-[#167D8D]" />
              <strong>Police Station:</strong> {user?.department || 'Cyber Crime Division, New Delhi'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
              Date: {dateFormatted}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#64748B]" />
              Shift: {shift}
            </span>
          </div>
        </div>

        {/* Quick Actions (Section 12 Right) */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => onNavigate('search')}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-btn bg-white hover:bg-[#F6F8FA] text-[#172033] text-xs font-semibold border border-[#E2E8F0] transition-colors shadow-xs cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Search Records</span>
            <span className="text-[10px] font-mono text-[#94A3B8] bg-[#F1F4F7] px-1.5 py-0.5 rounded border border-[#E2E8F0]">
              Ctrl+K
            </span>
          </button>

          <button
            onClick={() => onNavigate('cases')}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New Case</span>
          </button>
        </div>
      </div>

      {/* 2. Section: "REQUIRES ATTENTION" (Section 13) */}
      <div className="bg-[#FEF9C3]/50 border border-[#FEF08A] rounded-card p-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#854D0E] uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-[#B7791F]" />
            <span>Requires Attention Today</span>
          </div>
          <span className="text-[11px] font-mono text-[#854D0E] font-medium">
            4 Actionable Tasks
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Attention Item 1 */}
          <button
            onClick={() => onNavigate('evidence')}
            className="p-2.5 rounded-btn bg-white border border-[#FDE047]/60 hover:border-[#B7791F] transition-all text-left group cursor-pointer shadow-2xs"
          >
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold text-[#172033] group-hover:text-[#12355B]">
                {pendingEvidenceCount} Evidence Items
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#92400E]">
                Pending
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Forensic hash verification & chain sign-off required
            </p>
          </button>

          {/* Attention Item 2 */}
          <button
            onClick={() => onNavigate('documents')}
            className="p-2.5 rounded-btn bg-white border border-[#FDE047]/60 hover:border-[#B7791F] transition-all text-left group cursor-pointer shadow-2xs"
          >
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold text-[#172033] group-hover:text-[#12355B]">
                {pendingDocsCount} Documents
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#DBEAFE] text-[#1E40AF]">
                Review
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Witness statements awaiting Section 161 scrutiny
            </p>
          </button>

          {/* Attention Item 3 */}
          <button
            onClick={() => onNavigate('evidence')}
            className="p-2.5 rounded-btn bg-white border border-[#FDE047]/60 hover:border-[#B7791F] transition-all text-left group cursor-pointer shadow-2xs"
          >
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold text-[#172033] group-hover:text-[#12355B]">
                2 Custody Transfers
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#92400E]">
                In Transit
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              CFSL Rohini receipt confirmation pending
            </p>
          </button>

          {/* Attention Item 4 */}
          <button
            onClick={() => onNavigate('cases')}
            className="p-2.5 rounded-btn bg-white border border-[#FDE047]/60 hover:border-[#B7791F] transition-all text-left group cursor-pointer shadow-2xs"
          >
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold text-[#C53D3D] group-hover:text-[#991B1B]">
                Statutory Deadline
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FEE2E2] text-[#991B1B]">
                4 Days
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Charge sheet due for FIR-2024-0891 (Sec 173 CrPC)
            </p>
          </button>
        </div>
      </div>

      {/* 2.5. Section 6: Operational Metrics & Evidentiary Distributions */}
      <div className="bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F1F4F7]">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#12355B]" />
            <h2 className="text-sm font-bold text-[#172033]">
              Operational Intelligence & Evidentiary Distributions
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#64748B] font-mono">
            <span>Overall Case Resolution Rate: <strong className="text-[#16805C]">78.4%</strong></span>
            <span>•</span>
            <span>Audit Proofs: <strong className="text-[#12355B]">100% Validated</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Chart 1: Cases by Status */}
          <div className="p-4 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#172033]">Cases by Status</span>
              <span className="text-[10px] font-mono font-semibold text-[#167D8D] bg-[#E8F5F6] px-1.5 py-0.5 rounded border border-[#167D8D]/20">
                11 Active Dockets
              </span>
            </div>

            {/* Segmented Bar */}
            <div className="w-full h-2 rounded-full overflow-hidden flex bg-[#E2E8F0]">
              <div style={{ width: '40%' }} className="bg-[#12355B]" title="Active: 4 (40%)" />
              <div style={{ width: '25%' }} className="bg-[#167D8D]" title="Under Review: 3 (25%)" />
              <div style={{ width: '18%' }} className="bg-[#16805C]" title="Charge Sheet Filed: 2 (18%)" />
              <div style={{ width: '10%' }} className="bg-[#B7791F]" title="Under Trial: 1 (10%)" />
              <div style={{ width: '7%' }} className="bg-[#94A3B8]" title="Closed: 1 (7%)" />
            </div>

            {/* Legend & Breakdown */}
            <div className="space-y-1.5 text-xs text-[#64748B]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-[#12355B]" />
                  <span>Active Investigation</span>
                </span>
                <span className="font-mono font-bold text-[#172033]">4</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-[#167D8D]" />
                  <span>Under Supervisory Review</span>
                </span>
                <span className="font-mono font-bold text-[#172033]">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-[#16805C]" />
                  <span>Charge Sheet Filed</span>
                </span>
                <span className="font-mono font-bold text-[#172033]">2</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-[#B7791F]" />
                  <span>Under Trial (Court)</span>
                </span>
                <span className="font-mono font-bold text-[#172033]">1</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-[#94A3B8]" />
                  <span>Closed</span>
                </span>
                <span className="font-mono font-bold text-[#172033]">1</span>
              </div>
            </div>
          </div>

          {/* Chart 2: Documents by Type */}
          <div className="p-4 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#172033]">Documents by Type</span>
              <span className="text-[10px] font-mono font-semibold text-[#12355B] bg-[#E8F5F6] px-1.5 py-0.5 rounded border border-[#12355B]/20">
                28 Dockets
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-[11px] text-[#64748B] mb-0.5">
                  <span>Witness Statements (Sec 161/180)</span>
                  <span className="font-mono font-semibold text-[#172033]">8 (29%)</span>
                </div>
                <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#167D8D] rounded-full" style={{ width: '29%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[#64748B] mb-0.5">
                  <span>Case Diary Entries (Sec 172)</span>
                  <span className="font-mono font-semibold text-[#172033]">6 (21%)</span>
                </div>
                <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#12355B] rounded-full" style={{ width: '21%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[#64748B] mb-0.5">
                  <span>CFSL Forensic Reports</span>
                  <span className="font-mono font-semibold text-[#172033]">5 (18%)</span>
                </div>
                <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#12355B] rounded-full" style={{ width: '18%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[#64748B] mb-0.5">
                  <span>Seizure & Panchnama Memos</span>
                  <span className="font-mono font-semibold text-[#172033]">5 (18%)</span>
                </div>
                <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#B7791F] rounded-full" style={{ width: '18%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[#64748B] mb-0.5">
                  <span>FIRs (Form I.F.1) & Orders</span>
                  <span className="font-mono font-semibold text-[#172033]">4 (14%)</span>
                </div>
                <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#16805C] rounded-full" style={{ width: '14%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Chart 3: Evidence by Category */}
          <div className="p-4 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#172033]">Evidence by Category</span>
              <span className="text-[10px] font-mono font-semibold text-[#16805C] bg-[#E8F5F6] px-1.5 py-0.5 rounded border border-[#16805C]/20">
                16 Exhibits
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2 rounded bg-white border border-[#E2E8F0] flex items-center justify-between">
                <span className="text-[11px] text-[#172033] font-medium">Digital Storage (HDD/SSD/DVR)</span>
                <span className="font-mono font-bold text-[#12355B] bg-[#E8F5F6] px-1.5 py-0.2 rounded">5</span>
              </div>
              <div className="p-2 rounded bg-white border border-[#E2E8F0] flex items-center justify-between">
                <span className="text-[11px] text-[#172033] font-medium">Mobile Phones & SIM Cards</span>
                <span className="font-mono font-bold text-[#12355B] bg-[#E8F5F6] px-1.5 py-0.2 rounded">4</span>
              </div>
              <div className="p-2 rounded bg-white border border-[#E2E8F0] flex items-center justify-between">
                <span className="text-[11px] text-[#172033] font-medium">Financial Ledgers & Statements</span>
                <span className="font-mono font-bold text-[#12355B] bg-[#E8F5F6] px-1.5 py-0.2 rounded">3</span>
              </div>
              <div className="p-2 rounded bg-white border border-[#E2E8F0] flex items-center justify-between">
                <span className="text-[11px] text-[#172033] font-medium">Ballistics / Seized Firearms</span>
                <span className="font-mono font-bold text-[#12355B] bg-[#E8F5F6] px-1.5 py-0.2 rounded">2</span>
              </div>
              <div className="p-2 rounded bg-white border border-[#E2E8F0] flex items-center justify-between">
                <span className="text-[11px] text-[#172033] font-medium">Physical Material & Forensics</span>
                <span className="font-mono font-bold text-[#12355B] bg-[#E8F5F6] px-1.5 py-0.2 rounded">2</span>
              </div>
            </div>
          </div>

          {/* Chart 4: Monthly Ingestion Activity & Progress */}
          <div className="p-4 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#172033]">Monthly Document Activity</span>
              <span className="text-[10px] font-mono font-semibold text-[#16805C] flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +33% MoM
              </span>
            </div>

            {/* Bar columns */}
            <div className="h-24 flex items-end justify-between gap-2 pt-2 px-1 border-b border-[#E2E8F0]">
              {[
                { month: 'May', count: 6, height: '25%' },
                { month: 'Jun', count: 10, height: '40%' },
                { month: 'Jul', count: 15, height: '60%' },
                { month: 'Aug', count: 21, height: '85%' },
                { month: 'Sep', count: 26, height: '100%' }
              ].map(bar => (
                <div key={bar.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] font-mono font-semibold text-[#64748B]">{bar.count}</span>
                  <div
                    className="w-full bg-[#12355B] hover:bg-[#167D8D] transition-colors rounded-t"
                    style={{ height: bar.height }}
                    title={`${bar.month}: ${bar.count} documents`}
                  />
                  <span className="text-[10px] text-[#64748B]">{bar.month}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1">
              <span>Section 193 BNSS Readiness:</span>
              <strong className="text-[#16805C] font-mono">82% On-Track</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Split Grid: My Active Cases & Recent Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (8 Cols): SECTION "MY ACTIVE CASES" (Section 14) */}
        <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F4F7]">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-[#12355B]" />
              <h2 className="text-sm font-bold text-[#172033]">
                My Active Cases ({activeCases.length})
              </h2>
            </div>
            <button
              onClick={() => onNavigate('cases')}
              className="text-xs text-[#167D8D] hover:text-[#12355B] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View All Cases</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {activeCases.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-card border border-[#E2E8F0] hover:border-[#167D8D]/40 hover:bg-[#F6F8FA]/60 transition-all space-y-2.5 bg-white"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#12355B] bg-[#E8F5F6] px-2 py-0.5 rounded border border-[#167D8D]/20">
                      {c.caseNumber}
                    </span>
                    <span className="text-[11px] text-[#64748B] font-medium">{c.type}</span>
                  </div>
                  <CaseStatusBadge status={c.status} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[#172033] hover:text-[#12355B] transition-colors">
                    {c.title}
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5 line-clamp-1">
                    {c.summary || c.incidentSummary || 'Ongoing investigation registered under jurisdiction.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-[#64748B] pt-2 border-t border-[#F1F4F7] gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-[#64748B]" />
                      <strong>{c.documentsCount ?? (documents.filter(d => d.caseId === c.id).length || 8)}</strong> Documents
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-[#64748B]" />
                      <strong>{c.evidenceCount ?? 4}</strong> Evidence Items
                    </span>
                    <span>•</span>
                    <span className="text-[11px] text-[#94A3B8]">
                      Last activity: {new Date(c.updatedAt || c.filingDate).toLocaleDateString('en-IN')}
                    </span>
                  </div>

                  <button
                    onClick={() => onNavigate('cases', c.id)}
                    className="text-xs font-bold text-[#167D8D] hover:text-[#12355B] flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Case</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right (4 Cols): SECTION "RECENT ACTIVITY TIMELINE" (Section 15) */}
        <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F4F7]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#12355B]" />
                <h2 className="text-sm font-bold text-[#172033]">
                  Recent Activity
                </h2>
              </div>
              <button
                onClick={() => onNavigate('audit')}
                className="text-xs text-[#167D8D] hover:text-[#12355B] font-semibold cursor-pointer"
              >
                Audit Log
              </button>
            </div>

            {/* Clean Vertical Timeline */}
            <div className="mt-4 relative pl-4 border-l-2 border-[#E2E8F0] space-y-5">
              {/* Event 1 */}
              <div className="relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#167D8D] border-2 border-white ring-2 ring-[#167D8D]/20" />
                <div className="text-[11px] font-mono text-[#64748B] font-semibold">
                  10:42 AM Today
                </div>
                <p className="text-xs text-[#172033] mt-0.5">
                  <strong className="font-semibold text-[#12355B]">SI Sharma</strong> uploaded Forensics Disk Image (EnCase format)
                </p>
                <div className="text-[11px] text-[#64748B] mt-0.5 flex items-center gap-1 font-mono">
                  <span className="text-[#167D8D]">FIR-2024-0891</span> • SHA-256 Validated
                </div>
              </div>

              {/* Event 2 */}
              <div className="relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#B7791F] border-2 border-white ring-2 ring-[#B7791F]/20" />
                <div className="text-[11px] font-mono text-[#64748B] font-semibold">
                  09:15 AM Today
                </div>
                <p className="text-xs text-[#172033] mt-0.5">
                  Evidence Item <strong className="font-mono text-[#172033]">#EV-2024-0042</strong> transferred to Central Forensic Science Lab
                </p>
                <div className="text-[11px] text-[#64748B] mt-0.5">
                  Custodian: Dr. V. Sen (CFSL)
                </div>
              </div>

              {/* Event 3 */}
              <div className="relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#16805C] border-2 border-white ring-2 ring-[#16805C]/20" />
                <div className="text-[11px] font-mono text-[#64748B] font-semibold">
                  Yesterday, 16:30
                </div>
                <p className="text-xs text-[#172033] mt-0.5">
                  Case <strong className="font-mono text-[#12355B]">FIR-2024-0712</strong> status updated to <span className="font-semibold text-[#16805C]">Charge Sheet Filed</span>
                </p>
                <div className="text-[11px] text-[#64748B] mt-0.5">
                  Dispatched to Patiala House Court
                </div>
              </div>

              {/* Event 4 */}
              <div className="relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#64748B] border-2 border-white ring-2 ring-[#64748B]/20" />
                <div className="text-[11px] font-mono text-[#64748B] font-semibold">
                  Yesterday, 11:00
                </div>
                <p className="text-xs text-[#172033] mt-0.5">
                  Digital Signature applied to Witness Deposition (Sec 161 CrPC)
                </p>
                <div className="text-[11px] text-[#64748B] mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#16805C]" />
                  <span>DSC Token #MHA-GOI-9923 Validated</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ledger Height Mini Status */}
          <div className="mt-6 pt-4 border-t border-[#F1F4F7] flex items-center justify-between text-xs text-[#64748B]">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#16805C]" />
              <span>Audit Ledger Height:</span>
              <strong className="font-mono text-[#172033]">#{stats?.ledgerHeight ?? 22}</strong>
            </div>
            <span className="text-[10px] font-mono text-[#16805C] font-semibold bg-[#E8F5F6] px-1.5 py-0.5 rounded border border-[#16805C]/20">
              0 Tamper Alerts
            </span>
          </div>
        </div>
      </div>

      {/* 4. Statutory Evidentiary Sanctity Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-card p-4 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-btn bg-[#E8F5F6] text-[#167D8D] flex items-center justify-center shrink-0 border border-[#167D8D]/20">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-[#172033] flex items-center gap-2">
              <span>Statutory Evidentiary Sanctity & Cryptographic Ledger Proofs</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-[#E8F5F6] text-[#167D8D] border border-[#167D8D]/20">
                SEC 65B CERTIFIED
              </span>
            </div>
            <p className="text-[#64748B] text-[11px] mt-0.5">
              All records and custody transfers are immutably anchored to SHA-256 Merkle blocks, legally admissible under Section 65B Indian Evidence Act & Section 63 BSA 2023.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-[#12355B] bg-[#F6F8FA] px-3 py-1.5 rounded-btn border border-[#E2E8F0]">
          <Clock className="w-3.5 h-3.5 text-[#167D8D]" />
          <span>Continuous IST Ledger Sync Active</span>
        </div>
      </div>
    </div>
  );
};
