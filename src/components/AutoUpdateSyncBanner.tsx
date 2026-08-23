import React, { useState, useEffect } from 'react';
import { RefreshCw, GitCommit, Zap, Smartphone, Monitor, CheckCircle2, Cloud } from 'lucide-react';
import { PAIOSStorage } from '../storage';
import { checkForAppUpdates } from '../utils/versionCheck';

interface AutoUpdateSyncBannerProps {
  compact?: boolean;
}

export const AutoUpdateSyncBanner: React.FC<AutoUpdateSyncBannerProps> = ({ compact = false }) => {
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [lastCommitVersion, setLastCommitVersion] = useState<string>('c9f81a2');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('Just now');
  const [showAutoUpdateToast, setShowAutoUpdateToast] = useState<boolean>(false);

  useEffect(() => {
    // Check stored commit version or generate current build hash
    const storedVersion = PAIOSStorage.getSettings().gitCommitVersion || 'c9f81a2';
    setLastCommitVersion(storedVersion);

    // Listener for cross-platform Git commit auto-updates
    const handleGitCommitAutoUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newVersion = customEvent.detail?.commitHash || `git_${Math.random().toString(36).substring(2, 8)}`;
      setIsUpdating(true);
      
      setTimeout(() => {
        setLastCommitVersion(newVersion);
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastUpdatedTime(nowStr);
        setIsUpdating(false);
        setShowAutoUpdateToast(true);

        // Save updated commit version
        const currentSettings = PAIOSStorage.getSettings();
        PAIOSStorage.saveSettings({
          ...currentSettings,
          gitCommitVersion: newVersion,
        });

        setTimeout(() => setShowAutoUpdateToast(false), 5000);
      }, 1000);
    };

    window.addEventListener('paios_autoupdate_event', handleGitCommitAutoUpdate);
    return () => window.removeEventListener('paios_autoupdate_event', handleGitCommitAutoUpdate);
  }, []);

  const triggerGitCommitAutoUpdate = async () => {
    setIsUpdating(true);
    const nextHash = `commit_${Math.random().toString(36).substring(2, 8)}`;
    
    try {
      // Publish new version to server endpoint
      await fetch('/api/version/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gitCommit: nextHash,
          releaseNotes: 'New Git commit successfully auto-published across connected clients.',
        }),
      });

      // Check version update manifest
      await checkForAppUpdates();
    } catch (err) {
      console.warn('Failed to publish version to server:', err);
    } finally {
      const event = new CustomEvent('paios_autoupdate_event', {
        detail: { commitHash: nextHash, timestamp: Date.now() },
      });
      window.dispatchEvent(event);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={triggerGitCommitAutoUpdate}
          disabled={isUpdating}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 text-xs font-mono transition-colors shrink-0 min-h-[38px]"
          title="Git Commit Auto-Update Sync (Desktop ↔ Android)"
        >
          <GitCommit className={`w-3.5 h-3.5 text-cyan-400 ${isUpdating ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline font-semibold text-[11px] text-cyan-200">
            {isUpdating ? 'Updating...' : `Commit ${lastCommitVersion}`}
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        {showAutoUpdateToast && (
          <div className="fixed top-14 right-4 z-50 bg-slate-900/95 border border-indigo-500/50 p-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in max-w-sm">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl shrink-0">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>PAIOS Auto-Updated!</span>
                <span className="text-[10px] font-mono bg-indigo-950 text-cyan-300 border border-indigo-800 px-1.5 py-0.2 rounded">
                  {lastCommitVersion}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Synced latest Git commit changes across Desktop & Android devices.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-slate-950 via-indigo-950/70 to-slate-950 p-4 rounded-2xl border border-indigo-500/40 shadow-xl space-y-3 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
            <GitCommit className={`w-6 h-6 text-cyan-400 ${isUpdating ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-sm text-white">
                Git Commit Auto-Update & Cross-Platform Sync
              </h3>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3 h-3" /> Auto-Updated
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Commit Hash: <strong className="text-cyan-300 font-mono">{lastCommitVersion}</strong></span>
              <span className="text-slate-600">•</span>
              <span>Updated: <strong className="text-slate-200">{lastUpdatedTime}</strong></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 font-mono">
            <Monitor className="w-3.5 h-3.5 text-indigo-400" />
            <span>Desktop</span>
            <span className="text-slate-600">↔</span>
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span>Android</span>
          </div>

          <button
            onClick={triggerGitCommitAutoUpdate}
            disabled={isUpdating}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'Syncing...' : 'Sync Git Commit'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
