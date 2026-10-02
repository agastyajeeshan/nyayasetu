import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Restrained Backdrop */}
      <div 
        className="fixed inset-0 bg-[#0f172a]/40 backdrop-blur-xs transition-opacity duration-150" 
        onClick={onClose}
      />

      {/* Modal Card (10px radius) */}
      <div className={`relative w-full ${maxWidth} bg-white border border-[#D8E1E8] rounded-[10px] shadow-xl z-10 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#D8E1E8] bg-[#F8FAFC]">
          <div>
            <h3 className="text-sm font-bold text-[#182631] flex items-center gap-2">
              {title}
            </h3>
            {subtitle && <p className="text-[11px] text-[#526372] mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#687887] hover:text-[#182631] hover:bg-[#E2E8F0] rounded-[4px] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 text-[#182631] bg-white max-h-[80vh] overflow-y-auto text-xs">
          {children}
        </div>
      </div>
    </div>
  );
};
