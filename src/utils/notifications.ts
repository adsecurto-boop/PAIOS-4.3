import { LocalNotifications } from '@capacitor/local-notifications';

export interface PaiosNotification {
  id: string;
  title: string;
  message: string;
  type: 'SCHEDULE' | 'MEDICATION' | 'FOCUS' | 'TASK' | 'CHECKIN' | 'SYSTEM';
  timestampMillis: number;
  read: boolean;
  actionUrl?: string;
}

const NOTIF_STORAGE_KEY = 'paios_notifications_history_v1';

export function getNotificationsHistory(): PaiosNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load notification history:', e);
    return [];
  }
}

export function saveNotificationsHistory(items: PaiosNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(items.slice(0, 100)));
    window.dispatchEvent(new CustomEvent('paios_notification_change'));
  } catch (e) {
    console.error('Failed to save notifications:', e);
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  // 1. Try Capacitor Local Notifications permission
  try {
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display === 'granted') {
        return true;
      }
    }
  } catch (err) {
    console.warn('Capacitor notifications request skipped:', err);
  }

  // 2. Try HTML5 Web Notification API
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const status = await Notification.requestPermission();
      return status === 'granted';
    }
  }

  return false;
}

export async function dispatchNotification(
  title: string,
  message: string,
  type: PaiosNotification['type'] = 'SYSTEM'
): Promise<PaiosNotification> {
  const notifItem: PaiosNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    message,
    type,
    timestampMillis: Date.now(),
    read: false,
  };

  // 1. Save to in-app notification center history
  const history = getNotificationsHistory();
  saveNotificationsHistory([notifItem, ...history]);

  // 2. Trigger Capacitor Native Android Local Notification
  try {
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      const canNotif = await LocalNotifications.checkPermissions();
      if (canNotif.display === 'granted') {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: `PAIOS: ${title}`,
              body: message,
              id: Math.floor(Math.random() * 100000),
              schedule: { at: new Date(Date.now() + 100) },
              smallIcon: 'res://icon',
            },
          ],
        });
      }
    }
  } catch (e) {
    console.warn('Capacitor local notification schedule failed:', e);
  }

  // 3. Trigger HTML5 Desktop Browser Notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(`PAIOS: ${title}`, {
        body: message,
        icon: '/favicon.ico',
      });
    } catch (e) {
      console.warn('HTML5 Notification trigger error:', e);
    }
  }

  return notifItem;
}

export function markNotificationAsRead(id: string): void {
  const history = getNotificationsHistory();
  const updated = history.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveNotificationsHistory(updated);
}

export function clearAllNotifications(): void {
  saveNotificationsHistory([]);
}

export function markAllNotificationsAsRead(): void {
  const history = getNotificationsHistory();
  const updated = history.map((n) => ({ ...n, read: true }));
  saveNotificationsHistory(updated);
}
