import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  StatusBar, Image, ActivityIndicator, TextInput, BackHandler
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NonTeachingFaculty, ScreenName } from '../../types';
import { apiService } from '../../services/api.service';
import { useNotifications } from '../../context/NotificationContext';
import { useProfile } from '../../context/ProfileContext';
import { useTheme } from '../../context/ThemeContext';
import { getRelativeTime, formatDateShort } from '../../utils/dateUtils';
import NotificationDropdown from '../../components/NotificationDropdown';
import SinglePassDetailsModal from '../../components/SinglePassDetailsModal';
import GatePassQRModal from '../../components/GatePassQRModal';
import PassTypeBottomSheet from '../../components/PassTypeBottomSheet';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import ScreenContentContainer from '../../components/ScreenContentContainer';
import ThemedText from '../../components/ThemedText';
import { VerticalFlatList } from '../../components/navigation/VerticalScrollViews';

interface NTFDashboardProps {
  ntf: NonTeachingFaculty;
  onLogout: () => void;
  onNavigate: (screen: ScreenName) => void;
}

const NTFDashboard: React.FC<NTFDashboardProps> = ({ ntf, onLogout, onNavigate }) => {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [bottomTab, setBottomTab] = useState<'HOME' | 'NEW_PASS' | 'MY_REQUESTS' | 'PROFILE'>('HOME');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string | null>(null);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPassTypeModal, setShowPassTypeModal] = useState(false);
  const { unreadCount, loadNotifications } = useNotifications();
  const { profileImage } = useProfile();

  useEffect(() => {
    loadRequests();
    loadNotifications(ntf.staffCode, 'staff');
  }, []);

  const loadRequests = async () => {
    try {
      const res = await apiService.getNTFOwnGatePassRequests(ntf.staffCode);
      const all: any[] = (res as any).requests || res.data || [];
      const isUsed = (r: any) => r.qrUsed === true || r.status === 'USED' || r.status === 'EXITED';
      const isToday = (v?: string) => {
        if (!v) return false;
        const d = new Date(v);
        const n = new Date();
        return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
      };
      const filtered = all
        .filter(r => !isUsed(r))
        .filter(r =>
          r.status === 'PENDING' || r.status === 'PENDING_HR' || r.status === 'REJECTED' ||
          r.status === 'APPROVED' || isToday(r.requestDate || r.createdAt)
        )
        .sort((a, b) => new Date(b.requestDate || b.createdAt).getTime() - new Date(a.requestDate || a.createdAt).getTime());
      setRequests(filtered);
    } catch (e) {
      console.error('NTF load requests error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = searchQuery === '' ||
      request.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.id?.toString().includes(searchQuery);

    let matchesTab = false;
    if (activeTab === 'PENDING') {
      matchesTab = request.status === 'PENDING' || request.status === 'PENDING_HR';
    } else if (activeTab === 'APPROVED') {
      matchesTab = request.status === 'APPROVED';
    } else if (activeTab === 'REJECTED') {
      matchesTab = request.status === 'REJECTED';
    }

    return matchesSearch && matchesTab;
  });

  const onRefresh = () => { setRefreshing(true); loadRequests(); };

  const handleViewQR = async (request: any) => {
    if (request.status !== 'APPROVED') return;
    setSelectedRequest(request);
    setQrCodeData(null);
    setManualCode(null);
    setShowQRModal(true);
    try {
      const result = await apiService.getGatePassQRCode(request.id, ntf.staffCode, true);
      if (result.success && result.qrCode) { 
        setQrCodeData(result.qrCode); 
        setManualCode(result.manualCode || null); 
      } else {
        setShowQRModal(false);
        setModalMessage(result.message || 'Could not fetch QR code.');
        setShowErrorModal(true);
      }
    } catch (error: any) {
      setShowQRModal(false);
      setModalMessage(error.message || 'Failed to load QR code.');
      setShowErrorModal(true);
    }
  };

  const isQRAvailable = (request: any) => {
    if (request.status !== 'APPROVED') return false;
    
    // Check if at least 1 day has passed since approval
    const approvalTime = request.hrApprovalDate || request.hodApprovalDate || request.staffApprovalDate;
    if (!approvalTime) return false;
    
    const oneDayAfterApproval = new Date(approvalTime).getTime() + (24 * 60 * 60 * 1000);
    return Date.now() >= oneDayAfterApproval;
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const getStatusLabel = (status: string) => {
    if (status === 'APPROVED') return 'ACTIVE';
    if (status === 'REJECTED') return 'REJECTED';
    if (status === 'PENDING_HR') return 'PENDING';
    return 'PENDING';
  };

  const getTimeAgo = (dateString: string) => {
    const diffMs = new Date().getTime() - new Date(dateString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => { setBottomTab('PROFILE'); onNavigate('PROFILE'); }}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <ThemedText style={styles.avatarText}>{getInitials(ntf.staffName || 'NF')}</ThemedText>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <ThemedText style={[styles.greeting, { color: theme.textSecondary }]}>GOOD MORNING,</ThemedText>
            <ThemedText style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
              {(ntf.staffName || 'Non-Teaching Faculty').toUpperCase()}
            </ThemedText>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.surfaceHighlight }]}
            onPress={() => onNavigate('NOTIFICATIONS')}
          >
            <Ionicons name="notifications-outline" size={24} color={theme.text} />
            {unreadCount > 0 && (
              <View style={[styles.notificationIndicator, { backgroundColor: theme.success, borderColor: theme.surface }]} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScreenContentContainer>
        <View style={[styles.requestsHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <ThemedText style={[styles.requestsTitle, { color: theme.text }]}>My Requests</ThemedText>
        </View>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>Loading requests...</ThemedText>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            <View style={[styles.searchWrap, { backgroundColor: theme.surface }]}>
              <Ionicons name="search" size={20} color={theme.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search requests..."
                placeholderTextColor={theme.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
        )}
        <VerticalFlatList
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          decelerationRate="normal"
          data={filteredRequests}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item: req }) => (
            <TouchableOpacity
              style={[styles.requestCard, { backgroundColor: theme.surface }]}
              onPress={() => {
                if (req.status === 'APPROVED' && isQRAvailable(req)) {
                  handleViewQR(req);
                } else {
                  setSelectedRequest(req);
                  setShowDetailModal(true);
                }
              }}
              activeOpacity={0.85}
            >
              <View style={styles.cardTopRow}>
                <View style={[styles.avatarCircle, { backgroundColor: theme.warning + '22' }]}>
                  <ThemedText style={[styles.avatarText, { color: theme.warning }]}>{getInitials(ntf.staffName)}</ThemedText>
                </View>
                <View style={styles.cardNameBlock}>
                  <View style={styles.cardNameRow}>
                    <ThemedText style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>{ntf.staffName || 'Non-Teaching Faculty'}</ThemedText>
                    <View style={[styles.typePillInline, { backgroundColor: theme.inputBackground }]}>
                      <ThemedText style={[styles.typePillInlineText, { color: theme.textSecondary }]}>Single Pass</ThemedText>
                    </View>
                  </View>
                  <ThemedText style={[styles.cardSubtitle, { color: theme.textSecondary }]}>Non-Teaching Faculty • {ntf.department || 'Department'}</ThemedText>
                </View>
                <ThemedText style={[styles.cardTimeAgo, { color: theme.textTertiary }]}>{getTimeAgo(req.requestDate || req.createdAt)}</ThemedText>
              </View>

              <View style={[styles.infoBox, { backgroundColor: theme.inputBackground }]}>
                <View style={styles.infoBoxRow}>
                  <Ionicons name="document-text-outline" size={16} color={theme.textSecondary} />
                  <ThemedText style={[styles.infoBoxText, { color: theme.text }]} numberOfLines={1}>{req.purpose || req.reason || 'Gate Pass Request'}</ThemedText>
                </View>
                <View style={styles.infoBoxRow}>
                  <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
                  <ThemedText style={[styles.infoBoxText, { color: theme.text }]}>{formatDateShort(req.requestDate || req.createdAt)}</ThemedText>
                </View>
              </View>

              <View style={styles.cardBottomRow}>
                <View style={[
                  styles.statusTag,
                  req.status === 'PENDING' && { backgroundColor: theme.warning + '22' },
                  req.status === 'PENDING_HR' && { backgroundColor: theme.warning + '22' },
                  req.status === 'APPROVED' && { backgroundColor: theme.success + '22' },
                  req.status === 'REJECTED' && { backgroundColor: theme.error + '22' },
                ]}>
                  <View style={[
                    styles.statusDot,
                    req.status === 'PENDING' && { backgroundColor: theme.warning },
                    req.status === 'PENDING_HR' && { backgroundColor: theme.warning },
                    req.status === 'APPROVED' && { backgroundColor: theme.success },
                    req.status === 'REJECTED' && { backgroundColor: theme.error },
                  ]} />
                  <ThemedText style={[
                    styles.statusTagText,
                    req.status === 'PENDING' && { color: theme.warning },
                    req.status === 'PENDING_HR' && { color: theme.warning },
                    req.status === 'APPROVED' && { color: theme.success },
                    req.status === 'REJECTED' && { color: theme.error },
                  ]}>{getStatusLabel(req.status)}</ThemedText>
                </View>
              </View>

              {req.status === 'APPROVED' && (
                <View style={[styles.qrHint, { borderTopColor: theme.border }]}>
                  {isQRAvailable(req) ? (
                    <>
                      <Ionicons name="qr-code-outline" size={14} color={theme.primary} />
                      <ThemedText style={[styles.qrHintText, { color: theme.primary }]}>Tap to view QR</ThemedText>
                    </>
                  ) : (
                    <>
                      <Ionicons name="time-outline" size={14} color={theme.textTertiary} />
                      <ThemedText style={[styles.qrHintText, { color: theme.textTertiary }]}>QR available 1 day after approval</ThemedText>
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={theme.textTertiary} />
              <ThemedText style={[styles.emptyStateText, { color: theme.text }]}>No requests found</ThemedText>
              <ThemedText style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>Your requests will appear here</ThemedText>
            </View>
          }
        />
      </ScreenContentContainer>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => setBottomTab('HOME')}>
          <Ionicons name={bottomTab === 'HOME' ? 'home' : 'home-outline'} size={22}
            color={bottomTab === 'HOME' ? theme.primary : theme.textTertiary} />
          <ThemedText style={[styles.navLabel, bottomTab === 'HOME' && { color: theme.primary }, { color: theme.textTertiary }]}>Home</ThemedText>
          {bottomTab === 'HOME' && <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => { setBottomTab('NEW_PASS'); setShowPassTypeModal(true); }}>
          <Ionicons name="add-circle-outline" size={32} color={theme.textSecondary} />
          <ThemedText style={[styles.navLabel, { color: theme.textTertiary }]}>New Pass</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => { setBottomTab('MY_REQUESTS'); onNavigate('NTF_MY_REQUESTS'); }}>
          <Ionicons name={bottomTab === 'MY_REQUESTS' ? 'list' : 'list-outline'} size={22}
            color={bottomTab === 'MY_REQUESTS' ? theme.primary : theme.textTertiary} />
          <ThemedText style={[styles.navLabel, bottomTab === 'MY_REQUESTS' && { color: theme.primary }, { color: theme.textTertiary }]}>My Requests</ThemedText>
          {bottomTab === 'MY_REQUESTS' && <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => { setBottomTab('PROFILE'); onNavigate('PROFILE'); }}>
          <Ionicons name={bottomTab === 'PROFILE' ? 'person' : 'person-outline'} size={22}
            color={bottomTab === 'PROFILE' ? theme.primary : theme.textTertiary} />
          <ThemedText style={[styles.navLabel, bottomTab === 'PROFILE' && { color: theme.primary }, { color: theme.textTertiary }]}>Profile</ThemedText>
          {bottomTab === 'PROFILE' && <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />}
        </TouchableOpacity>
      </View>

      <NotificationDropdown
        visible={showNotificationDropdown}
        onClose={() => setShowNotificationDropdown(false)}
        userId={ntf.staffCode}
        userType="staff"
      />

      {/* Pass Type Selection Modal — Single Pass + Guest Pre-Request (no bulk for NTF) */}
      <PassTypeBottomSheet
        visible={showPassTypeModal}
        onClose={() => {
          setShowPassTypeModal(false);
          setBottomTab('HOME');
        }}
        onSelectSingle={() => {
          setShowPassTypeModal(false);
          onNavigate('NEW_PASS_REQUEST');
        }}
        onSelectGuest={() => {
          setShowPassTypeModal(false);
          onNavigate('GUEST_PRE_REQUEST');
        }}
      />

      <SinglePassDetailsModal
        visible={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedRequest(null); }}
        request={selectedRequest}
        onApprove={undefined}
        onReject={undefined}
      />

      <GatePassQRModal
        visible={showQRModal}
        onClose={() => setShowQRModal(false)}
        qrCodeData={qrCodeData}
        manualCode={manualCode}
        personName={ntf.staffName}
        personId={ntf.staffCode}
        reason={selectedRequest?.reason}
      />

      <SuccessModal visible={showSuccessModal} title="Success" message={modalMessage} onClose={() => setShowSuccessModal(false)} />
      <ErrorModal visible={showErrorModal} title="Error" message={modalMessage} onClose={() => setShowErrorModal(false)} type="general" />
      <ConfirmationModal
        visible={showLogoutModal}
        title="Logout"
        message="Are you sure you want to logout?"
        onConfirm={onLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    fontSize: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  requestsHeader: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  requestsTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  requestCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardNameBlock: {
    flex: 1,
    gap: 4,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  typePillInline: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  typePillInlineText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 12,
  },
  cardTimeAgo: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'right',
  },
  infoBox: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  infoBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoBoxText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  qrHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  qrHintText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyStateSubtext: {
    fontSize: 13,
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 6,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    position: 'relative',
    paddingVertical: 4,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 20,
    height: 3,
    borderRadius: 2,
  },
});

export default NTFDashboard;
