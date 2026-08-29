import { describe, it, expect } from 'vitest';
import { OfflineSyncManager } from '../../src/core/sync/OfflineSyncManager';

describe('Unit Test: Remote Echo Loop Prevention Guard', () => {
  it('sets remote lock active during withRemoteUpdateLock execution', async () => {
    expect(OfflineSyncManager.isRemoteLockActive()).toBe(false);

    let lockStatusInside = false;
    await OfflineSyncManager.withRemoteUpdateLock(async () => {
      lockStatusInside = OfflineSyncManager.isRemoteLockActive();
    });

    expect(lockStatusInside).toBe(true);
    expect(OfflineSyncManager.isRemoteLockActive()).toBe(false);
  });

  it('resets remote lock even if locked function throws exception', async () => {
    try {
      await OfflineSyncManager.withRemoteUpdateLock(async () => {
        throw new Error('Remote Write Exception');
      });
    } catch (e) {}

    expect(OfflineSyncManager.isRemoteLockActive()).toBe(false);
  });

  it('handles nested withRemoteUpdateLock calls safely', async () => {
    await OfflineSyncManager.withRemoteUpdateLock(async () => {
      expect(OfflineSyncManager.isRemoteLockActive()).toBe(true);
      await OfflineSyncManager.withRemoteUpdateLock(async () => {
        expect(OfflineSyncManager.isRemoteLockActive()).toBe(true);
      });
    });
    expect(OfflineSyncManager.isRemoteLockActive()).toBe(false);
  });

  it('skips offline queue flush during active remote lock', async () => {
    OfflineSyncManager.enqueueMutation('sync_key', { data: 1 });

    let flushResult = null;
    await OfflineSyncManager.withRemoteUpdateLock(async () => {
      flushResult = await OfflineSyncManager.flushQueue();
    });

    expect(flushResult).not.toBeNull();
    expect((flushResult as any).processed).toBe(0);
  });

  it('returns function value from withRemoteUpdateLock', async () => {
    const value = await OfflineSyncManager.withRemoteUpdateLock(() => {
      return 'remote_write_success';
    });
    expect(value).toBe('remote_write_success');
  });

  it('supports async promise returning functions inside lock', async () => {
    const val = await OfflineSyncManager.withRemoteUpdateLock(async () => {
      return Promise.resolve(42);
    });
    expect(val).toBe(42);
  });
});
