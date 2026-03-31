import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { ScreenName } from '../types';
import { useTheme } from '../context/ThemeContext';
import ThemedText from './ThemedText';

interface SecurityBottomNavProps {
  activeTab: 'home' | 'scanner' | 'history' | 'vehicle' | 'visitor' | 'contacts';
  onNavigate: (screen: ScreenName) => void;
}

const SecurityBottomNav: React.FC<SecurityBottomNavProps> = ({ activeTab, onNavigate }) => {
  const { theme } = useTheme();

  const handleNavigate = (tab: string) => {
    const screenMap: { [key: string]: ScreenName } = {
      'home': 'SECURITY_DASHBOARD',
      'scanner': 'QR_SCANNER',
      'history': 'SCAN_HISTORY',
      'vehicle': 'VEHICLE_REGISTRATION',
      'visitor': 'VISITOR_REGISTRATION',
      'hods': 'HOD_CONTACTS',
    };
    onNavigate(screenMap[tab] || 'SECURITY_DASHBOARD');
  };

  return (
    <View style={[styles.bottomTabBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      <TouchableOpacity style={styles.bottomTab} onPress={() => handleNavigate('home')} activeOpacity={0.7}>
        <Ionicons name={activeTab === 'home' ? 'home' : 'home-outline'} size={24} color={activeTab === 'home' ? theme.primary : theme.textTertiary} />
        <ThemedText style={[styles.bottomTabLabel, { color: activeTab === 'home' ? theme.primary : theme.textTertiary }]}>Home</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity style={styles.bottomTab} onPress={() => handleNavigate('scanner')} activeOpacity={0.7}>
        <Ionicons name={activeTab === 'scanner' ? 'qr-code' : 'qr-code-outline'} size={24} color={activeTab === 'scanner' ? theme.primary : theme.textTertiary} />
        <ThemedText style={[styles.bottomTabLabel, { color: activeTab === 'scanner' ? theme.primary : theme.textTertiary }]}>Scanner</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity style={styles.bottomTab} onPress={() => handleNavigate('history')} activeOpacity={0.7}>
        <Ionicons name={activeTab === 'history' ? 'time' : 'time-outline'} size={24} color={activeTab === 'history' ? theme.primary : theme.textTertiary} />
        <ThemedText style={[styles.bottomTabLabel, { color: activeTab === 'history' ? theme.primary : theme.textTertiary }]}>History</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity style={styles.bottomTab} onPress={() => handleNavigate('vehicle')} activeOpacity={0.7}>
        <Ionicons name={activeTab === 'vehicle' ? 'car' : 'car-outline'} size={24} color={activeTab === 'vehicle' ? theme.primary : theme.textTertiary} />
        <ThemedText style={[styles.bottomTabLabel, { color: activeTab === 'vehicle' ? theme.primary : theme.textTertiary }]}>Vehicle</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity style={styles.bottomTab} onPress={() => handleNavigate('visitor')} activeOpacity={0.7}>
        <Ionicons name={activeTab === 'visitor' ? 'people' : 'people-outline'} size={24} color={activeTab === 'visitor' ? theme.primary : theme.textTertiary} />
        <ThemedText style={[styles.bottomTabLabel, { color: activeTab === 'visitor' ? theme.primary : theme.textTertiary }]}>Visitor</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity style={styles.bottomTab} onPress={() => handleNavigate('hods')} activeOpacity={0.7}>
        <Ionicons name={activeTab === 'contacts' ? 'call' : 'call-outline'} size={24} color={activeTab === 'contacts' ? theme.primary : theme.textTertiary} />
        <ThemedText style={[styles.bottomTabLabel, { color: activeTab === 'contacts' ? theme.primary : theme.textTertiary }]}>Contacts</ThemedText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomTabBar: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  bottomTabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default SecurityBottomNav;
