import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme } from '../context/ThemeContext';

interface TopMenuBarProps {
  onNotificationPress: () => void;
  onLogoutPress: () => void;
  onProfilePress?: () => void;
  onBackPress?: () => void;
  greeting: string;
  title: string;
  notificationCount?: number;
  profileImage?: string | null;
  showBackButton?: boolean;
}

const TopMenuBar: React.FC<TopMenuBarProps> = ({
  onNotificationPress, onLogoutPress, onProfilePress, onBackPress,
  greeting, title, notificationCount = 0, profileImage, showBackButton = false,
}) => {
  const { theme } = useTheme();

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'ST';
    return name.split(' ').map(p => p.charAt(0)).join('').toUpperCase().substring(0, 2);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <View style={styles.leftSection}>
        {showBackButton ? (
          <TouchableOpacity onPress={onBackPress} style={[styles.iconButton, { backgroundColor: theme.inputBackground }]}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onProfilePress} style={styles.profileButton}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileCircle, { backgroundColor: theme.primary }]}>
                <Text style={styles.initialsText}>{getInitials(title)}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        <View style={styles.greetingContainer}>
          <Text style={[styles.greetingText, { color: theme.textSecondary }]}>{greeting}</Text>
          <Text style={[styles.titleText, { color: theme.text }]} numberOfLines={1}>{title}</Text>
        </View>
      </View>
      <View style={styles.rightSection}>
        <TouchableOpacity onPress={onNotificationPress} style={[styles.iconButton, { backgroundColor: theme.inputBackground }]}>
          <Ionicons name="notifications-outline" size={24} color={theme.text} />
          {notificationCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onLogoutPress} style={[styles.iconButton, { backgroundColor: theme.inputBackground }]}>
          <Ionicons name="log-out-outline" size={24} color={theme.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  leftSection: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  profileButton: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden' },
  profileImage: { width: '100%', height: '100%' },
  profileCircle: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 24 },
  initialsText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  greetingContainer: { justifyContent: 'center', flex: 1 },
  greetingText: { fontSize: 12, fontWeight: '600', marginBottom: 2, letterSpacing: 0.3 },
  titleText: { fontSize: 18, fontWeight: '800', letterSpacing: 0.2 },
  rightSection: { flexDirection: 'row', gap: 10 },
  iconButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, position: 'relative' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#FFF' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
});

export default TopMenuBar;
