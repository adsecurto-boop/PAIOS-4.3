import { PAIOSStorage } from '../../storage';

export interface EphemeralContextEntry<T = any> {
  id: string;
  key: string;
  data: T;
  createdAtMillis: number;
  expiresAtMillis: number; // Rule C1: exactly 48h (172,800,000 ms)
  type: 'mood' | 'journal_raw' | 'emotional_state' | 'transient_focus' | 'ambient';
}

export interface ContextCacheOptions {
  db?: any;
}

export class ContextCache {
  public static TTL_48_HOURS_MS = 48 * 60 * 60 * 1000; // 172800000 ms
  public static STORAGE_KEY = 'paios_context_cache';

  private entries: Map<string, EphemeralContextEntry> = new Map();
  private db: any = null;

  constructor(options?: ContextCacheOptions) {
    this.db = options?.db ?? null;
  }

  /**
   * Adds or updates an ephemeral context entry with 48h TTL tied to device clock.
   */
  public addEntry<T = any>(
    key: string,
    data: T,
    type: EphemeralContextEntry['type'] = 'journal_raw',
    deviceTime: number = Date.now(),
    customTtlMs: number = ContextCache.TTL_48_HOURS_MS
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

  /**
   * Retrieves an ephemeral context entry if it has not expired according to the device clock.
   */
  public getEntry<T = any>(key: string, currentDeviceTime: number = Date.now()): EphemeralContextEntry<T> | null {
    const entry = this.entries.get(key);
    if (!entry) return null;

    if (currentDeviceTime >= entry.expiresAtMillis) {
      return null;
    }

    return entry as EphemeralContextEntry<T>;
  }

  /**
   * Returns all active ephemeral context entries.
   */
  public getAllActiveEntries(currentDeviceTime: number = Date.now()): EphemeralContextEntry[] {
    const active: EphemeralContextEntry[] = [];
    for (const entry of this.entries.values()) {
      if (currentDeviceTime < entry.expiresAtMillis) {
        active.push(entry);
      }
    }
    return active;
  }

  /**
   * Purges all expired ephemeral context entries.
   * Crucially, leaves persistent storage (like 'paios_goals' and 'paios_longterm_memory') intact.
   */
  public purgeExpired(currentDeviceTime: number = Date.now()): number {
    let purgedCount = 0;
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.entries.entries()) {
      if (currentDeviceTime >= entry.expiresAtMillis) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.entries.delete(key);
      purgedCount++;
    }

    // Update ephemeral storage without touching other persistent storage keys
    const remainingActive = Array.from(this.entries.values());
    PAIOSStorage.setItem(ContextCache.STORAGE_KEY, remainingActive);

    return purgedCount;
  }

  /**
   * Persists active entries into SQLite user_storage and PAIOSStorage.
   */
  public persistToStorage(userId: string = 'default_user'): void {
    const activeEntries = Array.from(this.entries.values());
    PAIOSStorage.setItem(ContextCache.STORAGE_KEY, activeEntries);

    if (this.db) {
      try {
        const payload = JSON.stringify(activeEntries);
        const id = `storage_${userId}_${ContextCache.STORAGE_KEY}`;
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO user_storage (id, user_id, storage_key, payload, version, updated_at)
          VALUES (?, ?, ?, ?, 1, ?)
        `);
        stmt.run(id, userId, ContextCache.STORAGE_KEY, payload, Date.now());
      } catch (err) {
        console.error('[ContextCache] Failed to persist to SQLite user_storage:', err);
      }
    }
  }

  /**
   * Loads cached entries from SQLite user_storage or PAIOSStorage.
   */
  public loadFromStorage(userId: string = 'default_user'): void {
    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          SELECT payload FROM user_storage WHERE storage_key = ? AND user_id = ?
        `);
        const row = stmt.get(ContextCache.STORAGE_KEY, userId);
        if (row && row.payload) {
          const loaded: EphemeralContextEntry[] = JSON.parse(row.payload);
          this.entries.clear();
          for (const item of loaded) {
            this.entries.set(item.key, item);
          }
          return;
        }
      } catch (err) {
        console.error('[ContextCache] Failed to load from SQLite user_storage:', err);
      }
    }

    const stored = PAIOSStorage.getItem<EphemeralContextEntry[]>(ContextCache.STORAGE_KEY, []) || [];
    this.entries.clear();
    for (const item of stored) {
      this.entries.set(item.key, item);
    }
  }

  /**
   * Clears the in-memory cache and ephemeral storage.
   */
  public clear(): void {
    this.entries.clear();
    PAIOSStorage.removeItem(ContextCache.STORAGE_KEY);
  }
}

export default ContextCache;
