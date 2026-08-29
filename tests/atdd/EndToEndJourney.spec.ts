/**
 * @vitest-environment jsdom
 *
 * ATDD Integration & E2E Contract Test Suite: Complete PAIOS 5.0 User Journey (Step 6)
 *
 * Simulates the complete end-to-end workflow:
 *   Step 1: User registers & authenticates via POST /api/auth/register.
 *   Step 2: Conversational Onboarding -> DoD Engine parses and persists immutable HardStoredGoal.
 *   Step 3: Morning Intent & Journaling -> Ephemeral Context Cache created (48h TTL) + Velocity analysis.
 *   Step 4: PreContext Inbound Broker buffers blocker -> Timetable Plugin creates 60s proposal -> User accepts proposal.
 *   Step 5: Dynamic Plugin Hub -> Habit Tracker plugin registered & schema discovered by AI -> Plugin data dispatched to isolated partition.
 *   Step 6: Sync persistence & consistency check across SQLite tables (users, user_storage, plugin_inbound_pit).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../server';
import db from '../../src/server/db';
import { PAIOSStorage } from '../../src/storage';
import { GoalExtractor } from '../../src/core/ai/GoalExtractor';
import { ContextCache } from '../../src/core/memory/ContextCache';
import { ProgressComparator } from '../../src/core/journal/ProgressComparator';
import { PreContextBroker } from '../../src/core/broker/PreContextBroker';
import { TimetablePlugin } from '../../src/core/plugins/TimetablePlugin';
import { PluginRegistry, PluginManifest } from '../../src/core/plugins/PluginRegistry';
import { PluginContextExtractor } from '../../src/core/plugins/PluginContextExtractor';
import { PluginUpdateDispatcher } from '../../src/core/plugins/PluginUpdateDispatcher';

describe('ATDD E2E: Full PAIOS 5.0 User Journey & Data Integrity Contract (Step 6)', () => {
  let authToken: string;
  let userId: string;
  let userEmail: string;

  beforeEach(() => {
    PAIOSStorage.clear();
    PreContextBroker.clearAll();
    TimetablePlugin.clear();
    PluginRegistry.clearAll();
  });

  it('executes the full PAIOS 5.0 end-to-end lifecycle with cross-table database consistency', async () => {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. STEP 1: USER REGISTRATION & AUTHENTICATION
    // ═══════════════════════════════════════════════════════════════════════
    userEmail = `e2e_user_${Date.now()}@paios.ai`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: userEmail,
        password: 'PasswordE2E123!',
        displayName: 'E2E Test Engineer',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body).toHaveProperty('token');
    expect(regRes.body.user).toHaveProperty('id');

    authToken = regRes.body.token;
    userId = regRes.body.user.id;
    PAIOSStorage.setAuthToken(authToken);

    // Verify record in SQLite `users` table
    const userRow = db.prepare('SELECT id, email, display_name FROM users WHERE id = ?').get(userId) as any;
    expect(userRow).toBeDefined();
    expect(userRow.email).toBe(userEmail.toLowerCase());

    // ═══════════════════════════════════════════════════════════════════════
    // 2. STEP 2: CONVERSATIONAL ONBOARDING & HARD-STORED GOAL EXTRACTION
    // ═══════════════════════════════════════════════════════════════════════
    const conversationalInput = `
      I want to become a Senior SDET.
      My key milestones are: Complete ISTQB Advanced Level certification, and build an automated test harness in Playwright.
      I want to target completing these in 6 months.
    `;

    const extractedGoals = GoalExtractor.extractGoalsFromConversation(conversationalInput);
    expect(extractedGoals.length).toBeGreaterThanOrEqual(1);

    const primaryGoal = extractedGoals[0];
    expect(primaryGoal.title).toMatch(/Senior SDET|SDET/i);
    expect(primaryGoal.milestones.length).toBeGreaterThanOrEqual(1);

    // Persist goal to SQLite via POST /api/sync/push
    const goalSyncRes = await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        key: 'paios_goals',
        payload: extractedGoals,
      });

    expect(goalSyncRes.status).toBe(200);

    // Verify storage record in SQLite `user_storage` table
    const goalRow = db.prepare(
      'SELECT payload FROM user_storage WHERE user_id = ? AND storage_key = ?'
    ).get(userId, 'paios_goals') as any;
    expect(goalRow).toBeDefined();
    const storedGoals = JSON.parse(goalRow.payload);
    expect(storedGoals[0].title).toBe(primaryGoal.title);

    // ═══════════════════════════════════════════════════════════════════════
    // 3. STEP 3: REFLECTIVE JOURNALING & 48H EPHEMERAL CONTEXT CACHE
    // ═══════════════════════════════════════════════════════════════════════
    const contextCache = new ContextCache();
    const journalNow = Date.now();

    const journalReflection = `
      Today I focused on building the test framework.
      Successfully finalized the ATDD specs.
      However, encountered a critical blocker: "SQLite WAL lock contention during multi-device push".
    `;

    // Add entry to 48h ephemeral context cache
    const cacheEntry = contextCache.addEntry(
      'morning_reflection_1',
      { content: journalReflection, mood: 8 },
      'journal_raw',
      journalNow
    );

    expect(cacheEntry.expiresAtMillis).toBe(journalNow + 48 * 60 * 60 * 1000);
    expect(contextCache.getEntry('morning_reflection_1', journalNow)).not.toBeNull();

    // Run Progress Comparator to analyze velocity & extract blocker
    const comparisonResult = ProgressComparator.compareActualVsPlanned({
      journalText: journalReflection,
      plannedTasks: [
        { id: 'task_1', title: 'Scaffold ATDD specs', targetMinutes: 120, completed: true },
        { id: 'task_2', title: 'Fix WAL lock contention', targetMinutes: 120, completed: false },
      ],
      activeGoals: extractedGoals as any,
    });

    expect(comparisonResult.identifiedBlockers.length).toBeGreaterThanOrEqual(1);

    // ═══════════════════════════════════════════════════════════════════════
    // 4. STEP 4: PRECONTEXT BROKER & TIMETABLE 60S PROPOSAL LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════════
    // Dispatch blocker to PreContext Inbound Broker
    ProgressComparator.dispatchBlockersToInboundPit(comparisonResult.identifiedBlockers);
    expect(PreContextBroker.getBufferCount()).toBeGreaterThanOrEqual(1);

    // Trigger Rule B2 Force Sync
    const forceSyncResult = await PreContextBroker.triggerForceSync();
    expect(forceSyncResult.success).toBe(true);

    // Broker generates a 60s adaptive timetable proposal
    const proposal = TimetablePlugin.createProposal({
      activity: 'Resolve SQLite WAL Lock Contention',
      category: 'Work',
      start: '14:00',
      end: '15:30',
      reason: 'Urgent resolution for critical blocker detected in reflection',
    });

    expect(proposal.status).toBe('pending');
    expect(TimetablePlugin.getActiveProposal()).not.toBeNull();

    // User accepts the proposal
    const acceptedProposal = TimetablePlugin.acceptProposal(proposal.id);
    expect(acceptedProposal?.status).toBe('accepted');

    const adaptiveTimetable = PAIOSStorage.getAdaptiveTimetable();
    expect(adaptiveTimetable?.blocks.some((b) => b.activity === 'Resolve SQLite WAL Lock Contention')).toBe(true);

    // Push updated timetable to backend
    const timetableSyncRes = await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        key: 'paios_timetable_v1',
        payload: adaptiveTimetable,
      });

    expect(timetableSyncRes.status).toBe(200);

    // ═══════════════════════════════════════════════════════════════════════
    // 5. STEP 5: DYNAMIC PLUGIN HUB & CONVERSATIONAL SCHEMA EXTRACTION
    // ═══════════════════════════════════════════════════════════════════════
    const habitManifest: PluginManifest = {
      id: 'habit-tracker',
      name: 'Habit Tracker',
      version: '1.0.0',
      storageKey: 'plugin_habit-tracker',
      schemaFields: [
        { name: 'habits', type: 'string[]', required: true, aiPromptHint: 'Ask what daily habits they want to track' },
        { name: 'streakGoalDays', type: 'number', required: false },
      ],
    };

    PluginRegistry.register(habitManifest, true);

    // AI discovers schema instructions
    const activeSchemas = PluginContextExtractor.buildActiveSchemas(
      PluginRegistry.getActivePlugins(),
      {}
    );
    const instructions = PluginContextExtractor.generatePluginPromptInstructions(activeSchemas);
    expect(instructions.systemInstruction).toMatch(/Habit Tracker/i);
    expect(instructions.requiredFieldsSummary['habit-tracker']).toContain('habits');

    // Simulate Gemini conversation returning plugin update
    const aiResponseWithPluginUpdate = `
      I've set up your habits!
      \`\`\`json
      {
        "pluginUpdates": {
          "habit-tracker": {
            "habits": ["Code 1hr", "Review PRs", "Drink 2L water"],
            "streakGoalDays": 30
          }
        }
      }
      \`\`\`
    `;

    const dispatchResult = PluginUpdateDispatcher.parseAndDispatch(
      aiResponseWithPluginUpdate,
      PluginRegistry.getActivePlugins()
    );

    expect(dispatchResult.success).toBe(true);
    expect(dispatchResult.dispatchedPluginIds).toContain('habit-tracker');

    const habitData = PluginRegistry.readPluginStorage('habit-tracker');
    expect(habitData?.habits).toContain('Code 1hr');

    // Push plugin data to backend
    const pluginSyncRes = await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        key: 'plugin_habit-tracker',
        payload: habitData,
      });

    expect(pluginSyncRes.status).toBe(200);

    // ═══════════════════════════════════════════════════════════════════════
    // 6. STEP 6: STATE CONSISTENCY ACROSS ALL BACKEND STORAGE TABLES
    // ═══════════════════════════════════════════════════════════════════════
    // Query all synced records for the user from backend GET /api/sync/pull
    const pullRes = await request(app)
      .get('/api/sync/pull')
      .set('Authorization', `Bearer ${authToken}`);

    expect(pullRes.status).toBe(200);
    const serverStores = pullRes.body.data;

    // Verify all steps are persisted in the backend database
    expect(serverStores).toHaveProperty('paios_goals');
    expect(serverStores).toHaveProperty('paios_timetable_v1');
    expect(serverStores).toHaveProperty('plugin_habit-tracker');

    // Verify data correctness
    expect(serverStores['plugin_habit-tracker'].habits).toContain('Code 1hr');
    expect(serverStores['paios_goals'][0].title).toBe(primaryGoal.title);
  });
});
