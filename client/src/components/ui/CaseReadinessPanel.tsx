import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { CaseReadinessReport, ReadinessCheckItem } from '../../types.js';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck2,
  ChevronRight,
  ShieldCheck,
  Scale,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface CaseReadinessPanelProps {
  caseId?: string;
  report?: CaseReadinessReport;
  onNavigateTab?: (tab: string) => void;
  onNavigateToTab?: (tab: string, extraAction?: string) => void;
}

export const CaseReadinessPanel: React.FC<CaseReadinessPanelProps> = ({
  caseId,
  report: initialReport,
  onNavigateTab,
  onNavigateToTab
}) => {
  const [report, setReport] = useState<CaseReadinessReport | null>(initialReport || null);
  const [loading, setLoading] = useState<boolean>(!initialReport && !!caseId);

  useEffect(() => {
    if (initialReport) {
      setReport(initialReport);
    } else if (caseId) {
      setLoading(true);
      api.getCaseReadiness(caseId)
        .then(res => setReport(res))
        .catch(err => console.error('Failed to load readiness:', err))
        .finally(() => setLoading(false));
    }
  }, [caseId, initialReport]);

  const handleNav = (tab: string, extraAction?: string) => {
    if (onNavigateTab) onNavigateTab(tab);
    if (onNavigateToTab) onNavigateToTab(tab, extraAction);
  };

  if (loading || !report) {
    return (
      <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-500 text-center">
        Evaluating statutory case readiness...
      </div>
    );
  }
  const completeCount = report.checks.filter(c => c.status === 'COMPLETE').length;
  const warningCount = report.checks.filter(c => c.status === 'WARNING').length;
  const missingCount = report.checks.filter(c => c.status === 'MISSING').length;

  const getStatusIcon = (status: ReadinessCheckItem['status']) => {
    switch (status) {
      case 'COMPLETE':
        return <CheckCircle2 className="w-4 h-4 text-[#16805C] shrink-0" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0" />;
      case 'MISSING':
        return <XCircle className="w-4 h-4 text-[#B91C1C] shrink-0" />;
    }
  };

  const getStatusBadge = (status: ReadinessCheckItem['status']) => {
    switch (status) {
      case 'COMPLETE':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ECFDF5] text-[#16805C] border border-[#A7F3D0]">Satisfied ✓</span>;
      case 'WARNING':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">Attention ⚠</span>;
      case 'MISSING':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FEF2F2] text-[#B91C1C] border border-[#FCA5A5]">Missing ✗</span>;
    }
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-card p-5 shadow-card space-y-5">
      {/* Header with real completeness score */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#F1F4F7]">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-btn bg-[#E8F5F6] flex items-center justify-center shrink-0 border border-[#167D8D]/20">
            <Scale className="w-5 h-5 text-[#167D8D]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#172033] tracking-tight">
                Case Readiness & Judicial Admissibility
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                report.isReadyForFiling
                  ? 'bg-[#ECFDF5] text-[#16805C] border border-[#A7F3D0]'
                  : 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
              }`}>
                {report.isReadyForFiling ? 'Charge Sheet Ready' : 'Incomplete Records'}
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Statutory verification under Section 193 BNSS & Bharatiya Sakshya Adhiniyam standards.
            </p>
          </div>
        </div>

        {/* Real Completeness Index Box */}
        <div className="flex items-center gap-3 bg-[#F8FAFC] px-4 py-2 rounded-card border border-[#E2E8F0]">
          <div>
            <div className="text-[10px] uppercase font-bold text-[#64748B]">Case Completeness</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-lg font-extrabold text-[#12355B]">{report.completenessScore}%</span>
              <span className="text-[11px] text-[#64748B]">({completeCount}/{report.checks.length} Met)</span>
            </div>
          </div>
          <div className="w-12 h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                report.completenessScore >= 80 ? 'bg-[#16805C]' : report.completenessScore >= 50 ? 'bg-[#D97706]' : 'bg-[#DC2626]'
              }`}
              style={{ width: `${report.completenessScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="p-3 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] text-xs text-[#475569] leading-relaxed">
        <strong>Evaluation Summary:</strong> {report.summaryText}
      </div>

      {/* 10 Real Checks Checklist */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-[#64748B] uppercase tracking-wider px-1">
          <span>Admissibility Standards</span>
          <span>Status & Action</span>
        </div>

        <div className="divide-y divide-[#F1F4F7] border border-[#E2E8F0] rounded-card overflow-hidden">
          {report.checks.map((item) => (
            <div
              key={item.key}
              onClick={() => {
                if (item.status !== 'COMPLETE') {
                  handleNav(item.navigationTarget.tab, item.navigationTarget.action);
                }
              }}
              className={`p-3.5 flex items-start justify-between gap-4 transition-colors ${
                item.status !== 'COMPLETE'
                  ? 'hover:bg-[#F8FAFC] cursor-pointer group'
                  : 'bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getStatusIcon(item.status)}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#172033] group-hover:text-[#12355B]">
                      {item.label}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#F1F5F9] text-[#64748B]">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    {item.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {getStatusBadge(item.status)}
                {item.status !== 'COMPLETE' && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-[#167D8D] group-hover:underline">
                    <span>Resolve</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
