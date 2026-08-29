import React, { useState, useEffect } from 'react';
import { Search, Sun, Moon, Settings, Cpu, LogOut, Bell, Compass, RefreshCw } from 'lucide-react';
import { CloudSyncBanner } from './CloudSyncBanner';
import { AutoUpdateSyncBanner } from './AutoUpdateSyncBanner';
import { PaiosUser } from '../firebase';
import { getNotificationsHistory } from '../utils/notifications';
import { PreContextBroker } from '../core/broker/PreContextBroker';

interface TopHeaderBarProps {
  userName?: string;
  user?: PaiosUser | null;
  onLogOut?: () => void;
  onOpenSearch: () => void;
  onOpenCheckIn: () => void;
  onOpenReview: () => void;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
  onSyncComplete?: () => void;
  onOpenTour?: () => void;
}

export const TopHeaderBar: React.FC<TopHeaderBarProps> = ({
  user,
  onLogOut,
  onOpenSearch,
  onOpenCheckIn,
  onOpenReview,
  onOpenSettings,
  onOpenNotifications,
  onSyncComplete,
  onOpenTour,
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isForceSyncing, setIsForceSyncing] = useState(false);

  const checkUnread = () => {
    const history = getNotificationsHistory();
    setUnreadCount(history.filter((n) => !n.read).length);
  };

  useEffect(() => {
    checkUnread();
    window.addEventListener('paios_notification_change', checkUnread);
    return () => window.removeEventListener('paios_notification_change', checkUnread);
  }, []);

  const handleForceSync = async () => {
    setIsForceSyncing(true);
    try {
      await PreContextBroker.triggerForceSync();
      if (onSyncComplete) onSyncComplete();
    } catch (err) {
      console.warn('[Header] Force sync error:', err);
    } finally {
      setTimeout(() => setIsForceSyncing(false), 600);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-3 py-2 sm:px-4 sm:py-2.5 text-slate-100 shadow-sm pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Compact Logo Branding without decorative text on mobile */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="hidden sm:inline-block font-heading font-extrabold text-sm sm:text-base tracking-wider bg-gradient-to-r from-indigo-300 via-cyan-200 to-white bg-clip-text text-transparent">
            PAIOS
          </span>
        </div>

        {/* Streamlined Interactive Tools Header Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
          <CloudSyncBanner compact onSyncComplete={onSyncComplete} />
          <AutoUpdateSyncBanner compact />

          {/* Rule B2 Force Sync Trigger Button */}
          <button
            onClick={handleForceSync}
            disabled={isForceSyncing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors shrink-0 min-h-[38px] disabled:opacity-50"
            title="Force Sync Inbound PreContext Broker Data (Rule B2)"
            aria-label="Force Sync Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isForceSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{isForceSyncing ? 'Syncing...' : 'Force Sync'}</span>
          </button>

          {onOpenTour && (
            <button
              onClick={onOpenTour}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-colors shrink-0 min-h-[38px]"
              title="Launch Setup Tour Guide & AI Assistant"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span className="hidden lg:inline">Setup Guide</span>
            </button>
          )}

          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-700/60 shrink-0 min-h-[38px] min-w-[38px] flex items-center justify-center relative"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={onOpenSearch}
            className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-700/60 shrink-0 min-h-[38px] min-w-[38px] flex items-center justify-center"
            title="Search PAIOS (Tasks, Notes, Journal)"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenCheckIn}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors shrink-0 min-h-[38px]"
            title="Morning Check-In"
          >
            <Sun className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Check-In</span>
          </button>

          <button
            onClick={onOpenReview}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors shrink-0 min-h-[38px]"
            title="Evening Review"
          >
            <Moon className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Review</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-700/60 shrink-0 min-h-[38px] min-w-[38px] flex items-center justify-center"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {user && onLogOut && (
            <button
              onClick={onLogOut}
              className="p-2 rounded-xl bg-slate-800/90 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors border border-slate-700/60 shrink-0 min-h-[38px] min-w-[38px] flex items-center justify-center ml-1"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
