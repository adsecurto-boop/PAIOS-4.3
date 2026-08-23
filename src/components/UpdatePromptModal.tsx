import React from 'react';
import { RefreshCw, Sparkles, Zap, GitCommit, ShieldCheck, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { VersionManifest, applyUpdateAndReload, CLIENT_VERSION } from '../utils/versionCheck';

interface UpdatePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverManifest: VersionManifest | null;
}

export const UpdatePromptModal: React.FC<UpdatePromptModalProps> = ({
  isOpen,
  onClose,
  serverManifest,
}) => {
  if (!isOpen || !serverManifest) return null;

  const handleReload = () => {
    applyUpdateAndReload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative overflow-hidden my-auto">
        {/* Subtle Ambient Background Glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Banner */}
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-lg shadow-indigo-500/30 shrink-0">
              <Zap className="w-7 h-7 text-amber-300 fill-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-extrabold text-lg text-white">New Update Available!</h3>
                <span className="text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-600/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> v{serverManifest.version}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                A newer PAIOS build is ready to install on your device.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Dismiss Update Prompt"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Version Comparison & Release Notes Card */}
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3 relative z-10">
          <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800 pb-2">
            <div>
              <span className="text-slate-400 block text-[10px]">Running Build</span>
              <strong className="text-slate-300 font-bold">v{CLIENT_VERSION.version}</strong> ({CLIENT_VERSION.gitCommit})
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
            <div className="text-right">
              <span className="text-indigo-400 block text-[10px]">Latest Server Build</span>
              <strong className="text-cyan-300 font-bold">v{serverManifest.version}</strong> ({serverManifest.gitCommit})
            </div>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Release Improvements
            </span>
            <p className="text-xs text-slate-200 leading-relaxed bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              {serverManifest.releaseNotes || 'Includes latest Git commit code updates, performance optimizations, and cross-device sync fixes.'}
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Verified Safe Build
            </span>
            <span className="flex items-center gap-1">
              <GitCommit className="w-3.5 h-3.5 text-cyan-400" />
              {serverManifest.gitCommit}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 relative z-10 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
          >
            Remind Me Later
          </button>

          <button
            type="button"
            onClick={handleReload}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/40 transition-all animate-pulse"
          >
            <RefreshCw className="w-4 h-4 text-amber-300" />
            <span>Reload & Apply Update</span>
          </button>
        </div>
      </div>
    </div>
  );
};
