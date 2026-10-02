import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { 
  Shield, 
  Lock, 
  KeyRound, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck,
  Building,
  Eye,
  EyeOff,
  BadgeCheck,
  UserCheck,
  Fingerprint
} from 'lucide-react';

interface PresetPersona {
  id: string;
  badge: string;
  name: string;
  role: string;
  description: string;
}

export const Login: React.FC = () => {
  const { login, verifyMfa } = useAuth();
  const [officerId, setOfficerId] = useState('USR-IO-01');
  const [password, setPassword] = useState('NyayaSetu@2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [enforceMfa, setEnforceMfa] = useState(false);
  const [mfaChallengeToken, setMfaChallengeToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await login(officerId.trim(), password, enforceMfa);
      if (res.requiresMfa && res.mfaChallengeToken) {
        setMfaChallengeToken(res.mfaChallengeToken);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your Officer ID and Password.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaChallengeToken) return;

    setLoading(true);
    setError(null);

    try {
      await verifyMfa(mfaChallengeToken, mfaCode);
    } catch (err: any) {
      setError(err.message || 'Invalid Two-Factor Verification Code');
    } finally {
      setLoading(false);
    }
  };

  const selectPersona = (p: PresetPersona) => {
    setOfficerId(p.id);
    setPassword('NyayaSetu@2026!');
    setError(null);
  };

  const personas: PresetPersona[] = [
    { id: 'USR-IO-01', badge: 'DEL-IO-442', name: 'Insp. Rajesh Verma', role: 'Investigating Officer', description: 'FIRs, Seizure Memos & Evidence' },
    { id: 'USR-SUP-01', badge: 'DEL-ACP-108', name: 'ACP Sunita Mehta', role: 'Police Supervisor', description: 'Review, Approvals & Charge Sheets' },
    { id: 'USR-PROS-01', badge: 'DEL-PP-309', name: 'Adv. Arvind Sharma', role: 'Public Prosecutor', description: 'Court Trial Filings & Remand' },
    { id: 'USR-JUDGE-01', badge: 'DHJS-771', name: 'Hon. Justice Kaur', role: 'Judicial Officer', description: 'Warrants, Bail & Dispositions' },
    { id: 'USR-FOR-01', badge: 'CFSL-EXP-82', name: 'Dr. Ramesh Rao', role: 'CFSL Scientist', description: 'Forensics & Lab Reports' },
    { id: 'USR-AUD-01', badge: 'MHA-AUD-05', name: 'Ananya Gupta', role: 'Compliance Auditor', description: 'Ledger Integrity & Audit Logs' },
    { id: 'USR-ADMIN-01', badge: 'NCRB-ADM-001', name: 'A. Swaminathan', role: 'System Admin', description: 'RBAC, Keys & System Config' },
    { id: 'USR-00001', badge: 'DP-IO-0001', name: 'Mrs. Berry Blick', role: 'Dataset Officer', description: 'From 1,000 Cases Database' },
  ];

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-[#172033] flex flex-col justify-between selection:bg-[#12355B] selection:text-white">
      {/* Subtle National Micro-Strip */}
      <div className="gov-tricolor-strip fixed top-0 left-0 z-50" />

      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-btn bg-[#12355B] text-white flex items-center justify-center font-bold text-xs font-mono">
            NA
          </div>
          <div>
            <div className="text-xs font-bold text-[#12355B] tracking-tight flex items-center gap-1.5">
              <span>NYAYASETU AI</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#E8F5F6] text-[#167D8D] font-semibold">SIH26190</span>
            </div>
            <div className="text-[10px] text-[#64748B]">Connecting Evidence. Uncovering Intelligence. • Ministry of Home Affairs</div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-[#16805C] bg-[#EBF6F1] px-2.5 py-1 rounded-btn border border-[#BEE4D3]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16805C]" />
          <span>OFFICIAL ACCESS PORTAL</span>
        </div>
      </header>

      {/* Main Two-Column Government Login */}
      <main className="w-full max-w-5xl mx-auto px-6 py-6 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch bg-white border border-[#E2E8F0] rounded-card shadow-sm p-7 sm:p-9">
          
          {/* Left Column: Government Presentation & Officer Quick-Select */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6 lg:pr-6 lg:border-r lg:border-[#E2E8F0]">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] text-[10px] font-mono font-medium mb-2 border border-[#E2E8F0]">
                <Shield className="w-3 h-3 text-[#167D8D]" />
                <span>CCTNS • ICJS • MHA INTEGRATED TERMINAL</span>
              </div>
              <div className="text-2xl font-bold text-[#12355B] tracking-tight mb-1">
                NYAYASETU AI
              </div>
              <p className="text-sm font-semibold text-[#167D8D]">
                “Connecting Evidence. Uncovering Intelligence.”
              </p>
              <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
                Secure Government-Grade Digital Document Management System for Law Enforcement, Public Prosecutors, and Judicial Chambers under Problem Statement SIH26190.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-4 text-xs text-[#64748B]">
                <div className="flex items-center gap-2 p-2 rounded-btn bg-[#F8FAFC] border border-[#F1F5F9]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#167D8D] shrink-0" />
                  <span className="text-[11px]">Sec 65B BSA Cryptographic Ledger</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-btn bg-[#F8FAFC] border border-[#F1F5F9]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#167D8D] shrink-0" />
                  <span className="text-[11px]">Tamper-Proof Chain of Custody</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-btn bg-[#F8FAFC] border border-[#F1F5F9]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#167D8D] shrink-0" />
                  <span className="text-[11px]">Dynamic Knowledge Graph Linkages</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-btn bg-[#F8FAFC] border border-[#F1F5F9]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#167D8D] shrink-0" />
                  <span className="text-[11px]">1,000+ Case Dockets Active</span>
                </div>
              </div>
            </div>

            {/* Quick Officer Persona Selector */}
            <div className="pt-4 border-t border-[#F1F4F7]">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] font-mono flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-[#167D8D]" />
                  <span>Select Officer ID to Quick-Fill:</span>
                </span>
                <span className="text-[9px] font-mono text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#E2E8F0]">
                  Default Pass: NyayaSetu@2026!
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {personas.map(p => {
                  const isSelected = officerId.toUpperCase() === p.id.toUpperCase();
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectPersona(p)}
                      className={`p-2 rounded-btn text-left border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#E8F5F6] text-[#12355B] font-semibold border-[#167D8D] shadow-xs'
                          : 'bg-[#F8FAFC] text-[#475569] hover:text-[#172033] hover:bg-[#F1F5F9] border-[#E2E8F0]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className={`font-mono text-[10px] font-bold px-1 py-0.5 rounded ${
                          isSelected ? 'bg-[#12355B] text-white' : 'bg-[#E2E8F0] text-[#1E293B]'
                        }`}>
                          {p.id}
                        </span>
                        <span className="text-[9px] text-[#94A3B8] font-mono truncate">{p.badge}</span>
                      </div>
                      <div className="font-semibold text-xs mt-1 text-[#172033] truncate">{p.name}</div>
                      <div className="text-[9px] text-[#64748B] truncate">{p.role}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Secure Sign In Form */}
          <div className="lg:col-span-6 flex flex-col justify-center space-y-5 lg:pl-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded bg-[#12355B]/5 text-[#12355B]">
                  <Lock className="w-4 h-4" />
                </span>
                <h2 className="text-lg font-bold text-[#172033]">Officer Credential Sign In</h2>
              </div>
              <p className="text-xs text-[#64748B]">
                Enter your Department Officer ID and Password to authenticate your investigation session.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-btn bg-[#FDF2F2] border border-[#F8D7DA] text-[#C53D3D] text-xs flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!mfaChallengeToken ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Officer ID Field */}
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <BadgeCheck className="w-3.5 h-3.5 text-[#167D8D]" />
                      <span>Officer ID / User ID</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#64748B]">
                      e.g. USR-IO-01, DEL-IO-442
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={officerId}
                      onChange={(e) => setOfficerId(e.target.value)}
                      required
                      placeholder="Enter Officer ID (e.g. USR-IO-01 or USR-00001)"
                      className="gov-input w-full text-xs font-mono font-semibold uppercase tracking-wider pl-3 pr-8"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#94A3B8]">
                      <Fingerprint className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-1 flex items-center justify-between">
                    <span>Matches Officer ID, Agency ID, or Badge No.</span>
                    <span className="font-mono text-[#167D8D]">108 Officers Loaded</span>
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#167D8D]" />
                      <span>Password</span>
                    </span>
                    <span className="text-[10px] text-[#64748B]">
                      Default: <code className="font-mono text-[#167D8D]">NyayaSetu@2026!</code>
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter official password"
                      className="gov-input w-full text-xs font-mono pr-10 pl-3"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#172033] p-1 cursor-pointer transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-[#94A3B8]" />}
                    </button>
                  </div>
                </div>

                {/* Device & Option Settings */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs text-[#64748B]">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberDevice}
                        onChange={(e) => setRememberDevice(e.target.checked)}
                        className="rounded border-[#CBD5E1] text-[#12355B] focus:ring-[#167D8D]"
                      />
                      <span>Remember Officer Workstation</span>
                    </label>
                    <a 
                      href="#help" 
                      onClick={(e) => { 
                        e.preventDefault(); 
                        alert('Officer Credential Guide:\n\n• Officer ID: Enter any ID such as USR-IO-01, USR-SUP-01, USR-ADMIN-01, or USR-00001 from the CCTNS dataset.\n• Password: Use the default official password "NyayaSetu@2026!" or click any quick-fill button on the left.'); 
                      }} 
                      className="text-[#167D8D] hover:underline"
                    >
                      Credential Guide
                    </a>
                  </div>

                  {/* Optional 2FA simulation checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-[#64748B]">
                    <input
                      type="checkbox"
                      checked={enforceMfa}
                      onChange={(e) => setEnforceMfa(e.target.checked)}
                      className="rounded border-[#CBD5E1] text-[#12355B] focus:ring-[#167D8D]"
                    />
                    <span>Require 2FA Hardware Security Token (OTP 123456)</span>
                  </label>
                </div>

                {/* Submit Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-2.5 cursor-pointer disabled:opacity-50 text-xs font-semibold shadow-sm hover:shadow transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{loading ? 'Authenticating Officer...' : 'Authorize & Sign In →'}</span>
                </button>

                {/* Quick Hint Card */}
                <div className="p-2.5 rounded-btn bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#64748B] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16805C] shrink-0" />
                  <span>
                    Direct access with <strong>Officer ID</strong> &amp; <strong>Password</strong>. Session cryptographically binds your badge &amp; jurisdiction.
                  </span>
                </div>
              </form>
            ) : (
              <form onSubmit={handleMfaSubmit} className="space-y-4">
                <div className="p-3.5 rounded-btn bg-[#E8F5F6] border border-[#C5E6EA] text-xs text-[#12355B]">
                  <div className="font-semibold mb-0.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#167D8D]" />
                    <span>Two-Factor Authentication Active</span>
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    Enter your 6-digit Department Token or OTP for Officer ID <code className="font-mono font-bold text-[#12355B]">{officerId}</code>. (Demo code: 123456)
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1.5 text-center">
                    6-Digit Security Passcode
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    required
                    placeholder="123456"
                    className="gov-input w-full text-center text-lg tracking-widest font-mono font-bold py-2.5"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-2.5 cursor-pointer disabled:opacity-50 bg-[#16805C] hover:bg-[#126b4d] text-xs font-semibold"
                >
                  <span>{loading ? 'Verifying Hardware Token...' : 'Verify Token & Access Workspace →'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMfaChallengeToken(null)}
                  className="w-full text-center text-xs text-[#64748B] hover:text-[#172033] cursor-pointer pt-1"
                >
                  ← Back to Officer ID &amp; Password
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#64748B]">
        <div>National Informatics Centre (NIC) • GIGW 3.0 Standard • Ministry of Home Affairs</div>
        <div>SHA-256 Merkle Ledger Node: NCRB-DELHI-PRIMARY • Session Verified</div>
      </footer>
    </div>
  );
};

