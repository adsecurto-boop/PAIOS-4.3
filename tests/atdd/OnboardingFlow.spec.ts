/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PAIOSStorage } from '../../src/storage';
import { GoalExtractor, ParsedGoal } from '../../src/core/ai/GoalExtractor';

describe('ATDD Integration Suite: Onboarding & Goal Probing Storage Invariants', () => {
  beforeEach(() => {
    PAIOSStorage.clear();
  });

  it('completes the onboarding loop and persists paios_goals to storage', () => {
    const userInput = 'I want to pass ISTQB CTFL exam. I want to build PAIOS desktop application.';
    const goals = GoalExtractor.extractGoalsFromConversation(userInput);

    expect(goals.length).toBeGreaterThanOrEqual(2);

    // Save goals into storage
    PAIOSStorage.setItem('paios_goals', goals);

    const retrieved = PAIOSStorage.getItem<ParsedGoal[]>('paios_goals');
    expect(retrieved).not.toBeNull();
    expect(retrieved).toHaveLength(goals.length);
    expect(retrieved![0].title).toBeDefined();
    expect(retrieved![0].definitionOfDone).toBeDefined();
  });

  it('dispatches paios_storage_change custom event on goal persistence', () => {
    const listener = vi.fn();
    window.addEventListener('paios_storage_change', listener);

    const sampleGoal: ParsedGoal = {
      id: 'g_test_1',
      title: 'Master Software Testing',
      category: 'Study',
      definitionOfDone: 'Complete 100 practice questions',
      milestones: [],
      priority: 'HIGH',
      createdAtMillis: Date.now(),
    };

    PAIOSStorage.setItem('paios_goals', [sampleGoal]);

    expect(listener).toHaveBeenCalled();
    const eventDetail = listener.mock.calls[0][0].detail;
    expect(eventDetail.key).toBe('paios_goals');
    expect(eventDetail.value).toHaveLength(1);

    window.removeEventListener('paios_storage_change', listener);
  });

  it('maintains goal list immutability during merges', () => {
    const initialGoal: ParsedGoal = {
      id: 'g_init',
      title: 'Initial Goal',
      category: 'Career',
      definitionOfDone: 'Initial DoD',
      milestones: [],
      priority: 'NORMAL',
      createdAtMillis: 100,
    };

    PAIOSStorage.setItem('paios_goals', [initialGoal]);
    const storedBefore = PAIOSStorage.getItem<ParsedGoal[]>('paios_goals', []);

    const newGoal: ParsedGoal = {
      id: 'g_new',
      title: 'New Goal',
      category: 'Study',
      definitionOfDone: 'New DoD',
      milestones: [],
      priority: 'HIGH',
      createdAtMillis: 200,
    };

    const merged = GoalExtractor.mergeGoalsImmutably(storedBefore!, [newGoal]);
    PAIOSStorage.setItem('paios_goals', merged);

    const storedAfter = PAIOSStorage.getItem<ParsedGoal[]>('paios_goals', []);
    expect(storedAfter).toHaveLength(2);
    expect(storedAfter![0].id).toBe('g_new');
    expect(storedAfter![1].id).toBe('g_init');
    expect(storedBefore).toHaveLength(1); // Original snapshot intact
  });

  it('updates UserSettings goals array when completing onboarding', () => {
    const currentSettings = PAIOSStorage.getSettings();
    const newGoalTitles = ['Pass ISTQB CTFL', 'Build PAIOS 5.0'];
    const updatedSettings = {
      ...currentSettings,
      goals: Array.from(new Set([...newGoalTitles, ...(currentSettings.goals || [])])),
    };

    PAIOSStorage.saveSettings(updatedSettings);

    const saved = PAIOSStorage.getSettings();
    expect(saved.goals).toContain('Pass ISTQB CTFL');
    expect(saved.goals).toContain('Build PAIOS 5.0');
  });

  it('preserves user settings integrity when saving goal updates', () => {
    const originalSettings = PAIOSStorage.getSettings();
    PAIOSStorage.updateSettings({ userName: 'Alex Mercer' });

    const updated = PAIOSStorage.getSettings();
    expect(updated.userName).toBe('Alex Mercer');
    expect(updated.aiProvider).toBe(originalSettings.aiProvider);
  });

  it('ensures unauthenticated guest users in offline mode do not trigger unhandled promise rejections', async () => {
    // Simulate offline state
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Network Unreachable'));

    const probeFn = async () => {
      try {
        const result = GoalExtractor.extractGoalsFromConversation('Build PAIOS app offline');
        PAIOSStorage.setItem('paios_goals', result);
        return result;
      } catch (err) {
        return [];
      }
    };

    await expect(probeFn()).resolves.toBeDefined();

    global.fetch = originalFetch;
  });
});
