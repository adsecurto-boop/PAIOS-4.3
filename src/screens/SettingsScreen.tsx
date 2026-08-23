import React, { useState } from 'react';
import { Settings, User, Key, Cpu, Database, RefreshCw, Download, Check, Monitor, Sparkles, Share2, Bell, Clock, Compass, AlertTriangle, GitCommit } from 'lucide-react';
import { UserSettings } from '../types';
import { CloudSyncBanner } from '../components/CloudSyncBanner';
import { AutoUpdateSyncBanner } from '../components/AutoUpdateSyncBanner';
import { exportAndShareBackup } from '../utils/exportShare';

interface SettingsScreenProps {
  settings: UserSettings;
  onUpdateSettings: (updated: Partial<UserSettings>) => void;
  onResetSampleData: () => void;
  onClearAllData: () => void;
  onExportData: (mode?: 'share' | 'download') => void;
  onOpenExportModal?: () => void;
  onStartTour?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onResetSampleData,
  onClearAllData,
  onExportData,
  onOpenExportModal,
  onStartTour,
}) => {
  const [name, setName] = useState(settings.userName);
  const [apiKey, setApiKey] = useState(settings.customApiKey || '');
  const [selectedModel, setSelectedModel] = useState(settings.preferredModel || 'gemini-3.7-flash');
  const [officeStart, setOfficeStart] = useState(settings.officeStartTime || '13:00');
  const [officeEnd, setOfficeEnd] = useState(settings.officeEndTime || '22:00');
  const [bedtimeVal, setBedtimeVal] = useState(settings.bedtime || '00:00');
  const [wakeTimeVal, setWakeTimeVal] = useState(settings.wakeTime || '07:30');
  const [isWorkdayVal, setIsWorkdayVal] = useState(settings.isWorkday !== false);
  const [morningNotifEnabled, setMorningNotifEnabled] = useState(settings.morningNotificationEnabled !== false);
  const [morningTimeVal, setMorningTimeVal] = useState(settings.morningCheckInTime || '08:00');
  const [eveningNotifEnabled, setEveningNotifEnabled] = useState(settings.eveningNotificationEnabled !== false);
  const [eveningTimeVal, setEveningTimeVal] = useState(settings.eveningReviewTime || '21:30');
  const [dailySummaryEnabledVal, setDailySummaryEnabledVal] = useState(settings.dailySummaryEnabled !== false);
  const [dailySummaryTimeVal, setDailySummaryTimeVal] = useState(settings.dailySummaryTime || '21:00');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleTriggerExport = async (mode: 'share' | 'download') => {
    try {
      const res = await exportAndShareBackup(mode);
      if (res.message) {
        setExportNotice(res.message);
        setTimeout(() => setExportNotice(null), 4000);
      }
    } catch (err: any) {
      setExportNotice('Export error occurred.');
      setTimeout(() => setExportNotice(null), 3000);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      userName: name.trim() || 'Alex',
      customApiKey: apiKey.trim() || undefined,
      preferredModel: selectedModel,
      officeStartTime: officeStart,
      officeEndTime: officeEnd,
      bedtime: bedtimeVal,
      wakeTime: wakeTimeVal,
      isWorkday: isWorkdayVal,
      morningNotificationEnabled: morningNotifEnabled,
      morningCheckInTime: morningTimeVal,
      eveningNotificationEnabled: eveningNotifEnabled,
      eveningReviewTime: eveningTimeVal,
      dailySummaryEnabled: dailySummaryEnabledVal,
      dailySummaryTime: dailySummaryTimeVal,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12 max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-heading font-bold text-xl text-white">PAIOS Operating System Settings</h2>
          <p className="text-xs text-slate-400">Configure profile preferences, AI model params, and Windows Desktop packaging</p>
        </div>
      </div>

      {/* Google SSO & Firestore Realtime Cloud Sync Banner */}
      <CloudSyncBanner />

      {/* Git Commit Auto-Update & Cross-Platform Sync Banner */}
      <AutoUpdateSyncBanner />

      {/* Interactive Setup & Onboarding Tour Launcher */}
      {onStartTour && (
        <div className="bg-gradient-to-r from-indigo-950/90 via-slate-900 to-cyan-950/90 border border-cyan-500/40 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                <span>PAIOS Interactive Setup Tour & AI Guide</span>
                <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.5 rounded">
                  5-Step Wizard
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Relaunch AI setup guide to configure life parameters, starter templates, and cross-platform sync
              </p>
            </div>
          </div>
          <button
            onClick={onStartTour}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-600/30 transition-all shrink-0 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Launch Setup Tour</span>
          </button>
        </div>
      )}

      {/* Windows Desktop Packaging Banner */}
      {onOpenExportModal && (
        <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-cyan-950/80 border border-indigo-800/60 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/40">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                <span>PAIOS Windows Desktop Executable</span>
                <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.5 rounded">
                  Win64 Native
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Generate Electron / Tauri build scripts to run PAIOS as a native `.exe` Windows app
              </p>
            </div>
          </div>
          <button
            onClick={onOpenExportModal}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all shrink-0 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Build Windows App</span>
          </button>
        </div>
      )}

      {/* User & AI Settings */}
      <form onSubmit={handleSaveProfile} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
        <h3 className="font-heading font-bold text-base text-white border-b border-slate-800 pb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-400" /> User Profile & Identity
        </h3>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Display Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <h3 className="font-heading font-bold text-base text-white border-b border-slate-800 pb-3 pt-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" /> Adaptive Timetable & Life Parameters
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Office Shift Start
            </label>
            <input
              type="text"
              value={officeStart}
              onChange={(e) => setOfficeStart(e.target.value)}
              placeholder="e.g. 13:00 or 1:00 PM"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Office Shift End
            </label>
            <input
              type="text"
              value={officeEnd}
              onChange={(e) => setOfficeEnd(e.target.value)}
              placeholder="e.g. 22:00 or 10:00 PM"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Bedtime Target
            </label>
            <input
              type="text"
              value={bedtimeVal}
              onChange={(e) => setBedtimeVal(e.target.value)}
              placeholder="e.g. 00:00 or 12:00 AM"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Wake Time Target
            </label>
            <input
              type="text"
              value={wakeTimeVal}
              onChange={(e) => setWakeTimeVal(e.target.value)}
              placeholder="e.g. 07:30 or 7:30 AM"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>

        <h3 className="font-heading font-bold text-base text-white border-b border-slate-800 pb-3 pt-2 flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-400" /> Notifications & Automated Summary Reminders
        </h3>

        <div className="space-y-4">
          {/* Daily Insights Summary Notification */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Daily Top-Performance Insights Summary
                </h4>
                <p className="text-[11px] text-slate-400">
                  Triggers an automated alert summarizing your top focus categories & productivity.
                </p>
              </div>
              <input
                type="checkbox"
                checked={dailySummaryEnabledVal}
                onChange={(e) => setDailySummaryEnabledVal(e.target.checked)}
                className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
              />
            </div>
            {dailySummaryEnabledVal && (
              <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-2">
                <label className="text-xs text-slate-300 font-mono flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" /> Summary Notification Time:
                </label>
                <input
                  type="text"
                  value={dailySummaryTimeVal}
                  onChange={(e) => setDailySummaryTimeVal(e.target.value)}
                  placeholder="21:00"
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono w-28 text-center focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Check-In Reminders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Morning Check-In Reminder</span>
                <input
                  type="checkbox"
                  checked={morningNotifEnabled}
                  onChange={(e) => setMorningNotifEnabled(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </div>
              {morningNotifEnabled && (
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Time:</span>
                  <input
                    type="text"
                    value={morningTimeVal}
                    onChange={(e) => setMorningTimeVal(e.target.value)}
                    placeholder="08:00"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono w-24 text-center focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Evening Review Reminder</span>
                <input
                  type="checkbox"
                  checked={eveningNotifEnabled}
                  onChange={(e) => setEveningNotifEnabled(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </div>
              {eveningNotifEnabled && (
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Time:</span>
                  <input
                    type="text"
                    value={eveningTimeVal}
                    onChange={(e) => setEveningTimeVal(e.target.value)}
                    placeholder="21:30"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono w-24 text-center focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <h3 className="font-heading font-bold text-base text-white border-b border-slate-800 pb-3 pt-2 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" /> Server-Side Gemini AI Configuration
        </h3>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Preferred Gemini Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="gemini-3.7-flash">gemini-3.7-flash (Recommended Fast)</option>
            <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Deep Reasoning)</option>
            <option value="gemini-flash-latest">gemini-flash-latest (Standard)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
            <Key className="w-3.5 h-3.5 text-amber-400" /> Custom Gemini API Key (Optional)
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Leave empty to use server GEMINI_API_KEY environment variable"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            Your key is used exclusively for server-proxied Gemini requests and never shared.
          </p>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          {savedSuccess ? (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-4 h-4" /> Preferences saved!
            </span>
          ) : (
            <span />
          )}

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all"
          >
            Save Preferences
          </button>
        </div>
      </form>

      {/* Local Storage & Data Management */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <h3 className="font-heading font-bold text-base text-white border-b border-slate-800 pb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" /> Data Management & Persistence
        </h3>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <div>
            <span className="text-xs font-semibold text-white block">Seed / Restore Sample Data</span>
            <span className="text-[10px] text-slate-400">Restore rich default tasks, study flashcards, medications, and logs</span>
          </div>
          <button
            onClick={onResetSampleData}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Sample Data</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-800/50">
          <div>
            <span className="text-xs font-semibold text-indigo-200 block">Factory Reset & Relaunch Setup Guide</span>
            <span className="text-[10px] text-slate-400">Wipe user data and open the interactive AI Setup Wizard</span>
          </div>
          <button
            onClick={() => {
              if (confirm('Reset all user data and relaunch the AI Setup Guide?')) {
                onClearAllData();
                if (onStartTour) onStartTour();
              }
            }}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-md shadow-indigo-600/30"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-300" />
            <span>Reset & Start Setup</span>
          </button>
        </div>

        {exportNotice && (
          <div className="p-3 rounded-xl bg-indigo-950/80 border border-indigo-800 text-indigo-200 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <div>
            <span className="text-xs font-semibold text-white block">Export PAIOS Backup JSON</span>
            <span className="text-[10px] text-slate-400">Save to phone File Manager or download full local JSON database backup</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleTriggerExport('share')}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Launch Phone Share Sheet to Save File"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share / Save File</span>
            </button>
            <button
              onClick={() => handleTriggerExport('download')}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Direct File Download"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40">
          <div>
            <span className="text-xs font-semibold text-rose-300 block">Clear All Local Data</span>
            <span className="text-[10px] text-rose-400/80">Wipe all tasks, cards, timeline logs, and chat messages</span>
          </div>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to clear all PAIOS data? This action cannot be undone.')) {
                onClearAllData();
              }
            }}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors shrink-0"
          >
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
};
