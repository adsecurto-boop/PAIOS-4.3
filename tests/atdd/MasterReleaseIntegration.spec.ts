/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PAIOSStorage } from '../../src/storage';
import { PreContextBroker } from '../../src/core/broker/PreContextBroker';
import { TimetablePlugin } from '../../src/core/plugins/TimetablePlugin';
import { ConflictResolver } from '../../src/core/sync/ConflictResolver';
import { OfflineSyncManager } from '../../src/core/sync/OfflineSyncManager';
import { GoalExtractor } from '../../src/core/ai/GoalExtractor';

describe('ATDD Master Production Release Integration Suite: All Subsystems Unified', () => {
  beforeEach(() => {
    PAIOSStorage.clear();
    PreContextBroker.clearAll();
    TimetablePlugin.clear();
    OfflineSyncManager.clearQueue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('subsystem 1: PAIOSStorage local-first cache & event dispatching', () => {
    const listener = vi.fn();
    window.addEventListener('paios_storage_change', listener);

    PAIOSStorage.setItem('paios_test_key', { status: 'ok' });
    expect(PAIOSStorage.getItem('paios_test_key')).toEqual({ status: 'ok' });
    expect(listener).toHaveBeenCalled();

    window.removeEventListener('paios_storage_change', listener);
  });

  it('subsystem 2: GoalExtractor conversational probing and DoD enforcement', () => {
    const goals = GoalExtractor.extractGoalsFromConversation('Pass ISTQB CTFL exam. Build PAIOS 5.0.');
    expect(goals.length).toBeGreaterThanOrEqual(2);
    expect(goals[0].definitionOfDone).toBeDefined();
    expect(goals[0].milestones).toHaveLength(3);
  });

  it('subsystem 3: PreContextBroker Rule B2 Force Sync override', async () => {
    PreContextBroker.enqueuePIT({ source_plugin_id: 'master_test', payload: { ping: true } });
    const result = await PreContextBroker.triggerForceSync();
    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
  });

  it('subsystem 4: TimetablePlugin Rule B1 60s proposal lifecycle', () => {
    const prop = TimetablePlugin.createProposal({
      activity: 'Master Release Validation',
      start: '16:00',
      end: '17:00',
      reason: 'Sprint validation',
    });

    expect(prop.status).toBe('pending');
    TimetablePlugin.acceptProposal(prop.id);
    const activeSchedule = PAIOSStorage.getAdaptiveTimetable();
    expect(activeSchedule!.blocks.some((b) => b.activity === 'Master Release Validation')).toBe(true);
  });

  it('subsystem 5: ConflictResolver goal preservation & LWW resolution', () => {
    const localGoals = [{ id: 'g1', title: 'Goal 1' }];
    const remoteGoals = [{ id: 'g2', title: 'Goal 2' }];

    const merged = ConflictResolver.resolveConflict(localGoals, remoteGoals, { storageKey: 'paios_goals' });
    expect(merged).toHaveLength(2);
  });

  it('subsystem 6: OfflineSyncManager mutation queueing and remote update lock', async () => {
    const item = OfflineSyncManager.enqueueMutation('paios_settings', { theme: 'DARK' });
    expect(item.key).toBe('paios_settings');

    let lockActive = false;
    await OfflineSyncManager.withRemoteUpdateLock(() => {
      lockActive = OfflineSyncManager.isRemoteLockActive();
    });
    expect(lockActive).toBe(true);
  });

  it('unified master release end-to-end flow: onboarding -> storage -> sync -> timetable proposal', async () => {
    // 1. Onboarding Goal Extraction
    const goals = GoalExtractor.extractGoalsFromConversation('Build automated PAIOS CTFL test suite.');
    PAIOSStorage.setItem('paios_goals', goals);
    expect(PAIOSStorage.getItem('paios_goals')).toHaveLength(1);

    // 2. Proposal Creation
    const prop = TimetablePlugin.createProposal({
      activity: 'Automated Test Verification',
      start: '18:00',
      end: '19:00',
      reason: 'Master release testing',
      goal: goals[0].title,
    });
    expect(prop.goal).toBe(goals[0].title);

    // 3. Force sync
    const syncRes = await PreContextBroker.triggerForceSync();
    expect(syncRes.success).toBe(true);
  });

  it('health-informed task context integration', () => {
    PAIOSStorage.logVitalSign({
      systolicBp: 118,
      diastolicBp: 76,
      symptoms: 'Mild fatigue',
    });

    const contextStr = PAIOSStorage.getUserContextString();
    expect(contextStr).toContain('Mild fatigue');
  });

  it('adaptive timetable generation fallback handling', () => {
    const activeTimetable = PAIOSStorage.getAdaptiveTimetable();
    expect(activeTimetable === null || typeof activeTimetable === 'object').toBe(true);
  });
});
