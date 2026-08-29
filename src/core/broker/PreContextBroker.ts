import { PriorityRanking, RankableItem, PriorityLevel, SeverityLevel } from './PriorityRanking';
import { PAIOSStorage } from '../../storage';

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

export class PreContextBroker {
  private static buffer: InboundPITRecord[] = [];
  private static debounceTimer: any = null;
  private static DEBOUNCE_DELAY_MS = 2500;
  private static isSyncing = false;

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

    this.buffer.push(record);

    // Reset/start 2500ms debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.flushBuffer();
    }, this.DEBOUNCE_DELAY_MS);

    return record;
  }

  /**
   * Rule B2 Force Sync Override: Immediately flushes the inbound buffer
   * without waiting for the 2500ms debounce timer.
   */
  static async triggerForceSync(): Promise<{ success: boolean; count: number; items: InboundPITRecord[] }> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    return this.flushBuffer();
  }

  /**
   * Flushes the staging buffer, ranks items by priority/severity composite score,
   * persists to storage, and dispatches the precontext_pit_synced event.
   */
  private static async flushBuffer(): Promise<{ success: boolean; count: number; items: InboundPITRecord[] }> {
    if (this.isSyncing) {
      return { success: true, count: 0, items: [] };
    }

    this.isSyncing = true;
    const itemsToSync = [...this.buffer];
    this.buffer = [];

    if (itemsToSync.length === 0) {
      this.isSyncing = false;
      return { success: true, count: 0, items: [] };
    }

    // Rank items by PriorityRanking
    const rankedItems = PriorityRanking.rankItems(itemsToSync).map((item) => ({
      ...item,
      status: 'synced' as const,
    }));

    try {
      // 1. Retrieve existing synced PIT store
      const existing = PAIOSStorage.getItem<InboundPITRecord[]>('paios_precontext_pit', []) || [];
      const updatedList = [...rankedItems, ...existing].slice(0, 100);

      // 2. Persist to storage
      PAIOSStorage.setItem('paios_precontext_pit', updatedList);

      // 3. Dispatch CustomEvent for reactive UI re-renders
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

  /**
   * Gets current staged buffer count.
   */
  static getBufferCount(): number {
    return this.buffer.length;
  }

  /**
   * Gets all synced PIT records from storage.
   */
  static getSyncedRecords(): InboundPITRecord[] {
    return PAIOSStorage.getItem<InboundPITRecord[]>('paios_precontext_pit', []) || [];
  }

  /**
   * Clears staged buffer and synced store.
   */
  static clearAll(): void {
    this.buffer = [];
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    PAIOSStorage.removeItem('paios_precontext_pit');
  }
}

export default PreContextBroker;
