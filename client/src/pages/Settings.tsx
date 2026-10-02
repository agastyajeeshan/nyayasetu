import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  ShieldCheck,
  ScanFace,
  Bell,
  FileText,
  Fingerprint,
  MonitorSmartphone,
  Building2,
  Lock,
  CheckCircle2,
  AlertCircle,
  TriangleAlert,
  ArrowRight,
  ExternalLink,
  Laptop,
  Check,
  RefreshCw,
  LogOut,
  Save,
  Edit2,
  Trash2,
  Shield,
  Key
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { User, UserRole } from '../types.js';
import { ChangePasswordModal } from '../components/settings/ChangePasswordModal.js';
import { FaceVerificationModal } from '../components/settings/FaceVerificationModal.js';
import { ReauthPasswordModal } from '../components/settings/ReauthPasswordModal.js';
import { SystemSecurity } from './SystemSecurity.js';
import { DatabaseSettings } from './DatabaseSettings.js';
import { AssetRegister } from './AssetRegister.js';
import { Sharing } from './Sharing.js';

type SettingsTab =
  | 'profile'
  | 'security'
  | 'face'
  | 'notifications'
  | 'documents'
  | 'evidence'
  | 'sessions'
  | 'admin';

interface SettingsProps {
  onNavigateTab?: (tab: string, extraId?: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigateTab }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [currentUser, setCurrentUser] = useState<User | null>(user);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileDept, setProfileDept] = useState(user?.department || '');
  const [profileOrg, setProfileOrg] = useState(user?.organization || '');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Modals
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [isFaceReenroll, setIsFaceReenroll] = useState(false);
  const [isReauthModalOpen, setIsReauthModalOpen] = useState(false);
  const [reauthConfig, setReauthConfig] = useState<{
    title: string;
    description: string;
    actionLabel: string;
    onConfirm: (pwd: string) => Promise<void>;
  } | null>(null);

  // Notifications State
  const [notifPrefs, setNotifPrefs] = useState({
    caseActivity: user?.notificationPreferences?.caseActivity ?? true,
    evidenceCustody: user?.notificationPreferences?.evidenceCustody ?? true,
    integrityAlerts: user?.notificationPreferences?.integrityAlerts ?? true,
    documentSharing: user?.notificationPreferences?.documentSharing ?? true,
    documentReviews: user?.notificationPreferences?.documentReviews ?? true,
    documentAlerts: user?.notificationPreferences?.documentAlerts ?? true,
    failedLogins: user?.notificationPreferences?.failedLogins ?? true,
    faceFailures: user?.notificationPreferences?.faceFailures ?? true,
    suspiciousAccess: user?.notificationPreferences?.suspiciousAccess ?? true
  });
  const [notifSaved, setNotifSaved] = useState(false);

  // Document preferences (local storage backing)
  const [docViewMode, setDocViewMode] = useState<'list' | 'grid'>(
    (localStorage.getItem('nyayasetu_doc_view') as 'list' | 'grid') || 'list'
  );

  // Session & Security Events State
  const [sessionInfo, setSessionInfo] = useState<{ currentSession: any; securityEvents: any[] } | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sessionActionMsg, setSessionActionMsg] = useState<string | null>(null);

  // Admin Tab Sub-Navigation
  const [adminSubTab, setAdminSubTab] = useState<'users' | 'security' | 'database' | 'assets' | 'sharing'>('users');
  const [userList, setUserList] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [adminActionMsg, setAdminActionMsg] = useState<string | null>(null);

  const isAdminOrSupervisor = user?.role === 'admin' || user?.role === 'supervisor';

  // Sync current user state
  useEffect(() => {
    if (user) {
      setCurrentUser(user);
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
      setProfileDept(user.department || '');
      setProfileOrg(user.organization || '');
    }
  }, [user]);

  // Load session telemetry when on sessions or security tab
  useEffect(() => {
    if (activeTab === 'sessions' || activeTab === 'security') {
      loadSessionInfo();
    }
    if (activeTab === 'admin' && adminSubTab === 'users') {
      loadUserList();
    }
  }, [activeTab, adminSubTab]);

  const loadSessionInfo = async () => {
    try {
      setLoadingSession(true);
      const data = await api.getSessionInfo();
      setSessionInfo(data);
    } catch (err) {
      console.error('Failed to load session telemetry', err);
    } finally {
      setLoadingSession(false);
    }
  };

  const loadUserList = async () => {
    try {
      setLoadingUsers(true);
      const data = await api.getUsers();
      setUserList(data);
    } catch (err) {
      console.error('Failed to load user list', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // 1. Save Profile
  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      setProfileMsg(null);
      const updated = await api.updateProfile({
        name: profileName,
        phone: profilePhone,
        department: profileDept,
        organization: profileOrg
      });
      setCurrentUser((prev: any) => ({ ...prev, ...updated }));
      setIsEditingProfile(false);
      setProfileMsg({ type: 'success', text: 'Officer profile credentials updated successfully.' });
      setTimeout(() => setProfileMsg(null), 4000);
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  // 2. Toggle MFA
  const handleToggleMfa = async () => {
    try {
      const nextState = !currentUser?.mfaEnabled;
      const res = await api.toggleMfa(nextState);
      setCurrentUser((prev: any) => ({ ...prev, mfaEnabled: res.mfaEnabled }));
      loadSessionInfo();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle MFA state.');
    }
  };

  // 3. Face Enrollment Success
  const handleFaceSuccess = (faceEnrolledAt: string) => {
    setCurrentUser((prev: any) => ({
      ...prev,
      faceEnrolled: true,
      faceEnrolledAt
    }));
    loadSessionInfo();
  };

  // 4. Face Removal Action
  const promptRemoveFace = () => {
    setReauthConfig({
      title: 'Remove Biometric Face Verification',
      description: 'Are you sure you want to remove your enrolled facial verification credentials? You will need your account password to confirm this action.',
      actionLabel: 'Remove Biometric',
      onConfirm: async (password: string) => {
        await api.removeFace(password);
        setCurrentUser((prev: any) => ({
          ...prev,
          faceEnrolled: false,
          faceEnrolledAt: undefined
        }));
        loadSessionInfo();
      }
    });
    setIsReauthModalOpen(true);
  };

  // 5. Test Face Verification
  const handleTestFaceVerification = async () => {
    try {
      const res = await api.verifyFace();
      alert('Biometric Verification Successful! Signature verified against enrolled SHA-256 template.');
      loadSessionInfo();
    } catch (err: any) {
      alert(err.message || 'Biometric verification test failed.');
    }
  };

  // 6. Save Notification Preferences
  const handleToggleNotif = async (key: keyof typeof notifPrefs) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    try {
      await api.updateNotificationPreferences(updated);
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save notification preferences', err);
    }
  };

  // 7. Toggle Document View Mode
  const handleToggleDocView = (mode: 'list' | 'grid') => {
    setDocViewMode(mode);
    localStorage.setItem('nyayasetu_doc_view', mode);
  };

  // 8. Revoke Other Sessions
  const handleRevokeOtherSessions = async () => {
    try {
      setSessionActionMsg('Invalidating concurrent sessions...');
      const res = await api.revokeOtherSessions();
      setSessionActionMsg(res.message || 'All other active sessions have been terminated.');
      loadSessionInfo();
      setTimeout(() => setSessionActionMsg(null), 4000);
    } catch (err: any) {
      setSessionActionMsg(err.message || 'Failed to revoke other sessions.');
    }
  };

  // 9. Danger Zone: Deactivate Account
  const promptDeactivateAccount = () => {
    setReauthConfig({
      title: 'Deactivate Officer Account',
      description: 'Deactivating your account will immediately revoke all workstation session tokens, digital signature capabilities, and active investigation case assignments. Enter your password to confirm.',
      actionLabel: 'Deactivate Account',
      onConfirm: async (password: string) => {
        await api.deactivateAccount(password);
        logout();
      }
    });
    setIsReauthModalOpen(true);
  };

  // 10. Admin: Toggle User Status
  const handleAdminUserStatus = async (targetId: string, currentActive: boolean) => {
    try {
      setAdminActionMsg(null);
      await api.updateUserStatus(targetId, !currentActive);
      setUserList((prev) =>
        prev.map((u) => (u.id === targetId ? { ...u, isActive: !currentActive } : u))
      );
      setAdminActionMsg('User account status updated successfully.');
      setTimeout(() => setAdminActionMsg(null), 3000);
    } catch (err: any) {
      setAdminActionMsg(err.message || 'Failed to update user status.');
    }
  };

  // 11. Admin: Update User Role
  const handleAdminUserRole = async (targetId: string, newRole: string) => {
    try {
      setAdminActionMsg(null);
      await api.updateUserRole(targetId, newRole);
      setUserList((prev) =>
        prev.map((u) => (u.id === targetId ? { ...u, role: newRole as UserRole } : u))
      );
      setAdminActionMsg('User statutory role updated successfully.');
      setTimeout(() => setAdminActionMsg(null), 3000);
    } catch (err: any) {
      setAdminActionMsg(err.message || 'Failed to update user role.');
    }
  };

  // Browser & OS detection for Current Session
  const detectWorkstation = () => {
    const ua = navigator.userAgent;
    let browser = 'Chrome';
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Microsoft Edge';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';

    let os = 'Windows Workstation';
    if (ua.includes('Macintosh')) os = 'macOS Workstation';
    else if (ua.includes('Linux')) os = 'Linux Security Node';

    return { browser, os };
  };

  const workstation = detectWorkstation();

  // Navigation Items
  const navItems: { id: SettingsTab; label: string; number: string; icon: any; adminOnly?: boolean }[] = [
    { id: 'profile', label: 'Profile', number: '01', icon: UserIcon },
    { id: 'security', label: 'Security', number: '02', icon: ShieldCheck },
    { id: 'face', label: 'Face Verification', number: '03', icon: ScanFace },
    { id: 'notifications', label: 'Notifications', number: '04', icon: Bell },
    { id: 'documents', label: 'Documents', number: '05', icon: FileText },
    { id: 'evidence', label: 'Evidence & Integrity', number: '06', icon: Fingerprint },
    { id: 'sessions', label: 'Access & Sessions', number: '07', icon: MonitorSmartphone },
    { id: 'admin', label: 'System / Administration', number: '08', icon: Building2, adminOnly: true }
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto bg-[#FAFBFC] min-h-[calc(100vh-60px)]">
      {/* Institutional Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#D9E2E8] pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#EAF3F9] text-[#2F6FA3] flex items-center justify-center border border-[#2F6FA3]/20 shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-[#263746] tracking-tight">
              Settings & Security Console
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#EAF3F9] text-[#2F6FA3] border border-[#2F6FA3]/20 uppercase">
              {currentUser?.role?.replace('_', ' ') || 'OFFICER'}
            </span>
          </div>
          <p className="text-xs text-[#6B7C8C]">
            Manage officer identity, biometric verification, document security parameters, and cryptographic node integrity
          </p>
        </div>
      </div>

      {/* 2-Column Institutional Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation (3.5 cols) */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-[#D9E2E8] shadow-xs overflow-hidden">
            <div className="p-3 bg-[#F8FAFC] border-b border-[#D9E2E8] text-[10px] font-bold uppercase tracking-wider text-[#6B7C8C]">
              Configuration Categories
            </div>
            <nav className="p-1.5 space-y-0.5">
              {navItems.map((item) => {
                if (item.adminOnly && !isAdminOrSupervisor) return null;
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                      isActive
                        ? 'bg-[#EAF3F9] text-[#2F6FA3] font-semibold border border-[#2F6FA3]/20 shadow-xs'
                        : 'text-[#263746] hover:bg-[#F3F8FC] hover:text-[#2F6FA3]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-[#2F6FA3]' : 'text-[#6B7C8C]'}`}>
                        {item.number}
                      </span>
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#2F6FA3]' : 'text-[#6B7C8C]'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.adminOnly && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#F8F5ED] text-[#C9A45C] border border-[#C9A45C]/30 font-mono">
                        ADMIN
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Officer Identity Card Preview */}
          <div className="bg-[#F8F5ED] rounded-xl border border-[#C9A45C]/30 p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-[#C9A45C] font-semibold">
              <Shield className="w-4 h-4" />
              <span>Sovereign Identity Anchor</span>
            </div>
            <p className="text-[11px] text-[#6B7C8C] leading-relaxed">
              Certified under Section 65B of BSA, 2023. All authentication and signature actions are anchored to the immutable tamper-evident ledger.
            </p>
            <div className="pt-2 border-t border-[#C9A45C]/20 flex items-center justify-between font-mono text-[10px] text-[#263746]">
              <span>NODE: NYAYA-DL-01</span>
              <span className="text-emerald-700 font-bold">ONLINE</span>
            </div>
          </div>
        </div>

        {/* Right Selected Settings Panel (8.5 cols) */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* ======================================================== */}
          {/* 01 PROFILE PANEL */}
          {/* ======================================================== */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl border border-[#D9E2E8] shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-[#D9E2E8] bg-[#F8FAFC] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#263746] flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-[#2F6FA3]" />
                    Officer Identity & Profile Record
                  </h2>
                  <p className="text-[11px] text-[#6B7C8C]">Official service credentials and station deployment</p>
                </div>
                {!isEditingProfile ? (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-[#2F6FA3] bg-[#EAF3F9] hover:bg-[#d6e9f5] rounded-lg border border-[#2F6FA3]/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className="px-3 py-1.5 text-xs font-medium text-[#6B7C8C] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2F6FA3] hover:bg-[#255882] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>

              {profileMsg && (
                <div className={`m-6 p-3 rounded-lg border flex items-center gap-2 text-xs ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-[#FBEFEF] border-[#B85C5C]/30 text-[#B85C5C]'
                }`}>
                  {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{profileMsg.text}</span>
                </div>
              )}

              <div className="p-6 space-y-6">
                {/* Officer Avatar & Monogram */}
                <div className="flex items-center gap-4 pb-6 border-b border-[#D9E2E8]">
                  <div className="w-16 h-16 rounded-xl bg-[#2F6FA3] text-white flex items-center justify-center font-bold text-xl shadow-xs border-2 border-[#EAF3F9]">
                    {currentUser?.name
                      ? currentUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                      : 'NS'}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#263746]">{currentUser?.name || 'Officer'}</h3>
                    <p className="text-xs text-[#6B7C8C] capitalize">{currentUser?.role?.replace('_', ' ') || 'Investigator'}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        ACTIVE DEPLOYMENT
                      </span>
                      <span className="text-[10px] font-mono text-[#6B7C8C]">
                        ID: {currentUser?.agencyId || currentUser?.id}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-[#263746] mb-1">Full Legal Name</label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-[#D9E2E8] rounded-lg bg-[#FAFBFC] focus:outline-none focus:ring-1 focus:ring-[#2F6FA3]"
                      />
                    ) : (
                      <div className="text-xs text-[#263746] font-medium p-2.5 bg-[#FAFBFC] rounded-lg border border-[#D9E2E8]">
                        {currentUser?.name || 'Not provided'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#263746] mb-1">Officer Agency ID / Badge</label>
                    <div className="text-xs text-[#263746] font-mono p-2.5 bg-slate-100 rounded-lg border border-[#D9E2E8] flex items-center justify-between">
                      <span>{currentUser?.agencyId || currentUser?.badgeNumber || currentUser?.id}</span>
                      <span className="text-[10px] text-[#6B7C8C] font-sans">Immutable</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#263746] mb-1">Official Police Email</label>
                    <div className="text-xs text-[#263746] font-medium p-2.5 bg-slate-100 rounded-lg border border-[#D9E2E8] flex items-center justify-between">
                      <span>{currentUser?.email || 'officer@police.gov.in'}</span>
                      <span className="text-[10px] text-[#6B7C8C] font-sans">Verified</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#263746] mb-1">Official Mobile / Telecom</label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="+91 XXXXX XXXXX"
                        className="w-full text-xs px-3 py-2 border border-[#D9E2E8] rounded-lg bg-[#FAFBFC] focus:outline-none focus:ring-1 focus:ring-[#2F6FA3]"
                      />
                    ) : (
                      <div className="text-xs text-[#263746] font-medium p-2.5 bg-[#FAFBFC] rounded-lg border border-[#D9E2E8]">
                        {currentUser?.phone || '+91 98101 23456 (Verified Station Mobile)'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#263746] mb-1">Assigned Department</label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={profileDept}
                        onChange={(e) => setProfileDept(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-[#D9E2E8] rounded-lg bg-[#FAFBFC] focus:outline-none focus:ring-1 focus:ring-[#2F6FA3]"
                      />
                    ) : (
                      <div className="text-xs text-[#263746] font-medium p-2.5 bg-[#FAFBFC] rounded-lg border border-[#D9E2E8]">
                        {currentUser?.department || 'Crime Investigation Branch'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#263746] mb-1">Organization / Station</label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={profileOrg}
                        onChange={(e) => setProfileOrg(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-[#D9E2E8] rounded-lg bg-[#FAFBFC] focus:outline-none focus:ring-1 focus:ring-[#2F6FA3]"
                      />
                    ) : (
                      <div className="text-xs text-[#263746] font-medium p-2.5 bg-[#FAFBFC] rounded-lg border border-[#D9E2E8]">
                        {currentUser?.organization || 'Delhi Police'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#263746] mb-1">Judicial Jurisdiction</label>
                    <div className="text-xs text-[#263746] font-medium p-2.5 bg-slate-100 rounded-lg border border-[#D9E2E8] flex items-center justify-between">
                      <span>{currentUser?.jurisdiction || 'National Capital Territory of Delhi'}</span>
                      <span className="text-[10px] text-[#6B7C8C]">Statutory</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#263746] mb-1">Statutory Access Role</label>
                    <div className="text-xs text-[#263746] font-medium p-2.5 bg-slate-100 rounded-lg border border-[#D9E2E8] flex items-center justify-between">
                      <span className="font-bold text-[#2F6FA3] uppercase">{currentUser?.role?.replace('_', ' ')}</span>
                      <span className="text-[10px] text-[#6B7C8C]">Managed by Admin</span>
                    </div>
                  </div>
                </div>

                {/* Public Key Anchor */}
                <div className="pt-4 border-t border-[#D9E2E8] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#263746]">
                    <Key className="w-3.5 h-3.5 text-[#3B8C87]" />
                    <span>Section 3A IT Act Digital Signature Public Key</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#6B7C8C] bg-slate-50 p-2.5 rounded-lg border border-[#D9E2E8] break-all">
                    {currentUser?.publicKey || 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE7pLg9F4aYgA7e1N8wQ3+qVx5b2jKl8M0v6yR4c2eG8h2k9i0== (ECDSA P-256)'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 02 SECURITY PANEL */}
          {/* ======================================================== */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-xl border border-[#D9E2E8] shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-[#D9E2E8] bg-[#F8FAFC]">
                <h2 className="text-sm font-bold text-[#263746] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#2F6FA3]" />
                  Authentication & Account Security
                </h2>
                <p className="text-[11px] text-[#6B7C8C]">Password lifecycle, session tokens, and multi-factor authentication</p>
              </div>

              <div className="p-6 divide-y divide-[#D9E2E8] space-y-6">
                {/* Password Setting */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-[#263746]">Account Password</h3>
                    <p className="text-xs text-[#6B7C8C]">
                      Manage account password for secure officer authentication
                    </p>
                    <div className="text-[11px] text-[#6B7C8C] font-mono pt-1">
                      Last password change:{' '}
                      <span className="text-[#263746] font-semibold">
                        {currentUser?.passwordChangedAt
                          ? new Date(currentUser.passwordChangedAt).toLocaleString()
                          : 'Provisioning default (Change recommended)'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-[#2F6FA3] bg-[#EAF3F9] hover:bg-[#d6e9f5] rounded-lg border border-[#2F6FA3]/20 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Change Password
                  </button>
                </div>

                {/* Password Authentication */}
                <div className="pt-6 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-[#263746]">Password Authentication</h3>
                    <p className="text-xs text-[#6B7C8C]">
                      PBKDF2 SHA-256 password salting with cryptographic verification
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Enabled
                  </span>
                </div>

                {/* JWT / Session Security */}
                <div className="pt-6 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-[#263746]">JWT / Session Security</h3>
                    <p className="text-xs text-[#6B7C8C]">
                      Cryptographically signed 8-hour bearer access tokens with HMAC-SHA256
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active
                  </span>
                </div>

                {/* Account Lockout */}
                <div className="pt-6 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-[#263746]">Account Lockout Protection</h3>
                    <p className="text-xs text-[#6B7C8C]">
                      Automatic 15-minute workstation lockout triggered after 5 consecutive failed login attempts
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Enabled
                  </span>
                </div>

                {/* Multi-Factor Authentication (MFA) */}
                <div className="pt-6 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-[#263746]">Multi-Factor Authentication (MFA)</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F8F5ED] text-[#C9A45C] border border-[#C9A45C]/30 font-semibold">
                        PROTOTYPE TOTP
                      </span>
                    </div>
                    <p className="text-xs text-[#6B7C8C]">
                      Time-based 6-digit OTP challenge verification during officer sign-in (Demo OTP: 123456)
                    </p>
                    <div className="text-[11px] text-[#6B7C8C] pt-1">
                      Current status:{' '}
                      <span className={currentUser?.mfaEnabled ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                        {currentUser?.mfaEnabled ? '● Configured & Active' : '○ Not Configured'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleMfa}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer shrink-0 ${
                      currentUser?.mfaEnabled
                        ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        : 'bg-[#2F6FA3] text-white border-[#2F6FA3] hover:bg-[#255882]'
                    }`}
                  >
                    {currentUser?.mfaEnabled ? 'Disable MFA' : 'Configure MFA'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 03 FACE VERIFICATION PANEL */}
          {/* ======================================================== */}
          {activeTab === 'face' && (
            <div className="bg-white rounded-xl border border-[#D9E2E8] shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-[#D9E2E8] bg-[#F8FAFC]">
                <h2 className="text-sm font-bold text-[#263746] flex items-center gap-2">
                  <ScanFace className="w-4 h-4 text-[#2F6FA3]" />
                  Biometric Face Verification
                </h2>
                <p className="text-[11px] text-[#6B7C8C]">
                  High-security facial recognition check for critical evidence access and sign-in
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Status Box */}
                <div className="p-4 rounded-xl border border-[#D9E2E8] bg-[#FAFBFC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                      currentUser?.faceEnrolled
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      <ScanFace className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#263746]">Biometric Status:</span>
                        <span className={`text-xs font-semibold flex items-center gap-1 ${
                          currentUser?.faceEnrolled ? 'text-emerald-700' : 'text-slate-500'
                        }`}>
                          {currentUser?.faceEnrolled ? '● Enrolled' : '○ Not Enrolled'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B7C8C] mt-0.5">
                        {currentUser?.faceEnrolled && currentUser.faceEnrolledAt
                          ? `Last enrollment: ${new Date(currentUser.faceEnrolledAt).toLocaleString()}`
                          : 'No facial biometric template currently anchored to this profile'}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {currentUser?.faceEnrolled ? (
                      <>
                        <button
                          onClick={handleTestFaceVerification}
                          className="px-3 py-1.5 text-xs font-medium text-[#2F6FA3] bg-[#EAF3F9] hover:bg-[#d6e9f5] rounded-lg border border-[#2F6FA3]/20 transition-colors cursor-pointer"
                        >
                          Test Verification
                        </button>
                        <button
                          onClick={() => {
                            setIsFaceReenroll(true);
                            setIsFaceModalOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-[#2F6FA3] bg-[#EAF3F9] hover:bg-[#d6e9f5] rounded-lg border border-[#2F6FA3]/20 transition-colors cursor-pointer"
                        >
                          Re-enroll Face
                        </button>
                        <button
                          onClick={promptRemoveFace}
                          className="px-3 py-1.5 text-xs font-semibold text-[#B85C5C] bg-[#FBEFEF] hover:bg-[#f5dede] rounded-lg border border-[#B85C5C]/30 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove Face
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setIsFaceReenroll(false);
                          setIsFaceModalOpen(true);
                        }}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-[#2F6FA3] hover:bg-[#255882] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <ScanFace className="w-3.5 h-3.5" />
                        Enroll Face
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-[#263746] leading-relaxed">
                  Use face verification as an additional identity check during sign-in and when unsealing high-priority evidence files.
                </div>

                {/* Privacy & Compliance Card */}
                <div className="p-4 bg-[#F8F5ED] border border-[#C9A45C]/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#263746]">
                    <Shield className="w-4 h-4 text-[#C9A45C]" />
                    <span>Biometric Privacy & Legal Protection</span>
                  </div>
                  <p className="text-[11px] text-[#6B7C8C] leading-relaxed">
                    Face verification is used exclusively to verify your identity during sign-in. Biometric templates are cryptographically sealed with SHA-256 and are not displayed or transmitted to other officers or external networks.
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-[10px] font-mono text-[#6B7C8C]">
                    <span>Standard: ISO/IEC 19794-5</span>
                    <span>•</span>
                    <span>Storage: Cryptographic Template Digest</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 04 NOTIFICATIONS PANEL */}
          {/* ======================================================== */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl border border-[#D9E2E8] shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-[#D9E2E8] bg-[#F8FAFC] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#263746] flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#2F6FA3]" />
                    Notification & Alert Preferences
                  </h2>
                  <p className="text-[11px] text-[#6B7C8C]">Select which judicial events trigger workstation alerts</p>
                </div>
                {notifSaved && (
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Saved
                  </span>
                )}
              </div>

              <div className="p-6 space-y-6">
                {/* CASE ACTIVITY */}
                <div>
                  <h3 className="text-xs font-bold text-[#6B7C8C] uppercase tracking-wider mb-3">Case Activity</h3>
                  <div className="p-3 bg-[#FAFBFC] rounded-lg border border-[#D9E2E8]">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <span className="text-xs font-bold text-[#263746]">Case Updates & Filing Milestones</span>
                        <p className="text-[11px] text-[#6B7C8C]">Alerts when assigned cases change status or receive new filings</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifPrefs.caseActivity}
                        onChange={() => handleToggleNotif('caseActivity')}
                        className="w-4 h-4 rounded text-[#2F6FA3] focus:ring-[#2F6FA3] border-slate-300 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* EVIDENCE */}
                <div>
                  <h3 className="text-xs font-bold text-[#6B7C8C] uppercase tracking-wider mb-3">Evidence Integrity</h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-[#FAFBFC] rounded-lg border border-[#D9E2E8]">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-xs font-bold text-[#263746]">Evidence Custody Transfers</span>
                          <p className="text-[11px] text-[#6B7C8C]">Notifications when evidence items are moved or transferred</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifPrefs.evidenceCustody}
                          onChange={() => handleToggleNotif('evidenceCustody')}
                          className="w-4 h-4 rounded text-[#2F6FA3] focus:ring-[#2F6FA3] border-slate-300 cursor-pointer"
                        />
                      </label>
                    </div>

                    <div className="p-3 bg-[#FAFBFC] rounded-lg border border-[#D9E2E8]">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-xs font-bold text-[#263746]">Integrity Verification Alerts</span>
                          <p className="text-[11px] text-[#6B7C8C]">Critical notices if any hash discrepancy or tamper is detected</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifPrefs.integrityAlerts}
                          onChange={() => handleToggleNotif('integrityAlerts')}
                          className="w-4 h-4 rounded text-[#2F6FA3] focus:ring-[#2F6FA3] border-slate-300 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* DOCUMENTS */}
                <div>
                  <h3 className="text-xs font-bold text-[#6B7C8C] uppercase tracking-wider mb-3">Documents & Reviews</h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-[#FAFBFC] rounded-lg border border-[#D9E2E8]">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-xs font-bold text-[#263746]">Document Sharing Activity</span>
                          <p className="text-[11px] text-[#6B7C8C]">Alerts when documents are shared across agency boundaries</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifPrefs.documentSharing}
                          onChange={() => handleToggleNotif('documentSharing')}
                          className="w-4 h-4 rounded text-[#2F6FA3] focus:ring-[#2F6FA3] border-slate-300 cursor-pointer"
                        />
                      </label>
                    </div>

                    <div className="p-3 bg-[#FAFBFC] rounded-lg border border-[#D9E2E8]">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-xs font-bold text-[#263746]">Document Review Requests</span>
                          <p className="text-[11px] text-[#6B7C8C]">Notices when supervisory review or signature is requested</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifPrefs.documentReviews}
                          onChange={() => handleToggleNotif('documentReviews')}
                          className="w-4 h-4 rounded text-[#2F6FA3] focus:ring-[#2F6FA3] border-slate-300 cursor-pointer"
                        />
                      </label>
                    </div>

                    <div className="p-3 bg-[#FAFBFC] rounded-lg border border-[#D9E2E8]">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-xs font-bold text-[#263746]">Document Verification Alerts</span>
                          <p className="text-[11px] text-[#6B7C8C]">Alerts when legal documents are cryptographically verified</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifPrefs.documentAlerts}
                          onChange={() => handleToggleNotif('documentAlerts')}
                          className="w-4 h-4 rounded text-[#2F6FA3] focus:ring-[#2F6FA3] border-slate-300 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* SECURITY */}
                <div>
                  <h3 className="text-xs font-bold text-[#6B7C8C] uppercase tracking-wider mb-3">Security & Gateway</h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-[#FAFBFC] rounded-lg border border-[#D9E2E8]">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-xs font-bold text-[#263746]">Failed Login Attempts</span>
                          <p className="text-[11px] text-[#6B7C8C]">Alerts on incorrect password attempts against your account</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifPrefs.failedLogins}
                          onChange={() => handleToggleNotif('failedLogins')}
                          className="w-4 h-4 rounded text-[#2F6FA3] focus:ring-[#2F6FA3] border-slate-300 cursor-pointer"
                        />
                      </label>
                    </div>

                    <div className="p-3 bg-[#FAFBFC] rounded-lg border border-[#D9E2E8]">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-xs font-bold text-[#263746]">Face Verification Failures</span>
                          <p className="text-[11px] text-[#6B7C8C]">Alerts when a biometric match attempt fails</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifPrefs.faceFailures}
                          onChange={() => handleToggleNotif('faceFailures')}
                          className="w-4 h-4 rounded text-[#2F6FA3] focus:ring-[#2F6FA3] border-slate-300 cursor-pointer"
                        />
                      </label>
                    </div>

                    <div className="p-3 bg-[#FAFBFC] rounded-lg border border-[#D9E2E8]">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-xs font-bold text-[#263746]">Suspicious Access Telemetry</span>
                          <p className="text-[11px] text-[#6B7C8C]">Alerts on logins from unknown workstations or IPs</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifPrefs.suspiciousAccess}
                          onChange={() => handleToggleNotif('suspiciousAccess')}
                          className="w-4 h-4 rounded text-[#2F6FA3] focus:ring-[#2F6FA3] border-slate-300 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 05 DOCUMENTS PANEL */}
          {/* ======================================================== */}
          {activeTab === 'documents' && (
            <div className="bg-white rounded-xl border border-[#D9E2E8] shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-[#D9E2E8] bg-[#F8FAFC]">
                <h2 className="text-sm font-bold text-[#263746] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#2F6FA3]" />
                  Document Management Parameters
                </h2>
                <p className="text-[11px] text-[#6B7C8C]">Statutory rules for legal document handling and workstation preferences</p>
              </div>

              <div className="p-6 divide-y divide-[#D9E2E8] space-y-6">
                {/* Default Document View */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-[#263746]">Default Document View</h3>
                    <p className="text-xs text-[#6B7C8C]">Select preferred docket layout style for documents repository</p>
                  </div>
                  <div className="flex items-center bg-[#FAFBFC] border border-[#D9E2E8] rounded-lg p-0.5">
                    <button
                      onClick={() => handleToggleDocView('list')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        docViewMode === 'list'
                          ? 'bg-[#2F6FA3] text-white shadow-xs'
                          : 'text-[#6B7C8C] hover:text-[#263746]'
                      }`}
                    >
                      List View
                    </button>
                    <button
                      onClick={() => handleToggleDocView('grid')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        docViewMode === 'grid'
                          ? 'bg-[#2F6FA3] text-white shadow-xs'
                          : 'text-[#6B7C8C] hover:text-[#263746]'
                      }`}
                    >
                      Grid View
                    </button>
                  </div>
                </div>

                {/* Document Verification */}
                <div className="pt-6 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-[#263746]">Document Integrity Verification</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                        SECTION 63 BSA COMPLIANT
                      </span>
                    </div>
                    <p className="text-xs text-[#6B7C8C]">
                      Enforces cryptographic SHA-256 verification against the immutable file ledger upon every document download
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-[#6B7C8C] bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    System controlled
                  </span>
                </div>

                {/* Document Versioning */}
                <div className="pt-6 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-[#263746]">Append-Only Document Versioning</h3>
                    <p className="text-xs text-[#6B7C8C]">
                      Preserves all previous versions of court filings and chargesheets with independent cryptographic seals
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-[#6B7C8C] bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    System controlled
                  </span>
                </div>

                {/* Secure Document Downloads */}
                <div className="pt-6 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-[#263746]">Secure Document Downloads & Watermarking</h3>
                    <p className="text-xs text-[#6B7C8C]">
                      Automatically embeds officer name, timestamp, and verification hash into exported PDF copies
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-[#6B7C8C] bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    Enabled by administrator
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 06 EVIDENCE & INTEGRITY PANEL */}
          {/* ======================================================== */}
          {activeTab === 'evidence' && (
            <div className="bg-white rounded-xl border border-[#D9E2E8] shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-[#D9E2E8] bg-[#F8FAFC]">
                <h2 className="text-sm font-bold text-[#263746] flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-[#2F6FA3]" />
                  Evidence Security & Sovereign Cryptographic Ledger
                </h2>
                <p className="text-[11px] text-[#6B7C8C]">
                  Evidentiary custody validation under the Bharatiya Sakshya Adhiniyam, 2023
                </p>
              </div>

              <div className="p-6 divide-y divide-[#D9E2E8] space-y-6">
                {/* Status items */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-[#FAFBFC] border border-[#D9E2E8] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#263746]">SHA-256 Hash Verification</span>
                      <p className="text-[11px] text-[#6B7C8C]">Continuous cryptographic checksum validation</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                      ✓ Enabled
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#FAFBFC] border border-[#D9E2E8] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#263746]">Evidence Integrity Engine</span>
                      <p className="text-[11px] text-[#6B7C8C]">Tamper detection with ledger proof verification</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                      ✓ Enabled
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#FAFBFC] border border-[#D9E2E8] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#263746]">ECDSA Digital Signatures</span>
                      <p className="text-[11px] text-[#6B7C8C]">Section 3A Information Technology Act</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                      ✓ Configured
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#FAFBFC] border border-[#D9E2E8] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#263746]">Chain of Custody Ledger</span>
                      <p className="text-[11px] text-[#6B7C8C]">Append-only physical & digital exhibit transfers</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                      ✓ Enabled
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#FAFBFC] border border-[#D9E2E8] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#263746]">Merkle Block Hash Chain</span>
                      <p className="text-[11px] text-[#6B7C8C]">Cryptographic parent-hash ledger anchoring</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                      ✓ Enabled
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#FAFBFC] border border-[#D9E2E8] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#263746]">Section 65B Certificate Generator</span>
                      <p className="text-[11px] text-[#6B7C8C]">Court-admissible electronic record certificates</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                      ✓ Active
                    </span>
                  </div>
                </div>

                {/* Relevant Operational Actions */}
                <div className="pt-6 space-y-3">
                  <h3 className="text-xs font-bold text-[#263746]">Relevant Forensic Actions</h3>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={() => onNavigateTab ? onNavigateTab('integrity') : window.location.assign('#/integrity')}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-[#2F6FA3] hover:bg-[#255882] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verify Integrity Center
                    </button>
                    <button
                      onClick={() => onNavigateTab ? onNavigateTab('audit') : window.location.assign('#/audit')}
                      className="px-3.5 py-2 text-xs font-semibold text-[#2F6FA3] bg-[#EAF3F9] hover:bg-[#d6e9f5] rounded-lg border border-[#2F6FA3]/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View Audit Trail
                    </button>
                    <button
                      onClick={() => onNavigateTab ? onNavigateTab('evidence') : window.location.assign('#/evidence')}
                      className="px-3.5 py-2 text-xs font-semibold text-[#2F6FA3] bg-[#EAF3F9] hover:bg-[#d6e9f5] rounded-lg border border-[#2F6FA3]/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Fingerprint className="w-3.5 h-3.5" />
                      View Chain of Custody
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 07 ACCESS & SESSIONS PANEL */}
          {/* ======================================================== */}
          {activeTab === 'sessions' && (
            <div className="bg-white rounded-xl border border-[#D9E2E8] shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-[#D9E2E8] bg-[#F8FAFC]">
                <h2 className="text-sm font-bold text-[#263746] flex items-center gap-2">
                  <MonitorSmartphone className="w-4 h-4 text-[#2F6FA3]" />
                  Access Telemetry & Active Sessions
                </h2>
                <p className="text-[11px] text-[#6B7C8C]">Workstation connections and security events from the audit log</p>
              </div>

              <div className="p-6 space-y-6">
                {sessionActionMsg && (
                  <div className="p-3 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{sessionActionMsg}</span>
                  </div>
                )}

                {/* CURRENT SESSION CARD */}
                <div>
                  <h3 className="text-xs font-bold text-[#6B7C8C] uppercase tracking-wider mb-3">Current Active Session</h3>
                  <div className="p-4 bg-[#FAFBFC] border border-[#D9E2E8] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#EAF3F9] text-[#2F6FA3] flex items-center justify-center border border-[#2F6FA3]/20">
                        <Laptop className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#263746]">{workstation.browser} on {workstation.os}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                            ACTIVE NOW
                          </span>
                        </div>
                        <div className="text-[11px] text-[#6B7C8C] font-mono mt-0.5 flex items-center gap-2">
                          <span>IP: {sessionInfo?.currentSession?.ip || '127.0.0.1 (Local Workstation)'}</span>
                          <span>•</span>
                          <span>Auth: {sessionInfo?.currentSession?.authMethod || 'Password'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleRevokeOtherSessions}
                      className="px-3.5 py-1.5 text-xs font-semibold text-[#B85C5C] bg-[#FBEFEF] hover:bg-[#f5dede] rounded-lg border border-[#B85C5C]/30 transition-colors cursor-pointer shrink-0"
                    >
                      Sign Out Other Sessions
                    </button>
                  </div>
                </div>

                {/* SECURITY EVENTS TABLE (ACTUAL AUDIT DATA) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#6B7C8C] uppercase tracking-wider">
                      Recent Security Events (Audit Log)
                    </h3>
                    <button
                      onClick={loadSessionInfo}
                      className="text-xs text-[#2F6FA3] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingSession ? 'animate-spin' : ''}`} />
                      Refresh Log
                    </button>
                  </div>

                  <div className="border border-[#D9E2E8] rounded-xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      {sessionInfo?.securityEvents && sessionInfo.securityEvents.length > 0 ? (
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#F8FAFC] border-b border-[#D9E2E8] text-[#6B7C8C] font-semibold">
                            <tr>
                              <th className="px-4 py-2 font-mono">Timestamp</th>
                              <th className="px-4 py-2">Action</th>
                              <th className="px-4 py-2">Details</th>
                              <th className="px-4 py-2 text-right">Outcome</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#D9E2E8]">
                            {sessionInfo.securityEvents.map((evt, idx) => (
                              <tr key={evt.id || idx} className="hover:bg-slate-50">
                                <td className="px-4 py-2.5 font-mono text-[11px] text-[#6B7C8C] whitespace-nowrap">
                                  {new Date(evt.timestamp).toLocaleString()}
                                </td>
                                <td className="px-4 py-2.5 font-bold text-[#263746]">
                                  {evt.action}
                                </td>
                                <td className="px-4 py-2.5 text-[#6B7C8C] text-[11px] max-w-xs truncate">
                                  {evt.details}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                                    evt.outcome === 'SUCCESS'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-[#FBEFEF] text-[#B85C5C] border border-[#B85C5C]/30'
                                  }`}>
                                    {evt.outcome}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-8 text-center text-xs text-[#6B7C8C]">
                          No security events recorded in current audit interval.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 08 SYSTEM / ADMINISTRATION PANEL (ADMIN / SUPERVISOR ONLY) */}
          {/* ======================================================== */}
          {activeTab === 'admin' && isAdminOrSupervisor && (
            <div className="bg-white rounded-xl border border-[#D9E2E8] shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-[#D9E2E8] bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-[#263746] flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#2F6FA3]" />
                    System Administration & Judicial Infrastructure
                  </h2>
                  <p className="text-[11px] text-[#6B7C8C]">Station user management, cryptographic node health, and database engine</p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-[#F8F5ED] text-[#C9A45C] border border-[#C9A45C]/30 uppercase">
                  AUTHORIZED CONSOLE
                </span>
              </div>

              {/* Sub-tabs for Admin Console */}
              <div className="border-b border-[#D9E2E8] px-6 flex gap-2 text-xs font-semibold overflow-x-auto">
                <button
                  onClick={() => setAdminSubTab('users')}
                  className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    adminSubTab === 'users'
                      ? 'border-[#2F6FA3] text-[#2F6FA3]'
                      : 'border-transparent text-[#6B7C8C] hover:text-[#263746]'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>User Management</span>
                </button>
                <button
                  onClick={() => setAdminSubTab('security')}
                  className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    adminSubTab === 'security'
                      ? 'border-[#2F6FA3] text-[#2F6FA3]'
                      : 'border-transparent text-[#6B7C8C] hover:text-[#263746]'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Node Security Telemetry</span>
                </button>
                <button
                  onClick={() => setAdminSubTab('database')}
                  className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    adminSubTab === 'database'
                      ? 'border-[#2F6FA3] text-[#2F6FA3]'
                      : 'border-transparent text-[#6B7C8C] hover:text-[#263746]'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Database & Storage</span>
                </button>
                <button
                  onClick={() => setAdminSubTab('assets')}
                  className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    adminSubTab === 'assets'
                      ? 'border-[#2F6FA3] text-[#2F6FA3]'
                      : 'border-transparent text-[#6B7C8C] hover:text-[#263746]'
                  }`}
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  <span>Police Asset Register</span>
                </button>
                <button
                  onClick={() => setAdminSubTab('sharing')}
                  className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    adminSubTab === 'sharing'
                      ? 'border-[#2F6FA3] text-[#2F6FA3]'
                      : 'border-transparent text-[#6B7C8C] hover:text-[#263746]'
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Inter-Agency Sharing</span>
                </button>
              </div>

              {/* Sub-tab content */}
              <div>
                {adminSubTab === 'users' && (
                  <div className="p-6 space-y-4">
                    {adminActionMsg && (
                      <div className="p-3 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{adminActionMsg}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#263746]">
                        Officer & Staff Directory ({userList.length} Accounts)
                      </span>
                      <button
                        onClick={loadUserList}
                        className="text-xs text-[#2F6FA3] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <RefreshCw className={`w-3 h-3 ${loadingUsers ? 'animate-spin' : ''}`} />
                        Refresh Directory
                      </button>
                    </div>

                    <div className="border border-[#D9E2E8] rounded-xl overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#F8FAFC] border-b border-[#D9E2E8] text-[#6B7C8C] font-semibold sticky top-0">
                            <tr>
                              <th className="px-4 py-2.5">Officer Name</th>
                              <th className="px-4 py-2.5 font-mono">ID / Agency</th>
                              <th className="px-4 py-2.5">Role</th>
                              <th className="px-4 py-2.5">Department</th>
                              <th className="px-4 py-2.5 text-center">Status</th>
                              <th className="px-4 py-2.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#D9E2E8]">
                            {userList.map((u) => (
                              <tr key={u.id} className="hover:bg-slate-50">
                                <td className="px-4 py-2.5 font-bold text-[#263746] whitespace-nowrap">
                                  {u.name}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-[11px] text-[#6B7C8C]">
                                  {u.agencyId || u.id}
                                </td>
                                <td className="px-4 py-2.5">
                                  {currentUser?.role === 'admin' ? (
                                    <select
                                      value={u.role}
                                      onChange={(e) => handleAdminUserRole(u.id, e.target.value)}
                                      className="text-xs py-1 px-2 border border-[#D9E2E8] rounded bg-white font-medium"
                                    >
                                      <option value="investigating_officer">Investigating Officer</option>
                                      <option value="supervisor">Supervisor / SHO</option>
                                      <option value="prosecutor">Prosecutor</option>
                                      <option value="judge">Judge / Magistrate</option>
                                      <option value="forensic_officer">Forensic Officer</option>
                                      <option value="auditor">Auditor</option>
                                      <option value="admin">Administrator</option>
                                    </select>
                                  ) : (
                                    <span className="font-semibold capitalize text-[#2F6FA3]">
                                      {u.role.replace('_', ' ')}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-[#6B7C8C] text-[11px]">
                                  {u.department}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                                    u.isActive
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-[#FBEFEF] text-[#B85C5C] border border-[#B85C5C]/30'
                                  }`}>
                                    {u.isActive ? 'ACTIVE' : 'LOCKED'}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <button
                                    onClick={() => handleAdminUserStatus(u.id, u.isActive)}
                                    className={`px-2.5 py-1 text-[11px] font-semibold rounded border cursor-pointer ${
                                      u.isActive
                                        ? 'text-[#B85C5C] bg-[#FBEFEF] border-[#B85C5C]/30 hover:bg-[#f5dede]'
                                        : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                    }`}
                                  >
                                    {u.isActive ? 'Deactivate' : 'Activate'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {adminSubTab === 'security' && (
                  <div className="p-4">
                    <SystemSecurity />
                  </div>
                )}

                {adminSubTab === 'database' && (
                  <div className="p-4">
                    <DatabaseSettings />
                  </div>
                )}

                {adminSubTab === 'assets' && (
                  <div className="p-4">
                    <AssetRegister />
                  </div>
                )}

                {adminSubTab === 'sharing' && (
                  <div className="p-4">
                    <Sharing />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* DANGER ZONE (CLEARLY SEPARATED SECTION) */}
          {/* ======================================================== */}
          <div className="bg-[#FBEFEF] rounded-xl border border-[#B85C5C]/30 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#B85C5C]/20 bg-[#FBEFEF] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-white text-[#B85C5C] flex items-center justify-center border border-[#B85C5C]/30 shadow-xs">
                  <TriangleAlert className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-[#B85C5C] uppercase tracking-wider">
                  Danger Zone
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#B85C5C]">
                Irreversible Security Actions
              </span>
            </div>

            <div className="p-6 divide-y divide-[#B85C5C]/20 space-y-4">
              {/* Sign out all sessions */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-[#263746]">Sign Out All Concurrent Sessions</h4>
                  <p className="text-[11px] text-[#6B7C8C]">
                    Immediately invalidates all active session tokens across other workstations
                  </p>
                </div>
                <button
                  onClick={handleRevokeOtherSessions}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#B85C5C] bg-white hover:bg-red-50 rounded-lg border border-[#B85C5C]/40 transition-colors cursor-pointer shrink-0"
                >
                  Terminate Sessions
                </button>
              </div>

              {/* Remove face verification */}
              {currentUser?.faceEnrolled && (
                <div className="pt-4 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-[#263746]">Remove Face Verification Biometrics</h4>
                    <p className="text-[11px] text-[#6B7C8C]">
                      Requires password verification. Removes the stored biometric template digest
                    </p>
                  </div>
                  <button
                    onClick={promptRemoveFace}
                    className="px-3.5 py-1.5 text-xs font-semibold text-[#B85C5C] bg-white hover:bg-red-50 rounded-lg border border-[#B85C5C]/40 transition-colors cursor-pointer shrink-0"
                  >
                    Remove Face Biometric
                  </button>
                </div>
              )}

              {/* Deactivate account */}
              <div className="pt-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-[#263746]">Deactivate Officer Account</h4>
                  <p className="text-[11px] text-[#6B7C8C]">
                    Revokes access and locks account until reactivated by a Station Administrator
                  </p>
                </div>
                <button
                  onClick={promptDeactivateAccount}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#B85C5C] hover:bg-[#a34f4f] rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  Deactivate Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={(passwordChangedAt) => {
          setCurrentUser((prev: any) => ({ ...prev, passwordChangedAt }));
          loadSessionInfo();
        }}
      />

      <FaceVerificationModal
        isOpen={isFaceModalOpen}
        isReenroll={isFaceReenroll}
        onClose={() => setIsFaceModalOpen(false)}
        onSuccess={handleFaceSuccess}
      />

      {reauthConfig && (
        <ReauthPasswordModal
          isOpen={isReauthModalOpen}
          title={reauthConfig.title}
          description={reauthConfig.description}
          actionButtonLabel={reauthConfig.actionLabel}
          onClose={() => {
            setIsReauthModalOpen(false);
            setReauthConfig(null);
          }}
          onConfirm={reauthConfig.onConfirm}
        />
      )}
    </div>
  );
};
