import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Download,
  Upload,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  Shield,
  Layers,
  Sparkles,
  ExternalLink,
  Code2,
  Trash2,
} from 'lucide-react';
import { PluginRegistry, PluginRegistration, PluginManifest } from '../core/plugins/PluginRegistry';
import { PluginPortability } from '../core/plugins/PluginPortability';
import { PAIOSStorage } from '../storage';

export interface PluginHubScreenProps {
  onPluginStatusChange?: (pluginId: string, enabled: boolean) => void;
  onInstallPlugin?: (manifest: PluginManifest) => void;
  onUninstallPlugin?: (pluginId: string) => void;
}

const DEFAULT_MARKETPLACE_PLUGINS: PluginManifest[] = [
  {
    id: 'habit-tracker',
    name: 'Habit Tracker',
    version: '1.2.0',
    description: 'Track daily streaks and habits with AI check-ins',
    author: 'PAIOS Core',
    category: 'wellness',
    storageKey: 'plugin_habit-tracker',
    schemaFields: [
      { name: 'habits', type: 'string[]', required: true, aiPromptHint: 'Ask what daily habits they want to build' },
      { name: 'streakGoalDays', type: 'number', required: false, aiPromptHint: 'Target consecutive days goal' },
    ],
  },
  {
    id: 'budget-tracker',
    name: 'Budget Tracker',
    version: '1.0.1',
    description: 'Manage daily budgets and financial goals',
    author: 'PAIOS Finance',
    category: 'finance',
    storageKey: 'plugin_budget-tracker',
    schemaFields: [
      { name: 'dailySpendLimit', type: 'number', required: true, aiPromptHint: 'Daily spending limit' },
      { name: 'currency', type: 'string', required: true, aiPromptHint: 'Preferred currency (e.g. USD, EUR)' },
    ],
  },
  {
    id: 'study-companion',
    name: 'Study Companion & Flashcards',
    version: '2.0.0',
    description: 'Spaced repetition cards and focus timer integration',
    author: 'Community Edu',
    category: 'learning',
    storageKey: 'plugin_study-companion',
    schemaFields: [
      { name: 'subjects', type: 'string[]', required: true, aiPromptHint: 'Study subjects or exams' },
      { name: 'dailyCardsTarget', type: 'number', required: false, aiPromptHint: 'Target cards per day' },
    ],
  },
];

