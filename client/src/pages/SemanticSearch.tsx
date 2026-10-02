import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  FolderLock, 
  FileText, 
  Binary, 
  Users, 
  ExternalLink,
  Shield,
  Building2,
  FolderKanban
} from 'lucide-react';
import { SemanticSearchResult } from '../types.js';
import { apiGet } from '../api/client.js';

interface SemanticSearchProps {
  onNavigateToCase?: (caseId: string) => void;
  onNavigateToDoc?: (docId: string) => void;
  onNavigateToEvidence?: (evidenceId: string) => void;
}

export const SemanticSearch: React.FC<SemanticSearchProps> = ({
  onNavigateToCase,
  onNavigateToDoc,
  onNavigateToEvidence
}) => {
  const [query, setQuery] = useState('');
  const [resourceType, setResourceType] = useState<'ALL' | 'CASE' | 'DOCUMENT' | 'EVIDENCE' | 'PERSON'>('ALL');
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const sampleQueries = [
    'Cases involving country-made 9mm firearms in Hauz Khas',
    'Telegram crypto mule accounts and escrow wire fraud',
    'Witness statements recorded under Section 180 BNSS',
    'Suspects with AFIS verified biometrics and scar marks',
    'Forensic ballistic reports with CFSL hash proof'
  ];

  const handleSearch = async (q = query) => {
    if (!q.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      params.append('q', q.trim());
      if (resourceType !== 'ALL') params.append('type', resourceType);

      const res = await apiGet<SemanticSearchResult[]>(`/api/search/semantic?${params.toString()}`);
      setResults(res || []);
    } catch (err) {
      console.error('Failed to execute semantic search:', err);
    } finally {
      setLoading(false);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'CASE': return FolderKanban;
      case 'DOCUMENT': return FileText;
      case 'EVIDENCE': return Shield;
      default: return Users;
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Header Banner */}
      <div className="text-center space-y-1.5 py-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#E8F5F6] border border-[#167D8D]/20 text-[#167D8D] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-[#167D8D]" />
          <span>Cross-Docket Hybrid Semantic Engine</span>
        </div>
        <h1 className="text-2xl font-bold text-[#172033] tracking-tight">
          National Police & Judicial Semantic Search
        </h1>
        <p className="text-xs text-[#64748B] max-w-xl mx-auto">
          Query across First Information Reports (FIRs), witness statements, CFSL exhibits, and suspect records using natural language.
        </p>
      </div>

      {/* Main Search Input Box */}
      <div className="bg-white border border-[#E2E8F0] rounded-card p-5 shadow-card space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex items-center gap-3 bg-[#F6F8FA] rounded-btn px-4 py-2.5 border border-[#E2E8F0] focus-within:border-[#167D8D] transition-colors"
        >
          <Search className="w-4 h-4 text-[#94A3B8] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type your investigative inquiry (e.g., 'unlicensed 9mm firearm seized in South District robbery')..."
            className="w-full bg-transparent border-none text-xs focus:outline-none text-[#172033] placeholder:text-[#94A3B8] font-sans"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold shrink-0 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Resource Type Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[#64748B] font-semibold mr-1 text-[11px]">Filter Scope:</span>
            {(['ALL', 'CASE', 'DOCUMENT', 'EVIDENCE', 'PERSON'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setResourceType(type);
                  if (hasSearched) handleSearch();
                }}
                className={`px-3 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  resourceType === type
                    ? 'bg-[#12355B] text-white font-semibold shadow-2xs'
                    : 'bg-[#F1F4F7] hover:bg-[#E2E8F0] text-[#64748B]'
                }`}
              >
                {type === 'ALL' ? 'All Records' :
                 type === 'CASE' ? 'Cases / FIRs' :
                 type === 'DOCUMENT' ? 'Documents' :
                 type === 'EVIDENCE' ? 'Evidence Exhibits' : 'Persons'}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-[#64748B] font-mono">
            BNSS, BNS & BSA 2023 Indexed
          </span>
        </div>

        {/* Suggested Natural Language Queries */}
        <div className="pt-3 border-t border-[#F1F4F7]">
          <div className="text-[10px] uppercase font-bold text-[#64748B] mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#B7791F]" />
            <span>Sample Investigation Queries:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sampleQueries.map((sq, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setQuery(sq);
                  handleSearch(sq);
                }}
                className="text-[11px] px-2.5 py-1 rounded-btn bg-[#F6F8FA] hover:bg-[#E8F5F6] text-[#12355B] border border-[#E2E8F0] transition-colors text-left cursor-pointer"
              >
                "{sq}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Results List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[#64748B] flex justify-center items-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#12355B] border-t-transparent" />
          <span>Searching cross-document vector index & cryptographic records...</span>
        </div>
      ) : hasSearched && results.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-card p-12 text-center space-y-2">
          <Search className="w-8 h-8 text-[#94A3B8] mx-auto mb-1" />
          <h3 className="text-sm font-semibold text-[#172033]">No matching dockets or records found</h3>
          <p className="text-xs text-[#64748B]">Try broadening query keywords or resetting the filter scope.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.length > 0 && (
            <div className="flex justify-between items-center text-xs text-[#64748B] px-1">
              <span>Found <strong>{results.length}</strong> matching verified evidentiary records</span>
              <span>Ranked by Semantic Relevance</span>
            </div>
          )}

          {results.map(res => {
            const Icon = getResourceIcon(res.resourceType);
            return (
              <div
                key={res.id}
                className="bg-white border border-[#E2E8F0] rounded-card p-5 space-y-2.5 shadow-card hover:border-[#167D8D]/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-btn bg-[#E8F5F6] border border-[#167D8D]/20 flex items-center justify-center text-[#167D8D] shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#F1F4F7] text-[#12355B]">
                          {res.resourceType}
                        </span>
                        {res.caseNumber && (
                          <span className="text-xs font-mono font-bold text-[#12355B]">
                            {res.caseNumber}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-[#172033] mt-0.5">
                        {res.title}
                      </h3>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold text-[#16805C] bg-[#E8F5F6] px-2 py-0.5 rounded border border-[#16805C]/20 shrink-0">
                    {res.relevanceScore}% MATCH
                  </span>
                </div>

                <p className="text-xs text-[#172033] bg-[#F6F8FA] p-3 rounded-btn border border-[#E2E8F0] leading-relaxed font-sans">
                  {res.snippet}
                </p>

                <div className="flex flex-wrap items-center justify-between pt-1 gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1">
                    {res.tags.map((tag, i) => (
                      <span key={i} className="text-[10px] bg-[#F1F4F7] text-[#64748B] px-2 py-0.5 rounded border border-[#E2E8F0]">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    {res.resourceType === 'CASE' && onNavigateToCase && (
                      <button
                        onClick={() => onNavigateToCase(res.actionUrl.replace('#/cases/', ''))}
                        className="text-xs font-semibold text-[#167D8D] hover:text-[#12355B] flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open Case Docket</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                    {res.resourceType === 'DOCUMENT' && onNavigateToDoc && (
                      <button
                        onClick={() => onNavigateToDoc(res.actionUrl.replace('#/documents/', ''))}
                        className="text-xs font-semibold text-[#167D8D] hover:text-[#12355B] flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Document</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                    {res.resourceType === 'EVIDENCE' && onNavigateToEvidence && (
                      <button
                        onClick={() => onNavigateToEvidence(res.actionUrl.replace('#/evidence/', ''))}
                        className="text-xs font-semibold text-[#167D8D] hover:text-[#12355B] flex items-center gap-1 cursor-pointer"
                      >
                        <span>Inspect Exhibit</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
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
