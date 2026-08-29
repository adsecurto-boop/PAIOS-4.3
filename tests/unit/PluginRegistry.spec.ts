/**
 * @vitest-environment jsdom
 *
 * ATDD Unit Test Suite: Dynamic Plugin Registry & Lifecycle Management (Step 5)
 *
 * Tests the runtime plugin manifest registration, enable/disable/uninstall lifecycle,
 * isolated PAIOSStorage partitioning, and active plugin schema filtering.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PluginRegistry,
  PluginManifest,
  PluginSchemaField,
  PluginRegistration,
} from '../../src/core/plugins/PluginRegistry';
import { PAIOSStorage } from '../../src/storage';

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const HABITS_MANIFEST: PluginManifest = {
  id: 'habit-tracker',
  name: 'Habit Tracker',
  version: '1.0.0',
  description: 'Tracks daily habits and streaks',
  author: 'PAIOS Core',
  storageKey: 'plugin_habit-tracker',
  schemaFields: [
    {
      name: 'habits',
      type: 'string[]',
      required: true,
      aiPromptHint: 'Ask the user what daily habits they want to track.',
    },
    {
      name: 'streakGoalDays',
      type: 'number',
      required: false,
      aiPromptHint: 'Ask how many consecutive days they want to maintain habits.',
    },
  ],
};

const BUDGET_MANIFEST: PluginManifest = {
  id: 'budget-tracker',
  name: 'Budget Tracker',
  version: '1.0.0',
  description: 'Tracks daily and monthly spending limits',
  author: 'PAIOS Core',
  storageKey: 'plugin_budget-tracker',
  schemaFields: [
    {
      name: 'dailySpendLimit',
      type: 'number',
      required: true,
      aiPromptHint: 'Ask the user what their daily spending limit is.',
    },
    {
      name: 'currency',
      type: 'string',
      required: true,
      aiPromptHint: 'Ask which currency they use (e.g. USD, EUR, INR).',
    },
    {
      name: 'monthlyBudget',
      type: 'number',
      required: false,
      aiPromptHint: 'Optionally ask for a monthly budget cap.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('Unit Test: Dynamic Plugin Registry & Lifecycle (Step 5)', () => {
  beforeEach(() => {
    PluginRegistry.clearAll();
    PAIOSStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Registration ───────────────────────────────────────────────────────

  describe('Plugin Manifest Registration', () => {
    it('registers a new plugin manifest with schema fields at runtime', () => {
      const registration = PluginRegistry.register(HABITS_MANIFEST);

      expect(registration).toBeDefined();
      expect(registration.manifest.id).toBe('habit-tracker');
      expect(registration.manifest.name).toBe('Habit Tracker');
      expect(registration.manifest.schemaFields).toHaveLength(2);
      expect(registration.enabled).toBe(true); // enabled by default on registration
      expect(registration.installedAtMillis).toBeLessThanOrEqual(Date.now());
    });

    it('registers multiple plugins independently without conflicts', () => {
      PluginRegistry.register(HABITS_MANIFEST);
      PluginRegistry.register(BUDGET_MANIFEST);

      const all = PluginRegistry.getAllPlugins();
      expect(all).toHaveLength(2);
      expect(all.map((r: PluginRegistration) => r.manifest.id)).toEqual(
        expect.arrayContaining(['habit-tracker', 'budget-tracker'])
      );
    });

    it('overwrites existing registration when same plugin ID is re-registered', () => {
      PluginRegistry.register(HABITS_MANIFEST);
      const updatedManifest: PluginManifest = {
        ...HABITS_MANIFEST,
        version: '2.0.0',
        description: 'Updated Habit Tracker with streak bonuses',
      };
      PluginRegistry.register(updatedManifest);

      const reg = PluginRegistry.getRegistration('habit-tracker');
      expect(reg?.manifest.version).toBe('2.0.0');
      expect(PluginRegistry.getAllPlugins()).toHaveLength(1); // no duplicates
    });

    it('stores schema fields including type, required flag, and aiPromptHint', () => {
      PluginRegistry.register(BUDGET_MANIFEST);
      const reg = PluginRegistry.getRegistration('budget-tracker');

      const currencyField = reg?.manifest.schemaFields.find(
        (f: PluginSchemaField) => f.name === 'currency'
      );
      expect(currencyField).toBeDefined();
      expect(currencyField?.type).toBe('string');
      expect(currencyField?.required).toBe(true);
      expect(currencyField?.aiPromptHint).toContain('currency');
    });
  });

  // ── 2. Enable / Disable Lifecycle ────────────────────────────────────────

  describe('Enable / Disable Lifecycle', () => {
    it('disables an active plugin so it no longer appears in getActivePlugins()', () => {
      PluginRegistry.register(HABITS_MANIFEST);
      PluginRegistry.register(BUDGET_MANIFEST);

      const disabled = PluginRegistry.disable('habit-tracker');
      expect(disabled).toBe(true);

      const active = PluginRegistry.getActivePlugins();
      expect(active).toHaveLength(1);
      expect(active[0].manifest.id).toBe('budget-tracker');
    });

    it('re-enables a previously disabled plugin', () => {
      PluginRegistry.register(HABITS_MANIFEST);
      PluginRegistry.disable('habit-tracker');

      const enabled = PluginRegistry.enable('habit-tracker');
      expect(enabled).toBe(true);

      const active = PluginRegistry.getActivePlugins();
      expect(active.some((r: PluginRegistration) => r.manifest.id === 'habit-tracker')).toBe(true);
    });

    it('returns false when enabling/disabling a non-existent plugin ID', () => {
      expect(PluginRegistry.enable('ghost-plugin')).toBe(false);
      expect(PluginRegistry.disable('ghost-plugin')).toBe(false);
    });
  });

  // ── 3. Uninstall Lifecycle ───────────────────────────────────────────────

  describe('Uninstall Lifecycle', () => {
    it('uninstalls a plugin and removes its registration from the registry', () => {
      PluginRegistry.register(HABITS_MANIFEST);
      PluginRegistry.register(BUDGET_MANIFEST);

      const removed = PluginRegistry.uninstall('habit-tracker');
      expect(removed).toBe(true);

      expect(PluginRegistry.getRegistration('habit-tracker')).toBeNull();
      expect(PluginRegistry.getAllPlugins()).toHaveLength(1);
    });

    it('returns false when attempting to uninstall a non-existent plugin', () => {
      expect(PluginRegistry.uninstall('does-not-exist')).toBe(false);
    });
  });

  // ── 4. Isolated Storage Partitions ──────────────────────────────────────

  describe('Isolated Storage Partitions (plugin_<pluginId>)', () => {
    it('writes plugin data to an isolated PAIOSStorage key: plugin_<pluginId>', () => {
      PluginRegistry.register(HABITS_MANIFEST);
      PluginRegistry.writePluginStorage('habit-tracker', {
        habits: ['Read 20m', 'Exercise 30m'],
        streakGoalDays: 30,
      });

      // The storage key must be `plugin_habit-tracker`
      const raw = PAIOSStorage.getItem<Record<string, any>>('plugin_habit-tracker', null);
      expect(raw).not.toBeNull();
      expect(raw!.habits).toEqual(['Read 20m', 'Exercise 30m']);
    });

    it('reads plugin data from its isolated storage partition', () => {
      PluginRegistry.register(BUDGET_MANIFEST);
      PluginRegistry.writePluginStorage('budget-tracker', {
        dailySpendLimit: 50,
        currency: 'USD',
      });

      const data = PluginRegistry.readPluginStorage<{ dailySpendLimit: number; currency: string }>(
        'budget-tracker'
      );
      expect(data).not.toBeNull();
      expect(data!.dailySpendLimit).toBe(50);
      expect(data!.currency).toBe('USD');
    });

    it('does not allow cross-plugin data pollution between isolated partitions', () => {
      PluginRegistry.register(HABITS_MANIFEST);
      PluginRegistry.register(BUDGET_MANIFEST);

      PluginRegistry.writePluginStorage('habit-tracker', { habits: ['Run 5km'] });
      PluginRegistry.writePluginStorage('budget-tracker', { dailySpendLimit: 100, currency: 'EUR' });

      const habitsData = PluginRegistry.readPluginStorage('habit-tracker');
      const budgetData = PluginRegistry.readPluginStorage('budget-tracker');

      // Cross-plugin isolation — budget data must not appear in habits partition
      expect(habitsData).not.toHaveProperty('dailySpendLimit');
      expect(habitsData).not.toHaveProperty('currency');

      // And habits data must not bleed into budget partition
      expect(budgetData).not.toHaveProperty('habits');
    });

    it('clears plugin storage partition on uninstall', () => {
      PluginRegistry.register(HABITS_MANIFEST);
      PluginRegistry.writePluginStorage('habit-tracker', { habits: ['Sleep 8h'] });

      PluginRegistry.uninstall('habit-tracker');

      const data = PluginRegistry.readPluginStorage('habit-tracker');
      expect(data).toBeNull();
    });
  });

  // ── 5. Active Schema Discovery Exclusion ────────────────────────────────

  describe('Active Schema Discovery Exclusion', () => {
    it('excludes disabled plugins from getActivePlugins() schema list', () => {
      PluginRegistry.register(HABITS_MANIFEST);
      PluginRegistry.register(BUDGET_MANIFEST);
      PluginRegistry.disable('budget-tracker');

      const active = PluginRegistry.getActivePlugins();
      const activeIds = active.map((r: PluginRegistration) => r.manifest.id);

      expect(activeIds).toContain('habit-tracker');
      expect(activeIds).not.toContain('budget-tracker');
    });

    it('returns empty active list when all plugins are disabled', () => {
      PluginRegistry.register(HABITS_MANIFEST);
      PluginRegistry.register(BUDGET_MANIFEST);
      PluginRegistry.disable('habit-tracker');
      PluginRegistry.disable('budget-tracker');

      expect(PluginRegistry.getActivePlugins()).toHaveLength(0);
    });

    it('getActivePlugins() returns correct schema fields for each active plugin', () => {
      PluginRegistry.register(HABITS_MANIFEST);
      PluginRegistry.register(BUDGET_MANIFEST);
      PluginRegistry.disable('budget-tracker');

      const active = PluginRegistry.getActivePlugins();
      expect(active).toHaveLength(1);
      expect(active[0].manifest.schemaFields.map((f: PluginSchemaField) => f.name)).toContain('habits');
    });
  });
});
