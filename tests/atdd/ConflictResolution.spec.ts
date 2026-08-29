/**
 * @vitest-environment jsdom
 *
 * ATDD Integration Test Suite: Multi-Device Conflict Resolution (Step 6)
 *
 * Tests the ConflictResolver engine:
 *   1. Version hierarchy & timestamp tiebreakers.
 *   2. Non-conflicting dictionary merges (multi-device plugin keys & settings).
 *   3. Non-destructive preservation of hard-stored goals.
 *   4. Remote update loop prevention flags (isApplyingRemoteUpdate).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ConflictResolver,
  SyncStorageRecord,
  ConflictResolutionResult,
} from '../../src/core/sync/ConflictResolver';
import { PAIOSStorage } from '../../src/storage';

describe('ATDD: Multi-Device Conflict Resolution & Loop Prevention (Step 6)', () => {
  beforeEach(() => {
    PAIOSStorage.clear();
    ConflictResolver.setApplyingRemoteUpdate(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Version Hierarchy Resolution ──────────────────────────────────────

  describe('Version Hierarchy & Timestamp Tiebreaking', () => {
    it('deterministically selects remote record when remote version is higher', () => {
      const localRecord: SyncStorageRecord = {
        key: 'paios_tasks_v1',
        payload: [{ id: 'task_1', title: 'Drafting specs on Desktop', status: 'TODO' }],
        version: 2,
        updatedAt: 1000,
        clientDeviceId: 'electron-desktop',
      };

      const remoteRecord: SyncStorageRecord = {
        key: 'paios_tasks_v1',
        payload: [{ id: 'task_1', title: 'Finalized specs on Mobile', status: 'COMPLETED' }],
        version: 3,
        updatedAt: 900, // Even if timestamp is slightly older, higher version wins
        clientDeviceId: 'capacitor-android',
      };

      const result = ConflictResolver.resolve(localRecord, remoteRecord);

      expect(result.winner).toBe('remote');
      expect(result.resolvedVersion).toBe(3);
      expect(result.resolvedPayload).toEqual(remoteRecord.payload);
    });

    it('deterministically selects local record when local version is higher', () => {
      const localRecord: SyncStorageRecord = {
        key: 'paios_settings_v1',
        payload: { theme: 'dark', userName: 'Alex (Desktop)' },
        version: 5,
        updatedAt: 2000,
        clientDeviceId: 'electron-desktop',
      };

      const remoteRecord: SyncStorageRecord = {
        key: 'paios_settings_v1',
        payload: { theme: 'light', userName: 'Alex (Mobile)' },
        version: 4,
        updatedAt: 2500,
        clientDeviceId: 'capacitor-android',
      };

      const result = ConflictResolver.resolve(localRecord, remoteRecord);

      expect(result.winner).toBe('local');
      expect(result.resolvedVersion).toBe(5);
      expect(result.resolvedPayload).toEqual(localRecord.payload);
    });

    it('breaks ties using newest timestamp when versions are identical for primitive payloads', () => {
      const localRecord: SyncStorageRecord<string> = {
        key: 'paios_active_focus_tag',
        payload: 'Study ISTQB',
        version: 1,
        updatedAt: 1000,
      };

      const remoteRecord: SyncStorageRecord<string> = {
        key: 'paios_active_focus_tag',
        payload: 'Coding Step 6',
        version: 1,
        updatedAt: 2000, // Newer timestamp
      };

      const result = ConflictResolver.resolve(localRecord, remoteRecord);

      expect(result.winner).toBe('remote');
      expect(result.resolvedPayload).toBe('Coding Step 6');
    });
  });

  // ── 2. Dictionary Merging ────────────────────────────────────────────────

  describe('Non-Conflicting Dictionary Merging (Multi-Device Plugins & State)', () => {
    it('merges non-conflicting dictionary keys across Desktop and Mobile devices', () => {
      // Desktop installed Habit Tracker
      const localDesktopRecord: SyncStorageRecord = {
        key: 'paios_installed_plugins_data',
        payload: {
          'habit-tracker': { habits: ['Read 20m', 'Exercise'] },
        },
        version: 1,
        updatedAt: 1000,
        clientDeviceId: 'desktop-win11',
      };

      // Mobile installed Budget Tracker
      const remoteMobileRecord: SyncStorageRecord = {
        key: 'paios_installed_plugins_data',
        payload: {
          'budget-tracker': { dailySpendLimit: 50, currency: 'USD' },
        },
        version: 1,
        updatedAt: 1100,
        clientDeviceId: 'android-mobile',
      };

      const result = ConflictResolver.resolve(localDesktopRecord, remoteMobileRecord);

      expect(result.winner).toBe('merged');
      expect(result.resolvedPayload).toHaveProperty('habit-tracker');
      expect(result.resolvedPayload).toHaveProperty('budget-tracker');
      expect(result.resolvedPayload['habit-tracker'].habits).toContain('Read 20m');
      expect(result.resolvedPayload['budget-tracker'].dailySpendLimit).toBe(50);
    });

    it('merges milestone completion statuses without losing progress on either device', () => {
      const localRecord: SyncStorageRecord = {
        key: 'paios_milestones_v1',
        payload: {
          step1_auth: true,
          step2_onboarding: true,
          step3_timetable: false,
        },
        version: 2,
        updatedAt: 2000,
      };

      const remoteRecord: SyncStorageRecord = {
        key: 'paios_milestones_v1',
        payload: {
          step1_auth: true,
          step2_onboarding: true,
          step3_timetable: true, // completed on mobile
          step4_journaling: true, // completed on mobile
        },
        version: 2,
        updatedAt: 2100,
      };

      const result = ConflictResolver.resolve(localRecord, remoteRecord);

      expect(result.winner).toBe('merged');
      expect(result.resolvedPayload.step3_timetable).toBe(true);
      expect(result.resolvedPayload.step4_journaling).toBe(true);
    });
  });

  // ── 3. Hard-Stored Goal Non-Destructive Protection ───────────────────────

  describe('Hard-Stored Goals Non-Destructive Invariant', () => {
    it('prevents destructive overwrites of hard-stored goals when receiving partial/empty remote sync', () => {
      const localHardStoredGoals: SyncStorageRecord = {
        key: 'paios_goals',
        payload: [
          {
            id: 'goal_sdet_2026',
            title: 'Transition to Senior SDET',
            isHardStored: true,
            subprojects: [
              { id: 'sub_istqb', title: 'Complete ISTQB', status: 'COMPLETED' },
              { id: 'sub_playwright', title: 'Build Test Framework', status: 'IN_PROGRESS' },
            ],
          },
        ],
        version: 1,
        updatedAt: 5000,
      };

      // Remote transient sync arrived with empty or partial goals payload
      const remoteTransientSync: SyncStorageRecord = {
        key: 'paios_goals',
        payload: [],
        version: 1,
        updatedAt: 6000, // Newer timestamp
      };

      const result = ConflictResolver.resolve(localHardStoredGoals, remoteTransientSync);

      // Invariant: The hard-stored goal must NOT be deleted or dropped
      expect(result.resolvedPayload).toHaveLength(1);
      expect(result.resolvedPayload[0].id).toBe('goal_sdet_2026');
      expect(result.resolvedPayload[0].title).toBe('Transition to Senior SDET');
    });

    it('merges new subproject progress from remote into existing hard-stored goal without data loss', () => {
      const localGoal: SyncStorageRecord = {
        key: 'paios_goals',
        payload: [
          {
            id: 'goal_sdet_2026',
            title: 'Transition to Senior SDET',
            subprojects: [
              { id: 'sub_istqb', title: 'Complete ISTQB', status: 'IN_PROGRESS' },
            ],
          },
        ],
        version: 1,
        updatedAt: 1000,
      };

      const remoteGoal: SyncStorageRecord = {
        key: 'paios_goals',
        payload: [
          {
            id: 'goal_sdet_2026',
            title: 'Transition to Senior SDET',
            subprojects: [
              { id: 'sub_istqb', title: 'Complete ISTQB', status: 'COMPLETED' }, // updated on mobile
              { id: 'sub_paios5', title: 'Finish PAIOS Step 6', status: 'IN_PROGRESS' }, // added on mobile
            ],
          },
        ],
        version: 1,
        updatedAt: 2000,
      };

      const result = ConflictResolver.resolve(localGoal, remoteGoal);

      expect(result.resolvedPayload[0].subprojects).toHaveLength(2);
      const istqbSub = result.resolvedPayload[0].subprojects.find((s: any) => s.id === 'sub_istqb');
      expect(istqbSub.status).toBe('COMPLETED');
    });
  });

  // ── 4. Remote Echo Loop Prevention ───────────────────────────────────────

  describe('Remote Update Echo Loop Prevention', () => {
    it('sets and clears isApplyingRemoteUpdate flag correctly during remote write locks', async () => {
      expect(ConflictResolver.isApplyingRemoteUpdate()).toBe(false);

      const executed = await ConflictResolver.withRemoteUpdateLock(async () => {
        expect(ConflictResolver.isApplyingRemoteUpdate()).toBe(true);
        return 'done';
      });

      expect(executed).toBe('done');
      expect(ConflictResolver.isApplyingRemoteUpdate()).toBe(false);
    });

    it('resets isApplyingRemoteUpdate even if the wrapped callback throws an error', async () => {
      await expect(
        ConflictResolver.withRemoteUpdateLock(async () => {
          expect(ConflictResolver.isApplyingRemoteUpdate()).toBe(true);
          throw new Error('Simulated sync exception');
        })
      ).rejects.toThrow('Simulated sync exception');

      expect(ConflictResolver.isApplyingRemoteUpdate()).toBe(false);
    });
  });
});
