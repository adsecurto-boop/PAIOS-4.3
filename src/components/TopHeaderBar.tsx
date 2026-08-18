import React from 'react';
import { Search, Sun, Moon, Settings, Cpu } from 'lucide-react';
import { CloudSyncBanner } from './CloudSyncBanner';

interface TopHeaderBarProps {
  userName: string;
  onOpenSearch: () => void;
  onOpenCheckIn: () => void;
  onOpenReview: () => void;
  onOpenSettings: () => void;
  onSyncComplete?: () => void;
}

export const TopHeaderBar: React.FC<TopHeaderBarProps> = ({
  userName,
  onOpenSearch,
  onOpenCheckIn,
  onOpenReview,
  onOpenSettings,
  onSyncComplete,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 text-slate-100 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-base tracking-wider bg-gradient-to-r from-indigo-300 via-cyan-200 to-white bg-clip-text text-transparent">
                PAIOS
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/50">
                v4.0
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {getGreeting()}, <span className="text-slate-200 font-semibold">{userName}</span> &bull; {formattedDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <CloudSyncBanner compact onSyncComplete={onSyncComplete} />

          <button
            onClick={onOpenSearch}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
            title="Search PAIOS (Tasks, Notes, Journal)"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenCheckIn}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors"
            title="Morning Check-In"
          >
            <Sun className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Check-In</span>
          </button>

          <button
            onClick={onOpenReview}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors"
            title="Evening Review"
          >
            <Moon className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Review</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
