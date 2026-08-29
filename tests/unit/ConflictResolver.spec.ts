import { describe, it, expect } from 'vitest';
import { ConflictResolver } from '../../src/core/sync/ConflictResolver';

describe('Unit Test: ConflictResolver Deterministic Resolution Engine', () => {
  it('protects hard-stored user goals (paios_goals) from being overwritten or lost', () => {
    const localGoals = [
      { id: 'g_local_1', title: 'Pass ISTQB CTFL', category: 'Study' },
    ];
    const remoteGoals = [
      { id: 'g_remote_1', title: 'Build PAIOS 5.0', category: 'Career' },
    ];

    const resolved = ConflictResolver.resolveConflict(localGoals, remoteGoals, {
      storageKey: 'paios_goals',
    });

    expect(resolved).toHaveLength(2);
    expect(resolved.some((g: any) => g.id === 'g_local_1')).toBe(true);
    expect(resolved.some((g: any) => g.id === 'g_remote_1')).toBe(true);
  });

  it('deduplicates goals by ID when resolving paios_goals conflict', () => {
    const localGoals = [{ id: 'g_1', title: 'Local Version' }];
    const remoteGoals = [{ id: 'g_1', title: 'Remote Version' }];

    const resolved = ConflictResolver.resolveConflict(localGoals, remoteGoals, { storageKey: 'paios_goals' });
    expect(resolved).toHaveLength(1);
    expect(resolved[0].title).toBe('Local Version'); // Local takes precedence
  });

  it('applies version dominance when remote version is higher', () => {
    const localData = { title: 'Old Title' };
    const remoteData = { title: 'New Remote Title' };

    const resolved = ConflictResolver.resolveConflict(localData, remoteData, {
      localVersion: 1,
      remoteVersion: 2,
    });

    expect(resolved).toEqual(remoteData);
  });

  it('applies version dominance when local version is higher', () => {
    const localData = { title: 'Local Dominant Title' };
    const remoteData = { title: 'Remote Stale Title' };

    const resolved = ConflictResolver.resolveConflict(localData, remoteData, {
      localVersion: 3,
      remoteVersion: 1,
    });

    expect(resolved).toEqual(localData);
  });

  it('uses millisecond LWW tiebreaking when versions match', () => {
    const localData = { title: 'Local Older' };
    const remoteData = { title: 'Remote Newer' };

    const resolved = ConflictResolver.resolveConflict(localData, remoteData, {
      localVersion: 1,
      remoteVersion: 1,
      localUpdatedAt: 1000,
      remoteUpdatedAt: 5000, // Newer timestamp
    });

    expect(resolved).toEqual(remoteData);
  });

  it('defaults to local data when timestamps and versions match', () => {
    const localData = 'local_string';
    const remoteData = 'remote_string';

    const resolved = ConflictResolver.resolveConflict(localData, remoteData, {
      localVersion: 1,
      remoteVersion: 1,
      localUpdatedAt: 1000,
      remoteUpdatedAt: 1000,
    });

    expect(resolved).toBe('local_string');
  });

  it('merges non-conflicting plain object keys when timestamps and versions match', () => {
    const localData = { localSetting: true, theme: 'DARK' };
    const remoteData = { remoteSyncSetting: 'ENABLED', theme: 'LIGHT' };

    const resolved = ConflictResolver.resolveConflict(localData, remoteData, {
      localVersion: 1,
      remoteVersion: 1,
      localUpdatedAt: 1000,
      remoteUpdatedAt: 1000,
    });

    expect(resolved.localSetting).toBe(true);
    expect(resolved.remoteSyncSetting).toBe('ENABLED');
    expect(resolved.theme).toBe('DARK'); // Local key overrides on match
  });

  it('returns fallback local data when remote data is null or undefined', () => {
    const localData = { id: 101, text: 'Local Note' };
    expect(ConflictResolver.resolveConflict(localData, null)).toEqual(localData);
    expect(ConflictResolver.resolveConflict(localData, undefined)).toEqual(localData);
  });

  it('returns remote data when local data is null or undefined', () => {
    const remoteData = { id: 202, text: 'Remote Note' };
    expect(ConflictResolver.resolveConflict(null, remoteData)).toEqual(remoteData);
  });

  it('handles primitive boolean conflict resolution correctly', () => {
    expect(ConflictResolver.resolveConflict(true, false, { localVersion: 2, remoteVersion: 1 })).toBe(true);
  });
});
