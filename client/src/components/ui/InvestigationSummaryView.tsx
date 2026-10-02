import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Users, 
  Database, 
  Clock, 
  AlertTriangle, 
  HelpCircle, 
  BookOpen, 
  ShieldCheck, 
  Printer, 
  Download, 
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Bookmark,
  CheckCircle2,
  Calendar,
  Building2,
  UserCheck
} from 'lucide-react';
import { api } from '../../api/client';
import { InvestigationSummaryReport } from '../../types';

interface InvestigationSummaryViewProps {
  caseId: string;
}

export const InvestigationSummaryView: React.FC<InvestigationSummaryViewProps> = ({ caseId }) => {
  const [summary, setSummary] = useState<InvestigationSummaryReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getInvestigationSummary(caseId);
        setSummary(data);
      } catch (err: any) {
        setError(err.message || 'Failed to generate investigation summary');
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [caseId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500 text-xs">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Compiling factual 10-section case intelligence summary with verified citations...
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
        <h4 className="font-bold text-sm mb-1">Failed to Compile Investigation Summary</h4>
        <p>{error || 'An error occurred while aggregating case records.'}</p>
      </div>
    );
  }

  const sections = [
    { id: 'sec-overview', label: '1. Overview', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'sec-people', label: '2. People', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'sec-docs', label: '3. Documents', icon: <Bookmark className="w-3.5 h-3.5" /> },
    { id: 'sec-evidence', label: '4. Evidence', icon: <Database className="w-3.5 h-3.5" /> },
    { id: 'sec-events', label: '5. Key Events', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'sec-timeline', label: '6. Timeline', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'sec-contradictions', label: '7. Contradictions', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { id: 'sec-missing', label: '8. Gaps', icon: <HelpCircle className="w-3.5 h-3.5" /> },
    { id: 'sec-legal', label: '9. Legal Basis', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'sec-integrity', label: '10. Integrity', icon: <ShieldCheck className="w-3.5 h-3.5" /> }
  ];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
              Form 10-SI Factual Report
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Generated: {new Date(summary.generatedAt).toLocaleString()}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Factual Investigation & Case Intelligence Summary
          </h2>
          <p className="text-xs text-slate-500">
            Strictly derived from immutable case records with statutory evidentiary citations. Zero ungrounded conjectures.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Quick Nav Bar */}
      <div className="bg-slate-100/70 p-1.5 rounded-xl border border-slate-200 flex items-center space-x-1 overflow-x-auto text-xs font-medium">
        {sections.map(sec => (
          <a
            key={sec.id}
            href={`#${sec.id}`}
            className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-white flex items-center space-x-1.5 whitespace-nowrap transition-colors"
          >
            {sec.icon}
            <span>{sec.label}</span>
          </a>
        ))}
      </div>

      {/* SECTION 1: Case Overview */}
      <div id="sec-overview" className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            1. Case Overview & Registration Particulars
          </h3>
          <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
            {summary.caseOverview.sourceCitation}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Case Docket Number:</span>
            <span className="font-bold text-slate-900 font-mono text-sm">{summary.caseOverview.caseNumber}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Jurisdictional Police Station:</span>
            <span className="font-semibold text-slate-800">{summary.caseOverview.policeStation}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Investigating Officer (IO):</span>
            <span className="font-semibold text-slate-800">{summary.caseOverview.investigatingOfficer}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Date & Time of Incident:</span>
            <span className="font-semibold text-slate-800">{new Date(summary.caseOverview.incidentDate).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Place of Occurrence:</span>
            <span className="font-semibold text-slate-800">{summary.caseOverview.placeOfOccurrence}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Statutory Sections Applied:</span>
            <span className="font-semibold text-slate-800">{summary.caseOverview.statutorySections}</span>
          </div>
        </div>

        <div className="mt-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
          <span className="font-bold text-slate-700 block mb-1">Incident Summary & Complaint Substance:</span>
          <p className="text-slate-700 leading-relaxed">{summary.caseOverview.summary}</p>
        </div>
      </div>

      {/* SECTION 2: Key People */}
      <div id="sec-people" className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            2. Key People (Complainant, Accused, Suspects & Witnesses)
          </h3>
          <span className="text-xs text-slate-400 font-normal">({summary.keyPeople.length} verified individuals)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {summary.keyPeople.map((p, idx) => (
            <div key={idx} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  p.role.includes('Accused') || p.role.includes('Suspect')
                    ? 'bg-rose-100 text-rose-800'
                    : p.role.includes('Complainant')
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {p.role}
                </span>
                <span className="text-[11px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  {p.sourceCitation}
                </span>
              </div>
              <div className="font-bold text-slate-900 text-sm">{p.name}</div>
              <p className="text-slate-600 text-[11px]">{p.details}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: Key Documents */}
      <div id="sec-docs" className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-blue-600" />
            3. Key Evidentiary Documents & Sworn Statements
          </h3>
          <span className="text-xs text-slate-400 font-normal">({summary.keyDocuments.length} dockets)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50/70">
              <tr>
                <th className="px-3 py-2 text-left font-bold text-slate-600">Doc # / Category</th>
                <th className="px-3 py-2 text-left font-bold text-slate-600">Title</th>
                <th className="px-3 py-2 text-left font-bold text-slate-600">Version</th>
                <th className="px-3 py-2 text-left font-bold text-slate-600">SHA-256 Digest</th>
                <th className="px-3 py-2 text-right font-bold text-slate-600">Citation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.keyDocuments.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono font-semibold text-slate-800">
                    {d.documentNumber}
                    <span className="block text-[10px] text-slate-500 font-normal font-sans">{d.category}</span>
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900">{d.title}</td>
                  <td className="px-3 py-2 font-mono text-slate-600">{d.version}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-slate-600">
                    {d.sha256Hash.slice(0, 14)}...
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[10px] text-blue-700">
                    {d.sourceCitation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: Evidence Items */}
      <div id="sec-evidence" className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-600" />
            4. Seized Physical & Digital Exhibits
          </h3>
          <span className="text-xs text-slate-400 font-normal">({summary.evidence.length} items)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {summary.evidence.map(e => (
            <div key={e.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-blue-800">{e.evidenceNumber}</span>
                <span className="text-[10px] font-mono text-slate-500">{e.sourceCitation}</span>
              </div>
              <div className="font-medium text-slate-800">{e.type}: {e.description}</div>
              <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between">
                <span>Storage: <strong>{e.storageLocker}</strong></span>
                <span>Custodian: <strong>{e.currentCustodian}</strong></span>
                <span>Hops: <strong>{e.custodyHopsCount}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 5: Important Events */}
      <div id="sec-events" className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600" />
            5. Key Chronological Incident & Procedural Events
          </h3>
          <span className="text-xs text-slate-400 font-normal">({summary.importantEvents.length} events logged)</span>
        </div>

        <div className="space-y-2 text-xs">
          {summary.importantEvents.map((ev, idx) => (
            <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-slate-500 font-semibold">{ev.dateFormatted}</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-bold text-slate-800">{ev.title}</span>
                </div>
                <p className="text-slate-600 text-[11px]">{ev.description}</p>
                <span className="text-[10px] text-slate-400">Actor: {ev.actor}</span>
              </div>
              <span className="font-mono text-[10px] text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                {ev.sourceCitation}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 6: Compact Timeline */}
      <div id="sec-timeline" className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-600" />
            6. Compact Milestone Timeline
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {summary.timeline.map((t, idx) => (
            <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-mono text-blue-700 font-bold text-[11px]">{t.date}</span>
              <div className="font-semibold text-slate-900 mt-1">{t.event}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">{t.summary}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 7: Potential Contradictions */}
      <div id="sec-contradictions" className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            7. Potential Contradictions & Discrepancies
          </h3>
          <span className="text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-medium border border-amber-200">
            Non-Declarative Analytical Flags
          </span>
        </div>

        {summary.potentialContradictions && summary.potentialContradictions.length > 0 ? (
          <div className="space-y-2.5">
            {summary.potentialContradictions.map((c, idx) => (
              <div key={idx} className="p-3.5 bg-amber-50/40 rounded-lg border border-amber-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900">{c.title}</span>
                  <span className="font-mono text-[10px] text-amber-800">{c.sourceCitation}</span>
                </div>
                <p className="text-amber-800 text-[11px] leading-relaxed">{c.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No evidentiary contradictions flagged across statements and exhibits.</p>
        )}
      </div>

      {/* SECTION 8: Missing Information */}
      <div id="sec-missing" className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-rose-600" />
            8. Missing Information & Statutory Gaps
          </h3>
        </div>

        {summary.missingInformation && summary.missingInformation.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.missingInformation.map((m, idx) => (
              <div key={idx} className="p-3 bg-rose-50/30 rounded-lg border border-rose-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-900">{m.item}</span>
                  <span className="text-[10px] text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">{m.category}</span>
                </div>
                <p className="text-slate-600 text-[11px]">{m.recommendation}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>All 10 statutory case readiness benchmarks are fully satisfied.</span>
          </div>
        )}
      </div>

      {/* SECTION 9: Legal References */}
      <div id="sec-legal" className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            9. Statutory Legal Framework & Judicial Provisions
          </h3>
        </div>

        <div className="space-y-2 text-xs">
          {summary.legalReferences.map((l, idx) => (
            <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start justify-between">
              <div>
                <span className="font-bold text-slate-900 block">{l.act}</span>
                <span className="font-mono text-blue-700 font-semibold">{l.sections}</span>
                <p className="text-slate-500 text-[11px] mt-0.5">{l.applicability}</p>
              </div>
              <span className="font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                {l.sourceCitation}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 10: Cryptographic Integrity Status */}
      <div id="sec-integrity" className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            10. Cryptographic Integrity & Chain of Custody Health
          </h3>
          <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
            {summary.integrityStatus.overallStatus}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block">Documents Anchored:</span>
            <span className="text-lg font-bold text-slate-800">{summary.integrityStatus.documentsCount}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block">Evidence Exhibits:</span>
            <span className="text-lg font-bold text-slate-800">{summary.integrityStatus.evidenceCount}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block">Digital Signatures:</span>
            <span className="text-lg font-bold text-slate-800">{summary.integrityStatus.digitalSignaturesCount}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block">Custody Transfers:</span>
            <span className="text-lg font-bold text-slate-800">{summary.integrityStatus.custodyHopsCount}</span>
          </div>
        </div>

        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Merkle Tree Hash Chain Verified. All transactions immutably anchored in cryptographically sealed ledger.</span>
          </div>
          <span className="font-mono text-[10px] text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
            {summary.integrityStatus.sourceCitation}
          </span>
        </div>
      </div>
    </div>
  );
};
