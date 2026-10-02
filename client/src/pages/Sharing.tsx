import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { ShareLink } from '../types.js';
import { Modal } from '../components/common/Modal.js';
import { 
  Share2, 
  Plus, 
  Clock, 
  Copy, 
  Trash2,
  ShieldCheck,
  Building2,
  UserCheck,
  FileText,
  KeyRound,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const Sharing: React.FC = () => {
  const { user } = useAuth();
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [documentId, setDocumentId] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientOrg, setRecipientOrg] = useState('');
  const [permission, setPermission] = useState<'VIEW_ONLY' | 'DOWNLOAD_ALLOWED'>('VIEW_ONLY');
  const [expiresInHours, setExpiresInHours] = useState(48);
  const [passcode, setPasscode] = useState('');
  const [purpose, setPurpose] = useState('');
  const [watermarkText, setWatermarkText] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchShares = async () => {
    setLoading(true);
    try {
      const [sharesData, docsData] = await Promise.all([
        api.getShares(),
        api.getDocuments()
      ]);
      setShares(sharesData);
      setDocuments(docsData.documents || []);
      if (!documentId && docsData.documents?.length > 0) {
        setDocumentId(docsData.documents[0].id);
      }
    } catch (err) {
      console.error('Error fetching shares:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShares();
  }, [user]);

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId || !recipientEmail || !recipientName || !recipientOrg || !purpose) return;

    setIsCreating(true);
    try {
      await api.createShare({
        documentId,
        recipientEmail,
        recipientName,
        recipientOrg,
        permission,
        expiresInHours,
        passcode: passcode || undefined,
        purpose,
        watermarkText: watermarkText || undefined
      });

      setIsModalOpen(false);
      resetForm();
      fetchShares();
    } catch (err: any) {
      alert(`Failed to create share: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setRecipientEmail('');
    setRecipientName('');
    setRecipientOrg('');
    setPasscode('');
    setPurpose('');
    setWatermarkText('');
  };

  const handleRevokeShare = async (shareId: string) => {
    if (!window.confirm('Revoke access immediately for this share token? The recipient will be locked out instantaneously.')) {
      return;
    }
    try {
      await api.revokeShare(shareId);
      fetchShares();
    } catch (err: any) {
      alert(`Revocation failed: ${err.message}`);
    }
  };

  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/#/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const canCreateShare = ['investigating_officer', 'supervisor', 'prosecutor', 'admin'].includes(user?.role || '');

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700">
              <Share2 className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Inter-Agency Controlled Sharing
            </h1>
            <span className="status-pill status-pill-blue">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              EXPIRING TOKENS
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Time-bounded, dynamic watermarked, revocable legal access tokens for courts, prosecutors & forensic laboratories
          </p>
        </div>

        {canCreateShare && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a3c6e] hover:bg-[#122b52] text-white text-xs font-semibold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Expiring Share Link</span>
          </button>
        )}
      </div>

      {/* Share Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 text-xs">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#1a3c6e] mx-auto mb-3" />
          Loading active share tokens...
        </div>
      ) : shares.length === 0 ? (
        <div className="gov-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Share2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Active Share Links</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You have not issued any external collaboration tokens yet. Create a secure expiring share above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {shares.map((share) => {
            const isExpired = new Date(share.expiresAt).getTime() < Date.now();
            const isActive = !share.isRevoked && !isExpired;

            return (
              <div
                key={share.id}
                className="gov-card gov-card-hover p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                      {share.permission === 'VIEW_ONLY' ? 'VIEW ONLY' : 'DOWNLOAD ALLOWED'}
                    </span>
                    <span className={`status-pill ${isActive ? 'status-pill-emerald' : 'status-pill-crimson'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {share.isRevoked ? 'REVOKED' : isExpired ? 'EXPIRED' : 'ACTIVE'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">{share.resourceTitle}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-blue-700 font-medium mt-1">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>{share.recipientName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{share.recipientOrg}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Statutory Purpose:</span>
                    <p className="line-clamp-2 leading-relaxed">{share.purpose}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-xs space-y-2.5">
                  <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Expires: {new Date(share.expiresAt).toLocaleDateString('en-IN')}
                    </span>
                    <span className="text-slate-700 font-semibold">{share.accessCount} Views</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => copyShareLink(share.shareToken)}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {copiedToken === share.shareToken ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-600" />
                          <span>Copy Token Link</span>
                        </>
                      )}
                    </button>

                    {isActive && (
                      <button
                        onClick={() => handleRevokeShare(share.id)}
                        className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/80 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="Revoke access immediately"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        <span>Revoke</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Expiring Share Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Generate Secure Expiring Legal Share Token"
        subtitle="Zero-Trust Access Control with Dynamic Anti-Leak Watermark & Audit Logging"
      >
        <form onSubmit={handleCreateShare} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Official Document to Share *</label>
            <select
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.documentNumber} - {d.title} ({d.category})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Recipient Official Name *</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                required
                placeholder="e.g. Adv. Arvind Sharma (Public Prosecutor)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Recipient Organization / Agency *</label>
              <input
                type="text"
                value={recipientOrg}
                onChange={(e) => setRecipientOrg(e.target.value)}
                required
                placeholder="e.g. Directorate of Prosecution, Delhi"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Recipient Gov Email *</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
                placeholder="e.g. prosecutor.sharma@delhi.gov.in"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Access Expiration (Hours)</label>
              <input
                type="number"
                min={1}
                max={720}
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(parseInt(e.target.value, 10) || 48)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Access Permission Mode</label>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
              >
                <option value="VIEW_ONLY">View Only (Watermarked In-Browser)</option>
                <option value="DOWNLOAD_ALLOWED">Download Encrypted Container Allowed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mandatory Access Passcode (Optional)</label>
              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="e.g. CourtPass@2026"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Official Statutory Purpose *</label>
            <textarea
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
              placeholder="e.g. Scrutiny of forensic ballistics certificate prior to filing formal charge sheet in Saket District Court..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Custom Anti-Leak Watermark Banner (Optional)</label>
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="e.g. FOR PROSECUTOR SCRUTINY ONLY - NOT FOR PUBLIC RELEASE"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-5 py-2 rounded-xl bg-[#1a3c6e] hover:bg-[#122b52] text-white text-xs font-bold disabled:opacity-50 shadow-xs"
            >
              {isCreating ? 'Generating Token...' : 'Generate & Issue Share Token'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
