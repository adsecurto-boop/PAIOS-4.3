/**
 * @vitest-environment jsdom
 *
 * ATDD Integration Test Suite: AI Context Extraction → Inbound PIT Dispatch (Step 5)
 *
 * Simulates Gemini chat responses containing a `pluginUpdates` JSON block.
 * Tests that PluginUpdateDispatcher:
 *   1. Parses the pluginUpdates payload from AI response text.
 *   2. Dispatches update events to each target plugin via PreContextBroker.
 *   3. Writes isolated state to each plugin's storage partition.
 *   4. Enforces strict cross-plugin / cross-tenant data isolation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PreContextBroker } from '../../src/core/broker/PreContextBroker';
import { PAIOSStorage } from '../../src/storage';
import { PluginRegistry, PluginManifest } from '../../src/core/plugins/PluginRegistry';
import {
  PluginUpdateDispatcher,
  PluginUpdatePayload,
  DispatchResult,
} from '../../src/core/plugins/PluginUpdateDispatcher';

// ---------------------------------------------------------------------------
// Simulated AI Response Fixtures
// ---------------------------------------------------------------------------

/**
 * Full Gemini chat response with embedded pluginUpdates JSON block.
 * The dispatcher must locate and parse the JSON from the prose response.
 */
const GEMINI_RESPONSE_MULTI_PLUGIN = `
Great! Based on our conversation today, I've recorded your habits and budget preferences.

Here are your updates:

\`\`\`json
{
  "pluginUpdates": {
    "habit-tracker": {
      "habits": ["Read 20m", "Drink 2L water", "Exercise 30m"],
      "streakGoalDays": 21
    },
    "budget-tracker": {
      "dailySpendLimit": 50,
      "currency": "USD"
    }
  }
}
\`\`\`

I'll track these habits and monitor your spending going forward!
`;

/**
 * Single plugin update — only habit-tracker.
 */
const GEMINI_RESPONSE_SINGLE_PLUGIN = `
Sure! I've noted your habits.

\`\`\`json
{
  "pluginUpdates": {
    "habit-tracker": {
      "habits": ["Meditate 10m", "Journal 15m"]
    }
  }
}
\`\`\`
`;

/**
 * Malformed AI response — no JSON block present.
 */
const GEMINI_RESPONSE_NO_JSON = `
That's wonderful! Keep up the good work with your daily routine.
Let me know if you want to adjust anything.
`;

/**
 * AI response with malformed / invalid JSON block.
 */
