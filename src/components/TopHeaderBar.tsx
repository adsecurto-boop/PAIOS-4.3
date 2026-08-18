import React from 'react';
import { Search, Sun, Moon, Settings, Cpu, LogOut } from 'lucide-react';
import { CloudSyncBanner } from './CloudSyncBanner';
import { PaiosUser } from '../firebase';

interface TopHeaderBarProps {
  userName?: string;
  user?: PaiosUser | null;
  onLogOut?: () => void;
  onOpenSearch: () => void;
  onOpenCheckIn: () => void;
  onOpenReview: () => void;
  onOpenSettings: () => void;
  onSyncComplete?: () => void;
}

export const TopHeaderBar: React.FC<TopHeaderBarProps> = ({
  user,
  onLogOut,
  onOpenSearch,
  onOpenCheckIn,
  onOpenReview,
  onOpenSettings,
  onSyncComplete,
}) => {
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
