import React, { useState } from 'react';
import { X, TriangleAlert, Lock, AlertCircle } from 'lucide-react';

interface ReauthPasswordModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  actionButtonLabel: string;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
}

export const ReauthPasswordModal: React.FC<ReauthPasswordModalProps> = ({
  isOpen,
  title,
  description,
  actionButtonLabel,
  onClose,
  onConfirm
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('Password is required to confirm this critical security action.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm(password);
      setPassword('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Action failed. Please check your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-xl border border-[#D9E2E8] w-full max-w-md overflow-hidden">
        {/* Header with muted red accent */}
        <div className="px-5 py-4 border-b border-[#D9E2E8] bg-[#FBEFEF] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white text-[#B85C5C] flex items-center justify-center border border-[#B85C5C]/30 shadow-xs">
              <TriangleAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#263746]">{title}</h2>
              <p className="text-[11px] text-[#B85C5C]">Re-authentication required</p>
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
          <p className="text-xs text-[#6B7C8C] leading-relaxed">
            {description}
          </p>

          {error && (
            <div className="p-3 bg-[#FBEFEF] border border-[#B85C5C]/30 rounded-lg flex items-start gap-2.5 text-xs text-[#B85C5C]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#263746] mb-1">
              Account Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to authenticate"
                className="w-full text-xs px-3 py-2 border border-[#D9E2E8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B85C5C] focus:border-[#B85C5C] bg-[#FAFBFC]"
                autoFocus
              />
            </div>
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
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#B85C5C] hover:bg-[#a34f4f] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              {isSubmitting ? 'Verifying...' : actionButtonLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
