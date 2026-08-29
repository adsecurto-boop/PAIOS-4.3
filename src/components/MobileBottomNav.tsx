import React, { useRef, useEffect } from 'react';
import {
  Sun,
  Clock,
  CheckSquare,
  HeartPulse,
  BookOpen,
  BarChart2,
  Bot,
  Book,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { NavTab } from '../types';

interface MobileBottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  const tabs = [
    { id: NavTab.TODAY, label: 'Today', icon: Sun },
    { id: NavTab.TIMELINE, label: 'Timeline', icon: Clock },
    { id: NavTab.TASKS, label: 'Tasks', icon: CheckSquare },
    { id: NavTab.HEALTH, label: 'Health', icon: HeartPulse },
    { id: NavTab.LEARN, label: 'Learn', icon: BookOpen },
    { id: NavTab.INSIGHTS, label: 'Insights', icon: BarChart2 },
    { id: NavTab.AI, label: 'AI', icon: Bot },
    { id: NavTab.JOURNAL, label: 'Journal', icon: Book },
    { id: NavTab.SETTINGS, label: 'Settings', icon: Settings },
  ];

  // Auto-scroll active tab into center view when tab changes
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeTab]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -180 : 180;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/80 shadow-2xl pb-[env(safe-area-inset-bottom,8px)] w-full max-w-full">
      <div className="relative flex items-center w-full">
        {/* Left Scroll Cue / Button */}
        <button
          onClick={() => handleScroll('left')}
          className="absolute left-0 z-10 h-full px-1 flex items-center justify-center bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent text-slate-400 hover:text-white"
          aria-label="Scroll Left"
        >
          <ChevronLeft className="w-4 h-4 opacity-75" />
        </button>

        {/* Scrollable Navigation Container */}
        <div
          ref={scrollRef}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-6 py-1.5 scroll-smooth snap-x touch-pan-x w-full overscroll-x-contain"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={isActive ? activeItemRef : null}
                onClick={() => onSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center min-w-[62px] py-1 px-1.5 rounded-2xl text-[10px] font-medium transition-all duration-200 snap-center shrink-0 min-h-[48px] active:scale-95 ${
                  isActive
                    ? 'text-indigo-200 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-11 h-6 rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/50 shadow-md shadow-indigo-900/40 scale-105'
                      : 'bg-transparent text-slate-400'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-300' : 'text-slate-400'}`} />
                </div>
                <span className={`mt-0.5 truncate w-full text-center tracking-tight text-[9.5px] ${isActive ? 'text-indigo-200 font-extrabold' : 'text-slate-400'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Scroll Cue / Button */}
        <button
          onClick={() => handleScroll('right')}
          className="absolute right-0 z-10 h-full px-1 flex items-center justify-center bg-gradient-to-l from-slate-950 via-slate-950/90 to-transparent text-slate-400 hover:text-white"
          aria-label="Scroll Right"
        >
          <ChevronRight className="w-4 h-4 opacity-75" />
        </button>
      </div>
    </nav>
  );
};
