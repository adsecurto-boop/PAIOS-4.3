/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OfflineSyncManager } from '../../src/core/sync/OfflineSyncManager';
import { AuthSyncService } from '../../src/services/AuthSyncService';
import { PAIOSStorage } from '../../src/storage';

describe('ATDD Integration Suite: Offline Mutation Buffering & Reconnection Flushing', () => {
  beforeEach(() => {
    OfflineSyncManager.clearQueue();
    PAIOSStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('buffers local offline writes and flushes automatically on online event', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    vi.spyOn(AuthSyncService, 'getToken').mockReturnValue('valid_auth_jwt');
    const pushSpy = vi.spyOn(AuthSyncService, 'pushData').mockResolvedValue({
      success: true,
      key: 'paios_tasks',
      syncedAt: Date.now(),
    });

    // Enqueue mutation while offline
    OfflineSyncManager.enqueueMutation('paios_tasks', [{ id: 'task_offline_1' }]);
    expect(OfflineSyncManager.getQueue()).toHaveLength(1);

    // Simulate online event
    vi.stubGlobal('navigator', { onLine: true });
    window.dispatchEvent(new Event('online'));

    // Execute flush
    const result = await OfflineSyncManager.flushQueue();

    expect(result.success).toBe(true);
    expect(result.processed).toBe(1);
    expect(OfflineSyncManager.getQueue()).toHaveLength(0);
    expect(pushSpy).toHaveBeenCalledWith('paios_tasks', [{ id: 'task_offline_1' }]);
  });

  it('persists offline mutation queue to localStorage across application reloads', () => {
    vi.stubGlobal('navigator', { onLine: false });
    OfflineSyncManager.enqueueMutation('paios_persisted_key', { val: 'persisted' });

    const rawQueue = PAIOSStorage.getItem('paios_offline_sync_queue');
    expect(rawQueue).toHaveLength(1);
    expect(rawQueue[0].key).toBe('paios_persisted_key');
  });

  it('retains queued items in storage if push throws network error and retries on next connection', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    vi.spyOn(AuthSyncService, 'getToken').mockReturnValue('valid_auth_jwt');
    const pushSpy = vi.spyOn(AuthSyncService, 'pushData');

    // First attempt fails
    pushSpy.mockRejectedValueOnce(new Error('Network Offline'));

    OfflineSyncManager.enqueueMutation('paios_timeline', [{ id: 'tl_1' }]);
    const firstFlush = await OfflineSyncManager.flushQueue();

    expect(firstFlush.processed).toBe(0);
    expect(firstFlush.remaining).toBe(1);

    // Second attempt succeeds
    pushSpy.mockResolvedValueOnce({ success: true, key: 'paios_timeline', syncedAt: Date.now() });
    const secondFlush = await OfflineSyncManager.flushQueue();

    expect(secondFlush.processed).toBe(1);
    expect(secondFlush.remaining).toBe(0);
  });

  it('prevents cyclical echo loop pushes during withRemoteUpdateLock execution', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    vi.spyOn(AuthSyncService, 'getToken').mockReturnValue('valid_auth_jwt');
    const pushSpy = vi.spyOn(AuthSyncService, 'pushData');

    OfflineSyncManager.enqueueMutation('paios_settings', { theme: 'DARK' });

    let lockActiveInside = false;
    await OfflineSyncManager.withRemoteUpdateLock(async () => {
      lockActiveInside = OfflineSyncManager.isRemoteLockActive();
      await OfflineSyncManager.flushQueue();
    });

    expect(lockActiveInside).toBe(true);
    expect(pushSpy).not.toHaveBeenCalled(); // Push skipped during remote lock
  });
});
