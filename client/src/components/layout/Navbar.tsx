import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import {
  LogOut,
  UserCheck,
  Shield,
  ChevronDown,
  Search,
  Command,
  PanelLeftClose,
  PanelLeftOpen,
  Check
} from 'lucide-react';
import { UserRole } from '../../types.js';
import { NotificationPopover } from '../ui/NotificationPopover.js';

interface NavbarProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onOpenCommandPalette?: () => void;
  onNavigateTab?: (tab: string, extraId?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isSidebarOpen = true,
  onToggleSidebar,
  onOpenCommandPalette,
  onNavigateTab
}) => {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] shadow-xs">
      {/* Subtle National Micro-Strip */}
      <div className="gov-tricolor-strip" />

      {/* Main Bar */}
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Sidebar Toggle + Government Identity */}
        <div className="flex items-center gap-3 shrink-0">
          {user && onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-btn border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F4F7] text-[#64748B] hover:text-[#172033] transition-colors cursor-pointer"
              title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-label="Toggle Sidebar"
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4 text-[#167D8D]" />
              )}
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#12355B] text-white flex items-center justify-center font-bold text-xs font-mono tracking-tight shrink-0">
              NA
            </div>
            <div>
              <div className="text-[11px] font-bold text-[#12355B] tracking-tight leading-tight flex items-center gap-1">
                <span>NYAYASETU AI</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#E8F5F6] text-[#167D8D] font-mono font-semibold">SIH26190</span>
              </div>
              <div className="text-[10px] text-[#64748B] leading-tight">
                Government of India • Ministry of Home Affairs
              </div>
            </div>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        {user && onOpenCommandPalette && (
          <div className="flex-1 max-w-xl mx-2 hidden md:block">
            <button
              onClick={onOpenCommandPalette}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-btn bg-[#F6F8FA] hover:bg-[#F1F4F7] border border-[#E2E8F0] text-[#64748B] hover:text-[#172033] transition-colors text-xs cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span className="truncate">
                  Search cases, FIRs, evidence, documents, persons...
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] bg-white px-1.5 py-0.5 rounded border border-[#E2E8F0] font-mono text-[#64748B]">
                <Command className="w-3 h-3" />
                <span>K</span>
              </div>
            </button>
          </div>
        )}

        {/* Right: Notifications & Officer Profile */}
        {user && (
          <div className="flex items-center gap-3 shrink-0">
            <NotificationPopover onNavigate={onNavigateTab} />

            {/* Officer Profile & Clearance Info (Role Locked to Login Session) */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-btn border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs text-[#172033] cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-[#12355B] text-white flex items-center justify-center font-bold text-[10px]">
                  {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="text-left hidden sm:block leading-tight">
                  <div className="font-semibold text-[#172033] truncate max-w-[130px]">{user.name}</div>
                  <div className="text-[10px] text-[#167D8D] font-medium capitalize">{user.role.replace(/_/g, ' ')}</div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-1.5 w-72 rounded-modal bg-white border border-[#E2E8F0] shadow-modal z-50 p-3 space-y-3">
                  {/* Header info */}
                  <div className="flex items-start gap-2.5 pb-2.5 border-b border-[#F1F4F7]">
                    <div className="w-9 h-9 rounded-full bg-[#12355B] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-[#172033] truncate">{user.name}</div>
                      <div className="text-[11px] text-[#167D8D] font-semibold capitalize">
                        {user.role.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[10px] text-[#64748B] font-mono truncate mt-0.5">
                        ID: {user.agencyId}
                      </div>
                    </div>
                  </div>

                  {/* Official Credentials Details */}
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between py-0.5 text-[#64748B]">
                      <span>Department:</span>
                      <span className="font-medium text-[#172033] text-right truncate max-w-[150px]">{user.department}</span>
                    </div>
                    <div className="flex justify-between py-0.5 text-[#64748B]">
                      <span>Organization:</span>
                      <span className="font-medium text-[#172033] text-right truncate max-w-[150px]">{user.organization}</span>
                    </div>
                    {user.badgeNumber && (
                      <div className="flex justify-between py-0.5 text-[#64748B]">
                        <span>Badge No:</span>
                        <span className="font-mono font-bold text-[#12355B]">{user.badgeNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-0.5 text-[#64748B]">
                      <span>Jurisdiction:</span>
                      <span className="font-medium text-[#172033] text-right truncate max-w-[150px]">{user.jurisdiction}</span>
                    </div>
                  </div>

                  {/* Security Clearance Status */}
                  <div className="p-2 rounded bg-[#E8F5F6] border border-[#C5E6EA] text-[10px] space-y-0.5">
                    <div className="font-bold text-[#12355B] flex items-center gap-1">
                      <Shield className="w-3 h-3 text-[#167D8D]" />
                      <span>Security Clearance Locked</span>
                    </div>
                    <p className="text-[#64748B] leading-tight">
                      Session is strictly bound to verified officer credentials. To change role, sign out and re-authenticate.
                    </p>
                  </div>

                  {/* Sign Out Button */}
                  <div className="pt-1 border-t border-[#F1F4F7]">
                    <button
                      onClick={logout}
                      className="w-full text-left px-2.5 py-2 rounded-btn text-xs font-semibold text-[#C53D3D] hover:bg-[#FDF2F2] flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out of Platform</span>
                      </span>
                      <span className="text-[10px] font-mono text-[#94A3B8]">Terminate Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
