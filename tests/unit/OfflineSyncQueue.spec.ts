/**
 * @vitest-environment jsdom
 *
 * Unit Test Suite: Offline Sync Queue & Auto-Reconnection (Step 6)
 *
 * Tests:
 *   1. Queuing mutations into indexed offline buffer when client is offline.
 *   2. Preserving chronological FIFO order of pending mutations.
 *   3. Flushing pending queue via POST /api/sync/push upon network recovery (online event).
 *   4. Clearing successfully synced items from offline buffer.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OfflineSyncManager, OfflineSyncItem } from '../../src/core/sync/OfflineSyncManager';
import { PAIOSStorage } from '../../src/storage';

describe('Unit Test: Offline Sync Queue & Network Reconnection (Step 6)', () => {
  const MOCK_TOKEN = 'test_jwt_token_user_offline_123';

  beforeEach(() => {
    PAIOSStorage.clear();
    PAIOSStorage.setAuthToken(MOCK_TOKEN);
    OfflineSyncManager.clearQueue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Offline Queueing ──────────────────────────────────────────────────

  describe('Offline Mutation Queueing', () => {
    it('enqueues write operations into the offline sync queue', () => {
      const taskMutation = [{ id: 'task_off_1', title: 'Offline Task 1', status: 'TODO' }];
      const item = OfflineSyncManager.enqueueAction('paios_tasks_v1', taskMutation, 'SAVE');

      expect(item.id).toBeDefined();
      expect(item.key).toBe('paios_tasks_v1');
      expect(item.action).toBe('SAVE');
      expect(item.payload).toEqual(taskMutation);

      expect(OfflineSyncManager.getQueueCount()).toBe(1);
    });

    it('preserves chronological ordering for multiple distinct mutations', () => {
      OfflineSyncManager.enqueueAction('paios_tasks_v1', { title: 'First Task' });
      OfflineSyncManager.enqueueAction('paios_journal_v1', { title: 'First Journal' });
      OfflineSyncManager.enqueueAction('paios_settings_v1', { theme: 'dark' });

      const queue = OfflineSyncManager.getQueue();
      expect(queue).toHaveLength(3);
      expect(queue[0].key).toBe('paios_tasks_v1');
      expect(queue[1].key).toBe('paios_journal_v1');
      expect(queue[2].key).toBe('paios_settings_v1');
    });

    it('deduplicates multiple consecutive edits to the same key keeping the latest payload', () => {
      OfflineSyncManager.enqueueAction('paios_tasks_v1', [{ id: 't1', title: 'Draft v1' }]);
      OfflineSyncManager.enqueueAction('paios_tasks_v1', [{ id: 't1', title: 'Draft v2 Final' }]);

      const queue = OfflineSyncManager.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].payload[0].title).toBe('Draft v2 Final');
    });
  });

  // ── 2. Flush on Network Reconnection ─────────────────────────────────────

  describe('Auto-Reconnection & Queue Flushing (POST /api/sync/push)', () => {
    it('flushes pending queue items in sequence via POST /api/sync/push and clears queue upon 200 OK', async () => {
      // Enqueue two offline items
      OfflineSyncManager.enqueueAction('paios_tasks_v1', [{ id: 't1' }]);
      OfflineSyncManager.enqueueAction('paios_journal_v1', [{ id: 'j1' }]);

      expect(OfflineSyncManager.getQueueCount()).toBe(2);

      const pushedPayloads: any[] = [];
      global.fetch = vi.fn().mockImplementation((url: string, options: any) => {
        if (url === '/api/sync/push') {
          pushedPayloads.push(JSON.parse(options.body));
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
          });
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      });

      // Trigger flush
      const result = await OfflineSyncManager.flushQueue(MOCK_TOKEN);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.remainingQueue).toHaveLength(0);

      // Verify fetch was called for each queued item
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(pushedPayloads[0].key).toBe('paios_tasks_v1');
      expect(pushedPayloads[1].key).toBe('paios_journal_v1');

      // Offline queue in storage is now empty
      expect(OfflineSyncManager.getQueueCount()).toBe(0);
    });

    it('retains failed mutations in the queue when server returns an error or network throws', async () => {
      global.fetch = vi.fn().mockImplementation((url: string, options: any) => {
        const body = JSON.parse(options.body);
        if (body.key === 'paios_failing_key') {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ error: 'Internal Database Lock' }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });
      });

      OfflineSyncManager.enqueueAction('paios_ok_key', { ok: true });
      OfflineSyncManager.enqueueAction('paios_failing_key', { fail: true });

      const result = await OfflineSyncManager.flushQueue(MOCK_TOKEN);

      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(1);

      // Failing key remains in the queue for subsequent retry
      const remaining = OfflineSyncManager.getQueue();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].key).toBe('paios_failing_key');
      expect(remaining[0].retryCount).toBe(1);
    });

    it('attaches window online event listener and automatically flushes on network recovery', async () => {
      const flushSpy = vi.spyOn(OfflineSyncManager, 'flushQueue').mockResolvedValue({
        success: true,
        syncedCount: 1,
        failedCount: 0,
        remainingQueue: [],
      });

      const cleanup = OfflineSyncManager.initAutoReconnection(() => MOCK_TOKEN);

      // Simulate online event
      window.dispatchEvent(new Event('online'));

      expect(flushSpy).toHaveBeenCalled();

      cleanup();
    });
  });
});
