import React, { useState, useEffect } from 'react';
import {
  Search,
  FolderLock,
  FileText,
  Binary,
  ShieldCheck,
  ArrowRight,
  UserCheck,
  X,
  Sparkles,
  Users,
  Cpu
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.js';
import { UserRole } from '../../types.js';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string, extraId?: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [cases, setCases] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      const fetchInitial = async () => {
        setLoading(true);
        try {
          const [casesRes, docsRes, evidenceRes] = await Promise.all([
            api.getCases(),
            api.getDocuments({ limit: '5' }),
            api.getEvidence()
          ]);
          setCases(casesRes || []);
          setDocs(docsRes.documents || []);
          setEvidence(evidenceRes || []);
        } catch (err) {
          console.error('Command palette fetch error:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchInitial();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredCases = cases.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(query.toLowerCase()) ||
      c.policeStation?.toLowerCase().includes(query.toLowerCase())
  );

  const filteredDocs = docs.filter(
    (d) =>
      d.title.toLowerCase().includes(query.toLowerCase()) ||
      d.documentNumber.toLowerCase().includes(query.toLowerCase()) ||
      d.category.toLowerCase().includes(query.toLowerCase())
  );

  const filteredEvidence = evidence.filter(
    (e) =>
      e.description.toLowerCase().includes(query.toLowerCase()) ||
      e.evidenceNumber.toLowerCase().includes(query.toLowerCase()) ||
      e.type.toLowerCase().includes(query.toLowerCase())
  );



  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Floating Search Container */}
      <div className="relative w-full max-w-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 space-y-3 p-4">
        {/* Search Header Bar */}
        <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search FIRs, dockets, exhibits, or switch personas..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="px-1.5 py-0.5 rounded bg-white text-[10px] font-mono text-slate-500 border border-slate-200 shadow-xs">
              ESC
            </kbd>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto space-y-4 px-1 text-xs">
          {/* Section: Modules & Shortcuts */}
          <div>
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Quick Module Navigation
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                onClick={() => {
                  onNavigate('cases');
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 text-left flex items-center justify-between text-slate-700 transition-all border border-slate-100 hover:border-slate-200"
              >
                <div className="flex items-center gap-2">
                  <FolderLock className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-slate-800">FIR Dockets</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  onNavigate('documents');
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 text-left flex items-center justify-between text-slate-700 transition-all border border-slate-100 hover:border-slate-200"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-800">Document Library</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  onNavigate('persons');
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 text-left flex items-center justify-between text-slate-700 transition-all border border-slate-100 hover:border-slate-200"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-slate-800">Criminals & Locality</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  onNavigate('intelligence');
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 text-left flex items-center justify-between text-slate-700 transition-all border border-slate-100 hover:border-slate-200"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-slate-800">Cross-Doc Intelligence</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  onNavigate('search');
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 text-left flex items-center justify-between text-slate-700 transition-all border border-slate-100 hover:border-slate-200"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-slate-800">BNS Semantic Search</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  onNavigate('copilot');
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 text-left flex items-center justify-between text-slate-700 transition-all border border-slate-100 hover:border-slate-200"
              >
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  <span className="font-semibold text-slate-800">AI Legal Copilot</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  onNavigate('evidence');
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 text-left flex items-center justify-between text-slate-700 transition-all border border-slate-100 hover:border-slate-200"
              >
                <div className="flex items-center gap-2">
                  <Binary className="w-4 h-4 text-cyan-600" />
                  <span className="font-semibold text-slate-800">Evidence Vault</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  onNavigate('audit');
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 text-left flex items-center justify-between text-slate-700 transition-all border border-slate-100 hover:border-slate-200"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-800">Merkle Ledger</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Section: Investigation Dockets (FIR) */}
          {filteredCases.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                FIR & Case Dockets ({filteredCases.length})
              </div>
              <div className="space-y-1 pt-1">
                {filteredCases.slice(0, 4).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onNavigate('cases', c.id);
                      onClose();
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 text-left flex items-center justify-between text-slate-800 transition-all border border-slate-100 hover:border-slate-200"
                  >
                    <div>
                      <span className="font-mono font-bold text-slate-900 mr-2">{c.caseNumber}</span>
                      <span className="text-slate-700 font-medium">{c.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200/80">{c.policeStation}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section: Legal Documents */}
          {filteredDocs.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Case Documents ({filteredDocs.length})
              </div>
              <div className="space-y-1 pt-1">
                {filteredDocs.slice(0, 4).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      onNavigate('documents', d.id);
                      onClose();
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 text-left flex items-center justify-between text-slate-800 transition-all border border-slate-100 hover:border-slate-200"
                  >
                    <div>
                      <span className="font-mono text-slate-500 mr-2">{d.documentNumber}</span>
                      <span className="text-slate-700 font-medium">{d.title}</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{d.category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-3.5 py-2.5 border-t border-slate-100 bg-slate-50 rounded-xl flex items-center justify-between text-[11px] text-slate-500">
          <span>Search with instant keyboard navigation</span>
          <span className="text-slate-700 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
            Sec 65B Telemetry Active
          </span>
        </div>
      </div>
    </div>
  );
};
