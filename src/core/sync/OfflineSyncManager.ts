import { PAIOSStorage } from '../../storage';

export interface OfflineSyncItem {
  id: string;
  key: string;
  payload: any;
  action: 'SAVE' | 'DELETE';
  timestamp: number;
  retryCount: number;
}

export class OfflineSyncManager {
  public static STORAGE_KEY = 'paios_offline_sync_queue';
  private static isFlushing = false;

  public static isOnline(): boolean {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  /**
   * Enqueues an offline action into the indexed offline buffer.
   */
  public static enqueueAction(key: string, payload: any, action: 'SAVE' | 'DELETE' = 'SAVE'): OfflineSyncItem {
    const queue = this.getQueue();
    const item: OfflineSyncItem = {
      id: `off_${key}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      key,
      payload,
      action,
      timestamp: Date.now(),
      retryCount: 0,
    };

    // Deduplicate or append in chronological order
    const filtered = queue.filter((q) => q.key !== key);
    filtered.push(item);

    PAIOSStorage.setItem(this.STORAGE_KEY, filtered);
    return item;
  }

  /**
   * Returns all items currently pending in the offline sync queue.
   */
  public static getQueue(): OfflineSyncItem[] {
    return PAIOSStorage.getItem<OfflineSyncItem[]>(this.STORAGE_KEY, []) || [];
  }

  /**
   * Returns the count of pending items in the offline sync queue.
   */
  public static getQueueCount(): number {
    return this.getQueue().length;
  }

  /**
   * Clears the offline sync queue.
   */
  public static clearQueue(): void {
    PAIOSStorage.setItem(this.STORAGE_KEY, []);
  }

  /**
   * Flushes the offline queue in chronological sequence via POST /api/sync/push.
   */
  public static async flushQueue(authToken?: string): Promise<{
    success: boolean;
    syncedCount: number;
    failedCount: number;
    remainingQueue: OfflineSyncItem[];
  }> {
    if (this.isFlushing) {
      return { success: true, syncedCount: 0, failedCount: 0, remainingQueue: this.getQueue() };
    }

    const token = authToken || PAIOSStorage.getAuthToken();
    if (!token) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        remainingQueue: this.getQueue(),
      };
    }

    this.isFlushing = true;
    const queue = [...this.getQueue()].sort((a, b) => a.timestamp - b.timestamp);
    const syncedItems: string[] = [];
    let failedCount = 0;

    try {
      for (const item of queue) {
        try {
          if (item.action === 'SAVE') {
            const res = await fetch('/api/sync/push', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                key: item.key,
                payload: item.payload,
              }),
            });

            if (res.ok) {
              syncedItems.push(item.id);
            } else {
              item.retryCount++;
              failedCount++;
            }
          } else if (item.action === 'DELETE') {
            const res = await fetch(`/api/sync/data?key=${encodeURIComponent(item.key)}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (res.ok) {
              syncedItems.push(item.id);
            } else {
              item.retryCount++;
              failedCount++;
            }
          }
        } catch (err) {
          console.warn('[OfflineSyncManager] Network error syncing item:', item.key, err);
          item.retryCount++;
          failedCount++;
          break; // Stop flushing if network remains down
        }
      }
    } finally {
      // Update queue removing all synced items
      const currentQueue = this.getQueue();
      const remaining = currentQueue.filter((q) => !syncedItems.includes(q.id));
      PAIOSStorage.setItem(this.STORAGE_KEY, remaining);
      this.isFlushing = false;
    }

    const remainingQueue = this.getQueue();
    return {
      success: failedCount === 0,
      syncedCount: syncedItems.length,
      failedCount,
      remainingQueue,
    };
  }

  /**
   * Initializes automatic online network recovery listener (alias for initAutoReconnection).
   */
  public static init(authTokenProvider?: () => string | null): () => void {
    return this.initAutoReconnection(authTokenProvider);
  }

  /**
   * Initializes automatic online network recovery listener.
   */
  public static initAutoReconnection(authTokenProvider?: () => string | null): () => void {
    if (typeof window === 'undefined') return () => {};

    const handleOnline = async () => {
      const token = authTokenProvider ? authTokenProvider() : PAIOSStorage.getAuthToken();
      if (token) {
        await this.flushQueue(token);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }
}

export default OfflineSyncManager;
