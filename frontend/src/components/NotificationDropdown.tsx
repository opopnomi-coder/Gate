import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_CONFIG } from '../config/api.config';
import { useNotifications } from '../context/NotificationContext';
import { getRelativeTime, formatDateShort } from '../utils/dateUtils';

interface Notification {
  id: number;
  userId: string;
  type: string;
  title: string;
  message: string;
  notificationType: string;
  isRead: boolean;
  timestamp: string;
  createdAt: string;
}

interface NotificationDropdownProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userType: 'student' | 'staff' | 'hod' | 'hr' | 'security';
  anchorPosition?: { top: number; right: number };
}

export default function NotificationDropdown({
  visible,
  onClose,
  userId,
  userType,
  anchorPosition = { top: 70, right: 20 },
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshNotifications } = useNotifications();

  useEffect(() => {
    if (visible) {
      fetchNotifications();
    }
  }, [visible, userId, userType]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_CONFIG.BASE_URL}/notifications/${userType}/${userId}`);
      const data = await response.json();
      
      if (data.success && data.notifications) {
        setNotifications(data.notifications.slice(0, 10));
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await fetch(`${API_CONFIG.BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      refreshNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch(`${API_CONFIG.BASE_URL}/notifications/user/${userId}/read-all`, {
        method: 'PUT',
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      refreshNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getTypeColor = (notificationType: string) => {
    switch (notificationType) {
      case 'APPROVAL': return '#10b981';
      case 'REJECTION': return '#ef4444';
      case 'GATE_PASS': return '#3b82f6';
      case 'BULK_PASS': return '#8b5cf6';
      case 'URGENT': return '#f59e0b';
      case 'ENTRY': return '#06b6d4';
      case 'EXIT': return '#ec4899';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (notificationType: string): any => {
    switch (notificationType) {
      case 'APPROVAL': return 'checkmark-circle';
      case 'REJECTION': return 'close-circle';
      case 'GATE_PASS': return 'document-text';
      case 'BULK_PASS': return 'people';
      case 'URGENT': return 'alert-circle';
      case 'ENTRY': return 'log-in';
      case 'EXIT': return 'log-out';
      default: return 'notifications';
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    return getRelativeTime(dateStr);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[styles.dropdown, { top: anchorPosition.top }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <View style={styles.headerRight}>
              {unreadCount > 0 && (
                <>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{unreadCount}</Text>
                  </View>
                  <TouchableOpacity onPress={markAllRead} style={styles.markAllButton}>
                    <Text style={styles.markAllText}>Mark all read</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeIconButton}>
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3b82f6" />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={40} color="#d1d5db" />
              <Text style={styles.emptyText}>No notifications</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {notifications.map((notif) => {
                const color = getTypeColor(notif.notificationType || notif.type);
                const icon = getTypeIcon(notif.notificationType || notif.type);
                return (
                  <TouchableOpacity
                    key={notif.id}
                    style={[styles.notificationItem, !notif.isRead && styles.unreadItem]}
                    onPress={() => !notif.isRead && markAsRead(notif.id)}
                    activeOpacity={0.7}
                  >
                    {/* Unread dot */}
                    {!notif.isRead && <View style={styles.unreadDot} />}

                    <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
                      <Ionicons name={icon} size={20} color={color} />
                    </View>

                    <View style={styles.contentWrapper}>
                      {notif.title ? (
                        <Text style={styles.notifTitle} numberOfLines={1}>{notif.title}</Text>
                      ) : null}
                      <Text style={styles.message} numberOfLines={2}>
                        {notif.message}
                      </Text>
                      <Text style={styles.timeText}>
                        {formatTime(notif.createdAt || notif.timestamp)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  dropdown: {
    position: 'absolute',
    width: 360,
    maxHeight: 560,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -180,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  markAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  markAllText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  closeIconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  scrollView: {
    maxHeight: 480,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    alignItems: 'flex-start',
    position: 'relative',
  },
  unreadItem: {
    backgroundColor: '#f0f9ff',
  },
  unreadDot: {
    position: 'absolute',
    left: 6,
    top: 20,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#3b82f6',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  contentWrapper: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 19,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
});
