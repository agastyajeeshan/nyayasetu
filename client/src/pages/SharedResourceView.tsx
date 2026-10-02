import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { 
  Shield, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  KeyRound,
  ArrowLeft,
  FileText,
  Lock,
  Building2,
  UserCheck
} from 'lucide-react';

interface SharedResourceViewProps {
  token: string;
  onExit: () => void;
}

export const SharedResourceView: React.FC<SharedResourceViewProps> = ({ token, onExit }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [requiresPasscode, setRequiresPasscode] = useState(false);

  const fetchResource = async (code?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.accessSharedResource(token, code);
      setData(res);
      setRequiresPasscode(false);
    } catch (err: any) {
      if (err.message?.includes('passcode')) {
        setRequiresPasscode(true);
      } else {
        setError(err.message || 'Unable to access shared resource');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResource();
  }, [token]);

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResource(passcode);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 flex flex-col items-center justify-center relative selection:bg-[#1a3c6e] selection:text-white">
      {/* Top Tricolor Ribbon */}
      <div className="tricolor-ribbon absolute top-0 left-0" />

      {/* Top Banner */}
      <div className="w-full max-w-4xl mb-6 flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1a3c6e] flex items-center justify-center text-white shadow-xs">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">Government of India • Ministry of Home Affairs</h1>
            <p className="text-[11px] text-slate-500">NyayaSetu Inter-Agency Controlled Legal Collaboration Gateway</p>
          </div>
        </div>

        <button
          onClick={onExit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Internal Portal</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-4xl gov-card p-6 sm:p-8 space-y-6 relative overflow-hidden border-t-4 border-t-[#1a3c6e]">
        {loading ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a3c6e] mx-auto mb-3" />
            Validating cryptographic access token with Central Ledger...
          </div>
        ) : error ? (
          <div className="py-16 text-center space-y-3">
            <div className="inline-flex p-3 rounded-2xl bg-red-50 text-red-600 border border-red-200">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Access Denied / Token Expired</h3>
            <p className="text-xs text-red-600 max-w-md mx-auto">{error}</p>
          </div>
        ) : requiresPasscode ? (
          <form onSubmit={handlePasscodeSubmit} className="max-w-md mx-auto py-10 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Passcode Protected Legal Record</h3>
              <p className="text-xs text-slate-500 mt-1">Enter the authorized access passcode supplied with this token link.</p>
            </div>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter Access Passcode"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-center text-sm focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#1a3c6e] hover:bg-[#122b52] text-white text-xs font-bold transition-all shadow-xs"
            >
              Unlock Document Preview
            </button>
          </form>
        ) : data ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-5 border-b border-slate-100">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    {data.share?.permission === 'VIEW_ONLY' ? 'VIEW ONLY' : 'DOWNLOAD ALLOWED'}
                  </span>
                  <span className="status-pill status-pill-emerald">
                    <CheckCircle2 className="w-3.5 h-3.5" /> TOKEN VERIFIED
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">{data.share?.resourceTitle}</h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <strong>{data.share?.recipientName}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {data.share?.recipientOrg}
                  </span>
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-500 font-mono space-y-1">
                <p className="flex items-center gap-1 justify-end">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Expires (IST): {new Date(data.share?.expiresAt).toLocaleString('en-IN')}
                </p>
                <p>Issued by Officer: <span className="font-semibold text-slate-700">{data.share?.sharedByName}</span></p>
              </div>
            </div>

            {/* Document Watermarked Container */}
            <div className="relative rounded-2xl bg-white border border-slate-200 p-8 min-h-[360px] overflow-hidden shadow-xs">
              {/* Dynamic Watermark Overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-40 flex items-center justify-center select-none overflow-hidden">
                <span className="text-xl sm:text-3xl font-black tracking-widest text-slate-400/30 uppercase -rotate-45 text-center leading-loose">
                  {data.share?.watermarkText || 'CONFIDENTIAL LEGAL DOCUMENT • GOVT OF INDIA • MHA / NCRB'}
                </span>
              </div>

              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    {data.resource?.document?.title || 'Legal Document Stream'}
                  </span>
                  <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    SHA-256: {data.resource?.versions?.[0]?.sha256Hash?.slice(0, 20)}...
                  </span>
                </div>

                <pre className="font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {data.resource?.document?.description || 'Official law enforcement filing container. Contents encrypted under restricted judicial token view.'}
                  {'\n\n[OFFICIAL LEGAL NOTICE]\nThis electronic record is shared under strict official confidentiality pursuant to Section 8 of the RTI Act and relevant provisions of the Bharatiya Nagarik Suraksha Sanhita (BNSS 2023) / CrPC. Unauthorized reproduction, forwarding, or extraction constitutes an offence under Sections 43 and 66 of the Information Technology Act, 2000.'}
                </pre>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
