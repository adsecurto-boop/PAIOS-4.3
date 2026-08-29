/**
 * @vitest-environment jsdom
 *
 * ATDD Integration Test Suite: Dynamic AI Schema Discovery & Prompt Formulation (Step 5)
 *
 * Tests that PluginContextExtractor dynamically composes an AI system instruction
 * instructing Gemini to conversationally discover missing required plugin fields,
 * and outputs structured `pluginUpdates` JSON blocks.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PluginContextExtractor,
  ActivePluginSchema,
  PluginPromptInstructions,
} from '../../src/core/plugins/PluginContextExtractor';
import { PluginRegistry } from '../../src/core/plugins/PluginRegistry';

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const HABITS_SCHEMA: ActivePluginSchema = {
  pluginId: 'habit-tracker',
  pluginName: 'Habit Tracker',
  currentData: {},  // no data yet — all required fields missing
  fields: [
    {
      name: 'habits',
      type: 'string[]',
      required: true,
      aiPromptHint: 'Ask the user what daily habits they want to track (e.g. Read 20m, Exercise).',
    },
    {
      name: 'streakGoalDays',
      type: 'number',
      required: false,
      aiPromptHint: 'Optionally ask how many consecutive days they want to maintain habits.',
    },
  ],
};

const BUDGET_SCHEMA: ActivePluginSchema = {
  pluginId: 'budget-tracker',
  pluginName: 'Budget Tracker',
  currentData: {},  // no data yet — all required fields missing
  fields: [
    {
      name: 'dailySpendLimit',
      type: 'number',
      required: true,
      aiPromptHint: 'Ask the user what their daily spending limit is in their chosen currency.',
    },
    {
      name: 'currency',
      type: 'string',
      required: true,
      aiPromptHint: 'Ask which currency they use (e.g. USD, EUR, INR, GBP).',
    },
    {
      name: 'monthlyBudget',
      type: 'number',
      required: false,
      aiPromptHint: 'Optionally ask for a monthly budget cap.',
    },
  ],
};

const BUDGET_SCHEMA_PARTIALLY_FILLED: ActivePluginSchema = {
  ...BUDGET_SCHEMA,
  currentData: { currency: 'USD' }, // currency is already known; only dailySpendLimit is missing
};

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('ATDD: Dynamic AI Schema Discovery & Prompt Formulation (Step 5)', () => {
  beforeEach(() => {
    PluginRegistry.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Prompt Generation Contract ────────────────────────────────────────

  describe('generatePluginPromptInstructions() — System Instruction Generation', () => {
    it('generates a non-empty systemInstruction string when active schemas are provided', () => {
      const instructions = PluginContextExtractor.generatePluginPromptInstructions([
        HABITS_SCHEMA,
        BUDGET_SCHEMA,
      ]);

      expect(instructions).toBeDefined();
      expect(typeof instructions.systemInstruction).toBe('string');
      expect(instructions.systemInstruction.length).toBeGreaterThan(50);
    });

    it('includes plugin names in the generated system instruction', () => {
      const instructions = PluginContextExtractor.generatePluginPromptInstructions([
        HABITS_SCHEMA,
        BUDGET_SCHEMA,
      ]);

      expect(instructions.systemInstruction).toMatch(/Habit Tracker/i);
      expect(instructions.systemInstruction).toMatch(/Budget Tracker/i);
    });

    it('instructs AI to output a structured pluginUpdates JSON block in the system instruction', () => {
      const instructions = PluginContextExtractor.generatePluginPromptInstructions([
        HABITS_SCHEMA,
      ]);

      // The system instruction must mention pluginUpdates JSON so AI knows to output it
      expect(instructions.systemInstruction).toMatch(/pluginUpdates/i);
      expect(instructions.systemInstruction).toMatch(/json/i);
    });

    it('includes aiPromptHint guidance for required fields in the system instruction', () => {
      const instructions = PluginContextExtractor.generatePluginPromptInstructions([
        BUDGET_SCHEMA,
      ]);

      // Should embed the aiPromptHint text for required fields so AI knows what to ask
      expect(instructions.systemInstruction).toMatch(/daily spending limit|spend limit/i);
      expect(instructions.systemInstruction).toMatch(/currency/i);
    });

    it('reports correct requiredFieldsSummary for each plugin', () => {
      const instructions = PluginContextExtractor.generatePluginPromptInstructions([
        HABITS_SCHEMA,
        BUDGET_SCHEMA,
      ]);

      expect(instructions.requiredFieldsSummary['habit-tracker']).toContain('habits');
      expect(instructions.requiredFieldsSummary['budget-tracker']).toEqual(
        expect.arrayContaining(['dailySpendLimit', 'currency'])
      );
    });

    it('counts total missing required fields across all active plugins', () => {
      const instructions = PluginContextExtractor.generatePluginPromptInstructions([
        HABITS_SCHEMA,   // 1 required field: habits
        BUDGET_SCHEMA,   // 2 required fields: dailySpendLimit, currency
      ]);

      expect(instructions.totalMissingFields).toBe(3);
    });

    it('excludes already-known fields from requiredFieldsSummary when currentData is partially filled', () => {
      const instructions = PluginContextExtractor.generatePluginPromptInstructions([
        BUDGET_SCHEMA_PARTIALLY_FILLED,
      ]);

      // currency is already in currentData — should NOT appear as still-missing
      const missingForBudget = instructions.requiredFieldsSummary['budget-tracker'] || [];
      expect(missingForBudget).toContain('dailySpendLimit');
      expect(missingForBudget).not.toContain('currency');
    });

    it('correctly reduces totalMissingFields when currentData has some pre-filled required fields', () => {
      const instructions = PluginContextExtractor.generatePluginPromptInstructions([
        BUDGET_SCHEMA_PARTIALLY_FILLED, // only dailySpendLimit is missing (currency is known)
      ]);

      expect(instructions.totalMissingFields).toBe(1);
    });
  });

  // ── 2. Zero-Plugin Edge Case ──────────────────────────────────────────────

  describe('Edge Case: No Active Plugins', () => {
    it('generates empty instruction and zero missing fields when no schemas are provided', () => {
      const instructions = PluginContextExtractor.generatePluginPromptInstructions([]);

      expect(instructions.systemInstruction).toBe('');
      expect(instructions.totalMissingFields).toBe(0);
      expect(Object.keys(instructions.requiredFieldsSummary)).toHaveLength(0);
    });
  });

  // ── 3. buildActiveSchemas() Contract ─────────────────────────────────────

  describe('buildActiveSchemas() — Active Plugin Schema Assembly', () => {
    it('builds ActivePluginSchema list from registered active plugins and current storage snapshot', () => {
      const storageSnapshot: Record<string, Record<string, any>> = {
        'habit-tracker': {}, // empty — no data yet
        'budget-tracker': { currency: 'INR' }, // partially known
      };

      const activePlugins = [
        { manifest: { id: 'habit-tracker', name: 'Habit Tracker', schemaFields: HABITS_SCHEMA.fields, storageKey: 'plugin_habit-tracker' }, enabled: true, installedAtMillis: Date.now() },
        { manifest: { id: 'budget-tracker', name: 'Budget Tracker', schemaFields: BUDGET_SCHEMA.fields, storageKey: 'plugin_budget-tracker' }, enabled: true, installedAtMillis: Date.now() },
      ];

      const schemas = PluginContextExtractor.buildActiveSchemas(activePlugins as any, storageSnapshot);

      expect(schemas).toHaveLength(2);

      const budgetSchema = schemas.find((s: ActivePluginSchema) => s.pluginId === 'budget-tracker');
      expect(budgetSchema?.currentData.currency).toBe('INR');
    });

    it('excludes disabled plugins from the assembled schema list', () => {
      const storageSnapshot: Record<string, Record<string, any>> = {};

      const activePlugins = [
        { manifest: { id: 'habit-tracker', name: 'Habit Tracker', schemaFields: HABITS_SCHEMA.fields, storageKey: 'plugin_habit-tracker' }, enabled: true, installedAtMillis: Date.now() },
        { manifest: { id: 'budget-tracker', name: 'Budget Tracker', schemaFields: BUDGET_SCHEMA.fields, storageKey: 'plugin_budget-tracker' }, enabled: false, installedAtMillis: Date.now() },
      ];

      const schemas = PluginContextExtractor.buildActiveSchemas(activePlugins as any, storageSnapshot);
      const ids = schemas.map((s: ActivePluginSchema) => s.pluginId);

      expect(ids).toContain('habit-tracker');
      expect(ids).not.toContain('budget-tracker');
    });
  });
});
