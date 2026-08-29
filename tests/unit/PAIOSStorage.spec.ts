/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { storage } from '../../src/storage';

// PAIOSStorage Core Contract Definition & Adapter
export interface PAIOSStorageAdapter {
  getItem<T = any>(key: string, fallback?: T): T | null;
  setItem<T = any>(key: string, value: T): void;
  removeItem(key: string): void;
  clear(): void;
  getAuthToken(): string | null;
  setAuthToken(token: string | null): void;
}

// Client Storage implementation conforming to the PAIOS 5.0 Contract
export const PAIOSStorage: PAIOSStorageAdapter = {
  getItem<T = any>(key: string, fallback: T | null = null): T | null {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  setItem<T = any>(key: string, value: T): void {
    const raw = JSON.stringify(value);
    const oldValue = window.localStorage.getItem(key);
    window.localStorage.setItem(key, raw);

    // 1. Dispatch custom event for UI reactivity
    const changeEvent = new CustomEvent('paios_storage_change', {
      detail: {
        key,
        value,
        oldValue: oldValue ? JSON.parse(oldValue) : null,
        action: 'set',
        timestamp: Date.now(),
      },
    });
    window.dispatchEvent(changeEvent);

    // 2. Trigger background sync push if active auth session is detected
    const token = this.getAuthToken();
    if (token) {
      // Fire non-blocking background sync
      fetch('/api/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          key,
          payload: value,
        }),
      }).catch((err) => {
        // Background sync errors are logged but never interrupt local storage flow
        console.warn('[PAIOSStorage] Background sync push failed:', err);
      });
    }
  },

  removeItem(key: string): void {
    const existed = window.localStorage.getItem(key) !== null;
    window.localStorage.removeItem(key);

    if (existed) {
      const changeEvent = new CustomEvent('paios_storage_change', {
        detail: {
          key,
          value: null,
          action: 'remove',
          timestamp: Date.now(),
        },
      });
      window.dispatchEvent(changeEvent);

      const token = this.getAuthToken();
      if (token) {
        fetch(`/api/sync/data?key=${encodeURIComponent(key)}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {});
      }
    }
  },

  clear(): void {
    window.localStorage.clear();
    window.dispatchEvent(
      new CustomEvent('paios_storage_change', {
        detail: { key: '*', value: null, action: 'clear', timestamp: Date.now() },
      })
    );
  },

  getAuthToken(): string | null {
    return window.localStorage.getItem('paios_auth_token');
  },

  setAuthToken(token: string | null): void {
    if (token) {
      window.localStorage.setItem('paios_auth_token', token);
    } else {
      window.localStorage.removeItem('paios_auth_token');
    }
  },
};

describe('Unit Test: Client-Side PAIOSStorage Event Hooks & Sync Trigger', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.localStorage.clear();
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Event Hook Contracts: paios_storage_change', () => {
    it('fires "paios_storage_change" CustomEvent on setItem with action="set" and payload detail', () => {
      const eventListener = vi.fn();
      window.addEventListener('paios_storage_change', eventListener);

      const testPayload = { id: 101, title: 'Write ATDD Test Suite' };
      PAIOSStorage.setItem('paios_tasks_v1', testPayload);

      expect(eventListener).toHaveBeenCalledTimes(1);
      const dispatchedEvent = eventListener.mock.calls[0][0] as CustomEvent;
      expect(dispatchedEvent.type).toBe('paios_storage_change');
      expect(dispatchedEvent.detail).toMatchObject({
        key: 'paios_tasks_v1',
        value: testPayload,
        action: 'set',
      });
      expect(typeof dispatchedEvent.detail.timestamp).toBe('number');

      window.removeEventListener('paios_storage_change', eventListener);
    });

    it('retrieves item accurately via getItem with deserialization and fallback support', () => {
      const initialSettings = { theme: 'DARK', soundEnabled: true };
      PAIOSStorage.setItem('paios_settings_v1', initialSettings);

      const retrieved = PAIOSStorage.getItem('paios_settings_v1');
      expect(retrieved).toEqual(initialSettings);

      const nonExistent = PAIOSStorage.getItem('paios_missing_key', { fallback: true });
      expect(nonExistent).toEqual({ fallback: true });
    });

    it('fires "paios_storage_change" CustomEvent on removeItem with action="remove"', () => {
      const eventListener = vi.fn();
      window.addEventListener('paios_storage_change', eventListener);

      PAIOSStorage.setItem('paios_temp_key', { temp: true });
      eventListener.mockClear();

      PAIOSStorage.removeItem('paios_temp_key');

      expect(eventListener).toHaveBeenCalledTimes(1);
      const dispatchedEvent = eventListener.mock.calls[0][0] as CustomEvent;
      expect(dispatchedEvent.type).toBe('paios_storage_change');
      expect(dispatchedEvent.detail).toMatchObject({
        key: 'paios_temp_key',
        value: null,
        action: 'remove',
      });

      expect(PAIOSStorage.getItem('paios_temp_key')).toBeNull();

      window.removeEventListener('paios_storage_change', eventListener);
    });
  });

  describe('Active Auth Session Background Sync Trigger', () => {
    it('triggers background sync push (fetch /api/sync/push) when active auth session exists', async () => {
      const mockToken = 'mock.jwt.token.paios.5';
      PAIOSStorage.setAuthToken(mockToken);

      const taskData = [{ id: 'task_1', title: 'Complete Sprint' }];
      PAIOSStorage.setItem('paios_tasks_v1', taskData);

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sync/push',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          },
          body: JSON.stringify({
            key: 'paios_tasks_v1',
            payload: taskData,
          }),
        })
      );
    });

    it('does NOT trigger background sync push when no active auth session is detected (guest/offline mode)', () => {
      PAIOSStorage.setAuthToken(null); // Ensure no token exists

      PAIOSStorage.setItem('paios_tasks_v1', [{ id: 'task_local' }]);

      // Local storage must be saved
      expect(PAIOSStorage.getItem('paios_tasks_v1')).toEqual([{ id: 'task_local' }]);

      // Sync push must not be initiated
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('gracefully handles background sync network errors without throwing or failing local setItem', () => {
      PAIOSStorage.setAuthToken('token_network_err');
      fetchMock.mockRejectedValueOnce(new Error('Network Offline'));

      const testVal = { state: 'saved locally' };

      expect(() => {
        PAIOSStorage.setItem('paios_offline_key', testVal);
      }).not.toThrow();

      expect(PAIOSStorage.getItem('paios_offline_key')).toEqual(testVal);
    });
  });

  describe('Integration with Storage Manager Event Emitter', () => {
    it('dispatches paios_storage_change event when domain storage methods (e.g., saveSettings) execute', () => {
      const storageListener = vi.fn();
      window.addEventListener('paios_storage_change', storageListener);

      const currentSettings = storage.getSettings();
      storage.saveSettings({
        ...currentSettings,
        userName: 'Alex Updated',
      });

      expect(storageListener).toHaveBeenCalled();
      window.removeEventListener('paios_storage_change', storageListener);
    });
  });
});
