import React, { useState, useEffect } from 'react';
import { 
  X, 
  GitCompare, 
  Copy, 
  Check, 
  FileText, 
  Clock, 
  User, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight,
  Split,
  List
} from 'lucide-react';
import { api } from '../../api/client';
import { VersionDiffResult, DocumentVersion } from '../../types';

interface DocumentVersionComparisonModalProps {
  documentId: string;
  documentTitle: string;
  versions: DocumentVersion[];
  onClose: () => void;
}

export const DocumentVersionComparisonModal: React.FC<DocumentVersionComparisonModalProps> = ({
  documentId,
  documentTitle,
  versions,
  onClose
}) => {
  const sortedVersions = [...versions].sort((a, b) => a.versionNumber - b.versionNumber);
  const defaultV1 = sortedVersions.length > 1 ? sortedVersions[sortedVersions.length - 2].versionNumber : 1;
  const defaultV2 = sortedVersions.length > 0 ? sortedVersions[sortedVersions.length - 1].versionNumber : 1;

  const [v1, setV1] = useState<number>(defaultV1);
  const [v2, setV2] = useState<number>(defaultV2);
  const [diffResult, setDiffResult] = useState<VersionDiffResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchDiff = async (ver1: number, ver2: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.compareVersions(documentId, ver1, ver2);
      setDiffResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to compare document versions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiff(v1, v2);
  }, [documentId, v1, v2]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Document Version Comparison
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-blue-100 text-blue-800 border border-blue-200">
                  {documentTitle}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cryptographic integrity diff, metadata alterations, and content comparison between revisions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Version Selector Toolbar */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Base Version (A):</label>
              <select
                value={v1}
                onChange={(e) => setV1(Number(e.target.value))}
                className="text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sortedVersions.map((v) => (
                  <option key={`v1-${v.versionNumber}`} value={v.versionNumber}>
                    Version v{v.versionNumber}.0 ({new Date(v.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400" />

            <div className="flex items-center space-x-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Target Version (B):</label>
              <select
                value={v2}
                onChange={(e) => setV2(Number(e.target.value))}
                className="text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sortedVersions.map((v) => (
                  <option key={`v2-${v.versionNumber}`} value={v.versionNumber}>
                    Version v{v.versionNumber}.0 ({new Date(v.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="bg-slate-100 p-0.5 rounded-lg flex items-center border border-slate-200">
              <button
                onClick={() => setViewMode('unified')}
                className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  viewMode === 'unified'
                    ? 'bg-white text-blue-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Unified View</span>
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  viewMode === 'split'
                    ? 'bg-white text-blue-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Split className="w-3.5 h-3.5" />
                <span>Side by Side</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-500 font-medium">Computing cryptographic and line-by-line diff...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-800">Diff Comparison Error</h4>
                <p className="text-xs text-red-700 mt-1">{error}</p>
              </div>
            </div>
          ) : diffResult ? (
            <>
              {/* Section 1: WHAT CHANGED? Executive Summary */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    Summary of Modifications (v{diffResult.v1Number} ➔ v{diffResult.v2Number})
                  </h3>
                </div>
                {diffResult.summaryOfChanges && diffResult.summaryOfChanges.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {diffResult.summaryOfChanges.map((change, idx) => (
                      <div
                        key={idx}
                        className="flex items-start space-x-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200"
                      >
                        <span className="text-blue-600 font-bold">•</span>
                        <span>{change}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No textual or metadata modifications detected between these versions.</p>
                )}
              </div>

              {/* Section 2: Cryptographic Hash Verification Side-by-Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Version A Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded-md">
                      Version v{diffResult.v1Number}.0 (Base)
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(diffResult.v1CreatedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    <div className="text-xs flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" /> Uploader:
                      </span>
                      <span className="font-semibold text-slate-800">{diffResult.v1Uploader}</span>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
                        <span className="font-semibold flex items-center gap-1 text-slate-700">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          SHA-256 Digest:
                        </span>
                        <button
                          onClick={() => copyToClipboard(diffResult.v1Hash, 'v1')}
                          className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-mono"
                        >
                          {copiedHash === 'v1' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          {copiedHash === 'v1' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-200 font-mono text-[11px] text-slate-700 break-all select-all">
                        {diffResult.v1Hash}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Version B Card */}
                <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm bg-blue-50/10">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-md">
                      Version v{diffResult.v2Number}.0 (Modified)
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(diffResult.v2CreatedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    <div className="text-xs flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" /> Uploader:
                      </span>
                      <span className="font-semibold text-slate-800">{diffResult.v2Uploader}</span>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
                        <span className="font-semibold flex items-center gap-1 text-slate-700">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          SHA-256 Digest:
                        </span>
                        <button
                          onClick={() => copyToClipboard(diffResult.v2Hash, 'v2')}
                          className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-mono"
                        >
                          {copiedHash === 'v2' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          {copiedHash === 'v2' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-200 font-mono text-[11px] text-slate-700 break-all select-all">
                        {diffResult.v2Hash}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Metadata Properties Diff */}
              {diffResult.metadataDiffs && diffResult.metadataDiffs.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Metadata & Header Attributes Diff
                    </h4>
                  </div>
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Attribute</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-600">v{diffResult.v1Number} Value</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-600">v{diffResult.v2Number} Value</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {diffResult.metadataDiffs.map((meta, idx) => (
                        <tr key={idx} className={meta.hasChanged ? 'bg-amber-50/40' : ''}>
                          <td className="px-4 py-2 font-medium text-slate-800">{meta.field}</td>
                          <td className="px-4 py-2 font-mono text-slate-600">{String(meta.v1Value)}</td>
                          <td className="px-4 py-2 font-mono text-slate-800 font-semibold">{String(meta.v2Value)}</td>
                          <td className="px-4 py-2 text-right">
                            {meta.hasChanged ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-semibold rounded text-[11px]">
                                Modified
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Unchanged</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Section 4: Text Content Diff Viewer */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Content Line-by-Line Difference
                    </h4>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px]">
                    <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded"></span> Line Added
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-700 font-semibold">
                      <span className="w-2.5 h-2.5 bg-rose-500 rounded"></span> Line Removed
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <span className="w-2.5 h-2.5 bg-slate-200 rounded"></span> Unchanged
                    </span>
                  </div>
                </div>

                {viewMode === 'unified' ? (
                  <div className="font-mono text-xs overflow-x-auto divide-y divide-slate-100 max-h-[450px]">
                    {diffResult.textDiffs && diffResult.textDiffs.length > 0 ? (
                      diffResult.textDiffs.map((line, idx) => {
                        if (line.type === 'ADDED') {
                          return (
                            <div key={idx} className="flex bg-emerald-50/70 text-emerald-900 border-l-4 border-emerald-500 py-1 px-3 hover:bg-emerald-100/60">
                              <span className="w-12 text-right pr-4 text-emerald-600 select-none opacity-60">
                                {line.lineB}
                              </span>
                              <span className="w-6 text-center text-emerald-700 font-bold select-none">+</span>
                              <span className="flex-1 whitespace-pre-wrap">{line.content}</span>
                            </div>
                          );
                        } else if (line.type === 'REMOVED') {
                          return (
                            <div key={idx} className="flex bg-rose-50/70 text-rose-900 border-l-4 border-rose-500 py-1 px-3 hover:bg-rose-100/60">
                              <span className="w-12 text-right pr-4 text-rose-600 select-none opacity-60">
                                {line.lineA}
                              </span>
                              <span className="w-6 text-center text-rose-700 font-bold select-none">-</span>
                              <span className="flex-1 whitespace-pre-wrap">{line.content}</span>
                            </div>
                          );
                        } else {
                          return (
                            <div key={idx} className="flex text-slate-700 py-1 px-3 hover:bg-slate-50">
                              <span className="w-12 text-right pr-4 text-slate-400 select-none opacity-50">
                                {line.lineA || line.lineB}
                              </span>
                              <span className="w-6 text-center text-slate-300 select-none"> </span>
                              <span className="flex-1 whitespace-pre-wrap text-slate-800">{line.content}</span>
                            </div>
                          );
                        }
                      })
                    ) : (
                      <div className="p-8 text-center text-slate-400">
                        Both versions contain identical textual content.
                      </div>
                    )}
                  </div>
                ) : (
                  /* Side by Side split view */
                  <div className="grid grid-cols-2 divide-x divide-slate-200 font-mono text-xs max-h-[450px] overflow-y-auto">
                    {/* Left: Version A */}
                    <div className="divide-y divide-slate-100">
                      <div className="bg-slate-100/70 px-4 py-1.5 font-bold text-slate-600 sticky top-0 border-b border-slate-200">
                        Version v{diffResult.v1Number}.0
                      </div>
                      {diffResult.textDiffs
                        .filter(l => l.type !== 'ADDED')
                        .map((line, idx) => (
                          <div
                            key={idx}
                            className={`flex py-1 px-3 ${
                              line.type === 'REMOVED'
                                ? 'bg-rose-50/70 text-rose-900 border-l-4 border-rose-500'
                                : 'text-slate-700'
                            }`}
                          >
                            <span className="w-8 text-right pr-2 text-slate-400 select-none">{line.lineA}</span>
                            <span className="flex-1 whitespace-pre-wrap">{line.content}</span>
                          </div>
                        ))}
                    </div>

                    {/* Right: Version B */}
                    <div className="divide-y divide-slate-100">
                      <div className="bg-slate-100/70 px-4 py-1.5 font-bold text-slate-600 sticky top-0 border-b border-slate-200">
                        Version v{diffResult.v2Number}.0
                      </div>
                      {diffResult.textDiffs
                        .filter(l => l.type !== 'REMOVED')
                        .map((line, idx) => (
                          <div
                            key={idx}
                            className={`flex py-1 px-3 ${
                              line.type === 'ADDED'
                                ? 'bg-emerald-50/70 text-emerald-900 border-l-4 border-emerald-500'
                                : 'text-slate-700'
                            }`}
                          >
                            <span className="w-8 text-right pr-2 text-slate-400 select-none">{line.lineB}</span>
                            <span className="flex-1 whitespace-pre-wrap">{line.content}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Cryptographic SHA-256 seals verify immutable record retention under Section 63 BSA / IT Act.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
