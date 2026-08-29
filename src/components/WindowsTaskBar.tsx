import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Sun,
  History,
  CheckCircle2,
  Brain,
  BarChart3,
  BookOpen,
  Settings,
  Wifi,
  Volume2,
  VolumeX,
  Battery,
  ChevronUp,
  Search,
  Bell,
  Play,
  Pause,
  Square,
  Shield,
  Activity,
  Download,
  Power,
} from 'lucide-react';
import { NavTab, ActivityLog } from '../types';

interface WindowsTaskBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeActivity: ActivityLog | null;
  elapsedSeconds: number;
  onPauseActivity: () => void;
  onResumeActivity: () => void;
  onFinishActivity: () => void;
  onOpenSearch: () => void;
  onOpenExportModal: () => void;
  isMinimized: boolean;
  onRestoreFromTaskbar: () => void;
}

export const WindowsTaskBar: React.FC<WindowsTaskBarProps> = ({
  activeTab,
  onTabChange,
  activeActivity,
  elapsedSeconds,
  onPauseActivity,
  onResumeActivity,
  onFinishActivity,
  onOpenSearch,
  onOpenExportModal,
  isMinimized,
  onRestoreFromTaskbar,
}) => {
  const [showStartMenu, setShowStartMenu] = useState(false);
  const [showSystemTray, setShowSystemTray] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [cpuUsage, setCpuUsage] = useState(14);
  const [ramUsage, setRamUsage] = useState(2.8);

  // Time & Date state
  const [timeString, setTimeString] = useState('');
  const [dateString, setDateString] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setDateString(
        now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate light CPU fluctuation for OS realism
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(Math.floor(10 + Math.random() * 18));
      setRamUsage(parseFloat((2.6 + Math.random() * 0.4).toFixed(1)));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const navItems = [
    { tab: NavTab.TODAY, label: 'Today', icon: Sun, color: 'text-amber-400' },
    { tab: NavTab.TIMELINE, label: 'Timeline', icon: History, color: 'text-emerald-400' },
    { tab: NavTab.TASKS, label: 'Tasks', icon: CheckCircle2, color: 'text-indigo-400' },
    { tab: NavTab.HEALTH, label: 'Health', icon: Activity, color: 'text-rose-400' },
    { tab: NavTab.LEARN, label: 'Learn', icon: Brain, color: 'text-purple-400' },
    { tab: NavTab.INSIGHTS, label: 'Insights', icon: BarChart3, color: 'text-cyan-400' },
    { tab: NavTab.AI, label: 'PAIOS AI', icon: Cpu, color: 'text-indigo-300' },
    { tab: NavTab.JOURNAL, label: 'Journal', icon: BookOpen, color: 'text-amber-300' },
    { tab: NavTab.SETTINGS, label: 'Settings', icon: Settings, color: 'text-slate-300' },
  ];

  return (
    <div className="hidden md:block relative z-50 select-none">
      {/* Windows 11 Start Menu Popover */}
      {showStartMenu && (
        <div
          className="absolute bottom-14 left-1/2 -translate-x-1/2 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-slate-100 z-50 animate-in slide-in-from-bottom-3 duration-200"
          onMouseLeave={() => setShowStartMenu(false)}
        >
          {/* Start Menu Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center text-white">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 tracking-tight">PAIOS Windows Shell</h3>
                <p className="text-[10px] text-slate-400">Personal AI Operating System v4.0</p>
              </div>
            </div>
            <button
              onClick={onOpenExportModal}
              className="flex items-center gap-1 text-[11px] px-2 py-1 bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-lg border border-indigo-500/40 transition-colors font-medium"
            >
              <Download className="w-3 h-3" />
              <span>Win Executable</span>
            </button>
          </div>

          {/* Quick App Shortcuts Grid */}
          <div className="py-3">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Pinned Apps
            </div>
            <div className="grid grid-cols-4 gap-2">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.tab}
                    onClick={() => {
                      if (isMinimized) onRestoreFromTaskbar();
                      onTabChange(item.tab);
                      setShowStartMenu(false);
                    }}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-800/80 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-800 group-hover:bg-indigo-600/20 border border-slate-700/50 flex items-center justify-center transition-all shadow-sm">
                      <IconComponent className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <span className="text-[11px] font-medium text-slate-300 group-hover:text-white">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Activity Quick Control */}
          {activeActivity && (
            <div className="p-3 bg-indigo-950/60 border border-indigo-800/50 rounded-xl mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider font-mono text-indigo-300 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-indigo-400 animate-pulse" /> Running Process
                </span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  {formatTimer(elapsedSeconds)}
                </span>
              </div>
              <div className="text-xs font-semibold text-white truncate">{activeActivity.activityName}</div>
              <div className="flex items-center justify-end gap-2 mt-2">
                {activeActivity.isPaused ? (
                  <button
                    onClick={onResumeActivity}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" /> Resume
                  </button>
                ) : (
                  <button
                    onClick={onPauseActivity}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-medium rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Pause className="w-3 h-3 fill-current" /> Pause
                  </button>
                )}
                <button
                  onClick={onFinishActivity}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white text-[11px] font-medium rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Square className="w-3 h-3 fill-current" /> Finish
                </button>
              </div>
            </div>
          )}

          {/* Start Menu Footer */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-300 text-[10px]">
                W11
              </div>
              <span className="text-slate-200 font-medium">Windows Desktop Mode</span>
            </div>
            <button
              onClick={onOpenExportModal}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
              title="Download Desktop Executable"
            >
              <Power className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>
      )}

      {/* System Tray Popover */}
      {showSystemTray && (
        <div
          className="absolute bottom-14 right-4 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-3 text-slate-200 z-50 animate-in slide-in-from-bottom-3 duration-200"
          onMouseLeave={() => setShowSystemTray(false)}
        >
          <div className="text-xs font-bold text-slate-200 mb-2.5 flex items-center justify-between border-b border-slate-800 pb-2">
            <span>Windows System Monitor</span>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
              ONLINE
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* CPU Monitor */}
            <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">CPU Usage</span>
                <span className="font-mono text-indigo-300 font-bold">{cpuUsage}%</span>
              </div>
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full transition-all duration-500"
                  style={{ width: `${cpuUsage}%` }}
                />
              </div>
            </div>

            {/* RAM Monitor */}
            <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Memory Allocated</span>
                <span className="font-mono text-cyan-300 font-bold">{ramUsage} GB / 16 GB</span>
              </div>
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-500 h-full transition-all duration-500"
                  style={{ width: `${(ramUsage / 16) * 100}%` }}
                />
              </div>
            </div>

            {/* System Audio Quick Toggle */}
            <div className="flex items-center justify-between p-2 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <span className="text-slate-300">Desktop Audio</span>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  isMuted
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                }`}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Windows 11 Taskbar Dock */}
      <div className="h-12 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 px-3 flex items-center justify-between text-slate-300 shadow-2xl">
        {/* Left: Start Icon & Windows Search */}
        <div className="flex items-center gap-2">
          {/* Windows Start Button */}
          <button
            onClick={() => setShowStartMenu(!showStartMenu)}
            className={`p-2 rounded-xl transition-all ${
              showStartMenu
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 shadow-lg shadow-indigo-500/20'
                : 'hover:bg-slate-800 text-slate-200'
            }`}
            title="Start Menu (Windows 11)"
          >
            <div className="w-5 h-5 rounded bg-gradient-to-tr from-indigo-500 via-indigo-400 to-cyan-400 flex items-center justify-center text-slate-950 font-black text-[10px]">
              田
            </div>
          </button>

          {/* Windows Taskbar Search */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-800 transition-colors text-xs"
            title="Type here to search PAIOS Desktop"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Search Desktop</span>
          </button>
        </div>

        {/* Center: Pinned Taskbar App Icons */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-900/60 p-1 rounded-2xl border border-slate-800/60 shadow-inner">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.tab && !isMinimized;
            return (
              <button
                key={item.tab}
                onClick={() => {
                  if (isMinimized) onRestoreFromTaskbar();
                  onTabChange(item.tab);
                }}
                className={`relative group p-2 rounded-xl transition-all flex items-center justify-center ${
                  isActive
                    ? 'bg-slate-800/90 text-white shadow-md border border-slate-700/80'
                    : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                }`}
                title={item.label}
              >
                <IconComponent className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${item.color}`} />
                {isActive && (
                  <div className="absolute -bottom-1 w-2.5 h-1 bg-indigo-400 rounded-full shadow-sm shadow-indigo-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Active Activity Mini Badge + System Tray + Clock */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          {/* Active Process Indicator in Taskbar */}
          {activeActivity && (
            <button
              onClick={() => {
                if (isMinimized) onRestoreFromTaskbar();
                onTabChange(NavTab.TODAY);
              }}
              className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-indigo-950/80 hover:bg-indigo-900/80 border border-indigo-700/60 rounded-xl text-indigo-200 transition-colors font-mono text-[11px]"
              title="Click to view Active Process"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              <span className="max-w-[120px] truncate font-sans font-medium">
                {activeActivity.activityName}
              </span>
              <span className="text-amber-300 font-bold">{formatTimer(elapsedSeconds)}</span>
            </button>
          )}

          {/* System Tray Group (Wifi, Sound, Battery) */}
          <button
            onClick={() => setShowSystemTray(!showSystemTray)}
            className="flex items-center gap-1.5 p-1.5 px-2 rounded-xl hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-800/60 transition-colors"
            title="System Tray Settings"
          >
            <ChevronUp className="w-3 h-3 text-slate-500" />
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-slate-300" />
            )}
            <Battery className="w-3.5 h-3.5 text-indigo-400" />
          </button>

          {/* System Clock & Calendar */}
          <div className="text-right flex flex-col justify-center px-1">
            <span className="text-slate-200 font-mono font-medium text-[11px] leading-tight">
              {timeString}
            </span>
            <span className="text-slate-400 text-[9.5px] leading-tight">{dateString}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
