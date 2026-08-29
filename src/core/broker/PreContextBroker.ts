import { Priority, Severity, PriorityRanking, RankableItem, PriorityLevel, SeverityLevel } from './PriorityRanking';
import { PAIOSStorage } from '../../storage';

export interface InboundEvent {
  id?: string;
  userId?: string;
  sourcePluginId?: string;
  targetPluginId?: string;
  priority: Priority;
  severity: Severity;
  payload: Record<string, any>;
  status?: string;
  createdAt?: number;
}

export interface InboundPITRecord extends RankableItem {
  id: string;
  source_plugin_id: string;
  target_plugin_id?: string;
  priority: PriorityLevel;
  severity: SeverityLevel;
  payload: any;
  status: 'staged' | 'synced' | 'rejected';
  created_at: number;
}

export interface PreContextBrokerOptions {
  db?: any;
  debounceMs?: number;
}

export class PreContextBroker {
  // Static state for client-side PIT event broker
  private static staticBuffer: InboundPITRecord[] = [];
  private static staticDebounceTimer: any = null;
  private static STATIC_DEBOUNCE_DELAY_MS = 2500;
  private static isSyncing = false;

  // Instance state for server/backend/test instances
  private buffer: InboundEvent[] = [];
  private timer: any = null;
  private subscriber: ((events: InboundEvent[]) => void) | null = null;
  private db: any = null;
  private debounceMs: number = 2500;

  constructor(options?: PreContextBrokerOptions) {
    this.db = options?.db ?? null;
    this.debounceMs = options?.debounceMs ?? 2500;
  }

  // --- Instance Methods ---

  public onFlush(callback: (events: InboundEvent[]) => void): void {
    this.subscriber = callback;
  }

  public submitEvent(event: InboundEvent): void {
    const enrichedEvent: InboundEvent = {
      id: event.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId: event.userId || 'system',
      sourcePluginId: event.sourcePluginId || 'plugin',
      targetPluginId: event.targetPluginId || undefined,
      priority: event.priority,
      severity: event.severity,
      payload: event.payload || {},
      status: event.status || 'staged',
      createdAt: event.createdAt || Date.now(),
    };

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

    this.buffer.push(enrichedEvent);

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.timer = setTimeout(() => {
      this.flushInstanceBuffer();
    }, this.debounceMs);
  }

  public triggerForceSync(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.flushInstanceBuffer();
  }

  public getBufferedCount(): number {
    return this.buffer.length;
  }

  private flushInstanceBuffer(): void {
    if (this.buffer.length === 0) return;
    const eventsToFlush = [...this.buffer];
    this.buffer = [];

    if (this.subscriber) {
      this.subscriber(eventsToFlush);
    }
  }

  // --- Static Methods ---

  /**
   * Enqueues an inbound PIT event into the staging buffer.
   * Starts a 2500ms debounce timer to batch incoming items before flushing.
   */
  static enqueuePIT(item: {
    source_plugin_id: string;
    target_plugin_id?: string;
    priority?: PriorityLevel;
    severity?: SeverityLevel;
    payload: any;
  }): InboundPITRecord {
    const record: InboundPITRecord = {
      id: `pit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      source_plugin_id: item.source_plugin_id,
      target_plugin_id: item.target_plugin_id,
      priority: item.priority || 'medium',
      severity: item.severity || 'info',
      payload: item.payload,
      status: 'staged',
      created_at: Date.now(),
    };

    this.staticBuffer.push(record);

    if (this.staticDebounceTimer) {
      clearTimeout(this.staticDebounceTimer);
    }

    this.staticDebounceTimer = setTimeout(() => {
      this.flushStaticBuffer();
    }, this.STATIC_DEBOUNCE_DELAY_MS);

    return record;
  }

  /**
   * Rule B2 Force Sync Override: Immediately flushes the inbound buffer.
   */
  static async triggerForceSync(): Promise<{ success: boolean; count: number; items: InboundPITRecord[] }> {
    if (this.staticDebounceTimer) {
      clearTimeout(this.staticDebounceTimer);
      this.staticDebounceTimer = null;
    }
    return this.flushStaticBuffer();
  }

  private static async flushStaticBuffer(): Promise<{ success: boolean; count: number; items: InboundPITRecord[] }> {
    if (this.isSyncing) {
      return { success: true, count: 0, items: [] };
    }

    this.isSyncing = true;
    const itemsToSync = [...this.staticBuffer];
    this.staticBuffer = [];

    if (itemsToSync.length === 0) {
      this.isSyncing = false;
      return { success: true, count: 0, items: [] };
    }

    const rankedItems = PriorityRanking.rankItems(itemsToSync).map((item) => ({
      ...item,
      status: 'synced' as const,
    }));

    try {
      const existing = PAIOSStorage.getItem<InboundPITRecord[]>('paios_precontext_pit', []) || [];
      const updatedList = [...rankedItems, ...existing].slice(0, 100);
      PAIOSStorage.setItem('paios_precontext_pit', updatedList);

      if (typeof window !== 'undefined') {
        const event = new CustomEvent('precontext_pit_synced', {
          detail: {
            count: rankedItems.length,
            items: rankedItems,
            timestamp: Date.now(),
          },
        });
        window.dispatchEvent(event);
      }

      return {
        success: true,
        count: rankedItems.length,
        items: rankedItems,
      };
    } catch (err) {
      console.warn('[PreContextBroker] Storage flush warning:', err);
      return {
        success: false,
        count: 0,
        items: [],
      };
    } finally {
      this.isSyncing = false;
    }
  }

  static getBufferCount(): number {
    return this.staticBuffer.length;
  }

  static getSyncedRecords(): InboundPITRecord[] {
    return PAIOSStorage.getItem<InboundPITRecord[]>('paios_precontext_pit', []) || [];
  }

  static clearAll(): void {
    this.staticBuffer = [];
    if (this.staticDebounceTimer) {
      clearTimeout(this.staticDebounceTimer);
      this.staticDebounceTimer = null;
    }
    PAIOSStorage.removeItem('paios_precontext_pit');
  }
}

export default PreContextBroker;
