import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Severity = 'info' | 'warning' | 'error' | 'blocker';

export interface InboundEvent {
  id?: string;
  userId: string;
  sourcePluginId: string;
  targetPluginId?: string;
  priority: Priority;
  severity: Severity;
  payload: Record<string, any>;
  createdAt?: number;
}

// Module resolver for target PreContextBroker service
let PreContextBroker: any = class MockPreContextBroker {
  private buffer: InboundEvent[] = [];
  private timer: any = null;
  private subscriber: ((events: InboundEvent[]) => void) | null = null;
  private db: any = null;

  constructor(options?: { db?: any }) {
    this.db = options?.db;
  }

  onFlush(callback: (events: InboundEvent[]) => void) {
    this.subscriber = callback;
  }

  submitEvent(event: InboundEvent) {
    // Scaffold fallback (Awaiting implementation)
  }

  triggerForceSync() {
    // Scaffold fallback (Awaiting implementation)
  }

  getBufferedCount() {
    return this.buffer.length;
  }
};

try {
  // @ts-ignore
  const imported = await import('../../src/core/broker/PreContextBroker');
  if (imported.PreContextBroker) PreContextBroker = imported.PreContextBroker;
} catch {
  // Awaiting AI Studio implementation (RED state)
}

describe('ATDD: PreContext Inbound Broker & Sync Buffering (Step 3)', () => {
  let mockDb: any;
  let broker: any;

  beforeEach(() => {
    vi.useFakeTimers();
    mockDb = new Database(':memory:');
    mockDb.exec(`
      CREATE TABLE IF NOT EXISTS plugin_inbound_pit (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        source_plugin_id TEXT NOT NULL,
        target_plugin_id TEXT,
        priority TEXT NOT NULL,
        severity TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'staged',
        created_at INTEGER NOT NULL
      );
    `);
    broker = new PreContextBroker({ db: mockDb });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    if (mockDb) mockDb.close();
  });

  it('buffers rapid mutations across multiple plugins within a 2500ms debounce window', () => {
    const flushSpy = vi.fn();
    broker.onFlush(flushSpy);

    // Rapid plugin mutations
    broker.submitEvent({
      userId: 'user_1',
      sourcePluginId: 'timetable-plugin',
      priority: 'high',
      severity: 'warning',
      payload: { action: 'block_moved', blockId: 'b1' },
    });

    vi.advanceTimersByTime(1000);

    broker.submitEvent({
      userId: 'user_1',
      sourcePluginId: 'tasks-plugin',
      priority: 'medium',
      severity: 'info',
      payload: { action: 'task_completed', taskId: 't1' },
    });

    vi.advanceTimersByTime(1000);

    broker.submitEvent({
      userId: 'user_1',
      sourcePluginId: 'health-plugin',
      priority: 'low',
      severity: 'info',
      payload: { action: 'dose_logged', doseId: 'd1' },
    });

    // Asserts AI context pit receives 0 events until the full 2500ms window settles
    expect(flushSpy).not.toHaveBeenCalled();

    // Advance remaining time to complete 2500ms after last event
    vi.advanceTimersByTime(2500);

    expect(flushSpy).toHaveBeenCalledTimes(1);
    const flushedEvents = flushSpy.mock.calls[0][0];
    expect(flushedEvents).toHaveLength(3);
    expect(flushedEvents.map((e: any) => e.sourcePluginId)).toEqual([
      'timetable-plugin',
      'tasks-plugin',
      'health-plugin',
    ]);
  });

  it('bypasses 2500ms debounce buffer instantly when triggerForceSync() is called (Rule B2 Force Sync Override)', () => {
    const flushSpy = vi.fn();
    broker.onFlush(flushSpy);

    broker.submitEvent({
      userId: 'user_1',
      sourcePluginId: 'timetable-plugin',
      priority: 'critical',
      severity: 'blocker',
      payload: { action: 'emergency_override' },
    });

    // Before timer advances
    expect(flushSpy).not.toHaveBeenCalled();

    // Trigger instant force sync
    broker.triggerForceSync();

    expect(flushSpy).toHaveBeenCalledTimes(1);
    expect(flushSpy.mock.calls[0][0]).toHaveLength(1);
    expect(flushSpy.mock.calls[0][0][0].priority).toBe('critical');
  });

  it('persists staged events to SQLite plugin_inbound_pit table before resolution', () => {
    broker.submitEvent({
      userId: 'user_1',
      sourcePluginId: 'timetable-plugin',
      priority: 'high',
      severity: 'warning',
      payload: { slot: '10:00-11:00', title: 'Deep Work' },
    });

    const rows = mockDb.prepare('SELECT * FROM plugin_inbound_pit WHERE user_id = ?').all('user_1');
    expect(rows.length).toBe(1);
    expect(rows[0].source_plugin_id).toBe('timetable-plugin');
    expect(rows[0].status).toBe('staged');
    expect(JSON.parse(rows[0].payload)).toEqual({ slot: '10:00-11:00', title: 'Deep Work' });
  });
});
