import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { API_CONFIG } from '../config/api.config';
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

export const NotificationProvider: React.FC<{ children: ReactNode; onNavigate?: (route: string) => void }> = ({ children, onNavigate }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const currentUserRef = useRef<{ userId: string; userType: UserType } | null>(null);
  const shownNotificationIdsRef = useRef<Set<number>>(new Set());
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;

  // Request permission + set up tap handler on mount
  useEffect(() => {
    requestNotificationPermission();

    // Handle tap on a notifee notification while app is in foreground
    const unsub = onNotificationTap((data) => {
      if (data.actionRoute && onNavigateRef.current) {
        onNavigateRef.current(data.actionRoute);
      }
    });

    // NOTE: getInitialNotificationData (notifee killed-state) is intentionally NOT
    // called here. App.tsx handles both FCM and notifee killed-state via
    // handleInitialNotification to avoid double-navigation.

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
        // Fresh login: do not banner old unread items; only rows that arrive after this point.
        shownNotificationIdsRef.current = new Set(todaysOnly.map(n => n.id));
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
