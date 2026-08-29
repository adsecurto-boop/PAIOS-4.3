/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictResolver } from '../../src/core/sync/ConflictResolver';
import { PAIOSStorage } from '../../src/storage';

describe('ATDD Integration Suite: Deterministic Conflict Resolution & Goal Preservation', () => {
  beforeEach(() => {
    PAIOSStorage.clear();
  });

  it('guarantees user goals (paios_goals) are never deleted during remote sync merge', () => {
    const localGoals = [
      { id: 'g_1', title: 'Pass ISTQB CTFL', category: 'Study' },
      { id: 'g_2', title: 'Build PAIOS 5.0', category: 'Career' },
    ];

    const remoteGoals = [
      { id: 'g_3', title: 'Master Playwright Automation', category: 'Testing' },
    ];

    PAIOSStorage.setItem('paios_goals', localGoals);

    const mergedGoals = ConflictResolver.resolveConflict(localGoals, remoteGoals, {
      storageKey: 'paios_goals',
    });

    expect(mergedGoals).toHaveLength(3);
    expect(mergedGoals.map((g: any) => g.id)).toEqual(expect.arrayContaining(['g_1', 'g_2', 'g_3']));
  });

  it('handles empty local or remote goal arrays safely during resolution', () => {
    const localGoals = [{ id: 'g_1', title: 'Only Local Goal' }];
    expect(ConflictResolver.resolveConflict(localGoals, [], { storageKey: 'paios_goals' })).toHaveLength(1);
    expect(ConflictResolver.resolveConflict([], localGoals, { storageKey: 'paios_goals' })).toHaveLength(1);
  });

  it('resolves remote dominance when remote version is higher than local version', () => {
    const localTasks = [{ id: 't1', title: 'Old Local Task' }];
    const remoteTasks = [{ id: 't1', title: 'Updated Remote Task' }];

    const resolved = ConflictResolver.resolveConflict(localTasks, remoteTasks, {
      localVersion: 1,
      remoteVersion: 2,
    });

    expect(resolved[0].title).toBe('Updated Remote Task');
  });

  it('resolves LWW timestamp tiebreak when versions are equal', () => {
    const localSettings = { theme: 'DARK', userName: 'Alex Local' };
    const remoteSettings = { theme: 'DARK', userName: 'Alex Remote' };

    const resolved = ConflictResolver.resolveConflict(localSettings, remoteSettings, {
      localVersion: 1,
      remoteVersion: 1,
      localUpdatedAt: 1000,
      remoteUpdatedAt: 2000, // Remote is newer
    });

    expect(resolved.userName).toBe('Alex Remote');
  });

  it('merges non-conflicting setting fields during dictionary resolution', () => {
    const localSettings = { morningCheckInTime: '08:00', userName: 'Alex' };
    const remoteSettings = { eveningReviewTime: '21:30', userName: 'Alex' };

    const resolved = ConflictResolver.resolveConflict(localSettings, remoteSettings, {
      localVersion: 1,
      remoteVersion: 1,
      localUpdatedAt: 1000,
      remoteUpdatedAt: 1000,
    });

    expect(resolved.morningCheckInTime).toBe('08:00');
    expect(resolved.eveningReviewTime).toBe('21:30');
  });
});
