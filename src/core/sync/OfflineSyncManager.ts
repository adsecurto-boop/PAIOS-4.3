import { PAIOSStorage } from '../../storage';
import { AuthSyncService } from '../../services/AuthSyncService';

export interface OfflineMutationItem {
  id: string;
  key: string;
  payload: any;
  action: 'SAVE' | 'DELETE';
  timestamp: number;
  retryCount: number;
}

export type OfflineSyncItem = OfflineMutationItem;

export class OfflineSyncManager {
  public static STORAGE_KEY = 'paios_offline_sync_queue';
  private static QUEUE_KEY = 'paios_offline_sync_queue';
  private static isFlushing = false;
  private static remoteLockActive = false;
  private static isInitialized = false;

  /**
   * Initializes application-wide network reconnection listeners.
   * Flushes offline queue automatically upon network recovery.
   */
  static init(authTokenProvider?: () => string | null): () => void {
    if (this.isInitialized) return () => {};
    this.isInitialized = true;

    if (typeof window !== 'undefined') {
      const handleOnline = () => {
        console.log('[OfflineSyncManager] Network online detected. Triggering queue flush...');
        this.flushQueue();
      };

      window.addEventListener('online', handleOnline);

      // Flush queue on launch if online and queue exists
      if (navigator.onLine) {
        setTimeout(() => this.flushQueue(), 1000);
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        this.isInitialized = false;
      };
    }

    return () => {};
  }

  /**
   * Enqueues a storage mutation into the chronological FIFO queue.
   */
  static enqueueMutation(key: string, payload: any, action: 'SAVE' | 'DELETE' = 'SAVE'): OfflineMutationItem {
    const queue = this.getQueue();
    // Filter existing queued items for same key to avoid duplicate backlog
    const filteredQueue = queue.filter((q) => q.key !== key);

    const newItem: OfflineMutationItem = {
      id: `mut_${key}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      key,
      payload,
      action,
      timestamp: Date.now(),
      retryCount: 0,
    };

    filteredQueue.push(newItem);
    PAIOSStorage.setItem(this.QUEUE_KEY, filteredQueue);

    // If online, attempt background flush
    if (typeof navigator !== 'undefined' && navigator.onLine && !this.remoteLockActive) {
      this.flushQueue();
    }

    return newItem;
  }

  /**
   * Alias for enqueueMutation.
   */
  static enqueueAction(key: string, payload: any, action: 'SAVE' | 'DELETE' = 'SAVE'): OfflineMutationItem {
    return this.enqueueMutation(key, payload, action);
  }

  /**
   * Flushes the FIFO offline mutation queue upon network reconnection or manual sync trigger.
   */
  static async flushQueue(): Promise<{ success: boolean; processed: number; remaining: number }> {
    if (this.isFlushing || this.remoteLockActive) {
      return { success: true, processed: 0, remaining: this.getQueue().length };
    }

    const token = AuthSyncService.getToken();
    if (!token) {
      // User unauthenticated or guest mode, skip push
      return { success: true, processed: 0, remaining: this.getQueue().length };
    }

    this.isFlushing = true;
    let queue = this.getQueue();
    let processedCount = 0;

    try {
      const remainingQueue: OfflineMutationItem[] = [];

      for (const item of queue) {
        try {
          if (item.action === 'DELETE') {
            await AuthSyncService.deleteData(item.key);
          } else {
            await AuthSyncService.pushData(item.key, item.payload);
          }
          processedCount++;
        } catch (err) {
          console.warn(`[OfflineSyncManager] Push failed for key ${item.key}:`, err);
          item.retryCount = (item.retryCount || 0) + 1;
          if (item.retryCount < 10) {
            remainingQueue.push(item);
          }
        }
      }

      PAIOSStorage.setItem(this.QUEUE_KEY, remainingQueue);
      return {
        success: true,
        processed: processedCount,
        remaining: remainingQueue.length,
      };
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Initializes automatic online network recovery listener (alias for init).
   */
  public static initAutoReconnection(authTokenProvider?: () => string | null): () => void {
    this.init();
    return () => {};
  }

  /**
   * Remote Echo Loop Prevention Guard.
   * Wraps inbound remote update processing with a lock to prevent cyclical echo pushes.
   */
  static async withRemoteUpdateLock<T>(fn: () => T | Promise<T>): Promise<T> {
    this.remoteLockActive = true;
    try {
      return await fn();
    } finally {
      this.remoteLockActive = false;
    }
  }

  /**
   * Returns whether the remote update lock is currently active.
   */
  static isRemoteLockActive(): boolean {
    return this.remoteLockActive;
  }

  /**
   * Retrieves current queued mutations.
   */
  static getQueue(): OfflineMutationItem[] {
    return PAIOSStorage.getItem<OfflineMutationItem[]>(this.QUEUE_KEY, []) || [];
  }

  /**
   * Clears the offline mutation queue.
   */
  static clearQueue(): void {
    PAIOSStorage.removeItem(this.QUEUE_KEY);
  }
}

export default OfflineSyncManager;
