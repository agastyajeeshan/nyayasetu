import React from 'react';
import {
  Home,
  FolderKanban,
  FileText,
  Shield,
  Search,
  Sparkles,
  FileSpreadsheet,
  Clock,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  allowedRoles?: string[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  currentTab,
  onSelectTab
}) => {
  const { user, logout } = useAuth();

  const mainItems: NavItem[] = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'cases', label: 'Cases', icon: FolderKanban },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'evidence', label: 'Evidence', icon: Shield },
    { id: 'search', label: 'Search', icon: Search },
  ];

  const intelligenceItems: NavItem[] = [
    { id: 'investigation', label: 'Investigation', icon: Sparkles },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
  ];

  const systemItems: NavItem[] = [
    { id: 'integrity', label: 'Integrity Center', icon: ShieldCheck },
    { id: 'audit', label: 'Audit Log', icon: Clock, allowedRoles: ['admin', 'auditor', 'supervisor', 'judge'] },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="space-y-0.5">
      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
        {title}
      </div>
      {items.map((item) => {
        if (item.allowedRoles && user && !item.allowedRoles.includes(user.role) && user.role !== 'admin') {
          return null;
        }

        const Icon = item.icon;
        const isActive = currentTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-btn text-xs transition-colors cursor-pointer text-left relative ${
              isActive
                ? 'bg-[#E8F5F6] text-[#12355B] font-semibold'
                : 'text-[#172033] hover:bg-[#F6F8FA] hover:text-[#0B2545]'
            }`}
          >
            {/* Small left indicator */}
            {isActive && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-[#167D8D]" />
            )}
            <Icon 
              className={`w-4 h-4 shrink-0 transition-colors ${
                isActive ? 'text-[#167D8D]' : 'text-[#64748B]'
              }`} 
            />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <aside
      className={`bg-white border-r border-[#E2E8F0] flex flex-col justify-between shrink-0 select-none min-h-[calc(100vh-53px)] transition-all duration-200 ease-in-out z-30 ${
        isOpen
          ? 'w-60 max-w-[240px] opacity-100 translate-x-0'
          : 'w-0 max-w-0 opacity-0 -translate-x-full overflow-hidden p-0 border-r-0 pointer-events-none'
      }`}
    >
      {/* Platform Branding Header */}
      <div>
        <div className="px-4 py-3 border-b border-[#F1F4F7]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#12355B] text-white flex items-center justify-center font-bold text-[10px] tracking-tight shrink-0">
              NA
            </div>
            <div>
              <div className="text-xs font-extrabold text-[#12355B] tracking-tight flex items-center gap-1">
                <span>NYAYASETU</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-[#E8F5F6] text-[#167D8D] font-mono">AI</span>
              </div>
              <div className="text-[10px] text-[#64748B] font-medium leading-tight">
                Case Intelligence & DMS
              </div>
            </div>
          </div>
          <div className="mt-1.5 text-[9px] text-[#94A3B8] font-mono flex items-center justify-between">
            <span>SIH26190</span>
            <span className="text-[#16805C] font-semibold">SEC 65B READY</span>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="p-2 space-y-4 overflow-y-auto">
          {renderNavGroup('MAIN', mainItems)}
          <div className="border-t border-[#F1F4F7] pt-2">
            {renderNavGroup('INTELLIGENCE', intelligenceItems)}
          </div>
          <div className="border-t border-[#F1F4F7] pt-2">
            {renderNavGroup('SYSTEM', systemItems)}
          </div>
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[#172033] truncate">
              {user?.name || 'Officer'}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#16805C] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16805C]" />
              <span>Online</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-1.5 rounded-btn text-[#64748B] hover:text-[#C53D3D] hover:bg-white transition-colors cursor-pointer"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
