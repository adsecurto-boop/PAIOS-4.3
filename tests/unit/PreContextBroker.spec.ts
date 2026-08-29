/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PreContextBroker } from '../../src/core/broker/PreContextBroker';
import { PAIOSStorage } from '../../src/storage';

describe('Unit Test: PreContextBroker Inbound Staging & Rule B2 Force Sync', () => {
  beforeEach(() => {
    PreContextBroker.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('enqueues inbound PIT records into staging buffer', () => {
    const item = PreContextBroker.enqueuePIT({
      source_plugin_id: 'test_plugin',
      priority: 'high',
      severity: 'warning',
      payload: { test: true },
    });

    expect(item.id).toContain('pit_');
    expect(item.status).toBe('staged');
    expect(PreContextBroker.getBufferCount()).toBe(1);
  });

  it('resets debounce timer on consecutive enqueue operations', () => {
    PreContextBroker.enqueuePIT({ source_plugin_id: 'p1', payload: { a: 1 } });
    expect(PreContextBroker.getBufferCount()).toBe(1);

    PreContextBroker.enqueuePIT({ source_plugin_id: 'p2', payload: { a: 2 } });
    expect(PreContextBroker.getBufferCount()).toBe(2);
  });

  it('flushes buffer immediately on Rule B2 triggerForceSync override', async () => {
    PreContextBroker.enqueuePIT({
      source_plugin_id: 'plugin_a',
      priority: 'critical',
      severity: 'blocker',
      payload: { data: 'a' },
    });

    PreContextBroker.enqueuePIT({
      source_plugin_id: 'plugin_b',
      priority: 'low',
      severity: 'info',
      payload: { data: 'b' },
    });

    expect(PreContextBroker.getBufferCount()).toBe(2);

    const result = await PreContextBroker.triggerForceSync();

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(PreContextBroker.getBufferCount()).toBe(0); // Buffer is empty after sync

    // Verify stored synced records
    const stored = PreContextBroker.getSyncedRecords();
    expect(stored.length).toBeGreaterThanOrEqual(2);
    expect(stored[0].source_plugin_id).toBe('plugin_a'); // Higher priority ranked first
  });

  it('dispatches precontext_pit_synced CustomEvent on force sync', async () => {
    const listener = vi.fn();
    window.addEventListener('precontext_pit_synced', listener);

    PreContextBroker.enqueuePIT({
      source_plugin_id: 'event_test_plugin',
      payload: { alert: 'test' },
    });

    await PreContextBroker.triggerForceSync();

    expect(listener).toHaveBeenCalled();
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail.count).toBe(1);
    expect(event.detail.items[0].source_plugin_id).toBe('event_test_plugin');

    window.removeEventListener('precontext_pit_synced', listener);
  });

  it('clears all buffer items and storage on clearAll()', () => {
    PreContextBroker.enqueuePIT({ source_plugin_id: 'p1', payload: {} });
    expect(PreContextBroker.getBufferCount()).toBe(1);

    PreContextBroker.clearAll();
    expect(PreContextBroker.getBufferCount()).toBe(0);
    expect(PreContextBroker.getSyncedRecords()).toEqual([]);
  });

  it('handles empty buffer sync cleanly', async () => {
    const result = await PreContextBroker.triggerForceSync();
    expect(result.success).toBe(true);
    expect(result.count).toBe(0);
  });
});
