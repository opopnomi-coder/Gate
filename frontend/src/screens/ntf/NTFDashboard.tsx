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
    if (!request.id) return;
    if (request.status !== 'APPROVED') {
      setSelectedRequest(request);
      setShowDetailModal(true);
      return;
    }
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

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return theme.success;
      case 'APPROVED_BY_HOD': return theme.success;
      case 'USED': return theme.textTertiary;
      case 'REJECTED': return theme.error;
      case 'PENDING_HOD': return theme.primary;
      case 'PENDING_STAFF': return theme.warning;
      default: return theme.warning;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING_STAFF': return 'AWAITING STAFF';
      case 'PENDING_HOD': return 'AWAITING HOD';
      case 'APPROVED': return 'APPROVED';
      case 'APPROVED_BY_HOD': return 'APPROVED';
      case 'USED': return 'USED';
      case 'REJECTED': return 'REJECTED';
      default: return status || 'PENDING';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const handleRequestClick = (request: any) => {
    if (!request.id) return;
    if (request.status !== 'APPROVED') {
      setSelectedRequest(request);
      setShowDetailModal(true);
      return;
    }
    handleViewQR(request);
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
        {/* Request Gate Pass Section */}
        <View style={[styles.staticHeaderContainer, { backgroundColor: theme.cardBackground, marginTop: 0 }]}>
          <TouchableOpacity style={[styles.requestCard, { backgroundColor: theme.cardBackground }]} onPress={() => onNavigate('NEW_PASS_REQUEST')}>
            <View style={[styles.requestCardTop, { backgroundColor: theme.primary }]}>
              <Ionicons name="shield-checkmark" size={40} color="rgba(255,255,255,0.7)" />
            </View>
            <View style={[styles.requestCardBottom, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.requestCardContent}>
                <ThemedText style={[styles.requestCardTitle, { color: theme.text }]}>Request Gate Pass</ThemedText>
              </View>
              <TouchableOpacity style={[styles.applyButton, { backgroundColor: theme.primary }]} onPress={() => onNavigate('NEW_PASS_REQUEST')}>
                <ThemedText style={styles.applyButtonText}>Apply Now</ThemedText>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        {/* Recent Requests Section */}
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>RECENT REQUESTS</ThemedText>
        </View>
        <VerticalFlatList
          style={styles.content}
          showsVerticalScrollIndicator={false}
          decelerationRate="normal"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          data={filteredRequests}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.scrollContent}
          renderItem={({ item: request }) => (
            <TouchableOpacity style={[styles.requestItem, { backgroundColor: theme.cardBackground }]} onPress={() => handleRequestClick(request)}>
              <View style={styles.requestItemTop}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.requestId, { color: theme.text }]}>{request.purpose || 'Gate Pass Request'}</ThemedText>
                  <ThemedText style={[styles.requestReason, { color: theme.textSecondary }]}>{formatDate(request.requestDate)}</ThemedText>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                  <ThemedText style={styles.statusText}>{getStatusLabel(request.status)}</ThemedText>
                </View>
              </View>
              {request.status === 'APPROVED' && (
                <TouchableOpacity style={[styles.viewQRButton, { backgroundColor: theme.primary }]} onPress={() => handleViewQR(request)}>
                  <Ionicons name="qr-code-outline" size={16} color="#FFFFFF" />
                  <ThemedText style={styles.viewQRButtonText}>View QR</ThemedText>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={theme.border} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>No recent requests</ThemedText>
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
  staticHeaderContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  requestCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  requestCardTop: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  requestCardBottom: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  requestCardContent: {
    alignItems: 'center',
  },
  requestCardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  applyButton: {
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  requestItem: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  requestItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestId: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  requestReason: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewQRButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewQRButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
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
  navLabelActive: {
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
