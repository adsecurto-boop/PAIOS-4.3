import React, { useState } from 'react';
import {
  Minus,
  Square,
  Copy,
  X,
  Cpu,
  Folder,
  FileText,
  Search,
  Settings,
  Download,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface WindowsTitleBarProps {
  appName?: string;
  isMaximized: boolean;
  isMinimized: boolean;
  onMinimize: () => void;
  onMaximizeToggle: () => void;
  onClose: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onNewTask: () => void;
  onNewCapture: () => void;
  onExportDesktopApp: () => void;
}

export const WindowsTitleBar: React.FC<WindowsTitleBarProps> = ({
  appName = 'PAIOS Desktop v4.0 - Personal AI Operating System',
  isMaximized,
  isMinimized,
  onMinimize,
  onMaximizeToggle,
  onClose,
  onOpenSearch,
  onOpenSettings,
  onNewTask,
  onNewCapture,
  onExportDesktopApp,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showSnapLayouts, setShowSnapLayouts] = useState(false);

  const toggleMenu = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const closeMenus = () => {
    setActiveMenu(null);
  };

  return (
    <div
      className="hidden md:flex relative z-50 select-none bg-slate-900 border-b border-slate-800 text-slate-300 flex-col font-sans"
      onMouseLeave={closeMenus}
    >
      {/* Top Window Bar */}
      <div className="h-9 px-3 flex items-center justify-between bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60">
        {/* Left: Window Icon, Title & Native Menus */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-sm">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-slate-200 tracking-tight flex items-center gap-1.5">
              <span>PAIOS Desktop</span>
              <span className="text-[9px] px-1 py-0.2 bg-indigo-950 text-indigo-300 border border-indigo-800/60 rounded font-mono">
                Win64
              </span>
            </span>
          </div>

          {/* Windows Window Menu items */}
          <div className="hidden sm:flex items-center text-xs text-slate-400 gap-0.5 ml-2">
            {/* File Menu */}
            <div className="relative">
              <button
                onClick={() => toggleMenu('file')}
                className={`px-2 py-0.5 rounded hover:bg-slate-800 hover:text-slate-200 transition-colors ${
                  activeMenu === 'file' ? 'bg-slate-800 text-white' : ''
                }`}
              >
                File
              </button>
              {activeMenu === 'file' && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-slate-900 border border-slate-700/80 rounded-lg shadow-2xl py-1 text-slate-200 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      onNewTask();
                      closeMenus();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center justify-between"
                  >
                    <span>New Task...</span>
                    <span className="text-[10px] text-slate-500 font-mono">Ctrl+N</span>
                  </button>
                  <button
                    onClick={() => {
                      onNewCapture();
                      closeMenus();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center justify-between"
                  >
                    <span>Quick Capture...</span>
                    <span className="text-[10px] text-slate-500 font-mono">Ctrl+Q</span>
                  </button>
                  <div className="my-1 border-t border-slate-800" />
                  <button
                    onClick={() => {
                      onExportDesktopApp();
                      closeMenus();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center gap-2 text-indigo-300 hover:text-white font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Build Windows .exe...</span>
                  </button>
                  <div className="my-1 border-t border-slate-800" />
                  <button
                    onClick={() => {
                      onClose();
                      closeMenus();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-red-600 hover:text-white flex items-center justify-between text-red-400"
                  >
                    <span>Exit PAIOS Desktop</span>
                    <span className="text-[10px] opacity-70 font-mono">Alt+F4</span>
                  </button>
                </div>
              )}
            </div>

            {/* Edit Menu */}
            <div className="relative">
              <button
                onClick={() => toggleMenu('edit')}
                className={`px-2 py-0.5 rounded hover:bg-slate-800 hover:text-slate-200 transition-colors ${
                  activeMenu === 'edit' ? 'bg-slate-800 text-white' : ''
                }`}
              >
                Edit
              </button>
              {activeMenu === 'edit' && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-slate-900 border border-slate-700/80 rounded-lg shadow-2xl py-1 text-slate-200 z-50 text-xs">
                  <button
                    onClick={() => {
                      onOpenSearch();
                      closeMenus();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center justify-between"
                  >
                    <span>Find & Search</span>
                    <span className="text-[10px] text-slate-500 font-mono">Ctrl+F</span>
                  </button>
                  <button
                    onClick={() => {
                      onOpenSettings();
                      closeMenus();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center justify-between"
                  >
                    <span>Preferences...</span>
                    <span className="text-[10px] text-slate-500 font-mono">Ctrl+,</span>
                  </button>
                </div>
              )}
            </div>

            {/* Tools Menu */}
            <div className="relative">
              <button
                onClick={() => toggleMenu('tools')}
                className={`px-2 py-0.5 rounded hover:bg-slate-800 hover:text-slate-200 transition-colors ${
                  activeMenu === 'tools' ? 'bg-slate-800 text-white' : ''
                }`}
              >
                Tools
              </button>
              {activeMenu === 'tools' && (
                <div className="absolute left-0 top-full mt-1 w-52 bg-slate-900 border border-slate-700/80 rounded-lg shadow-2xl py-1 text-slate-200 z-50 text-xs">
                  <button
                    onClick={() => {
                      onExportDesktopApp();
                      closeMenus();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Windows Packaging Assistant</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Search / Command Palette shortcut trigger */}
        <div className="hidden md:flex items-center">
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-full border border-slate-800/80 text-[11px] transition-colors shadow-inner"
          >
            <Search className="w-3 h-3 text-slate-400" />
            <span>Search PAIOS Desktop</span>
            <kbd className="px-1.5 py-0.5 bg-slate-950 text-slate-400 rounded text-[9px] font-mono border border-slate-800">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right: Windows 11 Window Control Buttons */}
        <div className="flex items-center -mr-3 h-full">
          {/* Minimize Button */}
          <button
            onClick={onMinimize}
            className="h-9 w-11 flex items-center justify-center hover:bg-slate-800/80 text-slate-400 hover:text-slate-100 transition-colors"
            title="Minimize to Windows Taskbar"
            aria-label="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Maximize / Restore Button with Snap Layouts Dropdown */}
          <div
            className="relative h-9"
            onMouseEnter={() => setShowSnapLayouts(true)}
            onMouseLeave={() => setShowSnapLayouts(false)}
          >
            <button
              onClick={onMaximizeToggle}
              className="h-9 w-11 flex items-center justify-center hover:bg-slate-800/80 text-slate-400 hover:text-slate-100 transition-colors"
              title={isMaximized ? 'Restore Down' : 'Maximize Window'}
              aria-label="Maximize"
            >
              {isMaximized ? <Copy className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
            </button>

            {/* Windows 11 Snap Layouts Preview popup on hover */}
            {showSnapLayouts && (
              <div className="absolute right-0 top-full mt-0 w-44 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-b-lg shadow-2xl p-2 z-50 animate-in fade-in duration-100">
                <div className="text-[10px] text-slate-400 font-mono mb-1.5 px-1">Windows Snap Layouts</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div
                    onClick={onMaximizeToggle}
                    className="h-10 border border-indigo-500/40 rounded bg-slate-800/60 hover:bg-indigo-600/30 cursor-pointer flex gap-0.5 p-0.5"
                    title="Split 50/50"
                  >
                    <div className="flex-1 bg-indigo-500/30 rounded-sm" />
                    <div className="flex-1 bg-indigo-500/30 rounded-sm" />
                  </div>
                  <div
                    onClick={onMaximizeToggle}
                    className="h-10 border border-indigo-500/40 rounded bg-slate-800/60 hover:bg-indigo-600/30 cursor-pointer flex gap-0.5 p-0.5"
                    title="3-Column Layout"
                  >
                    <div className="w-1/3 bg-indigo-500/30 rounded-sm" />
                    <div className="w-1/3 bg-indigo-500/30 rounded-sm" />
                    <div className="w-1/3 bg-indigo-500/30 rounded-sm" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Close Window Button */}
          <button
            onClick={onClose}
            className="h-9 w-11 flex items-center justify-center hover:bg-red-600 text-slate-400 hover:text-white transition-colors"
            title="Close Application"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
