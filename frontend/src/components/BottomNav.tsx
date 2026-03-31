import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import ThemedText from './ThemedText';

type TabType = 'HOME' | 'HISTORY' | 'REQUESTS' | 'MY_REQUESTS' | 'NEW_PASS' | 'NEW_PASS_REQUEST' | 'PROFILE' | 'ACCOUNT' | 'ENTRY_EXIT' | 'NOTIFICATIONS' | 'LOGOUT' | 'BACK';

interface BottomNavProps {
  role: 'STUDENT' | 'STAFF' | 'HOD' | 'HR' | 'SECURITY';
  activeTab: TabType;
  onTabPress: (tab: TabType) => void;
  notificationCount?: number;
  onLogout?: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ 
  role, 
  activeTab, 
  onTabPress,
  notificationCount = 0,
  onLogout,
  onBack,
  showBackButton = false
}) => {
  const getNavItems = () => {
    if (role === 'STUDENT') {
      return [
        { key: 'HOME' as TabType, icon: 'home', label: 'Home' },
        { key: 'NEW_PASS' as TabType, icon: 'add-circle', label: 'New Pass' },
        { key: 'REQUESTS' as TabType, icon: 'list', label: 'My Requests' },
        { key: 'PROFILE' as TabType, icon: 'person', label: 'Profile' },
      ];
    } else if (role === 'STAFF') {
      return [
        { key: 'HOME' as TabType, icon: 'home', label: 'Home' },
        { key: 'NEW_PASS' as TabType, icon: 'add-circle', label: 'New Pass' },
        { key: 'REQUESTS' as TabType, icon: 'list', label: 'My Requests' },
        { key: 'PROFILE' as TabType, icon: 'person', label: 'Profile' },
      ];
    } else if (role === 'HOD') {
      return [
        { key: 'HOME' as TabType, icon: 'home', label: 'Home' },
        { key: 'NEW_PASS_REQUEST' as TabType, icon: 'add-circle', label: 'Request Pass' },
        { key: 'MY_REQUESTS' as TabType, icon: 'list', label: 'My Requests' },
        { key: 'PROFILE' as TabType, icon: 'person', label: 'Profile' },
      ];
    } else if (role === 'HR') {
      return [
        { key: 'HOME' as TabType, icon: 'home', label: 'Home' },
        { key: 'REQUESTS' as TabType, icon: 'checkmark-done', label: 'Approvals' },
        { key: 'PROFILE' as TabType, icon: 'person', label: 'Profile' },
      ];
    } else if (role === 'SECURITY') {
      return [
        { key: 'HOME' as TabType, icon: 'home', label: 'Home' },
        { key: 'PROFILE' as TabType, icon: 'person', label: 'Profile' },
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  return (
    <View style={styles.container}>
      {showBackButton && onBack && (
        <TouchableOpacity
          style={styles.navItem}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#6B7280" />
          <ThemedText style={styles.navText}>Back</ThemedText>
        </TouchableOpacity>
      )}

      {navItems.map((item) => {
        const isActive = activeTab === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.navItem}
            onPress={() => onTabPress(item.key)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={isActive ? item.icon as any : `${item.icon}-outline` as any}
                size={24}
                color={isActive ? '#22D3EE' : '#6B7280'}
              />
            </View>
            <ThemedText
              style={[
                styles.navText,
                { color: isActive ? '#22D3EE' : '#6B7280' }
              ]}
            >
              {item.label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 75,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 20,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 5,
    minWidth: 50,
  },
  iconContainer: {
    position: 'relative',
  },
  navText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default BottomNav;
