import React, { useState } from 'react';
import { X, Lock, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client.js';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (passwordChangedAt: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError('Please provide your current account password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match. Please re-enter.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.changePassword(currentPassword, newPassword);
      if (res.success) {
        onSuccess(res.passwordChangedAt || new Date().toISOString());
        onClose();
      } else {
        setError(res.error || 'Failed to change password.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during password change.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-xl border border-[#D9E2E8] w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#D9E2E8] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EAF3F9] text-[#2F6FA3] flex items-center justify-center border border-[#2F6FA3]/20">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#263746]">Change Account Password</h2>
              <p className="text-[11px] text-[#6B7C8C]">Authenticate with current credentials to set new password</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-[#FBEFEF] border border-[#B85C5C]/30 rounded-lg flex items-start gap-2.5 text-xs text-[#B85C5C]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#263746] mb-1">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full text-xs px-3 py-2 pr-9 border border-[#D9E2E8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F6FA3] focus:border-[#2F6FA3] bg-[#FAFBFC]"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#263746] mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full text-xs px-3 py-2 pr-9 border border-[#D9E2E8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F6FA3] focus:border-[#2F6FA3] bg-[#FAFBFC]"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-[#6B7C8C] mt-1 font-mono">
              Must include letters, numbers & symbols for institutional compliance
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#263746] mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full text-xs px-3 py-2 border border-[#D9E2E8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F6FA3] focus:border-[#2F6FA3] bg-[#FAFBFC]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#D9E2E8]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-[#6B7C8C] hover:text-[#263746] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#2F6FA3] hover:bg-[#255882] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
