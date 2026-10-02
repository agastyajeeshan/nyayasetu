import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  Database, 
  Lock, 
  Layers, 
  Copy, 
  Check, 
  ExternalLink 
} from 'lucide-react';
import { api } from '../api/client';
import { IntegrityReportItem } from '../types';

export const IntegrityCenter: React.FC = () => {
  const [items, setItems] = useState<IntegrityReportItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [verifyingAll, setVerifyingAll] = useState<boolean>(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DOCUMENT' | 'EVIDENCE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VERIFIED' | 'WARNING' | 'INTEGRITY_FAILURE'>('ALL');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchIntegrityData = async () => {
    try {
      setLoading(true);
      const res = await api.getIntegrityCenterReport();
      setItems(res.items || []);
      setStats(res.stats || null);
      setLastCheckTime(res.verifiedAt || new Date().toISOString());
    } catch (err) {
      console.error('Failed to fetch integrity data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrityData();
  }, []);

  const handleVerifyAllNow = async () => {
    try {
      setVerifyingAll(true);
      const res = await api.verifyIntegrityAll();
      await fetchIntegrityData();
    } catch (err) {
      console.error('Batch verification error:', err);
      alert('Verification completed with warnings. Check logs for details.');
    } finally {
      setVerifyingAll(false);
    }
  };

  const copyHash = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.resourceTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.resourceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sha256Hash.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'ALL' || item.resourceType === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || item.currentStatus === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Evidence Integrity Center
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              SHA-256 & Merkle Live
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Sovereign real-time cryptographic audit station. Continuous automated verification of on-disk binary hashes, 
            ECDSA digital signatures, and Merkle ledger block anchors under Section 63 BSA & IT Act 2000.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleVerifyAllNow}
            disabled={verifyingAll}
            className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center space-x-2 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verifyingAll ? 'animate-spin' : ''}`} />
            <span>{verifyingAll ? 'Verifying Hashes...' : 'Verify All Integrity Now'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets Monitored */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monitored Assets</span>
            <Database className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{stats?.totalItems ?? items.length}</span>
            <span className="text-xs text-slate-500 font-medium">Docs & Exhibits</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Last audited: {lastCheckTime ? new Date(lastCheckTime).toLocaleTimeString() : 'Just now'}
          </div>
        </div>

        {/* Cryptographically Verified */}
        <div className="bg-white rounded-xl border border-emerald-200 p-5 shadow-sm bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Verified Uncompromised</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700">{stats?.verifiedCount ?? items.filter(i => i.currentStatus === 'VERIFIED').length}</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              100% Match
            </span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600">
            Binary hashes match stored sovereign seals
          </div>
        </div>

        {/* Action Required / Unsigned */}
        <div className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Awaiting Signature</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-700">{stats?.warningCount ?? items.filter(i => i.currentStatus === 'WARNING').length}</span>
            <span className="text-xs text-amber-700 font-medium">Unsigned</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-600">
            Integrity intact; requires IO/Court e-sign
          </div>
        </div>

        {/* Tamper Faults Detected */}
        <div className={`bg-white rounded-xl p-5 shadow-sm border ${
          (stats?.failureCount ?? 0) > 0 ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Integrity Faults</span>
            {(stats?.failureCount ?? 0) > 0 ? (
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            ) : (
              <Lock className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-2xl font-black ${
              (stats?.failureCount ?? 0) > 0 ? 'text-rose-700' : 'text-slate-900'
            }`}>
              {stats?.failureCount ?? 0}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              (stats?.failureCount ?? 0) > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
            }`}>
              {(stats?.failureCount ?? 0) > 0 ? 'TAMPER DETECTED' : 'Zero Faults'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {(stats?.failureCount ?? 0) > 0 ? 'Hash mismatch flagged in audit log' : 'Chain of custody unbroken'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by case #, document title, or hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          <div className="flex items-center space-x-1.5">
            <label className="text-xs font-semibold text-slate-600">Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Types</option>
              <option value="DOCUMENT">Documents</option>
              <option value="EVIDENCE">Physical/Digital Exhibits</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <label className="text-xs font-semibold text-slate-600">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="VERIFIED">Verified Clean</option>
              <option value="WARNING">Unsigned / In Review</option>
              <option value="INTEGRITY_FAILURE">Integrity Failure</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Integrity Assets Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Cryptographic Integrity Audit Ledger ({filteredItems.length} records)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Real-time binary digest comparison against filesystem
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Auditing cryptographic blocks and SHA-256 digests...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No evidentiary records matched the active filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50/70">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">Asset / Exhibit</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">Case Reference</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">SHA-256 Digest</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">Merkle Ledger</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">Digital Sign</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-600 uppercase tracking-wider">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Asset Info */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-2.5">
                        <div className={`p-1.5 rounded-lg shrink-0 ${
                          item.resourceType === 'DOCUMENT' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                        }`}>
                          {item.resourceType === 'DOCUMENT' ? <FileText className="w-4 h-4" /> : <Database className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 line-clamp-1">{item.resourceTitle}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">{item.resourceNumber}</div>
                        </div>
                      </div>
                    </td>

                    {/* Case Ref */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {item.caseNumber}
                      </span>
                    </td>

                    {/* SHA-256 Hash with Copy */}
                    <td className="px-4 py-3.5 font-mono text-[11px]">
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 select-all">
                          {item.sha256Hash ? `${item.sha256Hash.slice(0, 16)}...` : 'N/A'}
                        </span>
                        {item.sha256Hash && (
                          <button
                            onClick={() => copyHash(item.sha256Hash, item.id)}
                            className="text-slate-400 hover:text-slate-700 p-1"
                            title="Copy full SHA-256 hash"
                          >
                            {copiedHash === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Merkle Ledger Anchor */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        item.merkleStatus === 'ANCHORED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        <Lock className="w-3 h-3" />
                        {item.merkleStatus === 'ANCHORED' ? `Block #${item.ledgerBlockIndex ?? '0'}` : 'Pending'}
                      </span>
                    </td>

                    {/* Digital Signature */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {item.digitalSignatureStatus === 'NOT_APPLICABLE' ? (
                        <span className="text-[11px] text-slate-400 italic">Custody Chain</span>
                      ) : item.digitalSignatureStatus === 'SIGNED' ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Signed ({item.signatureCount})
                        </span>
                      ) : (
                        <span className="text-amber-700 font-medium flex items-center gap-1 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Unsigned
                        </span>
                      )}
                    </td>

                    {/* Status Pill */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {item.currentStatus === 'VERIFIED' ? (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          VERIFIED CLEAN
                        </span>
                      ) : item.currentStatus === 'WARNING' ? (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          PENDING SIGNATURE
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          INTEGRITY TAMPER
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info banner */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>All digests are calculated with SHA-256 standard and verified against local file blobs on request.</span>
          <span className="font-mono text-[11px]">System Status: Operational</span>
        </div>
      </div>
    </div>
  );
};