const GEMINI_RESPONSE_MALFORMED_JSON = `
Here are updates:
\`\`\`json
{ "pluginUpdates": { "habit-tracker": { habits: ["broken json"  }
\`\`\`
`;

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('ATDD: AI Context Extraction → Inbound PIT Dispatch (Step 5)', () => {
  const HABITS_MANIFEST: PluginManifest = {
    id: 'habit-tracker',
    name: 'Habit Tracker',
    version: '1.0.0',
    storageKey: 'plugin_habit-tracker',
    schemaFields: [
      { name: 'habits', type: 'string[]', required: true },
      { name: 'streakGoalDays', type: 'number', required: false },
    ],
  };

  const BUDGET_MANIFEST: PluginManifest = {
    id: 'budget-tracker',
    name: 'Budget Tracker',
    version: '1.0.0',
    storageKey: 'plugin_budget-tracker',
    schemaFields: [
      { name: 'dailySpendLimit', type: 'number', required: true },
      { name: 'currency', type: 'string', required: true },
    ],
  };

  beforeEach(() => {
    PreContextBroker.clearAll();
    PAIOSStorage.clear();
    PluginRegistry.clearAll();
    PluginRegistry.register(HABITS_MANIFEST);
    PluginRegistry.register(BUDGET_MANIFEST);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Parse & Dispatch from AI Response Text ─────────────────────────────

  describe('parseAndDispatch() — Gemini Response Parsing & Event Dispatch', () => {
    it('successfully parses a pluginUpdates JSON block from a full Gemini response string', () => {
      const activePlugins = PluginRegistry.getActivePlugins();
      const result = PluginUpdateDispatcher.parseAndDispatch(
        GEMINI_RESPONSE_MULTI_PLUGIN,
        activePlugins
      );

      expect(result.success).toBe(true);
      expect(result.dispatchedPluginIds).toEqual(
        expect.arrayContaining(['habit-tracker', 'budget-tracker'])
      );
      expect(result.failedPluginIds).toHaveLength(0);
    });

    it('creates PIT records for each dispatched plugin update', async () => {
      const activePlugins = PluginRegistry.getActivePlugins();
      const result = PluginUpdateDispatcher.parseAndDispatch(
        GEMINI_RESPONSE_MULTI_PLUGIN,
        activePlugins
      );

      expect(result.pitRecordsCreated).toBeGreaterThanOrEqual(2);
      expect(PreContextBroker.getBufferCount()).toBeGreaterThanOrEqual(2);
    });

    it('PIT records are tagged with the correct target_plugin_id for each update', async () => {
      const activePlugins = PluginRegistry.getActivePlugins();
      PluginUpdateDispatcher.parseAndDispatch(GEMINI_RESPONSE_MULTI_PLUGIN, activePlugins);

      const result = await PreContextBroker.triggerForceSync();
      const synced = PreContextBroker.getSyncedRecords();

      const habitRecord = synced.find((r) => r.target_plugin_id === 'habit-tracker');
      const budgetRecord = synced.find((r) => r.target_plugin_id === 'budget-tracker');

      expect(habitRecord).toBeDefined();
      expect(budgetRecord).toBeDefined();
    });

    it('writes each plugin update to the correct isolated storage partition', () => {
      const activePlugins = PluginRegistry.getActivePlugins();
      PluginUpdateDispatcher.parseAndDispatch(GEMINI_RESPONSE_MULTI_PLUGIN, activePlugins);

      const habitsData = PluginRegistry.readPluginStorage<{ habits: string[]; streakGoalDays: number }>(
        'habit-tracker'
      );
      const budgetData = PluginRegistry.readPluginStorage<{ dailySpendLimit: number; currency: string }>(
        'budget-tracker'
      );

      expect(habitsData).not.toBeNull();
      expect(habitsData!.habits).toEqual(
        expect.arrayContaining(['Read 20m', 'Drink 2L water', 'Exercise 30m'])
      );
      expect(habitsData!.streakGoalDays).toBe(21);

      expect(budgetData).not.toBeNull();
      expect(budgetData!.dailySpendLimit).toBe(50);
      expect(budgetData!.currency).toBe('USD');
    });

    it('handles a single-plugin update without affecting other plugin partitions', () => {
      const activePlugins = PluginRegistry.getActivePlugins();
      PluginUpdateDispatcher.parseAndDispatch(GEMINI_RESPONSE_SINGLE_PLUGIN, activePlugins);

      const habitsData = PluginRegistry.readPluginStorage<{ habits: string[] }>('habit-tracker');
      const budgetData = PluginRegistry.readPluginStorage('budget-tracker');

      // Only habit-tracker should have data; budget partition untouched
      expect(habitsData!.habits).toEqual(
        expect.arrayContaining(['Meditate 10m', 'Journal 15m'])
      );
      expect(budgetData).toBeNull();
    });
  });

  // ── 2. Cross-Plugin Data Isolation ───────────────────────────────────────

  describe('Cross-Plugin & Cross-Tenant Data Isolation', () => {
    it('does not write habit-tracker data into budget-tracker storage partition', () => {
      const activePlugins = PluginRegistry.getActivePlugins();
      PluginUpdateDispatcher.parseAndDispatch(GEMINI_RESPONSE_MULTI_PLUGIN, activePlugins);

      const budgetRaw = PAIOSStorage.getItem<Record<string, any>>('plugin_budget-tracker', null);
      expect(budgetRaw).not.toHaveProperty('habits');
      expect(budgetRaw).not.toHaveProperty('streakGoalDays');
    });

    it('does not write budget-tracker data into habit-tracker storage partition', () => {
      const activePlugins = PluginRegistry.getActivePlugins();
      PluginUpdateDispatcher.parseAndDispatch(GEMINI_RESPONSE_MULTI_PLUGIN, activePlugins);

      const habitsRaw = PAIOSStorage.getItem<Record<string, any>>('plugin_habit-tracker', null);
      expect(habitsRaw).not.toHaveProperty('dailySpendLimit');
      expect(habitsRaw).not.toHaveProperty('currency');
    });

    it('does not dispatch to unknown plugin IDs not present in the registry', () => {
      const aiResponse = `
        \`\`\`json
        {
          "pluginUpdates": {
            "ghost-plugin": { "secret": "data" },
            "habit-tracker": { "habits": ["Run 5km"] }
          }
        }
        \`\`\`
      `;

      const activePlugins = PluginRegistry.getActivePlugins();
      const result = PluginUpdateDispatcher.parseAndDispatch(aiResponse, activePlugins);

      // ghost-plugin should be in failedPluginIds (not registered)
      expect(result.dispatchedPluginIds).toContain('habit-tracker');
      expect(result.dispatchedPluginIds).not.toContain('ghost-plugin');
      expect(result.failedPluginIds).toContain('ghost-plugin');

      // ghost-plugin must not receive any storage write
      const ghostData = PAIOSStorage.getItem('plugin_ghost-plugin', null);
      expect(ghostData).toBeNull();
    });

    it('does not dispatch updates to disabled plugins', () => {
      PluginRegistry.disable('budget-tracker');

      const activePlugins = PluginRegistry.getActivePlugins();
      const result = PluginUpdateDispatcher.parseAndDispatch(
        GEMINI_RESPONSE_MULTI_PLUGIN,
        activePlugins
      );

      // budget-tracker is disabled — must not receive dispatch
      expect(result.dispatchedPluginIds).not.toContain('budget-tracker');
      const budgetData = PluginRegistry.readPluginStorage('budget-tracker');
      expect(budgetData).toBeNull();
    });
  });

  // ── 3. Direct dispatch() Method ──────────────────────────────────────────

  describe('dispatch() — Pre-parsed PluginUpdatePayload Direct Dispatch', () => {
    it('dispatches a pre-parsed update payload without re-parsing AI response text', () => {
      const preParseUpdate: PluginUpdatePayload = {
        'habit-tracker': { habits: ['Sleep 8h', 'Hydrate'], streakGoalDays: 14 },
      };

      const activePlugins = PluginRegistry.getActivePlugins();
      const result = PluginUpdateDispatcher.dispatch(preParseUpdate, activePlugins);

      expect(result.success).toBe(true);
      expect(result.dispatchedPluginIds).toContain('habit-tracker');

      const habitsData = PluginRegistry.readPluginStorage<{ habits: string[] }>('habit-tracker');
      expect(habitsData!.habits).toContain('Sleep 8h');
    });
  });

  // ── 4. Malformed / Missing JSON Resilience ───────────────────────────────

  describe('Malformed AI Response Resilience', () => {
    it('returns success:false and dispatches nothing when no JSON block is found in response', () => {
      const activePlugins = PluginRegistry.getActivePlugins();
      const result = PluginUpdateDispatcher.parseAndDispatch(
        GEMINI_RESPONSE_NO_JSON,
        activePlugins
      );

      expect(result.success).toBe(false);
      expect(result.dispatchedPluginIds).toHaveLength(0);
      expect(result.pitRecordsCreated).toBe(0);
      expect(PreContextBroker.getBufferCount()).toBe(0);
    });

    it('returns success:false and dispatches nothing when JSON block is malformed', () => {
      const activePlugins = PluginRegistry.getActivePlugins();
      const result = PluginUpdateDispatcher.parseAndDispatch(
        GEMINI_RESPONSE_MALFORMED_JSON,
        activePlugins
      );

      expect(result.success).toBe(false);
      expect(result.dispatchedPluginIds).toHaveLength(0);
    });

    it('does not throw on empty AI response string', () => {
      const activePlugins = PluginRegistry.getActivePlugins();
      expect(() => {
        PluginUpdateDispatcher.parseAndDispatch('', activePlugins);
      }).not.toThrow();
    });
  });
});
