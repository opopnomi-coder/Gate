import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Image,
  TextInput,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SecurityPersonnel, ActivePerson, ScreenName } from '../../types';
import { apiService } from '../../services/api';
import SecurityBottomNav from '../../components/SecurityBottomNav';
import { useProfile } from '../../context/ProfileContext';
import { useNotifications } from '../../context/NotificationContext';
import { useRefresh } from '../../context/RefreshContext';
import { useTheme } from '../../context/ThemeContext';
import { useActionLock } from '../../context/ActionLockContext';
import NotificationDropdown from '../../components/NotificationDropdown';
import ConfirmationModal from '../../components/ConfirmationModal';
import ScreenContentContainer from '../../components/ScreenContentContainer';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import { formatTime as fmtTime, getRelativeTimeShort } from '../../utils/dateUtils';
import ThemedText from '../../components/ThemedText';
import { VerticalFlatList, VerticalScrollView } from '../../components/navigation/VerticalScrollViews';
import { useBottomSheetSwipe } from '../../hooks/useBottomSheetSwipe';
import { SkeletonList, StatsSkeleton } from '../../components/SkeletonCard';
import TopRefreshControl from '../../components/TopRefreshControl';


interface NewSecurityDashboardProps {
  user: SecurityPersonnel;
  onLogout: () => void;
  onNavigate: (screen: ScreenName) => void;
}

interface EscalatedVisitor {
  id: number;
  name: string;
  email: string;
  phone: string;
  department: string;
  personToMeet: string;
  purpose: string;
  numberOfPeople: number;
  status: string;
  escalatedToSecurity: boolean;
  escalationTime: string;
  notificationSentAt: string;
  createdAt: string;
}

