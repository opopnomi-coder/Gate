import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  Platform,
  Linking,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { apiService } from '../../services/api';
import { HODContact, SecurityPersonnel, ScreenName } from '../../types';
import SecurityBottomNav from '../../components/SecurityBottomNav';
import ErrorModal from '../../components/ErrorModal';
import ThemedText from '../../components/ThemedText';
import { VerticalFlatList, VerticalScrollView } from '../../components/navigation/VerticalScrollViews';
import { useTheme } from '../../context/ThemeContext';
import TopRefreshControl from '../../components/TopRefreshControl';
import SearchableDropdown, { DropdownItem } from '../../components/SearchableDropdown';
import { SkeletonList } from '../../components/SkeletonCard';

interface HODContactsScreenProps {
  security: SecurityPersonnel;
  onBack: () => void;
  onNavigate: (screen: ScreenName) => void;
}

export default function HODContactsScreen({ security, onBack, onNavigate }: HODContactsScreenProps) {
  const { theme } = useTheme();
  const [hods, setHods] = useState<HODContact[]>([]);
  const [filteredHods, setFilteredHods] = useState<HODContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const departments = ['ALL', 'CSE', 'ECE', 'IT', 'AIDS', 'AIML', 'MECH', 'EEE', 'CCE', 'CSBS', 'VLSI', 'ADMIN'];

  useEffect(() => {
    fetchHODs();
  }, []);

  useEffect(() => {
    filterHODs();
  }, [searchQuery, selectedDepartment, hods]);

  const fetchHODs = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getHODContacts();
      if (response.success && response.data) {
        setHods(response.data);
        setFilteredHods(response.data);
      } else {
        setErrorMessage('Failed to fetch HOD contacts');
        setShowErrorModal(true);
      }
    } catch (error) {
      setErrorMessage('Could not connect to server');
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    console.log('🔄 [REFRESH] Security/HODContacts');
    setRefreshing(true);
    await fetchHODs();
    setRefreshing(false);
  };

  const filterHODs = () => {
    let filtered = [...hods];

    // Filter by department
    if (selectedDepartment !== 'ALL') {
      filtered = filtered.filter(hod => {
        const deptName = hod.department ? hod.department.toUpperCase() : '';
        return deptName === selectedDepartment.toUpperCase() || 
               deptName.includes(selectedDepartment.toUpperCase());
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        hod =>
          hod.name.toLowerCase().includes(query) ||
          (hod.department && hod.department.toLowerCase().includes(query))
      );
    }

    setFilteredHods(filtered);
  };

  const handleCall = async (phone: string) => {
    try {
      const phoneUrl = Platform.OS === 'ios' ? `telprompt://${phone}` : `tel:${phone}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);
      
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        await Linking.openURL(`tel:${phone}`);
      }
    } catch (error) {
      console.error('Error opening phone dialer:', error);
      setErrorMessage('Failed to open phone dialer');
      setShowErrorModal(true);
    }
  };

  const handleMessage = async (phone: string) => {
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const whatsappUrl = `whatsapp://send?phone=91${cleanPhone}`;
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        setErrorMessage('Please install WhatsApp to send messages to HODs.');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      setErrorMessage('Failed to open WhatsApp');
      setShowErrorModal(true);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name || typeof name !== 'string' || name.trim() === '') return 'HD';
    const trimmedName = name.trim();
    const parts = trimmedName.split(' ').filter(part => part.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return 'HD';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.surfaceHighlight }]} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>HOD Contacts</ThemedText>
        <View style={styles.headerRight} />
      </View>
      <TopRefreshControl refreshing={refreshing} onRefresh={handleRefresh} color={theme.primary} pullEnabled={true}>
      <View style={{ paddingHorizontal: 20 }}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: theme.surfaceHighlight, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search by HOD name or department"
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Department Filter as Dropdown */}
        <View style={styles.dropdownFilterWrapper}>
          <ThemedText style={[styles.filterLabel, { color: theme.textSecondary }]}>Filter by Department</ThemedText>
          <SearchableDropdown
            items={departments.map(dept => ({
              label: dept === 'ALL' ? 'All Departments' : dept,
              value: dept
            }))}
            selectedValue={selectedDepartment}
            onSelect={(val) => setSelectedDepartment(val)}
            placeholder="Select Department"
          />
        </View>
      </View>

      <VerticalFlatList
        style={styles.listContainer}
        data={filteredHods}
        keyExtractor={(item: HODContact) => (item.id ?? Math.random()).toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {isLoading && <SkeletonList count={6} />}

            {!isLoading && filteredHods.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color={theme.textTertiary} />
                <ThemedText style={[styles.emptyStateText, { color: theme.text }]}>No HOD contact records found</ThemedText>
                <ThemedText style={[styles.emptyStateSubtext, { color: theme.textTertiary }]}>
                  {searchQuery || selectedDepartment !== 'ALL'
                    ? 'Try adjusting your search or filter'
                    : 'No HOD contacts available'}
                </ThemedText>
              </View>
            )}
          </>
        }
        renderItem={({ item: hod }) => (
          <View key={hod.id} style={[styles.hodCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Avatar and Info */}
            <View style={styles.hodHeader}>
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <ThemedText style={[styles.avatarText, { color: '#FFFFFF' }]}>{getInitials(hod.name)}</ThemedText>
              </View>
              <View style={styles.hodInfo}>
                <ThemedText style={[styles.hodName, { color: theme.text }]}>{hod.name || 'Unknown HOD'}</ThemedText>
                <ThemedText style={[styles.hodDepartment, { color: theme.textSecondary }]}>
                  {hod.department || 'N/A'} • {hod.department || 'N/A'}
                </ThemedText>
                <View style={[styles.designationBadge, { backgroundColor: theme.surfaceHighlight }]}>
                  <ThemedText style={[styles.designationText, { color: theme.textSecondary }]}>Head of Department</ThemedText>
                </View>
              </View>
              <View style={styles.statusIndicator}>
                <View style={[styles.statusDot, { backgroundColor: theme.primary }]} />
                <ThemedText style={[styles.statusText, { color: theme.primary }]}>Active</ThemedText>
              </View>
            </View>

            {/* Contact Info */}
            <View style={[styles.contactSection, { backgroundColor: theme.surfaceHighlight }]}>
              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={16} color={theme.textSecondary} />
                <ThemedText style={[styles.contactText, { color: theme.text }]}>{hod.phone || 'N/A'}</ThemedText>
              </View>
              <View style={styles.contactRow}>
                <Ionicons name="mail-outline" size={16} color={theme.textSecondary} />
                <ThemedText style={[styles.contactEmail, { color: theme.textSecondary }]}>{hod.email || 'N/A'}</ThemedText>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.callButton, { backgroundColor: theme.primary }]}
                onPress={() => handleCall(hod.phone || '')}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={18} color="#FFFFFF" />
                <ThemedText style={styles.callButtonText}>Call</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.messageButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => handleMessage(hod.phone || '')}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-outline" size={18} color={theme.textSecondary} />
                <ThemedText style={[styles.messageButtonText, { color: theme.textSecondary }]}>Message</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Bottom Navigation */}
      <SecurityBottomNav activeTab="contacts" onNavigate={onNavigate} />
      </TopRefreshControl>

      <ErrorModal
        visible={showErrorModal}
        type="general"
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 20,
    paddingHorizontal: 20,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 22,
  },
  headerRight: {
    width: 40,
  },

  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },

  // Department Dropdown
  dropdownFilterWrapper: {
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  filterChipActive: {
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // List
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },

  // HOD Card
  hodCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
  },
  hodHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hodInfo: {
    flex: 1,
  },
  hodName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  hodDepartment: {
    fontSize: 13,
    marginBottom: 6,
  },
  designationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  designationText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusIndicator: {
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Contact Section
  contactSection: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
    flex: 1,
  },
  contactEmail: {
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  callButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  messageButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Bottom Navigation Bar
  bottomTabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 6,
    paddingBottom: Platform.OS === 'ios' ? 20 : 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 8,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  bottomTabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  activeBottomTabLabel: {
    fontWeight: '600',
  },
});
