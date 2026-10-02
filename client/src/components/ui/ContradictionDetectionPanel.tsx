import React, { useState, useEffect } from 'react';
import { apiGet } from '../../api/client.js';
import { ContradictionItem } from '../../types.js';
import {
  AlertTriangle,
  FileText,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ShieldAlert,
  Info,
  Check,
  Calendar,
  MapPin,
  Car
} from 'lucide-react';

interface ContradictionDetectionPanelProps {
  caseId?: string;
  contradictions?: ContradictionItem[];
  caseNumber?: string;
  onSelectDocument?: (docId: string) => void;
}

export const ContradictionDetectionPanel: React.FC<ContradictionDetectionPanelProps> = ({
  caseId,
  contradictions: initialContradictions,
  caseNumber,
  onSelectDocument
}) => {
  const [items, setItems] = useState<ContradictionItem[]>(initialContradictions || []);
  const [loading, setLoading] = useState<boolean>(!initialContradictions && !!caseId);
  const [expandedId, setExpandedId] = useState<string | null>(initialContradictions?.[0]?.id || null);
  const [activeNotesId, setActiveNotesId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>('');

  useEffect(() => {
    if (initialContradictions) {
      setItems(initialContradictions);
      if (initialContradictions.length > 0 && !expandedId) {
        setExpandedId(initialContradictions[0].id);
      }
    } else if (caseId) {
      setLoading(true);
      apiGet<ContradictionItem[]>(`/intelligence/discrepancies?caseId=${caseId}`)
        .then(res => {
          const list = res || [];
          setItems(list);
          if (list.length > 0) setExpandedId(list[0].id);
        })
        .catch(err => console.error('Failed to load contradictions:', err))
        .finally(() => setLoading(false));
    }
  }, [caseId, initialContradictions]);

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return { bg: 'bg-[#FEF2F2]', text: 'text-[#B91C1C]', border: 'border-[#FCA5A5]' };
      case 'high':
        return { bg: 'bg-[#FFF4E5]', text: 'text-[#B45309]', border: 'border-[#FDE68A]' };
      case 'medium':
        return { bg: 'bg-[#FEF9C3]', text: 'text-[#854D0E]', border: 'border-[#FEF08A]' };
      default:
        return { bg: 'bg-[#F1F5F9]', text: 'text-[#475569]', border: 'border-[#CBD5E1]' };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'DATES':
        return Calendar;
      case 'LOCATIONS':
        return MapPin;
      case 'EVIDENCE_IDS':
        return Car;
      default:
        return FileText;
    }
  };

  const handleResolve = (id: string, newStatus: 'INVESTIGATOR_NOTED' | 'RECONCILED') => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: newStatus,
          investigatorNotes: noteText || item.investigatorNotes || 'Investigator reviewed and reconciled with supplementary records.'
        };
      }
      return item;
    }));
    setActiveNotesId(null);
    setNoteText('');
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-card p-12 text-center text-xs text-[#64748B] shadow-card">
        <div className="w-6 h-6 border-2 border-[#12355B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Scanning case dockets and depositions for potential contradictions...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-card p-5 shadow-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-btn bg-[#FFF4E5] flex items-center justify-center shrink-0 border border-[#FDE68A]">
              <ShieldAlert className="w-5 h-5 text-[#B45309]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#172033] tracking-tight">
                  Cross-Document Contradiction Detection
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FFF4E5] text-[#B45309] font-bold border border-[#FDE68A]">
                  ADVISORY ONLY
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                Automated multi-document discrepancy scanner identifying potential conflicts in dates, vehicle descriptions, alibis, and seized exhibits.
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs text-[#64748B]">Case Docket</div>
            <div className="font-mono font-bold text-sm text-[#12355B]">{caseNumber}</div>
          </div>
        </div>

        {/* Advisory Guideline */}
        <div className="mt-4 p-3 rounded-btn bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-2 text-xs text-[#475569]">
          <Info className="w-4 h-4 text-[#167D8D] shrink-0" />
          <span>
            <strong>Statutory Rule:</strong> System flags potential variances for human evaluation. No statement is declared definitively false until investigated by the officer in charge.
          </span>
        </div>
      </div>

      {/* Contradiction Cards */}
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-card p-12 text-center text-[#64748B] text-xs">
            <CheckCircle2 className="w-8 h-8 text-[#16805C] mx-auto mb-2" />
            <p className="font-semibold text-[#172033]">No potential contradictions detected</p>
            <p className="text-[11px] text-[#94A3B8] mt-1">All dates, witness depositions, and exhibit identifiers are consistent across this docket.</p>
          </div>
        ) : (
          items.map((item) => {
            const isExpanded = expandedId === item.id;
            const sevBadge = getSeverityBadge(item.severity);
            const CatIcon = getCategoryIcon(item.category);

            return (
              <div
                key={item.id}
                className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-card shadow-xs transition-all overflow-hidden"
              >
                {/* Collapsed Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-btn bg-[#FFF4E5] flex items-center justify-center shrink-0 border border-[#FDE68A] mt-0.5">
                      <CatIcon className="w-4 h-4 text-[#B45309]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.2 rounded border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}>
                          {item.severity} Severity
                        </span>
                        <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                          Category: {item.category.replace(/_/g, ' ')}
                        </span>
                        {item.status === 'RECONCILED' && (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-[#ECFDF5] text-[#16805C] border border-[#A7F3D0]">
                            Reconciled
                          </span>
                        )}
                        {item.status === 'INVESTIGATOR_NOTED' && (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-[#EBF3FB] text-[#12355B] border border-[#BFDBFE]">
                            Investigator Noted
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-[#172033]">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#64748B] mt-1 line-clamp-2">
                        {item.conflictingInformation}
                      </p>
                    </div>
                  </div>

                  <button className="text-[#94A3B8] p-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expanded Side-by-Side Comparison */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-[#F1F4F7] space-y-4">
                    {/* Potential Contradiction Notice */}
                    <div className="p-3 rounded-btn bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] leading-relaxed">
                      <strong>Analysis:</strong> {item.potentialDescription}
                    </div>

                    {/* Side-by-side Document Excerpts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Source Document A */}
                      <div className="p-4 rounded-card bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#12355B]">Source Document A</span>
                          <span className="text-[10px] font-mono text-[#64748B]">{item.sourceA.documentNumber || 'DOC-A'}</span>
                        </div>
                        <div className="text-xs font-semibold text-[#172033]">
                          {item.sourceA.documentTitle}
                        </div>
                        {item.sourceA.pageOrSection && (
                          <div className="text-[10px] text-[#64748B] font-medium">
                            Citation: {item.sourceA.pageOrSection}
                          </div>
                        )}
                        <blockquote className="p-2.5 rounded bg-white border-l-2 border-[#12355B] text-xs text-[#334155] italic font-serif leading-relaxed">
                          {item.sourceA.snippet}
                        </blockquote>

                        {onSelectDocument && (
                          <button
                            onClick={() => onSelectDocument(item.sourceA.documentId)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#167D8D] hover:underline cursor-pointer pt-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Review Source Document A</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Source Document B */}
                      <div className="p-4 rounded-card bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#B91C1C]">Source Document B</span>
                          <span className="text-[10px] font-mono text-[#64748B]">{item.sourceB.documentNumber || 'DOC-B'}</span>
                        </div>
                        <div className="text-xs font-semibold text-[#172033]">
                          {item.sourceB.documentTitle}
                        </div>
                        {item.sourceB.pageOrSection && (
                          <div className="text-[10px] text-[#64748B] font-medium">
                            Citation: {item.sourceB.pageOrSection}
                          </div>
                        )}
                        <blockquote className="p-2.5 rounded bg-white border-l-2 border-[#B91C1C] text-xs text-[#334155] italic font-serif leading-relaxed">
                          {item.sourceB.snippet}
                        </blockquote>

                        {onSelectDocument && (
                          <button
                            onClick={() => onSelectDocument(item.sourceB.documentId)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#B91C1C] hover:underline cursor-pointer pt-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Review Source Document B</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Recommendation & Resolution Controls */}
                    {item.recommendation && (
                      <div className="p-3 rounded-btn bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#166534]">
                        <strong>Investigative Recommendation:</strong> {item.recommendation}
                      </div>
                    )}

                    {item.investigatorNotes && (
                      <div className="p-3 rounded-btn bg-[#F1F5F9] border border-[#CBD5E1] text-xs text-[#1E293B]">
                        <strong>Investigator Record Note:</strong> {item.investigatorNotes}
                      </div>
                    )}

                    {/* Investigator Action Buttons */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResolve(item.id, 'RECONCILED')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-[#16805C] hover:bg-[#136C4E] text-white text-xs font-semibold cursor-pointer shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark as Reconciled</span>
                        </button>

                        <button
                          onClick={() => setActiveNotesId(activeNotesId === item.id ? null : item.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-[#F6F8FA] hover:bg-[#E2E8F0] text-[#172033] border border-[#CBD5E1] text-xs font-semibold cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#64748B]" />
                          <span>Add Case Note</span>
                        </button>
                      </div>

                      <span className="text-[10px] text-[#94A3B8]">
                        Investigator has sovereign discretion under Section 173 BNSS.
                      </span>
                    </div>

                    {/* Note Input Drawer */}
                    {activeNotesId === item.id && (
                      <div className="pt-2 space-y-2">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Enter explanation, supplementary witness statement reference, or reconciliation note..."
                          rows={2}
                          className="w-full p-2.5 bg-[#F6F8FA] border border-[#CBD5E1] rounded-btn text-xs text-[#172033] focus:outline-none focus:border-[#12355B]"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setActiveNotesId(null)}
                            className="px-3 py-1 rounded-btn text-xs text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleResolve(item.id, 'INVESTIGATOR_NOTED')}
                            className="px-3 py-1 rounded-btn bg-[#12355B] text-white text-xs font-semibold cursor-pointer"
                          >
                            Save Note to Case Docket
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
