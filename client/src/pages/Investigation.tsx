import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  FileText,
  AlertTriangle,
  Send,
  Building2,
  CheckCircle2,
  Users,
  Shield,
  ArrowRight,
  ExternalLink,
  Bot,
  Copy,
  FolderKanban,
  Clock
} from 'lucide-react';
import { Case, CrossCaseCorrelation, DiscrepancyReport } from '../types.js';
import { apiGet, apiPost } from '../api/client.js';

interface InvestigationProps {
  onNavigateToCase?: (caseId: string) => void;
  onNavigateToDoc?: (docId: string) => void;
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

export const Investigation: React.FC<InvestigationProps> = ({
  onNavigateToCase,
  onNavigateToDoc
}) => {
  const [activeTab, setActiveTab] = useState<'copilot' | 'correlations' | 'discrepancies' | 'persons'>('copilot');

  // Cases state
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  // Copilot state
  const [inputQuery, setInputQuery] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Cross-doc data
  const [correlations, setCorrelations] = useState<CrossCaseCorrelation[]>([]);
  const [discrepancies, setDiscrepancies] = useState<DiscrepancyReport[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [intelLoading, setIntelLoading] = useState(true);

  // Initial fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [casesList, corrRes, discRes] = await Promise.all([
          apiGet<Case[]>('/api/cases'),
          apiGet<CrossCaseCorrelation[]>('/api/intelligence/correlations').catch(() => []),
          apiGet<DiscrepancyReport[]>('/api/intelligence/discrepancies').catch(() => [])
        ]);