export const PluginHubScreen: React.FC<PluginHubScreenProps> = ({
  onPluginStatusChange,
  onInstallPlugin,
  onUninstallPlugin,
}) => {
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>('installed');
  const [plugins, setPlugins] = useState<PluginRegistration[]>([]);
  const [exportModalManifest, setExportModalManifest] = useState<string | null>(null);
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const loadPlugins = () => {
    let installed = PluginRegistry.getAllPlugins();
    if (installed.length === 0) {
      // Seed default plugins if none present
      DEFAULT_MARKETPLACE_PLUGINS.slice(0, 2).forEach((m, idx) => {
        PluginRegistry.register(m, idx === 0);
      });
      installed = PluginRegistry.getAllPlugins();
    }
    setPlugins([...installed]);
  };

  useEffect(() => {
    loadPlugins();
  }, []);

  const handleToggle = (pluginId: string, currentStatus: boolean) => {
    if (currentStatus) {
      PluginRegistry.disable(pluginId);
    } else {
      PluginRegistry.enable(pluginId);
    }
    loadPlugins();
    if (onPluginStatusChange) {
      onPluginStatusChange(pluginId, !currentStatus);
    }
  };

  const handleExport = (pluginId: string) => {
    const data = PluginRegistry.readPluginStorage(pluginId) || {};
    const manifestJson = PluginPortability.exportPluginData(pluginId, data);
    setExportModalManifest(manifestJson);
  };

  const handleImportSubmit = () => {
    if (!importJsonText.trim()) return;
    const result = PluginPortability.importPluginData(importJsonText);
    if (result.success && result.manifest) {
      const manifest = result.manifest;
      PluginRegistry.writePluginStorage(manifest.pluginId, manifest.data);
      setImportFeedback({
        success: true,
        message: `Successfully imported backup for ${manifest.pluginId} (schemaVersion 1.0.0, checksum validated)`,
      });
      loadPlugins();
      setTimeout(() => {
        setShowImportModal(false);
        setImportFeedback(null);
        setImportJsonText('');
      }, 1800);
    } else {
      setImportFeedback({
        success: false,
        message: result.error || 'Import failed. Check JSON format and checksum.',
      });
    }
  };

  const handleInstallMarketplace = (manifest: PluginManifest) => {
    PluginRegistry.register(manifest, true);
    loadPlugins();
    if (onInstallPlugin) {
      onInstallPlugin(manifest);
    }
  };

  const handleUninstall = (pluginId: string) => {
    PluginRegistry.uninstall(pluginId);
    loadPlugins();
    if (onUninstallPlugin) {
      onUninstallPlugin(pluginId);
    }
  };

  return (
    <div className="space-y-6 pb-12 safe-area-bottom safe-area-left safe-area-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl text-white">Dynamic Plugin Hub</h2>
            <p className="text-xs text-slate-400">
              Extend PAIOS with modular, AI-discoverable plugins & isolated storage
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('installed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'installed'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Installed ({plugins.length})</span>
            </button>
            <button
              role="tab"
              onClick={() => setActiveTab('marketplace')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'marketplace'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Marketplace</span>
            </button>
          </div>

          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            <span>Import Plugin</span>
          </button>
        </div>
      </div>

      {/* Installed Tab View */}
      {activeTab === 'installed' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plugins.map((reg) => (
            <div
              key={reg.manifest.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg space-y-4 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-base text-white">
                      {reg.manifest.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      v{reg.manifest.version}
                    </span>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    role="switch"
                    aria-checked={reg.enabled}
                    onClick={() => handleToggle(reg.manifest.id, reg.enabled)}
                    className={`p-1 rounded-full transition-colors flex items-center ${
                      reg.enabled ? 'text-purple-400' : 'text-slate-600'
                    }`}
                    title={reg.enabled ? 'Click to Disable' : 'Click to Enable'}
                  >
                    {reg.enabled ? (
                      <ToggleRight className="w-7 h-7 fill-purple-600/20" />
                    ) : (
                      <ToggleLeft className="w-7 h-7" />
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {reg.manifest.description}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                      reg.enabled
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {reg.enabled ? 'Active / Enabled' : 'Disabled'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Storage: {reg.manifest.storageKey}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => handleExport(reg.manifest.id)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-all"
                  title="Export portable backup JSON"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>Export Backup</span>
                </button>

                <button
                  onClick={() => handleUninstall(reg.manifest.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                  title="Uninstall plugin"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Marketplace Tab View */}
      {activeTab === 'marketplace' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="font-heading font-bold text-base text-white mb-1">
              Available Marketplace Plugins
            </h3>
            <p className="text-xs text-slate-400">
              Browse ready-to-use plugins with pre-configured schemas and conversational AI extraction rules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEFAULT_MARKETPLACE_PLUGINS.map((m) => {
              const isInstalled = plugins.some((p) => p.manifest.id === m.id);
              return (
                <div
                  key={m.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-bold text-base text-white">{m.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        v{m.version}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{m.description}</p>
                    <div className="mt-3 text-[10px] text-purple-400 font-mono">
                      Author: {m.author}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-end">
                    {isInstalled ? (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Installed
                      </span>
                    ) : (
                      <button
                        onClick={() => handleInstallMarketplace(m)}
                        className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Install</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportModalManifest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-purple-900/60 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-purple-400" /> Export Plugin Data (Versioned Manifest)
              </h3>
              <button
                onClick={() => setExportModalManifest(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Portable JSON manifest with schemaVersion, data payload, and deterministic checksum.
            </p>
            <textarea
              readOnly
              rows={8}
              value={exportModalManifest}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-emerald-300 focus:outline-none"
            />
            <div className="flex justify-end">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(exportModalManifest);
                  alert('Manifest copied to clipboard!');
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-purple-900/60 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-purple-400" /> Import Plugin Backup Manifest
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFeedback(null);
                }}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Paste a valid portable JSON manifest string. Checksum and schema version will be validated.
            </p>
            <textarea
              rows={8}
              placeholder='Paste JSON manifest here e.g. { "version": 1, "pluginId": "...", "data": {...}, "checksum": "..." }'
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-white focus:outline-none focus:border-purple-500"
            />
            {importFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  importFeedback.success
                    ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/80 border border-rose-800 text-rose-300'
                }`}
              >
                {importFeedback.message}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={handleImportSubmit}
                disabled={!importJsonText.trim()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold disabled:opacity-50"
              >
                Validate & Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PluginHubScreen;
