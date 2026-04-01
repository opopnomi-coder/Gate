import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Image,
  Modal,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Student } from '../../types';
import { apiService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { useProfile } from '../../context/ProfileContext';
import NotificationDropdown from '../../components/NotificationDropdown';
import RequestTimeline from '../../components/RequestTimeline';
import GatePassQRModal from '../../components/GatePassQRModal';
import { useErrorModal } from '../../hooks/useErrorModal';
import { useSuccessModal } from '../../hooks/useSuccessModal';
import { AppError } from '../../utils/errorHandler';
import ErrorModal from '../../components/ErrorModal';
import SuccessModal from '../../components/SuccessModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import ScreenContentContainer from '../../components/ScreenContentContainer';
import ThemedText from '../../components/ThemedText';
import { VerticalScrollView } from '../../components/navigation/VerticalScrollViews';


interface StudentHomeScreenProps {
  student: Student;
  onLogout: () => void;
  onNavigate: (screen: any) => void;
  onTabChange: (tab: 'HOME' | 'REQUESTS' | 'HISTORY' | 'PROFILE') => void;
  onRequestGatePass: () => void;
}

const StudentHomeScreen: React.FC<StudentHomeScreenProps> = ({
  student,
  onLogout,
  onNavigate,
  onTabChange,
  onRequestGatePass,
}) => {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const { unreadCount } = useNotifications();
  const { profileImage } = useProfile();
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [stats, setStats] = useState({
    entries: 0,
    exits: 0,
  });
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [manualEntryCode, setManualEntryCode] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { errorInfo, showError, hideError, handleRetry, isVisible: isErrorVisible } = useErrorModal();
  const { successInfo, showSuccess, hideSuccess, isVisible: isSuccessVisible } = useSuccessModal();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const historyResponse = await apiService.getUserEntryHistory(student.regNo);
      const historyData = (historyResponse as any).history || historyResponse || [];
      
      const entries = historyData.filter((item: any) => item.type === 'ENTRY').length;
      const exits = historyData.filter((item: any) => item.type === 'EXIT').length;
      setStats({ entries, exits });

      const response = await apiService.getStudentGatePassRequests(student.regNo);
      if (response.success && response.requests) {
        const recent = response.requests
          .sort((a: any, b: any) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
          .slice(0, 10);
        setRecentRequests(recent);
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING,';
    if (hour < 17) return 'GOOD AFTERNOON,';
    return 'GOOD EVENING,';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

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

  const handleViewQR = async (request: any) => {
    if (!request.id) return;
    if (request.status !== 'APPROVED') {
       showError(new AppError('validation', 'This request is not fully approved yet', 'Wait for Approval'));
       return;
    }
    setSelectedRequest(request);
    setQrCodeData(null);
    setManualEntryCode(null);
    setShowQRModal(true);
    try {
      if (request.qrCode) {
        setQrCodeData(request.qrCode);
        setManualEntryCode(request.manualEntryCode || request.manualCode || null);
        return;
      }
      const response = await apiService.getGatePassQRCode(request.id, student.regNo, false);
      if (response.success && response.qrCode) {
        let qrCodeValue = response.qrCode;
        if (!qrCodeValue.startsWith('GP|') && !qrCodeValue.startsWith('ST|') && !qrCodeValue.startsWith('SF|') && !qrCodeValue.startsWith('VG|')) {
          qrCodeValue = qrCodeValue.startsWith('data:image') ? qrCodeValue : `data:image/png;base64,${qrCodeValue}`;
        }
        setQrCodeData(qrCodeValue);
        setManualEntryCode(response.manualCode || (response as any).manualEntryCode || request.manualEntryCode || request.manualCode || null);
      } else {
        showError(new AppError('api', response.message || 'Could not fetch QR code', 'QR Code Error'));
        setShowQRModal(false);
      }
    } catch (error: any) {
      showError(error);
      setShowQRModal(false);
    }
  };

  const handleRequestClick = (request: any) => {
    setSelectedRequest(request);
    if (request.status === 'APPROVED') {
      handleViewQR(request);
    } else {
      setShowDetailModal(true);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => onTabChange('PROFILE')}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <ThemedText ignoreGradient style={[styles.avatarText, { color: '#FFFFFF' }]}>
                  {getInitials(student.firstName, student.lastName)}
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <ThemedText ignoreGradient style={[styles.greeting, { color: theme.textSecondary }]}>{getGreeting()}</ThemedText>
            <ThemedText ignoreGradient style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
              {student.firstName.toUpperCase()} {student.lastName?.charAt(0) || ''}
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
              <View style={[styles.notificationBadge, { backgroundColor: theme.error }]}>
                <ThemedText style={styles.notificationBadgeText}>{unreadCount}</ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScreenContentContainer>
      <VerticalScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false} decelerationRate="normal"
      >
        <View style={[styles.statsCard, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.statItem}>
            <ThemedText ignoreGradient style={[styles.statValue, { color: theme.text }]}>{stats.entries}</ThemedText>
            <ThemedText ignoreGradient style={[styles.statLabel, { color: theme.textSecondary }]}>ENTRIES</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <ThemedText ignoreGradient style={[styles.statValue, { color: theme.text }]}>{stats.exits}</ThemedText>
            <ThemedText ignoreGradient style={[styles.statLabel, { color: theme.textSecondary }]}>EXITS</ThemedText>
          </View>
        </View>

        <TouchableOpacity style={[styles.requestCard, { backgroundColor: theme.cardBackground }]} onPress={onRequestGatePass}>
          <View style={[styles.requestCardTop, { backgroundColor: theme.primary }]}>
            <Ionicons name="shield-checkmark" size={40} color="rgba(255,255,255,0.7)" />
          </View>
          <View style={[styles.requestCardBottom, { backgroundColor: theme.cardBackground }]}>
             <View style={styles.requestCardContent}>
               <ThemedText ignoreGradient style={[styles.requestCardTitle, { color: theme.text }]}>Request Gate Pass</ThemedText>
             </View>
             <TouchableOpacity style={[styles.applyButton, { backgroundColor: theme.primary }]} onPress={onRequestGatePass}>
               <ThemedText ignoreGradient style={styles.applyButtonText}>Apply Now</ThemedText>
             </TouchableOpacity>
          </View>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <ThemedText ignoreGradient style={[styles.sectionTitle, { color: theme.textSecondary }]}>RECENT REQUESTS</ThemedText>
        </View>

        {recentRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={theme.border} />
            <ThemedText ignoreGradient style={[styles.emptyText, { color: theme.textSecondary }]}>No recent requests</ThemedText>
          </View>
        ) : (
          recentRequests.map((request) => (
            <TouchableOpacity key={request.id} style={[styles.requestItem, { backgroundColor: theme.cardBackground }]} onPress={() => handleRequestClick(request)}>
               <View style={styles.requestItemTop}>
                 <View style={{ flex: 1 }}>
                   <ThemedText ignoreGradient style={[styles.requestId, { color: theme.text }]}>{request.purpose || 'Gate Pass Request'}</ThemedText>
                   <ThemedText ignoreGradient style={[styles.requestReason, { color: theme.textSecondary }]}>{formatDate(request.requestDate)}</ThemedText>
                 </View>
                 <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                    <ThemedText ignoreGradient style={styles.statusText}>{getStatusLabel(request.status)}</ThemedText>
                 </View>
               </View>
               {request.status === 'APPROVED' && (
                 <TouchableOpacity style={[styles.viewQRButton, { backgroundColor: theme.primary }]} onPress={() => handleViewQR(request)}>
                   <Ionicons name="qr-code-outline" size={16} color="#FFFFFF" />
                   <ThemedText ignoreGradient style={styles.viewQRButtonText}>View QR</ThemedText>
                 </TouchableOpacity>
               )}
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 100 }} />
      </VerticalScrollView>
      </ScreenContentContainer>

      <View style={[styles.bottomNav, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => onTabChange('HOME')}>
          <Ionicons name="home" size={24} color={theme.primary} />
          <ThemedText ignoreGradient style={[styles.navLabelActive, { color: theme.primary }]}>Home</ThemedText>
          <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => onTabChange('REQUESTS')}>
          <Ionicons name="document-text-outline" size={24} color={theme.textTertiary} />
          <ThemedText ignoreGradient style={[styles.navLabel, { color: theme.textTertiary }]}>Requests</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => onTabChange('HISTORY')}>
          <Ionicons name="time-outline" size={24} color={theme.textTertiary} />
          <ThemedText ignoreGradient style={[styles.navLabel, { color: theme.textTertiary }]}>History</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => onTabChange('PROFILE')}>
          <Ionicons name="person-outline" size={24} color={theme.textTertiary} />
          <ThemedText ignoreGradient style={[styles.navLabel, { color: theme.textTertiary }]}>Profile</ThemedText>
        </TouchableOpacity>
      </View>

      <NotificationDropdown visible={showNotificationDropdown} onClose={() => setShowNotificationDropdown(false)} userId={student.regNo} userType="student" />

      <Modal visible={showDetailModal} animationType="slide" transparent={true} onRequestClose={() => setShowDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModalContainer, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <ThemedText ignoreGradient style={[styles.modalTitle, { color: theme.text }]}>Request Status</ThemedText>
              <TouchableOpacity onPress={() => setShowDetailModal(false)} style={[styles.closeButton, { backgroundColor: theme.surfaceHighlight }]}>
                <Ionicons name="close-circle" size={30} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            {selectedRequest && (
              <VerticalScrollView style={styles.detailModalContent} showsVerticalScrollIndicator={false} decelerationRate="normal">
                <View style={[styles.statusModalHeader, { borderBottomColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <ThemedText ignoreGradient style={[styles.statusModalId, { color: theme.primary }]}>#{selectedRequest.id}</ThemedText>
                    <ThemedText ignoreGradient style={[styles.statusModalDate, { color: theme.textSecondary }]}>{new Date(selectedRequest.requestDate).toLocaleDateString()}</ThemedText>
                  </View>
                </View>
                <RequestTimeline status={selectedRequest.status} staffApproval={selectedRequest.staffApproval || 'PENDING'} hodApproval={selectedRequest.hodApproval || 'PENDING'} requestDate={selectedRequest.requestDate} staffRemark={selectedRequest.staffRemark} hodRemark={selectedRequest.hodRemark}/>
                <TouchableOpacity style={[styles.closeModalButton, { backgroundColor: theme.inputBackground }]} onPress={() => setShowDetailModal(false)}>
                  <ThemedText ignoreGradient style={[styles.closeModalButtonText, { color: theme.text }]}>Close Status</ThemedText>
                </TouchableOpacity>
              </VerticalScrollView>
            )}
          </View>
        </View>
      </Modal>

      <GatePassQRModal visible={showQRModal} onClose={() => setShowQRModal(false)} personName={`${student.firstName} ${student.lastName || ''}`} personId={student.regNo} qrCodeData={qrCodeData} manualCode={manualEntryCode} reason={selectedRequest?.reason || selectedRequest?.purpose}/>
      <ConfirmationModal visible={showLogoutModal} title="Logout" message="Are you sure you want to log out of your account?" confirmText="Logout" onConfirm={onLogout} onCancel={() => setShowLogoutModal(false)} icon="log-out-outline" />
      <ErrorModal visible={isErrorVisible} type={errorInfo?.type || 'general'} title={errorInfo?.title} message={errorInfo?.message || ''} onClose={hideError} onRetry={errorInfo?.canRetry ? handleRetry : undefined} />
      <SuccessModal visible={isSuccessVisible} title={successInfo?.title} message={successInfo?.message || ''} onClose={hideSuccess} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 52, height: 52, borderRadius: 26 },
  avatarText: { fontSize: 20, fontWeight: '700' },
  headerInfo: { gap: 2, flex: 1 },
  greeting: { fontSize: 12, fontWeight: '500', letterSpacing: 0.5 },
  userName: { fontSize: 20, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  notificationBadge: { position: 'absolute', top: 4, right: 4, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  notificationBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  content: { flex: 1 },
  statsCard: { flexDirection: 'row', marginHorizontal: 20, marginTop: 20, borderRadius: 16, padding: 16, elevation: 2 },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  statValue: { fontSize: 36, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  statDivider: { width: 1, marginHorizontal: 20 },
  requestCard: { marginHorizontal: 20, marginTop: 20, borderRadius: 20, overflow: 'hidden', elevation: 4 },
  requestCardTop: { paddingVertical: 52, alignItems: 'center', justifyContent: 'center' },
  requestCardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18 },
  requestCardContent: { flex: 1 },
  requestCardTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  applyButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, marginLeft: 12 },
  applyButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  emptyState: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  requestItem: { marginHorizontal: 20, marginBottom: 12, padding: 16, borderRadius: 12, elevation: 2 },
  requestItemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  viewQRButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, marginTop: 12, gap: 6, alignSelf: 'flex-start' },
  viewQRButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  requestId: { fontSize: 16, fontWeight: '700' },
  requestReason: { fontSize: 13, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, borderTopWidth: 1, elevation: 8 },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 8, position: 'relative' },
  navLabelActive: { fontSize: 12, marginTop: 4, fontWeight: '700' },
  navLabel: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  activeIndicator: { position: 'absolute', bottom: 0, width: 32, height: 3, borderRadius: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  detailModalContainer: { borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '90%', paddingBottom: 20 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  closeButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  detailModalContent: { paddingHorizontal: 20 },
  statusModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 20, borderBottomWidth: 1 },
  statusModalId: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  statusModalDate: { fontSize: 14, fontWeight: '600' },
  closeModalButton: { paddingVertical: 15, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  closeModalButtonText: { fontWeight: '800' },
});

export default StudentHomeScreen;