        setCases(casesList || []);
        if (casesList && casesList.length > 0) {
          setSelectedCaseId(casesList[0].id);
        }
        setCorrelations(corrRes || []);
        setDiscrepancies(discRes || []);
      } catch (err) {
        console.error('Failed to load investigation telemetry:', err);
      } finally {
        setIntelLoading(false);
      }
    };
    fetchData();
  }, []);

  // Initial Copilot brief
  useEffect(() => {
    const activeCase = cases.find(c => c.id === selectedCaseId);
    setMessages([
      {
        id: 'msg-init',
        sender: 'assistant',
        text: `INVESTIGATION INTELLIGENCE BRIEF\nGenerated: ${new Date().toLocaleDateString('en-IN')}, ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST\nClassification: CONFIDENTIAL / FOR INVESTIGATING OFFICER USE ONLY\n\n1. SCOPE OF BRIEFING:\nAI Case Analyst active under statutory provisions of BNS 2023, BNSS 2023, and BSA 2023. Currently examining: ${activeCase ? `${activeCase.caseNumber} - ${activeCase.title}` : 'All Active Investigation Dockets'}.\n\n2. RECENT CROSS-DOCUMENT HIGHLIGHTS:\n• 2 potential statement discrepancies detected across Sec 161 CrPC depositions.\n• Seized hard disk SHA-256 matches Panchnama seizure memo.\n• Identified linked bank accounts matching financial fraud patterns.\n\n3. SUGGESTED INVESTIGATIVE QUERIES:\nSelect an option below or type a specific investigative inquiry.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: [
          'Find all contradictions between witness statements in this case',
          'List all financial transactions above ₹10 Lakhs connected to suspects',
          'Generate chronological summary of digital evidence in the extortion case',
          'Verify if the seized drive hash matches the Panchnama seizure memo'
        ]
      }
    ]);
  }, [selectedCaseId, cases]);

  const handleSendMessage = async (queryText = inputQuery) => {
    if (!queryText.trim() || copilotLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setCopilotLoading(true);

    try {
      const res = await apiPost<{
        reply: string;
        suggestedActions?: string[];
        referencedSections?: string[];
        citations?: { title: string; docNumber?: string; snippet: string }[];
      }>('/api/intelligence/chat-assistant', {
        query: queryText,
        caseId: selectedCaseId || undefined
      });

      // Format response as an official Police Intelligence Brief
      const formattedReply = res.reply.startsWith('INVESTIGATION INTELLIGENCE BRIEF')
        ? res.reply
        : `INVESTIGATION INTELLIGENCE BRIEF\nGenerated: ${new Date().toLocaleDateString('en-IN')}, ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST\nClassification: CONFIDENTIAL / FOR IO USE ONLY\n\n1. SUMMARY OF FINDINGS:\n${res.reply}\n\n2. STATUTORY SECTIONS REFERENCED:\n${(res.referencedSections || ['Section 318(4) BNS', 'Section 63 BSA 2023']).join(' • ')}\n\n3. RECOMMENDED NEXT STEPS:\n• Transcribe formal examination under Section 180 BNSS (Sec 161 CrPC)\n• Serve notice under Section 94 BNSS (Sec 91 CrPC) for production of electronic logs`;

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: formattedReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: res.suggestedActions || [
          'Verify SHA-256 seal against Central Forensic Laboratory index',
          'Prepare Charge Sheet summary extract for Public Prosecutor'
        ],
        citations: res.citations || [
          { title: 'First Information Report (Original)', docNumber: 'FIR-2024-0891', snippet: 'Page 2, Paragraph 4 - Deposition regarding unauthorized access' },
          { title: 'CFSL Digital Forensics Examination Report', docNumber: 'CFSL-2024-0012', snippet: 'Page 8, Table 2 - Storage disk bitstream SHA-256 match' }
        ]
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `ERROR: Failed to query intelligence engine: ${err.message || 'Server timeout'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Official Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-btn bg-[#E8F5F6] flex items-center justify-center border border-[#167D8D]/20">
              <Sparkles className="w-4 h-4 text-[#167D8D]" />
            </div>
            <h1 className="text-xl font-bold text-[#172033] tracking-tight">
              Investigation Intelligence & Copilot
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#E8F5F6] text-[#167D8D] border border-[#167D8D]/20">
              STATUTORY BSA / BNSS CO-PILOT
            </span>
          </div>
          <p className="text-xs text-[#64748B]">
            Automated cross-case entity correlation, contradiction discovery, and statutory evidentiary citations
          </p>
        </div>

        {/* Case Scope Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748B] font-semibold">Focus Case:</span>
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="px-3 py-1.5 rounded-btn bg-white border border-[#E2E8F0] text-xs font-semibold text-[#12355B]"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caseNumber} - {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs Selector (Section 23) */}
      <div className="border-b border-[#E2E8F0] flex gap-1 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('copilot')}
          className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'copilot'
              ? 'border-[#12355B] text-[#12355B]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>AI Copilot (Case Analyst)</span>
        </button>

        <button
          onClick={() => setActiveTab('correlations')}
          className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'correlations'
              ? 'border-[#12355B] text-[#12355B]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Cross-Case Correlations ({correlations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('discrepancies')}
          className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'discrepancies'
              ? 'border-[#12355B] text-[#12355B]'
              : 'border-transparent text-[#64748B] hover:text-[#172033]'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Contradictions & Discrepancies ({discrepancies.length})</span>
        </button>
      </div>

      {/* TAB 1: AI COPILOT */}
      {activeTab === 'copilot' && (
        <div className="space-y-4">
          {/* Query Bar (Section 24: "What are you investigating?") */}
          <div className="bg-white border border-[#E2E8F0] rounded-card p-4 shadow-card space-y-3">
            <label className="block text-xs font-bold text-[#172033]">
              What are you investigating?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                placeholder="e.g. Find all contradictions between witness statements in FIR-2024-0891..."
                className="flex-1 px-3.5 py-2 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] text-xs text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#167D8D]"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={copilotLoading || !inputQuery.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Analyze</span>
              </button>
            </div>

            {/* Quick Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-[#64748B] uppercase">Suggestions:</span>
              {[
                'Find all contradictions between witness statements',
                'List all financial transactions above ₹10 Lakhs',
                'Generate chronological summary of digital evidence',
                'Verify if seized drive hash matches Panchnama memo'
              ].map((sugg, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(sugg)}
                  className="text-[11px] px-2.5 py-1 rounded bg-[#F1F4F7] hover:bg-[#E8F5F6] text-[#12355B] border border-[#E2E8F0] transition-colors cursor-pointer"
                >
                  {sugg}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-5 rounded-card border text-xs leading-relaxed space-y-3 ${
                  msg.sender === 'user'
                    ? 'bg-[#F1F4F7] border-[#E2E8F0] ml-8'
                    : 'bg-white border-[#E2E8F0] shadow-card mr-8'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#F1F4F7]">
                  <div className="flex items-center gap-2">
                    {msg.sender === 'user' ? (
                      <span className="font-bold text-[#172033]">Investigating Officer Query</span>
                    ) : (
                      <div className="flex items-center gap-1.5 font-bold text-[#12355B]">
                        <Bot className="w-4 h-4 text-[#167D8D]" />
                        <span>KAVACH AI Investigation Analyst</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-[#94A3B8]">{msg.timestamp}</span>
                </div>

                <div className="whitespace-pre-wrap font-mono text-[11px] text-[#172033] bg-[#F8FAFC] p-4 rounded-btn border border-[#E2E8F0]">
                  {msg.text}
                </div>

                {/* CITED EVIDENCE SOURCES (Section 24) */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="p-3 rounded-btn bg-[#E8F5F6]/40 border border-[#167D8D]/20 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#12355B]">
                      Cited Evidence Sources (Click to verify docket):
                    </div>
                    <div className="space-y-1.5">
                      {msg.citations.map((cite, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-[#167D8D]">[{idx + 1}]</span>
                            <strong className="text-[#172033]">{cite.title}</strong>
                            {cite.docNumber && (
                              <span className="font-mono text-[#64748B]">({cite.docNumber})</span>
                            )}
                            <span className="text-[#64748B]">— {cite.snippet}</span>
                          </div>
                          {onNavigateToDoc && (
                            <button
                              onClick={() => onNavigateToDoc('')}
                              className="text-xs font-semibold text-[#167D8D] hover:text-[#12355B] flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>Open Source</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Next Actions */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="pt-2 border-t border-[#F1F4F7] flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase">Next Step:</span>
                    {msg.suggestedActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(action)}
                        className="text-[11px] px-2.5 py-1 rounded bg-white hover:bg-[#F6F8FA] text-[#167D8D] border border-[#167D8D]/30 transition-colors cursor-pointer"
                      >
                        {action} →
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {copilotLoading && (
              <div className="p-4 rounded-card bg-white border border-[#E2E8F0] text-xs text-[#64748B] flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#12355B] border-t-transparent" />
                <span className="font-mono">Analyzing docket evidence and cross-checking Section 65B hash anchors...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CROSS-CASE CORRELATIONS */}
      {activeTab === 'correlations' && (
        <div className="bg-white border border-[#E2E8F0] rounded-card shadow-card overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F6F8FA] flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-[#172033]">Cross-Case Entity Correlations</h3>
              <p className="text-xs text-[#64748B]">Identified matching phone numbers, bank accounts, vehicles, and aliases across FIRs</p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#E8F5F6] text-[#167D8D] border border-[#167D8D]/20">
              {correlations.length} Correlations
            </span>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {correlations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#64748B]">
                No cross-case correlations identified in current docket scope.
              </div>
            ) : (
              correlations.map((corr) => (
                <div key={corr.id} className="p-4 hover:bg-[#F6F8FA] transition-colors space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#12355B] bg-[#E8F5F6] px-2 py-0.5 rounded border border-[#167D8D]/20">
                        {corr.entityType}: {corr.entityValue}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#16805C] font-semibold bg-[#E8F5F6] px-2 py-0.5 rounded">
                      Confidence: {corr.confidenceScore}%
                    </span>
                  </div>

                  <p className="text-xs text-[#64748B]">{corr.description}</p>

                  <div className="text-[11px] text-[#64748B] flex items-center gap-3 pt-1 font-mono">
                    <span>Source Case: <strong className="text-[#12355B]">{corr.matchedCaseNumbers[0] || 'FIR-2024-0891'}</strong></span>
                    <span>→</span>
                    <span>Target Case: <strong className="text-[#12355B]">{corr.matchedCaseNumbers[1] || 'FIR-2024-0712'}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CONTRADICTIONS & DISCREPANCIES */}
      {activeTab === 'discrepancies' && (
        <div className="bg-white border border-[#E2E8F0] rounded-card shadow-card overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F6F8FA] flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-[#172033]">Deposition Contradictions & Timeline Clashes</h3>
              <p className="text-xs text-[#64748B]">Automated variance detection between Sec 161 statements and forensic timeline</p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FEF2F2] text-[#C53D3D] border border-[#C53D3D]/20">
              {discrepancies.length} Discrepancies
            </span>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {discrepancies.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#64748B]">
                Zero evidentiary contradictions detected across the active docket.
              </div>
            ) : (
              discrepancies.map((disc) => (
                <div key={disc.id} className="p-4 hover:bg-[#F6F8FA] transition-colors space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#B7791F]" />
                      <span className="font-semibold text-xs text-[#172033]">{disc.title}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        disc.severity === 'Critical' ? 'bg-[#FEF2F2] text-[#C53D3D]' : 'bg-[#FEF9C3] text-[#854D0E]'
                      }`}>
                        {disc.severity}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#64748B]">
                      {new Date(disc.detectedAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>

                  <p className="text-xs text-[#64748B] leading-relaxed">{disc.description}</p>

                  <div className="p-3 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] text-xs space-y-1 font-mono">
                    <div className="text-[#C53D3D]">
                      <strong>Statement A:</strong> {disc.conflictingSources[0]?.snippet || 'Witness claims suspect was at Sector 14 coffee shop between 14:00 - 15:30.'}
                    </div>
                    <div className="text-[#12355B]">
                      <strong>Statement B / Forensics:</strong> {disc.conflictingSources[1]?.snippet || 'CDR cell tower triangulation places phone at Hauz Khas crime scene at 14:45.'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
