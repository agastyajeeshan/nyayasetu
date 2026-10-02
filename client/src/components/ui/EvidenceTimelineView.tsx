import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client.js';
import { TimelineEventItem, TimelineEventType } from '../../types.js';
import {
  Calendar,
  Clock,
  Shield,
  FileText,
  User,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  Search,
  Filter,
  ExternalLink,
  Lock,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface EvidenceTimelineViewProps {
  caseId?: string;
  events?: TimelineEventItem[];
  caseNumber?: string;
  onSelectDocument?: (docId: string) => void;
  onSelectEvidence?: (evId: string) => void;
}

export const EvidenceTimelineView: React.FC<EvidenceTimelineViewProps> = ({
  caseId,
  events: initialEvents,
  caseNumber,
  onSelectDocument,
  onSelectEvidence
}) => {
  const [events, setEvents] = useState<TimelineEventItem[]>(initialEvents || []);
  const [loading, setLoading] = useState<boolean>(!initialEvents && !!caseId);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortAscending, setSortAscending] = useState<boolean>(true); // Chronological by default

  useEffect(() => {
    if (initialEvents) {
      setEvents(initialEvents);
    } else if (caseId) {
      setLoading(true);
      api.getCaseTimeline(caseId)
        .then(res => setEvents(res || []))
        .catch(err => console.error('Failed to load timeline:', err))
        .finally(() => setLoading(false));
    }
  }, [caseId, initialEvents]);

  const filteredEvents = useMemo(() => {
    let result = [...events];

    // Filter by category
    if (filterType !== 'ALL') {
      result = result.filter(ev => {
        if (filterType === 'EVIDENCE') return ev.eventType === 'EVIDENCE_REGISTRATION' || ev.eventType === 'CUSTODY_TRANSFER';
        if (filterType === 'DOCUMENTS') return ev.eventType === 'DOCUMENT_UPLOAD' || ev.eventType === 'VERSION_CHANGE';
        if (filterType === 'CUSTODY') return ev.eventType === 'CUSTODY_TRANSFER';
        if (filterType === 'SIGNATURES') return ev.eventType === 'DIGITAL_SIGNATURE';
        if (filterType === 'ACCESS') return ev.eventType === 'DOCUMENT_ACCESS';
        if (filterType === 'VERIFICATION') return ev.eventType === 'DOCUMENT_VERIFIED';
        if (filterType === 'INVESTIGATION') return ev.eventType === 'INVESTIGATION_EVENT' || ev.eventType === 'INCIDENT_OCCURRED' || ev.eventType === 'CASE_CREATED';
        return true;
      });
    }

    // Filter by search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(ev =>
        ev.title.toLowerCase().includes(q) ||
        ev.description.toLowerCase().includes(q) ||
        ev.actor.name.toLowerCase().includes(q) ||
        (ev.relatedEntity && ev.relatedEntity.name.toLowerCase().includes(q))
      );
    }

    // Sort order
    result.sort((a, b) => {
      const tA = new Date(a.timestamp).getTime();
      const tB = new Date(b.timestamp).getTime();
      return sortAscending ? tA - tB : tB - tA;
    });

    return result;
  }, [events, filterType, searchTerm, sortAscending]);

  const getEventBadge = (type: TimelineEventType) => {
    switch (type) {
      case 'INCIDENT_OCCURRED':
        return { label: 'Incident Occurred', bg: 'bg-[#FFF4E5]', text: 'text-[#B45309]', border: 'border-[#FDE68A]' };
      case 'CASE_CREATED':
        return { label: 'Case Registered', bg: 'bg-[#EBF3FB]', text: 'text-[#12355B]', border: 'border-[#BFDBFE]' };
      case 'DOCUMENT_UPLOAD':
        return { label: 'Document Added', bg: 'bg-[#ECFDF5]', text: 'text-[#065F46]', border: 'border-[#A7F3D0]' };
      case 'VERSION_CHANGE':
        return { label: 'Version Change', bg: 'bg-[#E0F2FE]', text: 'text-[#0369A1]', border: 'border-[#BAE6FD]' };
      case 'EVIDENCE_REGISTRATION':
        return { label: 'Evidence Registered', bg: 'bg-[#F3E8FF]', text: 'text-[#6B21A8]', border: 'border-[#DDD6FE]' };
      case 'CUSTODY_TRANSFER':
        return { label: 'Custody Transfer', bg: 'bg-[#EDE9FE]', text: 'text-[#5B21B6]', border: 'border-[#C4B5FD]' };
      case 'DOCUMENT_ACCESS':
        return { label: 'Document Access', bg: 'bg-[#F1F5F9]', text: 'text-[#475569]', border: 'border-[#CBD5E1]' };
      case 'DOCUMENT_VERIFIED':
        return { label: 'Integrity Verified', bg: 'bg-[#ECFDF5]', text: 'text-[#16805C]', border: 'border-[#A7F3D0]' };
      case 'DIGITAL_SIGNATURE':
        return { label: 'Digital Signature', bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', border: 'border-[#FDE68A]' };
      case 'INVESTIGATION_EVENT':
        return { label: 'Investigation Event', bg: 'bg-[#FFFBEB]', text: 'text-[#B45309]', border: 'border-[#FDE68A]' };
      default:
        return { label: 'Event', bg: 'bg-[#F6F8FA]', text: 'text-[#64748B]', border: 'border-[#E2E8F0]' };
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-card p-12 text-center text-xs text-[#64748B] shadow-card">
        <div className="w-6 h-6 border-2 border-[#12355B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Synthesizing chronological evidence timeline streams...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white border border-[#E2E8F0] rounded-card p-5 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#F1F4F7]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#167D8D] animate-pulse" />
              <h2 className="text-base font-bold text-[#172033] tracking-tight">
                Case Evidence & Investigation Timeline
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E8F5F6] text-[#167D8D] font-bold">
                {caseNumber}
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              Chronological synthesis of case events, forensic transfers, document revisions, and Section 65B verification seals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortAscending(prev => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-[#F6F8FA] hover:bg-[#E2E8F0] text-xs font-semibold text-[#172033] border border-[#CBD5E1] transition-colors cursor-pointer"
              title="Toggle Sort Order"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#64748B]" />
              <span>{sortAscending ? 'Oldest First (Chronological)' : 'Newest First'}</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search events, actors, exhibits, or descriptions..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#F6F8FA] border border-[#E2E8F0] rounded-btn text-xs text-[#172033] focus:outline-none focus:border-[#12355B]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
            {[
              { id: 'ALL', label: 'All Events' },
              { id: 'EVIDENCE', label: 'Evidence' },
              { id: 'CUSTODY', label: 'Custody' },
              { id: 'DOCUMENTS', label: 'Documents' },
              { id: 'SIGNATURES', label: 'Signatures' },
              { id: 'ACCESS', label: 'Access' },
              { id: 'VERIFICATION', label: 'Verification' },
              { id: 'INVESTIGATION', label: 'Investigation' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`px-2.5 py-1 rounded-btn text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  filterType === f.id
                    ? 'bg-[#12355B] text-white font-semibold shadow-xs'
                    : 'bg-[#F6F8FA] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#172033]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Stream */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-card p-12 text-center text-[#64748B] text-xs">
          <Calendar className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
          <p className="font-semibold text-[#172033]">No timeline events match your criteria</p>
          <p className="text-[11px] text-[#94A3B8] mt-1">Try resetting the filter chips or search query.</p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#CBD5E1]">
          {filteredEvents.map((ev, index) => {
            const badge = getEventBadge(ev.eventType);

            return (
              <div key={ev.id || index} className="relative group">
                {/* Node Bullet Marker */}
                <div className="absolute -left-6 sm:-left-8 top-3 w-4 h-4 rounded-full bg-white border-2 border-[#12355B] group-hover:scale-125 transition-transform flex items-center justify-center shadow-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#167D8D]" />
                </div>

                {/* Event Card */}
                <div className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-card p-4 sm:p-5 shadow-xs hover:shadow-card transition-all">
                  {/* Top Bar: Date/Time + Event Type Badge + Integrity */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs font-bold text-[#172033]">
                        <Calendar className="w-3.5 h-3.5 text-[#167D8D]" />
                        <span>{ev.dateFormatted}</span>
                      </div>
                      <span className="text-[11px] font-mono text-[#64748B]">• {ev.timeFormatted}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {badge.label}
                      </span>

                      {/* Integrity Status Badge */}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded ${
                        ev.integrityStatus === 'VERIFIED' || ev.integrityStatus === 'ANCHORED'
                          ? 'bg-[#ECFDF5] text-[#16805C] border border-[#A7F3D0]'
                          : ev.integrityStatus === 'WARNING'
                            ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                            : 'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]'
                      }`}>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Hash: {ev.integrityStatus}</span>
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-bold text-[#172033] mb-1">
                    {ev.title}
                  </h3>
                  <p className="text-xs text-[#475569] leading-relaxed mb-3">
                    {ev.description}
                  </p>

                  {/* Footer Meta: Actor + Related Entity + Action Link */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F8FAFC] text-xs">
                    {/* Actor */}
                    <div className="flex items-center gap-1.5 text-[#64748B]">
                      <User className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span className="font-semibold text-[#172033]">{ev.actor.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F1F5F9] text-[#475569]">
                        {ev.actor.role}
                      </span>
                    </div>

                    {/* Related Entity Link */}
                    {ev.relatedEntity && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#94A3B8]">Target:</span>
                        {ev.relatedEntity.type === 'DOCUMENT' && onSelectDocument ? (
                          <button
                            onClick={() => onSelectDocument(ev.relatedEntity!.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#167D8D] hover:underline cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{ev.relatedEntity.number || ev.relatedEntity.name}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : ev.relatedEntity.type === 'EVIDENCE' && onSelectEvidence ? (
                          <button
                            onClick={() => onSelectEvidence(ev.relatedEntity!.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#6B21A8] hover:underline cursor-pointer"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>{ev.relatedEntity.number || ev.relatedEntity.name}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-[#172033]">
                            {ev.relatedEntity.number || ev.relatedEntity.name}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Hash Proof if available */}
                    {ev.hashProof && (
                      <div className="font-mono text-[10px] text-[#94A3B8] truncate max-w-[200px]" title={ev.hashProof}>
                        Digest: {ev.hashProof.slice(0, 16)}...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
