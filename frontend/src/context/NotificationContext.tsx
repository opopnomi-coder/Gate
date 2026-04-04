import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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

/** Persist shown IDs — keep only last 200 to avoid unbounded growth */
async function saveShownIds(ids: Set<number>): Promise<void> {
  try {
    const arr = Array.from(ids).slice(-200);
    await AsyncStorage.setItem(SHOWN_IDS_KEY, JSON.stringify(arr));
  } catch {}
}

export const NotificationProvider: React.FC<{ children: ReactNode; onNavigate?: (route: string) => void }> = ({ children, onNavigate }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const currentUserRef = useRef<{ userId: string; userType: UserType } | null>(null);
  const shownNotificationIdsRef = useRef<Set<number>>(new Set());
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;

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

  const isToday = (value?: string) => {
    if (!value) return false;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
        const todaysOnly = latest.filter((n) => isToday(n.timestamp || n.createdAt));
        if (options.scheduleBanners) {
          const unreadNew = todaysOnly.filter(
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
        setNotifications(todaysOnly);
      }
    } catch (error) {
      // silent — polling will retry
    }
  };

  const loadNotifications = async (userId: string, userType: UserType) => {
    currentUserRef.current = { userId, userType };
    try {
      const url = `${API_CONFIG.BASE_URL}/notifications/${userType}/${userId}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success && Array.isArray(data.notifications)) {
        const latest = data.notifications as Notification[];
        const todaysOnly = latest.filter((n) => isToday(n.timestamp || n.createdAt));
        // Merge today's IDs into the persisted set so we don't re-banner them
        // (but don't wipe the set — that would cause re-shows on next login)
        for (const n of todaysOnly) {
          shownNotificationIdsRef.current.add(n.id);
        }
        await saveShownIds(shownNotificationIdsRef.current);
        setNotifications(todaysOnly);
      }
    } catch (error) {
      // silent — polling will retry
    }
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
      if (currentUserRef.current) {
        fetchFromBackend(currentUserRef.current.userId, currentUserRef.current.userType, {
          scheduleBanners: true,
        });
      }
    }, 15000);
    return () => clearInterval(interval);
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
