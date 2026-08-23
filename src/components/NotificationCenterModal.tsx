import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCheck, Trash2, Send, AlertCircle, Clock, Pill, Calendar, Zap, Check } from 'lucide-react';
import {
  PaiosNotification,
  getNotificationsHistory,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
  dispatchNotification,
  requestNotificationPermission,
} from '../utils/notifications';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<PaiosNotification[]>([]);
  const [permGranted, setPermGranted] = useState<boolean>(false);

  const reloadNotifs = () => {
    setNotifications(getNotificationsHistory());
  };

  useEffect(() => {
    if (isOpen) {
      reloadNotifs();
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermGranted(Notification.permission === 'granted');
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleNotifChange = () => {
      reloadNotifs();
    };
    window.addEventListener('paios_notification_change', handleNotifChange);
    return () => window.removeEventListener('paios_notification_change', handleNotifChange);
  }, []);

  if (!isOpen) return null;

  const handleRequestPerm = async () => {
    const granted = await requestNotificationPermission();
    setPermGranted(granted);
    if (granted) {
      dispatchNotification('Notifications Enabled', 'System and feature alerts active for PAIOS.', 'SYSTEM');
    }
  };

  const handleSendTest = () => {
    dispatchNotification(
      'Test Reminder Alert',
      'This is a sample PAIOS notification for your schedule, health doses, and tracker alerts.',
      'SYSTEM'
    );
  };

  const getIconForType = (type: PaiosNotification['type']) => {
    switch (type) {
      case 'MEDICATION':
        return <Pill className="w-4 h-4 text-emerald-400" />;
      case 'SCHEDULE':
        return <Calendar className="w-4 h-4 text-cyan-400" />;
      case 'FOCUS':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'TASK':
        return <Clock className="w-4 h-4 text-indigo-400" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-400" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-heading font-bold text-white text-base">Notification Center</h3>
              <p className="text-xs text-slate-400">System alerts, medication doses, & focus reminders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permission Banner */}
        {!permGranted && (
          <div className="p-3 bg-indigo-950/60 border-b border-indigo-800/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-indigo-200">
              <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Enable native browser / phone alerts for schedule & medication reminders.</span>
            </div>
            <button
              onClick={handleRequestPerm}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 transition-colors"
            >
              Enable
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="p-3 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendTest}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5 text-indigo-400" />
              <span>Test Notification</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-1 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark Read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 flex items-center gap-1 transition-colors"
                title="Clear history"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* List of Notifications */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
          {notifications.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Bell className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-400">No notifications yet</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                PAIOS will alert you when scheduled timetable blocks start, doses are due, or daily check-ins open.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => markNotificationAsRead(notif.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  notif.read
                    ? 'bg-slate-950/60 border-slate-800/60 opacity-75'
                    : 'bg-slate-950 border-indigo-500/40 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                      {getIconForType(notif.type)}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                        {notif.title}
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block shrink-0" />
                        )}
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{notif.message}</p>
                      <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                        {new Date(notif.timestampMillis).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
