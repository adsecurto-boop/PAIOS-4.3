/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { PAIOSStorage } from '../../src/storage';

describe('Unit Test: Journal & Reflection Entry Vault', () => {
  beforeEach(() => {
    PAIOSStorage.clear();
  });

  it('adds and retrieves journal entries', () => {
    const entry = PAIOSStorage.addJournalEntry(
      'Deep Focus Reflection',
      'Today I completed PAIOS 5.0 architecture and verified all test suites.',
      8,
      'Productivity',
      'AI, Systems'
    );

    expect(entry.id).toBeDefined();
    expect(entry.moodScore).toBe(8);

    const journal = PAIOSStorage.getJournalEntries();
    expect(journal.some((j) => j.id === entry.id)).toBe(true);
  });

  it('deletes journal entry from storage', () => {
    const entry = PAIOSStorage.addJournalEntry('Temp Entry', 'Delete me', 5);
    PAIOSStorage.deleteJournalEntry(entry.id);

    const journal = PAIOSStorage.getJournalEntries();
    expect(journal.some((j) => j.id === entry.id)).toBe(false);
  });

  it('filters journal entries by tags or category', () => {
    PAIOSStorage.addJournalEntry('Testing Journal', 'Content', 7, 'Testing', 'QA, Playwright');
    PAIOSStorage.addJournalEntry('Study Journal', 'Content', 9, 'Study', 'ISTQB');

    const journal = PAIOSStorage.getJournalEntries();
    const testingEntries = journal.filter((j) => j.category === 'Testing');
    expect(testingEntries).toHaveLength(1);
    expect(testingEntries[0].title).toBe('Testing Journal');
  });

  it('includes journal entries in global search', () => {
    PAIOSStorage.addJournalEntry('ISTQB Study Strategy', 'Focus on boundary value analysis', 9);
    const searchRes = PAIOSStorage.globalSearch('boundary');

    expect(searchRes.journal).toHaveLength(1);
    expect(searchRes.journal[0].title).toBe('ISTQB Study Strategy');
  });

  it('handles empty search query returning empty results', () => {
    const emptyRes = PAIOSStorage.globalSearch('');
    expect(emptyRes.journal).toEqual([]);
    expect(emptyRes.tasks).toEqual([]);
  });

  it('persists journal entry timestamps accurately', () => {
    const now = Date.now();
    const entry = PAIOSStorage.addJournalEntry('Timestamped Entry', 'Body text', 8);
    expect(entry.createdAtMillis).toBeGreaterThanOrEqual(now);
    expect(entry.updatedAtMillis).toBeGreaterThanOrEqual(now);
  });

  it('defaults mood score to 5 when not provided', () => {
    const entry = PAIOSStorage.addJournalEntry('Default Mood', 'Content');
    expect(entry.moodScore).toBe(5);
  });
});
