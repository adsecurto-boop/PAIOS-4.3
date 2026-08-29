import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { PAIOSStorage } from '../../src/storage';

export interface EphemeralContextEntry<T = any> {
  id: string;
  key: string;
  data: T;
  createdAtMillis: number;
  expiresAtMillis: number; // Rule C1: exactly 48h (172,800,000 ms)
  type: 'mood' | 'journal_raw' | 'emotional_state' | 'transient_focus' | 'ambient';
}

// Module resolver for target ContextCache service
let ContextCache: any = class MockContextCache {
  private entries: Map<string, EphemeralContextEntry> = new Map();
  private db: any = null;
  public static TTL_48_HOURS_MS = 48 * 60 * 60 * 1000; // 172800000 ms

  constructor(options?: { db?: any }) {
    this.db = options?.db || null;
  }

  addEntry<T = any>(
    key: string,
    data: T,
    type: EphemeralContextEntry['type'] = 'journal_raw',
    deviceTime = Date.now(),
    customTtlMs = MockContextCache.TTL_48_HOURS_MS
  ): EphemeralContextEntry<T> {
    const entry: EphemeralContextEntry<T> = {
      id: `ctx_${deviceTime}_${Math.random().toString(36).substring(2, 7)}`,
      key,
      data,
      type,
      createdAtMillis: deviceTime,
      expiresAtMillis: deviceTime + customTtlMs,
    };
    this.entries.set(key, entry);
    return entry;
  }

  getEntry<T = any>(key: string, currentDeviceTime = Date.now()): EphemeralContextEntry<T> | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (currentDeviceTime >= entry.expiresAtMillis) {
      return null;
    }
    return entry as EphemeralContextEntry<T>;
  }

  getAllActiveEntries(currentDeviceTime = Date.now()): EphemeralContextEntry[] {
    const active: EphemeralContextEntry[] = [];
    for (const entry of this.entries.values()) {
      if (currentDeviceTime < entry.expiresAtMillis) {
        active.push(entry);
      }
    }
    return active;
  }

  purgeExpired(currentDeviceTime = Date.now()): number {
    return 0; // Scaffold fallback (Awaiting implementation)
  }

  persistToStorage(): void {
    // Scaffold fallback
  }

  loadFromStorage(): void {
    // Scaffold fallback
  }
};

try {
  // @ts-ignore
  const imported = await import('../../src/core/memory/ContextCache');
  if (imported.ContextCache) ContextCache = imported.ContextCache;
} catch {
  // Awaiting AI Studio implementation (RED state)
}

describe('Unit Test: Ephemeral Context Cache & 48h Device-Clock TTL Lifecycle (Step 4)', () => {
  let cache: any;
  let mockDb: any;
  const START_DEVICE_TIME = 1787900000000; // Fixed deterministic device timestamp

  beforeEach(() => {
    mockDb = new Database(':memory:');
    mockDb.exec(`
      CREATE TABLE IF NOT EXISTS user_storage (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        storage_key TEXT NOT NULL,
        payload TEXT NOT NULL DEFAULT '{}',
        version INTEGER NOT NULL DEFAULT 1,
        updated_at INTEGER NOT NULL
      );
    `);
    cache = new ContextCache({ db: mockDb });
    PAIOSStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (mockDb) mockDb.close();
  });

  describe('Rule C1: 48-Hour Device Clock Expiration Policy', () => {
    it('creates ephemeral entries with exactly 48-hour (172,800,000ms) TTL timestamp', () => {
      const entry = cache.addEntry(
        'morning_mood',
        { score: 8, feeling: 'energized and focused' },
        'mood',
        START_DEVICE_TIME
      );

      expect(entry.createdAtMillis).toBe(START_DEVICE_TIME);
      expect(entry.expiresAtMillis).toBe(START_DEVICE_TIME + 48 * 60 * 60 * 1000);
      expect(entry.expiresAtMillis - entry.createdAtMillis).toBe(172800000);
    });

    it('retrieves active ephemeral entries when device clock is within the 48h window', () => {
      cache.addEntry(
        'journal_reflection',
        'Deep work session accomplished 4 hours of test framework refactoring.',
        'journal_raw',
        START_DEVICE_TIME
      );

      // Device clock advances by 47 hours and 59 minutes (within 48h TTL)
      const clockAt47h = START_DEVICE_TIME + 47 * 60 * 60 * 1000 + 59 * 60 * 1000;
      const retrieved = cache.getEntry('journal_reflection', clockAt47h);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.data).toContain('Deep work session accomplished');
    });

    it('purgeExpired(currentDeviceTime) removes entries older than 48h while preserving active entries', () => {
      // 1. Old entry (created at T0)
      cache.addEntry('old_transient_state', { fatigueLevel: 6 }, 'emotional_state', START_DEVICE_TIME);

      // 2. Fresh entry (created at T0 + 30h)
      const freshTime = START_DEVICE_TIME + 30 * 60 * 60 * 1000;
      cache.addEntry('fresh_journal_note', 'Shipped Step 3 PR review', 'journal_raw', freshTime);

      // Device clock reaches T0 + 49 hours
      const clockAt49h = START_DEVICE_TIME + 49 * 60 * 60 * 1000;

      const purgedCount = cache.purgeExpired(clockAt49h);
      expect(purgedCount).toBe(1);

      // Expired entry should be removed
      expect(cache.getEntry('old_transient_state', clockAt49h)).toBeNull();

      // Fresh entry (only 19h old relative to clockAt49h) must remain active
      const freshRetrieved = cache.getEntry('fresh_journal_note', clockAt49h);
      expect(freshRetrieved).not.toBeNull();
      expect(freshRetrieved?.data).toBe('Shipped Step 3 PR review');
    });

    it('ensures hard-stored goals (paios_goals) remain completely intact and untouched after cache purge', () => {
      // Seed hard-stored goals
      const permanentGoals = [
        { id: 'goal_lead_sdet', title: 'Lead SDET Certification', priority: 'HIGH', definitionOfDone: 'Pass ISTQB' },
      ];
      PAIOSStorage.setItem('paios_goals', permanentGoals);

      // Seed ephemeral cache entries
      cache.addEntry('ephemeral_note', 'Quick draft', 'journal_raw', START_DEVICE_TIME);

      // Advance clock by 100 hours (well past 48h)
      const clockAt100h = START_DEVICE_TIME + 100 * 60 * 60 * 1000;
      cache.purgeExpired(clockAt100h);

      // Ephemeral cache must be purged
      expect(cache.getEntry('ephemeral_note', clockAt100h)).toBeNull();

      // Permanent goals must remain completely untouched
      const retainedGoals = PAIOSStorage.getItem('paios_goals');
      expect(retainedGoals).toEqual(permanentGoals);
    });
  });

  describe('SQLite Persistence of Context Cache', () => {
    it('persists and reloads cached entries to SQLite user_storage with key "paios_context_cache"', () => {
      cache.addEntry('session_reflection', { text: 'Key learning: WAL mode pragma tuning' }, 'journal_raw', START_DEVICE_TIME);
      cache.persistToStorage('user_123');

      // Create separate isolated cache instance and load from same DB
      const isolatedCache = new ContextCache({ db: mockDb });
      isolatedCache.loadFromStorage('user_123');

      const reloadedEntry = isolatedCache.getEntry('session_reflection', START_DEVICE_TIME);
      expect(reloadedEntry).not.toBeNull();
      expect(reloadedEntry?.data).toEqual({ text: 'Key learning: WAL mode pragma tuning' });
    });
  });
});
