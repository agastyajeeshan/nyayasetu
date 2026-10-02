import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  GitMerge,
  FileCheck2,
  Binary,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { NotificationItem } from '../../types.js';
import { apiGet, apiPatch, apiPost } from '../../api/client.js';

interface NotificationPopoverProps {
  onNavigate?: (tab: string, extraId?: string) => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await apiGet<{ notifications: NotificationItem[]; unreadCount: number }>('/api/notifications');
      if (res) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiPatch(`/api/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiPost('/api/notifications/read-all', {});
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'AI_CROSS_MATCH': return GitMerge;
      case 'SIGNATURE_REQUEST': return FileCheck2;
      case 'CUSTODY_TRANSFER': return Binary;
      case 'TAMPER_ALERT': return ShieldCheck;
      default: return AlertTriangle;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 hover:text-slate-900 transition-all flex items-center justify-center shadow-xs"
        title="Alert Notifications"
      >
        <Bell className="w-4 h-4 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-mono font-bold rounded-full flex items-center justify-center shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="bg-slate-900 p-3.5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-400" />
              <span className="font-bold">System Alerts & Audit Log</span>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 font-semibold"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Mark All Read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-1 opacity-40" />
                <p>No new notifications</p>
              </div>
            ) : (
              notifications.map(n => {
                const Icon = getNotifIcon(n.type);
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) handleMarkAsRead(n.id);
                      if (n.actionUrl && onNavigate) {
                        const tab = n.actionUrl.replace('#/', '').split('/')[0];
                        const id = n.actionUrl.replace('#/', '').split('/')[1];
                        onNavigate(tab, id);
                        setIsOpen(false);
                      }
                    }}
                    className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!n.isRead ? 'bg-blue-50/40' : ''
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${n.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' :
                        n.severity === 'WARNING' ? 'bg-amber-100 text-amber-700' :
                          n.severity === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-blue-100 text-blue-700'
                      }`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs truncate">{n.title}</span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 ml-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        {n.message}
                      </p>
                      <div className="text-[9px] text-slate-400 font-mono">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