const NewSecurityDashboard: React.FC<NewSecurityDashboardProps> = ({
  user,
  onLogout,
  onNavigate,
}) => {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [activePersons, setActivePersons] = useState<ActivePerson[]>([]);
  const { profileImage } = useProfile();
  const [selectedPerson, setSelectedPerson] = useState<ActivePerson | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const { unreadCount, loadNotifications } = useNotifications();
  const { refreshCount } = useRefresh();
  const [escalatedVisitors, setEscalatedVisitors] = useState<EscalatedVisitor[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<EscalatedVisitor | null>(null);
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { lock, unlock } = useActionLock();
  const { translateY: rejectSheetY, panHandlers: rejectPanHandlers } = useBottomSheetSwipe(() => setShowRejectModal(false));

  const [stats, setStats] = useState({
    active: 0,
    exited: 0,
    total: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [personsLoading, setPersonsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadEscalatedVisitors();
    loadNotifications(user.securityId, 'security');

    // Poll for new escalated visitors every 30 seconds
    const pollInterval = setInterval(() => {
      loadEscalatedVisitors();
    }, 30000);

    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => { if (refreshCount > 0) { loadDashboardData(); loadEscalatedVisitors(); } }, [refreshCount]);

  const loadDashboardData = async () => {
    try {
      // Run active persons + fast stats endpoint in parallel
      const [personsResponse, statsResponse] = await Promise.all([
        apiService.getActivePersons(),
        apiService.getSecurityStats(),
      ]);

      let mergedPersons: ActivePerson[] = [];

      if (personsResponse.success && personsResponse.data) {
        mergedPersons = personsResponse.data.filter((person: ActivePerson) => {
          const name = person.name || (person as any).fullName || (person as any).studentName;
          return name && 
            !name.startsWith('QR Not Found') && 
            !name.includes('Unknown');
        }).map((person: ActivePerson) => {
          let name = person.name || (person as any).fullName || (person as any).studentName;
          if (!name || name === 'Visitor-null' || name.includes('-null')) {
            name = person.type === 'VISITOR' ? 'Visitor' : (name || 'User');
          }
          return { ...person, name, type: (person as any).role || person.type };
        });
      }

      setActivePersons(mergedPersons);
      setPersonsLoading(false);

      // Use fast stats endpoint for EXITED / TOTAL, but use actual list for ACTIVE count
      const actualActiveCount = mergedPersons.filter(p => p.status === 'PENDING').length;
      if (statsResponse.success && statsResponse.data) {
        setStats({
          active: actualActiveCount,
          exited: statsResponse.data.exited,
          total:  actualActiveCount + statsResponse.data.exited,
        });
      } else {
        setStats({ active: actualActiveCount, exited: 0, total: actualActiveCount });
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setPersonsLoading(false);
    } finally {
      setRefreshing(false);
      setStatsLoading(false);
    }
  };

  const loadEscalatedVisitors = async () => {
    try {
      const response = await apiService.getEscalatedVisitors();
      if (response.success && response.data) {
        setEscalatedVisitors(response.data);
      }
    } catch (error) {
      console.error('Error loading escalated visitors:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setStatsLoading(true);
    setPersonsLoading(true);
    loadDashboardData();
    loadEscalatedVisitors();
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'SG';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatTime = (timeString: string) => {
    try {
      return fmtTime(timeString);
    } catch (error) {
      return timeString;
    }
  };

  const handleManualExit = async (person: ActivePerson) => {
    try {
      lock('Marking exit for ' + person.name + '...');
      const response = await apiService.manualExit(person.name, user.securityId, person.userId, person.scanId, person.purpose);
      if (response.success) {
        // Optimistically remove from list immediately
        setActivePersons(prev => prev.filter(p => p.id !== person.id));
        setShowDetailModal(false);
        // Reload data silently before showing success
        await loadDashboardData();
        setSuccessMessage(`${person.name} has been marked as exited`);
        setShowSuccessModal(true);
      } else {
        setErrorMessage(response.message || 'Failed to mark exit');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Manual exit error:', error);
      setErrorMessage('Failed to process manual exit');
      setShowErrorModal(true);
    } finally {
      unlock();
    }
  };

  const handleApproveVisitor = async (visitor: EscalatedVisitor) => {
    try {
      lock('Approving visitor request...');
      const securityId = user.securityId || user.id?.toString() || 'SEC001';
      const response = await apiService.approveEscalatedVisitor(visitor.id, securityId);
      if (response.success) {
        // Optimistically remove from list immediately
        setEscalatedVisitors(prev => prev.filter(v => v.id !== visitor.id));
        
        setSuccessMessage('Visitor approved successfully');
        setShowSuccessModal(true);
        setShowVisitorModal(false);
        await loadEscalatedVisitors();
      } else {
        setErrorMessage(response.message || 'Failed to approve visitor');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Approve visitor error:', error);
      setErrorMessage('Failed to approve visitor');
      setShowErrorModal(true);
    } finally {
      unlock();
    }
  };

  const handleRejectVisitor = async (visitor: EscalatedVisitor) => {
    setSelectedVisitor(visitor);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const confirmRejectVisitor = async () => {
    if (!selectedVisitor) return;

    try {
      lock('Rejecting visitor request...');
      const response = await apiService.rejectEscalatedVisitor(
        selectedVisitor.id,
        user.securityId || user.id?.toString() || 'SEC001',
        rejectionReason || 'Rejected by security'
      );
      if (response.success) {
        // Optimistically remove from list immediately
        setEscalatedVisitors(prev => prev.filter(v => v.id !== selectedVisitor.id));
        
        setSuccessMessage('Visitor rejected');
        setShowSuccessModal(true);
        setShowRejectModal(false);
        setShowVisitorModal(false);
        setRejectionReason('');
        await loadEscalatedVisitors();
      } else {
        setErrorMessage(response.message || 'Failed to reject visitor');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Reject visitor error:', error);
      setErrorMessage('Failed to reject visitor');
      setShowErrorModal(true);
    } finally {
      unlock();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={[styles.avatar, { backgroundColor: theme.primary }]} onPress={() => onNavigate('PROFILE')}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: theme.surfaceHighlight }]}>
                <ThemedText style={[styles.avatarText, { color: theme.primary }]}>{getInitials(user.name || user.securityName || 'SG')}</ThemedText>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <ThemedText style={[styles.greeting, { color: theme.textSecondary }]}>Good Morning,</ThemedText>
            <ThemedText style={[styles.userName, { color: theme.text }]} numberOfLines={1}>{(user.name || user.securityName || 'SECURITY').toUpperCase()}</ThemedText>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.surfaceHighlight }]} onPress={() => onNavigate('NOTIFICATIONS')}>
            <Ionicons name="notifications-outline" size={24} color={theme.text} />
            {unreadCount > 0 && <View style={[styles.notificationIndicator, { backgroundColor: theme.error }]} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards */}
      <ScreenContentContainer style={{ flex: 1 }}>
        <TopRefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          color={theme.primary}
          pullEnabled={true}
        >
        <VerticalFlatList
          style={styles.outerScroll}
          contentContainerStyle={styles.outerScrollContent}
          showsVerticalScrollIndicator={false}
          decelerationRate="normal"
          data={personsLoading ? [] : activePersons.filter(p => p.status === 'PENDING')}
          keyExtractor={(person, index) => `${person.id}-${index}`}
          refreshControl={undefined}
          ListHeaderComponent={
            <>
              <View style={[styles.controlCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {statsLoading ? <StatsSkeleton /> : (
                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <View style={[styles.statIcon, { backgroundColor: theme.success + '20' }]}>
                      <Ionicons name="enter-outline" size={18} color={theme.success} />
                    </View>
                    <ThemedText style={[styles.statValue, { color: theme.text }]}>{stats.active}</ThemedText>
                    <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>ACTIVE</ThemedText>
                  </View>
                  
                  <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                  
                  <View style={styles.statBox}>
                    <View style={[styles.statIcon, { backgroundColor: theme.error + '20' }]}>
                      <Ionicons name="exit-outline" size={18} color={theme.error} />
                    </View>
                    <ThemedText style={[styles.statValue, { color: theme.text }]}>{stats.exited}</ThemedText>
                    <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>EXITED</ThemedText>
                  </View>

                  <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

                  <View style={styles.statBox}>
                    <View style={[styles.statIcon, { backgroundColor: theme.primary + '20' }]}>
                      <Ionicons name="people-outline" size={18} color={theme.primary} />
                    </View>
                    <ThemedText style={[styles.statValue, { color: theme.text }]}>{stats.total}</ThemedText>
                    <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>TOTAL</ThemedText>
                  </View>
                </View>
                )}
              </View>

              {/* Visitor Requests Section */}
              {escalatedVisitors.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="alert-circle" size={18} color={theme.error} />
                      <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Pending Visitor Requests</ThemedText>
                    </View>
                    <View style={[styles.badge, { backgroundColor: theme.error + '22' }]}>
                      <ThemedText style={[styles.badgeText, { color: theme.error }]}>{escalatedVisitors.length}</ThemedText>
                    </View>
                  </View>
                  <ThemedText style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                    Staff did not respond within 5 min — your action required
                  </ThemedText>

                  {escalatedVisitors.map((visitor) => (
                    <TouchableOpacity
                      key={visitor.id}
                      style={[styles.requestCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                      onPress={() => { setSelectedVisitor(visitor); setShowVisitorModal(true); }}
                    >
                      <View style={styles.cardTopRow}>
                        <View style={[styles.avatarContainer, { backgroundColor: theme.error + '22' }]}>
                          <ThemedText style={[styles.requestAvatarText, { color: theme.error }]}>
                            {getInitials(visitor.name)}
                          </ThemedText>
                        </View>
                        <View style={styles.headerMainInfo}>
                          <View style={styles.nameRow}>
                            <ThemedText style={[styles.requestStudentName, { color: theme.text }]} numberOfLines={1}>
                              {visitor.name}
                            </ThemedText>
                            <View style={[styles.passTypePill, { backgroundColor: theme.error + '15', borderColor: theme.error + '44' }]}>
                              <ThemedText style={[styles.passTypePillText, { color: theme.error }]}>Visitor</ThemedText>
                            </View>
                          </View>
                          <ThemedText style={[styles.studentIdSub, { color: theme.textSecondary }]}>
                            To meet: {visitor.personToMeet} • {visitor.department}
                          </ThemedText>
                        </View>
                        <View style={styles.timeAgoContainer}>
                          <Ionicons name="time-outline" size={12} color={theme.error} />
                          <ThemedText style={[styles.timeAgoText, { color: theme.error }]}>
                            {getRelativeTimeShort(visitor.escalationTime || visitor.createdAt)}
                          </ThemedText>
                        </View>
                      </View>

                      <View style={[styles.detailsBlock, { backgroundColor: theme.inputBackground }]}>
                        <View style={styles.detailItem}>
                          <Ionicons name="document-text-outline" size={14} color={theme.textSecondary} />
                          <ThemedText style={[styles.detailText, { color: theme.text }]} numberOfLines={1}>{visitor.purpose}</ThemedText>
                        </View>
                        <View style={styles.detailItem}>
                          <Ionicons name="people-outline" size={14} color={theme.textSecondary} />
                          <ThemedText style={[styles.detailText, { color: theme.text }]}>{visitor.numberOfPeople} {visitor.numberOfPeople === 1 ? 'person' : 'people'}</ThemedText>
                        </View>
                        <View style={styles.detailItem}>
                          <Ionicons name="call-outline" size={14} color={theme.textSecondary} />
                          <ThemedText style={[styles.detailText, { color: theme.text }]}>{visitor.phone}</ThemedText>
                        </View>
                      </View>

                      <View style={styles.cardFooter}>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: theme.success }]}
                          onPress={(e) => { e.stopPropagation(); handleApproveVisitor(visitor); }}
                        >
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          <ThemedText style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Approve</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: theme.error }]}
                          onPress={(e) => { e.stopPropagation(); handleRejectVisitor(visitor); }}
                        >
                          <Ionicons name="close" size={14} color="#FFFFFF" />
                          <ThemedText style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Reject</ThemedText>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Active Persons Section Header */}
              <View style={[styles.sectionHeader, { paddingBottom: 12 }]}>
                <View style={styles.sectionTitleRow}>
                  <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Active Persons</ThemedText>
                </View>
                <ThemedText style={[styles.sectionCount, { color: theme.textSecondary }]}>
                  {personsLoading ? '...' : `${activePersons.filter(p => p.status === 'PENDING').length} active`}
                </ThemedText>
              </View>
              {personsLoading && <SkeletonList count={3} />}
            </>
          }
          renderItem={({ item: person }) => (
            <TouchableOpacity
              style={[styles.personCard, { backgroundColor: theme.surface }]}
              onPress={() => { setSelectedPerson(person); setShowDetailModal(true); }}
            >
              <View style={[styles.personAvatar, { backgroundColor: theme.primary }]}>
                <ThemedText style={styles.personAvatarText}>{getInitials(person.name)}</ThemedText>
              </View>
              <View style={styles.personInfo}>
                <ThemedText style={[styles.personName, { color: theme.text }]}>{person.name}</ThemedText>
                <ThemedText style={[styles.personType, { color: theme.primary }]}>{person.type}</ThemedText>
                <ThemedText style={[styles.personPurpose, { color: theme.textSecondary }]} numberOfLines={1}>{person.purpose}</ThemedText>
              </View>
              <View style={styles.personRight}>
                <View style={[styles.statusBadge, { backgroundColor: theme.success }]}>
                  <View style={[styles.statusDot, { backgroundColor: '#FFFFFF' }]} />
                  <ThemedText style={[styles.statusText, { color: '#FFFFFF' }]}>ACTIVE</ThemedText>
                </View>
                <ThemedText style={[styles.personTime, { color: theme.textTertiary }]}>{formatTime(person.inTime)}</ThemedText>
                <TouchableOpacity
                  style={[styles.exitButton, { backgroundColor: theme.error }]}
                  onPress={(e) => { e.stopPropagation(); handleManualExit(person); }}
                >
                  <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
                  <ThemedText style={[styles.exitButtonText, { color: '#FFFFFF' }]}>Exit</ThemedText>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={theme.border} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>No active persons</ThemedText>
            </View>
          }
        />
        </TopRefreshControl>
      </ScreenContentContainer>

      {/* Bottom Navigation */}
      <SecurityBottomNav activeTab="home" onNavigate={onNavigate} />

      {/* Person Detail — Full Screen */}
      <Modal visible={showDetailModal} animationType="slide" transparent={false} statusBarTranslucent onRequestClose={() => setShowDetailModal(false)}>
        <SafeAreaView style={[detailStyles.screen, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
          <StatusBar barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />

          {/* Header */}
          <View style={[detailStyles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)} style={[detailStyles.backBtn, { backgroundColor: theme.inputBackground }]}>
              <Ionicons name="arrow-back" size={22} color={theme.text} />
            </TouchableOpacity>
            <ThemedText style={[detailStyles.headerTitle, { color: theme.text }]}>Person Details</ThemedText>
            {selectedPerson && (
              <View style={[detailStyles.statusPill, { backgroundColor: (selectedPerson.status === 'PENDING' ? theme.success : theme.error) + '22' }]}>
                <ThemedText style={[detailStyles.statusPillText, { color: selectedPerson.status === 'PENDING' ? theme.success : theme.error }]}>
                  {selectedPerson.status === 'PENDING' ? 'ON CAMPUS' : 'EXITED'}
                </ThemedText>
              </View>
            )}
          </View>

          {selectedPerson && (
            <VerticalScrollView style={detailStyles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={detailStyles.scrollContent}>
              {/* Profile Row */}
              <View style={[detailStyles.profileRow, { backgroundColor: theme.surface }]}>
                <View style={[detailStyles.avatar, { backgroundColor: theme.primary }]}>
                  <ThemedText style={detailStyles.avatarText}>{getInitials(selectedPerson.name)}</ThemedText>
                </View>
                <View style={detailStyles.profileInfo}>
                  <View style={[detailStyles.typePill, { backgroundColor: theme.primary + '22' }]}>
                    <ThemedText style={[detailStyles.typePillText, { color: theme.primary }]}>{selectedPerson.type}</ThemedText>
                  </View>
                  <ThemedText style={[detailStyles.profileName, { color: theme.text }]} numberOfLines={1}>{selectedPerson.name}</ThemedText>
                </View>
              </View>

              {/* Info Grid */}
              <View style={[detailStyles.infoGrid, { backgroundColor: theme.surface }]}>
                <View style={detailStyles.infoCell}>
                  <ThemedText style={[detailStyles.infoLabel, { color: theme.textTertiary }]}>PURPOSE</ThemedText>
                  <ThemedText style={[detailStyles.infoValue, { color: theme.text }]} numberOfLines={2}>{selectedPerson.purpose || 'N/A'}</ThemedText>
                </View>
                <View style={[detailStyles.infoDivider, { backgroundColor: theme.border }]} />
                <View style={detailStyles.infoCell}>
                  <ThemedText style={[detailStyles.infoLabel, { color: theme.textTertiary }]}>ENTRY TIME</ThemedText>
                  <ThemedText style={[detailStyles.infoValue, { color: theme.text }]}>{formatTime(selectedPerson.inTime)}</ThemedText>
                </View>
              </View>

              {/* Time Block */}
              <View style={[detailStyles.block, { backgroundColor: theme.surface }]}>
                <ThemedText style={[detailStyles.blockLabel, { color: theme.textTertiary }]}>TIME DETAILS</ThemedText>
                <View style={detailStyles.timeRow}>
                  <View style={[detailStyles.timeBox, { backgroundColor: theme.success + '15' }]}>
                    <Ionicons name="enter-outline" size={18} color={theme.success} />
                    <ThemedText style={[detailStyles.timeBoxLabel, { color: theme.textSecondary }]}>Entry</ThemedText>
                    <ThemedText style={[detailStyles.timeBoxValue, { color: theme.text }]}>{formatTime(selectedPerson.inTime)}</ThemedText>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={theme.textTertiary} />
                  <View style={[detailStyles.timeBox, { backgroundColor: (selectedPerson.outTime ? theme.error : theme.inputBackground) + '33' }]}>
                    <Ionicons name="exit-outline" size={18} color={selectedPerson.outTime ? theme.error : theme.textTertiary} />
                    <ThemedText style={[detailStyles.timeBoxLabel, { color: theme.textSecondary }]}>Exit</ThemedText>
                    <ThemedText style={[detailStyles.timeBoxValue, { color: theme.text }]}>{selectedPerson.outTime ? formatTime(selectedPerson.outTime) : '—'}</ThemedText>
                  </View>
                </View>
              </View>

              {/* Status Timeline */}
              <View style={[detailStyles.block, { backgroundColor: theme.surface }]}>
                <ThemedText style={[detailStyles.blockLabel, { color: theme.textTertiary }]}>STATUS TIMELINE</ThemedText>
                {/* Step 1: Entry */}
                <View style={detailStyles.tlItem}>
                  <View style={[detailStyles.tlDot, { backgroundColor: theme.success }]}>
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  </View>
                  <View style={detailStyles.tlBody}>
                    <ThemedText style={[detailStyles.tlTitle, { color: theme.text }]}>Entry Recorded</ThemedText>
                    <ThemedText style={[detailStyles.tlStatus, { color: theme.success }]}>✓ Completed — {selectedPerson.inTime ? formatTime(selectedPerson.inTime) : ''}</ThemedText>
                  </View>
                </View>
                <View style={[detailStyles.tlConnector, { backgroundColor: selectedPerson.status === 'EXITED' ? theme.success : theme.border }]} />
                {/* Step 2: Exit */}
                <View style={detailStyles.tlItem}>
                  <View style={[detailStyles.tlDot, {
                    backgroundColor: selectedPerson.status === 'EXITED' ? theme.error : theme.inputBackground,
                    borderWidth: selectedPerson.status !== 'EXITED' ? 2 : 0,
                    borderColor: theme.border,
                  }]}>
                    {selectedPerson.status === 'EXITED'
                      ? <Ionicons name="checkmark" size={14} color="#FFF" />
                      : <View style={[detailStyles.tlDotInner, { backgroundColor: theme.textTertiary }]} />}
                  </View>
                  <View style={detailStyles.tlBody}>
                    <ThemedText style={[detailStyles.tlTitle, { color: theme.text }]}>Exit</ThemedText>
                    <ThemedText style={[detailStyles.tlStatus, { color: selectedPerson.status === 'EXITED' ? theme.error : theme.textSecondary }]}>
                      {selectedPerson.status === 'EXITED'
                        ? `✓ Exited — ${selectedPerson.outTime ? formatTime(selectedPerson.outTime) : ''}`
                        : 'Still on campus'}
                    </ThemedText>
                  </View>
                </View>
              </View>

              <View style={{ height: 16 }} />
            </VerticalScrollView>
          )}

          {/* Footer */}
          {selectedPerson && selectedPerson.status === 'PENDING' && (
            <View style={[detailStyles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[detailStyles.exitBtn, { backgroundColor: theme.error }]}
                onPress={() => { setShowDetailModal(false); handleManualExit(selectedPerson); }}
              >
                <Ionicons name="log-out-outline" size={20} color="#FFF" />
                <ThemedText style={[detailStyles.exitBtnText, { color: '#FFF' }]}>Mark as Exited</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Visitor Detail — Full Screen (matching SinglePassDetailsModal style) */}
      <Modal visible={showVisitorModal} animationType="slide" transparent={false} statusBarTranslucent onRequestClose={() => setShowVisitorModal(false)}>
        <SafeAreaView style={[detailStyles.screen, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
          <StatusBar barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />

          {/* Header */}
          <View style={[detailStyles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowVisitorModal(false)} style={[detailStyles.backBtn, { backgroundColor: theme.inputBackground }]}>
              <Ionicons name="arrow-back" size={22} color={theme.text} />
            </TouchableOpacity>
            <ThemedText style={[detailStyles.headerTitle, { color: theme.text }]}>Visitor Request</ThemedText>
            <View style={[detailStyles.statusPill, { backgroundColor: theme.warning }]}>
              <ThemedText style={[detailStyles.statusPillText, { color: '#FFFFFF' }]}>ESCALATED</ThemedText>
            </View>
          </View>

          {selectedVisitor && (
            <VerticalScrollView style={detailStyles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={detailStyles.scrollContent}>
              {/* Escalation Warning Banner */}
              <View style={[visitorDetailStyles.urgentBanner, { backgroundColor: theme.error }]}>
                <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
                <ThemedText style={[visitorDetailStyles.urgentBannerText, { color: '#FFFFFF' }]}>
                  Request escalated — No response from {selectedVisitor.personToMeet}
                </ThemedText>
              </View>

              {/* Profile Row */}
              <View style={[detailStyles.profileRow, { backgroundColor: theme.surface }]}>
                <View style={[detailStyles.avatar, { backgroundColor: theme.error }]}>
                  <ThemedText style={detailStyles.avatarText}>{getInitials(selectedVisitor.name)}</ThemedText>
                </View>
                <View style={detailStyles.profileInfo}>
                  <View style={[visitorDetailStyles.visitorBadge, { backgroundColor: theme.error }]}>
                    <ThemedText style={[visitorDetailStyles.visitorBadgeText, { color: '#FFFFFF' }]}>VISITOR</ThemedText>
                  </View>
                  <ThemedText style={[detailStyles.profileName, { color: theme.text }]} numberOfLines={1}>{selectedVisitor.name}</ThemedText>
                  <ThemedText style={[visitorDetailStyles.profileSub, { color: theme.textSecondary }]} numberOfLines={1}>
                    {selectedVisitor.email}
                  </ThemedText>
                </View>
              </View>

              {/* Info Grid — People & Phone */}
              <View style={[detailStyles.infoGrid, { backgroundColor: theme.surface }]}>
                <View style={detailStyles.infoCell}>
                  <ThemedText style={[detailStyles.infoLabel, { color: theme.textTertiary }]}>PEOPLE</ThemedText>
                  <ThemedText style={[detailStyles.infoValue, { color: theme.text }]}>{selectedVisitor.numberOfPeople}</ThemedText>
                </View>
                <View style={[detailStyles.infoDivider, { backgroundColor: theme.border }]} />
                <View style={detailStyles.infoCell}>
                  <ThemedText style={[detailStyles.infoLabel, { color: theme.textTertiary }]}>PHONE</ThemedText>
                  <ThemedText style={[detailStyles.infoValue, { color: theme.text }]}>{selectedVisitor.phone}</ThemedText>
                </View>
              </View>

              {/* Visit Details */}
              <View style={[detailStyles.block, { backgroundColor: theme.surface }]}>
                <ThemedText style={[detailStyles.blockLabel, { color: theme.textTertiary }]}>VISIT DETAILS</ThemedText>
                <View style={visitorDetailStyles.detailRow}>
                  <ThemedText style={[visitorDetailStyles.detailLabel, { color: theme.textSecondary }]}>Person to Meet</ThemedText>
                  <ThemedText style={[visitorDetailStyles.detailValue, { color: theme.text }]}>{selectedVisitor.personToMeet}</ThemedText>
                </View>
                <View style={visitorDetailStyles.detailRow}>
                  <ThemedText style={[visitorDetailStyles.detailLabel, { color: theme.textSecondary }]}>Department</ThemedText>
                  <ThemedText style={[visitorDetailStyles.detailValue, { color: theme.text }]}>{selectedVisitor.department}</ThemedText>
                </View>
                <View style={visitorDetailStyles.detailRow}>
                  <ThemedText style={[visitorDetailStyles.detailLabel, { color: theme.textSecondary }]}>Purpose of Visit</ThemedText>
                  <ThemedText style={[visitorDetailStyles.detailValue, { color: theme.text, flex: 1, textAlign: 'right' }]}>{selectedVisitor.purpose}</ThemedText>
                </View>
              </View>

              <View style={{ height: 16 }} />
            </VerticalScrollView>
          )}

          {/* Footer with Approve/Reject buttons */}
          {selectedVisitor && (
            <View style={[detailStyles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
              <View style={visitorDetailStyles.actionRow}>
                <TouchableOpacity
                  style={[visitorDetailStyles.actionBtn, { backgroundColor: theme.success }]}
                  onPress={() => handleApproveVisitor(selectedVisitor)}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                  <ThemedText style={[visitorDetailStyles.actionBtnText, { color: '#FFF' }]}>Approve</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[visitorDetailStyles.actionBtn, { backgroundColor: theme.error }]}
                  onPress={() => handleRejectVisitor(selectedVisitor)}
                >
                  <Ionicons name="close-circle" size={20} color="#FFF" />
                  <ThemedText style={[visitorDetailStyles.actionBtnText, { color: '#FFF' }]}>Reject</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Rejection Reason Modal */}
      <Modal visible={showRejectModal} transparent animationType="fade" onRequestClose={() => setShowRejectModal(false)}>
        <TouchableOpacity style={styles.rejectModalOverlay} activeOpacity={1} onPress={() => setShowRejectModal(false)}>
          <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()} style={[styles.rejectModalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.rejectModalHeader, { borderBottomColor: theme.border }]}>
              <ThemedText style={[styles.rejectModalTitle, { color: theme.text }]}>Reject Visitor</ThemedText>
              <TouchableOpacity onPress={() => setShowRejectModal(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            {selectedVisitor && <ThemedText style={[styles.rejectModalSubtitle, { color: theme.textSecondary }]}>Provide reason for rejecting {selectedVisitor.name}</ThemedText>}
            <TextInput
              style={[styles.rejectReasonInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
              placeholder="Enter rejection reason..."
              placeholderTextColor={theme.textTertiary}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.rejectModalButtons}>
              <TouchableOpacity style={[styles.rejectModalCancelBtn, { backgroundColor: theme.surfaceHighlight, borderColor: theme.border }]} onPress={() => setShowRejectModal(false)}>
                <ThemedText style={[styles.rejectModalCancelText, { color: theme.textSecondary }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.rejectModalConfirmBtn, { backgroundColor: theme.error }]} onPress={confirmRejectVisitor}>
                <Ionicons name="close-circle" size={20} color="#FFF" />
                <ThemedText style={[styles.rejectModalConfirmText, { color: '#FFF' }]}>Reject</ThemedText>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Notification Dropdown */}
      <NotificationDropdown
        visible={showNotificationDropdown}
        onClose={() => setShowNotificationDropdown(false)}
        userId={user.securityId}
        userType="security"
      />
      <ConfirmationModal
        visible={showLogoutModal}
        title="Logout"
        message="Are you sure you want to log out?"
        confirmText="Logout"
        onConfirm={onLogout}
        onCancel={() => setShowLogoutModal(false)}
        icon="log-out-outline"
        confirmColor={theme.error}
      />
      <SuccessModal
        visible={showSuccessModal}
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
      <ErrorModal
        visible={showErrorModal}
        type="general"
        title="Action Failed"
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  outerScroll: { flex: 1 },
  outerScrollContent: { paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  headerInfo: { gap: 2, flex: 1 },
  greeting: { fontSize: 13 },
  userName: { fontSize: 18, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  notificationIndicator: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
  controlCard: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  statValue: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 40, marginHorizontal: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 4 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionSubtitle: { fontSize: 12, paddingHorizontal: 20, marginBottom: 12 },
  sectionCount: { fontSize: 14 },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyState: { paddingVertical: 80, alignItems: 'center', paddingHorizontal: 20 },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 16 },
  /* Visitor request cards — same style as staff dashboard */
  requestCard: { borderRadius: 16, padding: 16, marginHorizontal: 20, marginBottom: 12, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 },
  requestAvatarText: { fontSize: 16, fontWeight: '700' },
  headerMainInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  requestStudentName: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  passTypePill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  passTypePillText: { fontSize: 10, fontWeight: '700' },
  studentIdSub: { fontSize: 12, marginTop: 2 },
  timeAgoContainer: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 },
  timeAgoText: { fontSize: 12 },
  detailsBlock: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, gap: 5 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, flex: 1 },
  cardFooter: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  personCard: { borderRadius: 12, padding: 16, marginBottom: 12, marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  personAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  personAvatarText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  personInfo: { flex: 1 },
  personName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  personType: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  personPurpose: { fontSize: 13 },
  personRight: { alignItems: 'flex-end' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6, backgroundColor: '#FFFFFF' },
  statusText: { fontSize: 11, fontWeight: '800' },
  personTime: { fontSize: 12, marginBottom: 6 },
  exitButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  exitButtonText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', minHeight: '50%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  closeButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  modalContent: { flex: 1, maxHeight: '100%' },
  modalScrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  modalSection: { marginBottom: 20 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalLabel: { fontSize: 14 },
  modalValue: { fontSize: 14, fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  urgentBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 16, gap: 8 },
  urgentBannerText: { flex: 1, fontSize: 13, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalApproveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  modalRejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  modalBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  rejectModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  rejectModalContent: { borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
  rejectModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 0 },
  rejectModalTitle: { fontSize: 20, fontWeight: '700' },
  rejectModalSubtitle: { fontSize: 14, marginBottom: 16 },
  rejectReasonInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 100, marginBottom: 20 },
  rejectModalButtons: { flexDirection: 'row', gap: 12 },
  rejectModalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rejectModalCancelText: { fontSize: 16, fontWeight: '600' },
  rejectModalConfirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  rejectModalConfirmText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});

const detailStyles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 8 },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 12, gap: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  profileInfo: { flex: 1 },
  typePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 4 },
  typePillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  profileName: { fontSize: 16, fontWeight: '700' },
  profileSub: { fontSize: 12, marginTop: 2 },
  infoGrid: { flexDirection: 'row', marginHorizontal: 16, marginTop: 10, borderRadius: 14, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  infoCell: { flex: 1, padding: 12 },
  infoDivider: { width: 1, marginVertical: 8 },
  infoLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  infoValue: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  block: { marginHorizontal: 16, marginTop: 10, borderRadius: 14, padding: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  blockLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  timeBox: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 10, gap: 4 },
  timeBoxLabel: { fontSize: 11, fontWeight: '600' },
  timeBoxValue: { fontSize: 14, fontWeight: '700' },
  tlItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tlDot: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  tlDotInner: { width: 10, height: 10, borderRadius: 5 },
  tlBody: { flex: 1, paddingTop: 4, paddingBottom: 4 },
  tlTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  tlStatus: { fontSize: 12 },
  tlConnector: { width: 2, height: 20, marginLeft: 15, marginVertical: 2 },
  footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 8 : 14, borderTopWidth: 1 },
  exitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, gap: 8 },
  exitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});

const visitorDetailStyles = StyleSheet.create({
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  urgentBannerText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  visitorBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, alignSelf: 'flex-start', marginBottom: 3 },
  visitorBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  profileSub: { fontSize: 13, marginTop: 3 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailLabel: { fontSize: 14, fontWeight: '500' },
  detailValue: { fontSize: 14, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  actionBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

export default NewSecurityDashboard;
