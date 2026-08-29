import { Priority, Severity } from './PriorityRanking';

export interface InboundEvent {
  id?: string;
  userId: string;
  sourcePluginId: string;
  targetPluginId?: string;
  priority: Priority;
  severity: Severity;
  payload: Record<string, any>;
  status?: string;
  createdAt?: number;
}

export interface PreContextBrokerOptions {
  db?: any;
  debounceMs?: number;
}

export class PreContextBroker {
  private buffer: InboundEvent[] = [];
  private timer: any = null;
  private subscriber: ((events: InboundEvent[]) => void) | null = null;
  private db: any = null;
  private debounceMs: number = 2500;

  constructor(options?: PreContextBrokerOptions) {
    this.db = options?.db ?? null;
    this.debounceMs = options?.debounceMs ?? 2500;
  }

  public onFlush(callback: (events: InboundEvent[]) => void): void {
    this.subscriber = callback;
  }

  public submitEvent(event: InboundEvent): void {
    const enrichedEvent: InboundEvent = {
      id: event.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId: event.userId,
      sourcePluginId: event.sourcePluginId,
      targetPluginId: event.targetPluginId || undefined,
      priority: event.priority,
      severity: event.severity,
      payload: event.payload || {},
      status: event.status || 'staged',
      createdAt: event.createdAt || Date.now(),
    };

    // Persist to SQLite if database connection is available
    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT INTO plugin_inbound_pit (
            id, user_id, source_plugin_id, target_plugin_id, priority, severity, payload, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          enrichedEvent.id,
          enrichedEvent.userId,
          enrichedEvent.sourcePluginId,
          enrichedEvent.targetPluginId || null,
          enrichedEvent.priority,
          enrichedEvent.severity,
          JSON.stringify(enrichedEvent.payload),
          enrichedEvent.status,
          enrichedEvent.createdAt
        );
      } catch (err) {
        console.error('Failed to stage event into SQLite plugin_inbound_pit:', err);
      }
    }

    // Buffer in memory
    this.buffer.push(enrichedEvent);

    // Reset debounce timer
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.timer = setTimeout(() => {
      this.flushBuffer();
    }, this.debounceMs);
  }

  /**
   * Rule B2: Force Sync Override - immediately flushes the debounce buffer.
   */
  public triggerForceSync(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.flushBuffer();
  }

  public getBufferedCount(): number {
    return this.buffer.length;
  }

  private flushBuffer(): void {
    if (this.buffer.length === 0) return;
    const eventsToFlush = [...this.buffer];
    this.buffer = [];

    if (this.subscriber) {
      this.subscriber(eventsToFlush);
    }
  }
}
