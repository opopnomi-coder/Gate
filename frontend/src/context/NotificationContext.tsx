import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { API_CONFIG } from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  showLocalNotification,
  requestNotificationPermission,
  onNotificationTap,
} from '../services/localNotification.service';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  notificationType: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
  timestamp: string;
  userId: string;
  actionRoute?: string;
}

type UserType = 'student' | 'staff' | 'hod' | 'hr' | 'security';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loadNotifications: (userId: string, userType: UserType) => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const SHOWN_IDS_KEY = '@ritgate_shown_notif_ids';

/** Load persisted shown IDs from AsyncStorage */
async function loadShownIds(): Promise<Set<number>> {
  try {
    const raw = await AsyncStorage.getItem(SHOWN_IDS_KEY);
    if (!raw) return new Set();
    const arr: number[] = JSON.parse(raw);
    return new Set(arr);
  } catch {
    return new Set();
  }
}

/** Persist shown IDs — keep only last 300 to avoid unbounded growth */
async function saveShownIds(ids: Set<number>): Promise<void> {
  try {
    const arr = Array.from(ids).slice(-300);
    await AsyncStorage.setItem(SHOWN_IDS_KEY, JSON.stringify(arr));
  } catch {}
}

/** Check if a timestamp is within the last 24 hours */
function isRecent(value?: string): boolean {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const now = Date.now();
  const diff = now - d.getTime();
  // 24 hours in milliseconds
  return diff >= 0 && diff < 24 * 60 * 60 * 1000;
}

export const NotificationProvider: React.FC<{ children: ReactNode; onNavigate?: (route: string) => void }> = ({ children, onNavigate }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const currentUserRef = useRef<{ userId: string; userType: UserType } | null>(null);
  const shownNotificationIdsRef = useRef<Set<number>>(new Set());
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;
  const initialLoadDoneRef = useRef(false);

  // Request permission + set up tap handler on mount
  useEffect(() => {
    requestNotificationPermission();
    // Load persisted shown IDs so we don't re-show notifications after app restart
    loadShownIds().then(ids => { shownNotificationIdsRef.current = ids; });

    // Handle tap on a notifee notification while app is in foreground
    const unsub = onNotificationTap((data) => {
      if (data.actionRoute && onNavigateRef.current) {
        onNavigateRef.current(data.actionRoute);
      }
    });

    return () => { unsub(); };
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  /**
   * Fetch notifications from backend and optionally show OS banners for new ones.
   * 
   * DEDUPLICATION RULES:
   * 1. Every notification shown as a banner (via polling or FCM) gets its DB id
   *    added to the persisted shown-ids set.
   * 2. On initial load (login / app open), we mark ALL existing notifications as
   *    "shown" without firing banners — so stale alerts don't pop up.
   * 3. Only truly NEW notifications (not in the shown set) trigger OS banners.
   */
  const fetchFromBackend = async (
    userId: string,
    userType: UserType,
    options: { scheduleBanners: boolean }
  ) => {
    try {
      const url = `${API_CONFIG.BASE_URL}/notifications/${userType}/${userId}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success && Array.isArray(data.notifications)) {
        const latest = data.notifications as Notification[];
        // Use last-24-hours window instead of strict "today" to avoid midnight edge cases
        const recent = latest.filter((n) => isRecent(n.timestamp || n.createdAt));

        if (options.scheduleBanners) {
          // Only show banners for notifications we haven't shown before
          const unreadNew = recent.filter(
            (n) => !n.isRead && !shownNotificationIdsRef.current.has(n.id)
          );
          for (const n of unreadNew) {
            shownNotificationIdsRef.current.add(n.id);
            // Fire real OS notification
            showLocalNotification(
              String(n.id),
              n.title || 'RIT Gate',
              n.message || '',
              { actionRoute: n.actionRoute || '', notificationId: String(n.id) }
            );
          }
          // Persist so restarts don't re-show the same notifications
          if (unreadNew.length > 0) {
            saveShownIds(shownNotificationIdsRef.current);
          }
        }
        setNotifications(recent);
      }
    } catch (error) {
      // silent — polling will retry
    }
  };

  /**
   * Called on login / initial app load.
   * Marks ALL existing notifications as "shown" so they don't fire as banners.
   * Only notifications that arrive AFTER this point will trigger OS alerts.
   */
  const loadNotifications = async (userId: string, userType: UserType) => {
    currentUserRef.current = { userId, userType };
    initialLoadDoneRef.current = false;
    try {
      const url = `${API_CONFIG.BASE_URL}/notifications/${userType}/${userId}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success && Array.isArray(data.notifications)) {
        const latest = data.notifications as Notification[];
        const recent = latest.filter((n) => isRecent(n.timestamp || n.createdAt));
        // Mark ALL existing notifications as shown — prevents re-banners on app open
        for (const n of recent) {
          shownNotificationIdsRef.current.add(n.id);
        }
        await saveShownIds(shownNotificationIdsRef.current);
        setNotifications(recent);
      }
    } catch (error) {
      // silent — polling will retry
    }
    initialLoadDoneRef.current = true;
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await fetch(`${API_CONFIG.BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async (userId: string) => {
    try {
      await fetch(`${API_CONFIG.BASE_URL}/notifications/user/${userId}/read-all`, {
        method: 'PUT',
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const refreshNotifications = () => {
    if (currentUserRef.current) {
      fetchFromBackend(currentUserRef.current.userId, currentUserRef.current.userType, {
        scheduleBanners: true,
      });
    }
  };

  // Poll every 15 seconds for near-real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentUserRef.current && initialLoadDoneRef.current) {
        fetchFromBackend(currentUserRef.current.userId, currentUserRef.current.userType, {
          scheduleBanners: true,
        });
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Re-sync shown IDs when app comes back to foreground (in case background handler added IDs)
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        loadShownIds().then(ids => { shownNotificationIdsRef.current = ids; });
        // Also refresh notifications immediately
        if (currentUserRef.current && initialLoadDoneRef.current) {
          fetchFromBackend(currentUserRef.current.userId, currentUserRef.current.userType, {
            scheduleBanners: true,
          });
        }
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loadNotifications, markAsRead, markAllAsRead, refreshNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};
