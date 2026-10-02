import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  FileText,
  Calendar,
  Building2,
  CheckCircle2,
  Shield,
  Clock,
  Eye,
  ArrowRight
} from 'lucide-react';
import { apiGet } from '../api/client.js';
import { Case } from '../types.js';
import { PrintableReportModal } from '../components/ui/PrintableReportModal.js';

export const Reports: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [reportType, setReportType] = useState<'FIR_FORM_1' | 'CASE_DIARY' | 'CHARGE_SHEET'>('FIR_FORM_1');
  const [dateFrom, setDateFrom] = useState<string>('2024-05-01');
  const [dateTo, setDateTo] = useState<string>('2024-05-24');

  // Checkboxes (Section 26)
  const [includeHashes, setIncludeHashes] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [includeCustodyLog, setIncludeCustodyLog] = useState(true);
  const [includeInternalNotes, setIncludeInternalNotes] = useState(false);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCases = async () => {
      try {
        const list = await apiGet<Case[]>('/api/cases');
        setCases(list || []);
        if (list && list.length > 0) {
          setSelectedCaseId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load cases:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCases();
  }, []);

  const selectedCase = cases.find((c) => c.id === selectedCaseId);

  const handleExportJson = () => {
    if (!selectedCase) return;
    const exportPayload = {
      case: selectedCase,
      reportType,
      parameters: {
        dateFrom,
        dateTo,
        includeHashes,
        includeSignatures,
        includeCustodyLog,
        includeInternalNotes
      },
      exportedAt: new Date().toISOString(),
      statutoryCompliance: 'Section 65B Indian Evidence Act / Section 63 BSA 2023'
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${selectedCase.caseNumber}_${reportType}_Report.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Official Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-btn bg-[#E8F5F6] flex items-center justify-center border border-[#167D8D]/20">
              <FileSpreadsheet className="w-4 h-4 text-[#167D8D]" />
            </div>
            <h1 className="text-xl font-bold text-[#172033] tracking-tight">
              Operational Reports & Judicial Briefs
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#E8F5F6] text-[#167D8D] border border-[#167D8D]/20">
              NCRB / BNSS STATUTORY
            </span>
          </div>
          <p className="text-xs text-[#64748B]">
            Generate court-admissible Form I.F.1, Section 172 Case Diaries, and Section 173 Charge Sheets
          </p>
        </div>
      </div>

      {/* Main Report Generator Interface (Section 26) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Generator Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-5">
          <h2 className="text-sm font-bold text-[#172033] uppercase tracking-wider pb-2 border-b border-[#F1F4F7]">
            Report Configuration
          </h2>

          {/* 1. Select Case / FIR */}
          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Select Case / FIR Docket <span className="text-[#C53D3D]">*</span>
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs font-semibold text-[#12355B] focus:outline-none focus:border-[#167D8D]"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber} — {c.title} ({c.policeStation})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Select Report Type */}
          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Statutory Report Type <span className="text-[#C53D3D]">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setReportType('FIR_FORM_1')}
                className={`p-3 rounded-btn border text-left transition-all cursor-pointer ${
                  reportType === 'FIR_FORM_1'
                    ? 'bg-[#E8F5F6] border-[#167D8D] text-[#12355B]'
                    : 'bg-white border-[#E2E8F0] text-[#64748B] hover:bg-[#F6F8FA]'
                }`}
              >
                <div className="font-bold text-xs">Form I.F.1 (FIR)</div>
                <div className="text-[10px] mt-0.5 opacity-80">NCRB First Information Report</div>
              </button>

              <button
                type="button"
                onClick={() => setReportType('CASE_DIARY')}
                className={`p-3 rounded-btn border text-left transition-all cursor-pointer ${
                  reportType === 'CASE_DIARY'
                    ? 'bg-[#E8F5F6] border-[#167D8D] text-[#12355B]'
                    : 'bg-white border-[#E2E8F0] text-[#64748B] hover:bg-[#F6F8FA]'
                }`}
              >
                <div className="font-bold text-xs">Case Diary</div>
                <div className="text-[10px] mt-0.5 opacity-80">Section 172 CrPC / BNSS</div>
              </button>

              <button
                type="button"
                onClick={() => setReportType('CHARGE_SHEET')}
                className={`p-3 rounded-btn border text-left transition-all cursor-pointer ${
                  reportType === 'CHARGE_SHEET'
                    ? 'bg-[#E8F5F6] border-[#167D8D] text-[#12355B]'
                    : 'bg-white border-[#E2E8F0] text-[#64748B] hover:bg-[#F6F8FA]'
                }`}
              >
                <div className="font-bold text-xs">Charge Sheet</div>
                <div className="text-[10px] mt-0.5 opacity-80">Section 173 CrPC / 193 BNSS</div>
              </button>
            </div>
          </div>

          {/* 3. Date Range */}
          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Date Range (Investigation Window)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                />
              </div>
            </div>
          </div>

          {/* 4. Include / Exclude Checklists (Section 26) */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-semibold text-[#172033]">
              Evidentiary Inclusions & Statutory Verification
            </label>
            <div className="p-3.5 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] space-y-2 text-xs">
              <label className="flex items-center gap-2.5 cursor-pointer text-[#172033]">
                <input
                  type="checkbox"
                  checked={includeHashes}
                  onChange={(e) => setIncludeHashes(e.target.checked)}
                  className="rounded border-[#E2E8F0] text-[#12355B]"
                />
                <span>Include Digital Evidence Hashes (SHA-256 for Section 65B Compliance)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-[#172033]">
                <input
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={(e) => setIncludeSignatures(e.target.checked)}
                  className="rounded border-[#E2E8F0] text-[#12355B]"
                />
                <span>Include Officer Digital Signatures & Public Key Verification Seals</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-[#172033]">
                <input
                  type="checkbox"
                  checked={includeCustodyLog}
                  onChange={(e) => setIncludeCustodyLog(e.target.checked)}
                  className="rounded border-[#E2E8F0] text-[#12355B]"
                />
                <span>Include Complete Chain of Custody Movement Log & Malkhana Locker Seals</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-[#64748B]">
                <input
                  type="checkbox"
                  checked={includeInternalNotes}
                  onChange={(e) => setIncludeInternalNotes(e.target.checked)}
                  className="rounded border-[#E2E8F0] text-[#12355B]"
                />
                <span>Include Internal Confidential Investigation Leads & Surveillance Notes</span>
              </label>
            </div>
          </div>

          {/* Action Buttons (Section 26) */}
          <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-[#E2E8F0]">
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Report</span>
            </button>

            <button
              onClick={() => setIsPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-btn bg-white hover:bg-[#F6F8FA] text-[#172033] text-xs font-semibold border border-[#E2E8F0] cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-[#167D8D]" />
              <span>Print / Download PDF</span>
            </button>

            <button
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-btn bg-[#F1F4F7] hover:bg-[#E2E8F0] text-[#172033] text-xs font-semibold cursor-pointer border border-[#E2E8F0]"
            >
              <Download className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Export JSON / Metadata</span>
            </button>
          </div>
        </div>

        {/* Selected Case Summary Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-4">
            <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider pb-2 border-b border-[#F1F4F7]">
              Docket Summary for Selected Report
            </h3>

            {selectedCase ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] text-[#64748B] font-semibold block">Case Number</span>
                  <span className="font-mono font-bold text-[#12355B] text-sm">{selectedCase.caseNumber}</span>
                </div>

                <div>
                  <span className="text-[10px] text-[#64748B] font-semibold block">Title</span>
                  <div className="font-semibold text-[#172033]">{selectedCase.title}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] text-[#64748B] font-semibold block">Police Station</span>
                    <span className="text-[#172033]">{selectedCase.policeStation}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] font-semibold block">Investigating Officer</span>
                    <span className="text-[#172033]">{selectedCase.investigatingOfficerName}</span>
                  </div>
                </div>

                <div className="p-3 rounded-btn bg-[#E8F5F6]/50 border border-[#167D8D]/20 space-y-1">
                  <div className="text-[10px] font-bold text-[#12355B] uppercase tracking-wider">
                    Statutory Certification Seal
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    Reports generated through NYAYASETU AI include government watermarks, digital verification hashes, and are admissible under Section 65B Indian Evidence Act / Section 63 BSA 2023.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-[#64748B]">
                Select a case to inspect docket parameters.
              </div>
            )}
          </div>

          {/* Recently Generated Reports Table */}
          <div className="bg-white border border-[#E2E8F0] rounded-card p-5 shadow-card space-y-3">
            <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider pb-2 border-b border-[#F1F4F7]">
              Recently Generated Reports
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0]">
                <div>
                  <strong className="text-[#12355B]">Form I.F.1 — FIR-2024-0891</strong>
                  <div className="text-[10px] text-[#64748B]">Generated 24 May 2024, 11:20 IST</div>
                </div>
                <button
                  onClick={() => setIsPreviewOpen(true)}
                  className="text-xs text-[#167D8D] hover:underline font-semibold cursor-pointer"
                >
                  View
                </button>
              </div>

              <div className="flex items-center justify-between p-2 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0]">
                <div>
                  <strong className="text-[#12355B]">Case Diary — FIR-2024-0712</strong>
                  <div className="text-[10px] text-[#64748B]">Generated 22 May 2024, 16:45 IST</div>
                </div>
                <button
                  onClick={() => setIsPreviewOpen(true)}
                  className="text-xs text-[#167D8D] hover:underline font-semibold cursor-pointer"
                >
                  View
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Report Modal */}
      {isPreviewOpen && selectedCase && (
        <PrintableReportModal
          caseData={selectedCase}
          reportType={reportType}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
};
