import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  Send
} from 'lucide-react';
import { Case } from '../types.js';
import { apiGet, apiPost } from '../api/client.js';

interface AICaseAssistantProps {
  preselectedCaseId?: string | null;
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

export const AICaseAssistant: React.FC<AICaseAssistantProps> = ({
  preselectedCaseId,
}) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(preselectedCaseId || '');
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const loadCases = async () => {
      try {
        const list = await apiGet<Case[]>('/api/cases');
        setCases(list || []);
        if (!selectedCaseId && list && list.length > 0) {
          setSelectedCaseId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load cases:', err);
      }
    };
    loadCases();
  }, []);

  // Initial greeting message
  useEffect(() => {
    const selectedCase = cases.find(c => c.id === selectedCaseId);
    setMessages([
      {
        id: 'msg-init',
        sender: 'assistant',
        text: `**Welcome to NyayaSetu AI Investigation & Legal Copilot**\n\n` +
          `I am initialized with Bharatiya Nagarik Suraksha Sanhita (BNSS 2023), Bharatiya Nyaya Sanhita (BNS 2023), and Bharatiya Sakshya Adhiniyam (BSA 2023) evidentiary standards.\n\n` +
          `Currently inspecting: **${selectedCase ? `${selectedCase.caseNumber} - ${selectedCase.title}` : 'All Investigation Dockets'}**.\n\n` +
          `Select a quick action below or ask any legal, evidentiary, or procedural question.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: [
          'Evaluate Charge Sheet Readiness under Section 193 BNSS',
          'Identify Contradictions in Witness Statements',
          'Map IPC Sections to Bharatiya Nyaya Sanhita (BNS 2023)',
          'Check Chain-of-Custody Admissibility under BSA 2023'
        ]
      }
    ]);
  }, [selectedCaseId, cases]);

  const handleSendMessage = async (queryText = inputQuery) => {
    if (!queryText.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await apiPost<{
        reply: string;
        suggestedActions: string[];
        referencedSections: string[];
        citations: { title: string; docNumber?: string; snippet: string }[];
      }>('/api/intelligence/chat-assistant', {
        query: queryText,
        caseId: selectedCaseId || undefined
      });

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: res.suggestedActions,
        referencedSections: res.referencedSections,
        citations: res.citations
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Failed to communicate with AI Assistant:', err);
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'Error contacting AI reasoning engine. Please verify server connection.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                AI Case & Legal Prosecution Copilot
              </h1>
              <span className="status-pill-purple text-[10px]">
                BNSS / BNS / BSA 2023
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Interactive legal reasoning, contradiction verification, and charge sheet readiness analysis
            </p>
          </div>
        </div>

        {/* Case Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Active Docket:</span>
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
          >
            {cases.map(c => (
              <option key={c.id} value={c.id}>
                {c.caseNumber} - {c.title.slice(0, 35)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="gov-card flex flex-col h-[600px] overflow-hidden p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed space-y-3 ${
                  msg.sender === 'user'
                    ? 'bg-slate-900 text-white font-medium'
                    : 'bg-slate-50 text-slate-800 border border-slate-200/80'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">
                  {msg.text.split('\n').map((line, idx) => {
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return <p key={idx} className="font-bold text-slate-900 mt-2 mb-1">{line.replace(/\*\*/g, '')}</p>;
                    }
                    if (line.startsWith('• ')) {
                      return <p key={idx} className="ml-3 my-0.5">{line}</p>;
                    }
                    return <p key={idx}>{line}</p>;
                  })}
                </div>

                {/* Referenced Statutory Sections */}
                {msg.referencedSections && msg.referencedSections.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Statutory References:</span>
                    {msg.referencedSections.map((sec, idx) => (
                      <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                        {sec}
                      </span>
                    ))}
                  </div>
                )}

                {/* Suggested Action Chips */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Suggested Investigation Actions:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestedActions.map((act, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(act)}
                          className="text-[11px] px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-medium border border-slate-200 shadow-xs transition-all flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>{act}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[9px] text-slate-400 text-right font-mono">
                  {msg.timestamp}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0 text-xs font-bold">
                  IO
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center text-xs text-slate-500">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <span>AI Copilot is analyzing statutory precedents and case documents...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 border border-slate-200 focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:border-slate-300 shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask AI Copilot (e.g., 'Evaluate charge sheet readiness under BNSS Section 193')..."
              className="w-full bg-transparent border-none text-xs focus:outline-none text-slate-900 placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="p-2 rounded-xl bg-slate-900 hover:bg-black disabled:opacity-50 text-white transition-all shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
