import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
  Animated,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { HR, ScreenName } from '../../types';
import { apiService } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useRefresh } from '../../context/RefreshContext';
import { useProfile } from '../../context/ProfileContext';
import { useTheme } from '../../context/ThemeContext';
import { useActionLock } from '../../context/ActionLockContext';
import { formatDateShort } from '../../utils/dateUtils';
import { notificationService } from '../../services/NotificationService';
import NotificationDropdown from '../../components/NotificationDropdown';
import BulkDetailsModal from '../../components/BulkDetailsModal';
import SinglePassDetailsModal from '../../components/SinglePassDetailsModal';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import ScreenContentContainer from '../../components/ScreenContentContainer';
// GuestPreRequestScreen is navigated to via onNavigate('GUEST_PRE_REQUEST') — not rendered inline
// HRExitsScreen is navigated to via onNavigate('HR_EXITS') — rendered by HRDashboardContainer
import ThemedText from '../../components/ThemedText';
import { VerticalFlatList, VerticalScrollView } from '../../components/navigation/VerticalScrollViews';
import { useBottomSheetSwipe } from '../../hooks/useBottomSheetSwipe';
import TopRefreshControl from '../../components/TopRefreshControl';
import { SkeletonList } from '../../components/SkeletonCard';


interface NewHRDashboardProps {
  hr: HR;
  onLogout: () => void;
  onNavigate: (screen: ScreenName) => void;
}

const NewHRDashboard: React.FC<NewHRDashboardProps> = ({
  hr,
  onLogout,
  onNavigate,
}) => {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [bottomTab, setBottomTab] = useState<'HOME' | 'GUEST' | 'EXITS' | 'PROFILE'>('HOME');
  const [exitLogs, setExitLogs] = useState<any[]>([]);
  const [rangeModalVisible, setRangeModalVisible] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectingDateType, setSelectingDateType] = useState<'FROM' | 'TO'>('FROM');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedBulkId, setSelectedBulkId] = useState<number | null>(null);
  const [selectedBulkRequester, setSelectedBulkRequester] = useState<any>(null);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { unreadCount, loadNotifications } = useNotifications();
  const { refreshCount } = useRefresh();
  const { profileImage } = useProfile();
  const { lock, unlock } = useActionLock();
  const [isDownloading, setIsDownloading] = useState(false);
  const { translateY: rangeSheetY, panHandlers: rangePanHandlers, openSheet: openRangeSheet } = useBottomSheetSwipe(() => setRangeModalVisible(false));

  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    loadRequests();
    loadNotifications(hr.hrCode, 'hr');
    loadExitLogs();
  }, []);

  useEffect(() => { if (refreshCount > 0) { loadRequests(); loadExitLogs(); } }, [refreshCount]);

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const ms = nextMidnight.getTime() - now.getTime();
    const timer = setTimeout(() => {
      if (bottomTab === 'EXITS') loadExitLogs();
    }, ms + 500);
    return () => clearTimeout(timer);
  }, [bottomTab]);

  const loadRequests = async () => {
    try {
      const hrCode = hr.hrCode;

      const [bulkResult, singleResult, visitorRequests] = await Promise.all([
        apiService.getHRPendingBulkPasses(),
        apiService.getHRPendingRequests(hrCode),
        apiService.getHRVisitorRequests(hrCode),
      ]);

      let allRequests: any[] = [];

      if (bulkResult.success && bulkResult.requests) {
        allRequests = bulkResult.requests.map((req: any) => ({
          ...req,
          requestType: 'BULK',
        }));
      }

      if (singleResult.success && singleResult.data) {
        const singleRequests = singleResult.data.map((req: any) => ({
          ...req,
          requestType: 'SINGLE',
          hrApproval: req.hrApproval || 'PENDING',
        }));
        allRequests = [...allRequests, ...singleRequests];
      }

      allRequests = [...allRequests, ...visitorRequests];
      const sorted = allRequests.sort((a: any, b: any) => {
        const dateB = new Date(b.requestDate || b.createdAt || b.timestamp || b.visitDate || 0).getTime();
        const dateA = new Date(a.requestDate || a.createdAt || a.timestamp || a.visitDate || 0).getTime();
        if (dateB !== dateA) return dateB - dateA;
        const idB = parseInt(b.id?.toString().split('-')[1]) || parseInt(b.id) || 0;
        const idA = parseInt(a.id?.toString().split('-')[1]) || parseInt(a.id) || 0;
        return idB - idA;
      });

      setRequests(sorted);

      const pending = sorted.filter((r: any) =>
        r.requestType === 'VISITOR' ? r.status === 'PENDING' : (r.hrApproval === 'PENDING_HR' || r.hrApproval === 'PENDING' || !r.hrApproval)
      ).length;
      const approved = sorted.filter((r: any) =>
        r.requestType === 'VISITOR' ? r.status === 'APPROVED' : r.hrApproval === 'APPROVED'
      ).length;
      const rejected = sorted.filter((r: any) =>
        r.requestType === 'VISITOR' ? r.status === 'REJECTED' : r.hrApproval === 'REJECTED'
      ).length;

      setStats({ pending, approved, rejected });
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (bottomTab === 'EXITS') loadExitLogs();
    else loadRequests();
  };

  const loadExitLogs = async (rangeFrom?: string, rangeTo?: string) => {
    try {
      const response = await apiService.getHRExits(rangeFrom, rangeTo);
      if (response.success) setExitLogs(response.exits || []);
    } catch (error) {
      console.error('Error loading HR exits:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const exportExitsPdf = async (rows: any[]) => {
    setIsDownloading(true);
    const filename = `Exit_Report_${new Date().toISOString().slice(0, 10)}`;
    try {
      const result = await notificationService.generatePdfReport({
        title: 'Staff & Student Exit Report',
        subtitle: 'Consolidated exit activity — Registrar / HR view',
        sectionHeading: 'Exit records',
        brandFooterLine: 'RIT Gate Management System',
        filename,
        columns: [
          { key: 'userType', label: 'ROLE' },
          { key: 'userId', label: 'ID' },
          { key: 'name', label: 'NAME' },
          { key: 'department', label: 'DEPARTMENT' },
          { key: 'purpose', label: 'PURPOSE' },
          { key: 'exitTime', label: 'EXIT TIME' },
        ],
        rows: rows.map((r: any) => ({
          userType: r.userType || '-',
          userId: r.userId || '-',
          name: r.name || '-',
          department: r.department || '-',
          purpose: r.purpose || '-',
          exitTime: formatDateShort(r.exitTime),
        })),
      });
      if (result.success) {
        setModalTitle('Download Complete');
        setModalMessage('PDF saved to Downloads. Tap the notification to open it.');
        setShowSuccessModal(true);
      } else {
        setModalTitle('Download Failed');
        setModalMessage(result.message || 'Failed to generate PDF.');
        setShowErrorModal(true);
      }
    } catch (e: any) {
      setModalTitle('Download Failed');
      setModalMessage(e?.message || 'Failed to download PDF.');
      setShowErrorModal(true);
    } finally {
      setIsDownloading(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = searchQuery === '' ||
      request.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.hodCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.regNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.id?.toString().includes(searchQuery);

    let matchesTab = false;
    if (activeTab === 'PENDING') {
      matchesTab = request.requestType === 'VISITOR'
        ? request.status === 'PENDING'
        : (request.hrApproval === 'PENDING_HR' || request.hrApproval === 'PENDING' || !request.hrApproval);
    } else if (activeTab === 'APPROVED') {
      matchesTab = request.requestType === 'VISITOR'
        ? request.status === 'APPROVED'
        : request.hrApproval === 'APPROVED';
    } else if (activeTab === 'REJECTED') {
      matchesTab = request.requestType === 'VISITOR'
        ? request.status === 'REJECTED'
        : request.hrApproval === 'REJECTED';
    }

    return matchesSearch && matchesTab;
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleApprove = async (id?: number, remark?: string) => {
    const targetId = id || selectedRequest?.id;
    if (!targetId) return;
    const req = selectedRequest;

    setProcessing(true);
    lock('Approving request...');

    try {
      if (req && req.requestType === 'VISITOR') {
        await apiService.approveVisitorRequestByHR(targetId, hr.hrCode);
      } else if (req && req.requestType === 'SINGLE') {
        await apiService.approveRequestAsHR(targetId, hr.hrCode);
      } else {
        await apiService.approveHODBulkPass(targetId, hr.hrCode);
      }
      setShowDetailModal(false);
      setShowBulkModal(false);
      setSelectedRequest(null);
      setModalTitle('Approved');
      setModalMessage('Request approved successfully.');
      setShowSuccessModal(true);
      loadRequests();
    } catch (error: any) {
      setModalTitle('Error');
      setModalMessage(error.message || 'An error occurred.');
      setShowErrorModal(true);
    } finally {
      unlock();
      setProcessing(false);
    }
  };

  const handleReject = async (id?: number, remark?: string) => {
    const targetId = id || selectedRequest?.id;
    if (!targetId) return;
    const req = selectedRequest;
    const targetRemark = remark || 'Rejected by HR';

    setProcessing(true);
    lock('Rejecting request...');

    try {
      if (req && req.requestType === 'VISITOR') {
        await apiService.rejectVisitorRequestByHR(targetId, targetRemark);
      } else if (req && req.requestType === 'SINGLE') {
        await apiService.rejectRequestAsHR(targetId, hr.hrCode, targetRemark);
      } else {
        await apiService.rejectHODBulkPass(targetId, hr.hrCode, targetRemark);
      }
      setShowDetailModal(false);
      setShowBulkModal(false);
      setSelectedRequest(null);
      setModalTitle('Rejected');
      setModalMessage('Request has been rejected.');
      setShowSuccessModal(true);
      loadRequests();
    } catch (error: any) {
      setModalTitle('Error');
      setModalMessage(error.message || 'An error occurred.');
      setShowErrorModal(true);
    } finally {
      unlock();
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />
      <TopRefreshControl refreshing={refreshing} onRefresh={onRefresh} color={theme.primary}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => { setBottomTab('PROFILE'); onNavigate('PROFILE'); }}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <ThemedText style={styles.avatarText}>{getInitials(hr.hrName || hr.name || 'HR')}</ThemedText>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <ThemedText style={[styles.greeting, { color: theme.textSecondary }]}>GOOD MORNING,</ThemedText>
            <ThemedText style={[styles.userName, { color: theme.text }]} numberOfLines={1}>{(hr.hrName || hr.name || 'HR').toUpperCase()}</ThemedText>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.surfaceHighlight }]} onPress={() => onNavigate('NOTIFICATIONS')}>
            <Ionicons name="notifications-outline" size={24} color={theme.text} />
            {unreadCount > 0 && <View style={[styles.notificationIndicator, { backgroundColor: theme.success, borderColor: theme.surface }]} />}
          </TouchableOpacity>
        </View>
      </View>

      {bottomTab === 'HOME' && (
        <>
          {/* Header Controls (Fixed) */}
          <View style={{ paddingHorizontal: 20 }}>
            <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
              <Ionicons name="search" size={20} color={theme.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search requests..."
                placeholderTextColor={theme.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Stats Tabs */}
            <View style={[styles.statsContainer, { backgroundColor: theme.surface }]}>
              <TouchableOpacity style={[styles.statTab, activeTab === 'PENDING' && { borderBottomColor: theme.primary }]} onPress={() => setActiveTab('PENDING')}>
                <ThemedText style={[styles.statLabel, { color: theme.textTertiary }, activeTab === 'PENDING' && { color: theme.primary }]}>PENDING</ThemedText>
                <ThemedText style={[styles.statValue, { color: theme.textSecondary }, activeTab === 'PENDING' && { color: theme.text }]}>{stats.pending}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.statTab, activeTab === 'APPROVED' && { borderBottomColor: theme.success }]} onPress={() => setActiveTab('APPROVED')}>
                <ThemedText style={[styles.statLabel, { color: theme.textTertiary }, activeTab === 'APPROVED' && { color: theme.success }]}>APPROVED</ThemedText>
                <ThemedText style={[styles.statValue, { color: theme.textSecondary }, activeTab === 'APPROVED' && { color: theme.text }]}>{stats.approved}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.statTab, activeTab === 'REJECTED' && { borderBottomColor: theme.error }]} onPress={() => setActiveTab('REJECTED')}>
                <ThemedText style={[styles.statLabel, { color: theme.textTertiary }, activeTab === 'REJECTED' && { color: theme.error }]}>REJECTED</ThemedText>
                <ThemedText style={[styles.statValue, { color: theme.textSecondary }, activeTab === 'REJECTED' && { color: theme.text }]}>{stats.rejected}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <ScreenContentContainer style={{ flex: 1 }}>
            {refreshing ? (
              <SkeletonList count={5} />
            ) : (
            <VerticalFlatList
              style={styles.content}
              data={filteredRequests}
              keyExtractor={(request) => `${request.requestType}-${request.id}`}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              decelerationRate="normal"
              renderItem={({ item: request }) => (
                <TouchableOpacity
                  style={[styles.requestCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                  onPress={() => {
                    const normalized = request.requestType === 'VISITOR' ? {
                      ...request,
                      studentName: request.visitorName || request.studentName,
                    } : request;
                    setSelectedRequest(normalized);
                    setSelectedBulkId(request.id);
                    if (request.requestType === 'BULK') {
                      setSelectedBulkRequester({ name: request.requestedByStaffName || request.hodCode || 'HOD', role: request.userType || 'HOD', department: request.department || 'Department' });
                      setShowBulkModal(true);
                    } else {
                      setShowDetailModal(true);
                    }
                  }}
                >
                  <View style={styles.cardTopRow}>
                    <View style={[styles.avatarContainer, { backgroundColor: theme.surfaceHighlight }]}>
                      <ThemedText style={[styles.cardAvatarText, { color: theme.textSecondary }]}>
                        {getInitials(request.requestType === 'BULK' ? (request.hodCode || 'HOD') : request.requestType === 'VISITOR' ? (request.visitorName || 'VR') : (request.requestedByStaffName || request.studentName || 'ST'))}
                      </ThemedText>
                    </View>
                    <View style={styles.headerMainInfo}>
                      <View style={styles.nameRow}>
                        <ThemedText style={[styles.requestStudentName, { color: theme.text }]} numberOfLines={1}>
                          {request.requestType === 'VISITOR'
                            ? (request.visitorName || request.studentName || 'Visitor')
                            : request.requestType === 'SINGLE'
                              ? (request.requestedByStaffName || request.studentName || request.regNo || `Request #${request.id}`)
                              : `${request.requestedByStaffName || request.hodCode || 'Staff'}`}
                        </ThemedText>
                        <ThemedText style={[styles.passTypeLabel, { color: theme.textSecondary }]}>
                          {request.requestType === 'BULK'
                            ? '(Bulk Gatepass)'
                            : request.requestType === 'VISITOR'
                              ? `(${(request.role || 'VISITOR').toUpperCase()} Request)`
                              : '(Single Gatepass)'}
                        </ThemedText>
                      </View>
                      <ThemedText style={[styles.studentIdSub, { color: theme.textSecondary }]}>
                        {request.requestType === 'VISITOR'
                          ? `${request.visitorPhone || ''} • ${request.department || 'Department'}`
                          : request.requestType === 'SINGLE'
                            ? `${request.requestedByStaffCode || request.regNo || 'N/A'} • ${request.department || 'Department'}`
                            : `${request.userType || 'HOD'} • ${request.department || 'N/A'}`}
                      </ThemedText>
                    </View>
                    <View style={styles.timeAgoContainer}>
                      <ThemedText style={[styles.timeAgoText, { color: theme.textTertiary }]}>{request.requestDate ? '2h ago' : ''}</ThemedText>
                    </View>
                  </View>

                  <View style={[styles.detailsBlock, { backgroundColor: theme.inputBackground }]}>
                    <View style={styles.detailItem}>
                      <Ionicons name="medical" size={16} color={theme.textSecondary} />
                      <ThemedText style={[styles.detailText, { color: theme.text }]}>{request.purpose || 'General'}</ThemedText>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="calendar" size={16} color={theme.textSecondary} />
                      <ThemedText style={[styles.detailText, { color: theme.text }]}>
                        Exit: {formatDateShort(request.exitDateTime || request.requestDate)}
                      </ThemedText>
                    </View>
                    {request.requestType === 'BULK' && (
                      <View style={styles.detailItem}>
                        <Ionicons name="people" size={16} color={theme.textSecondary} />
                        <ThemedText style={[styles.detailText, { color: theme.text }]}>
                          {(() => {
                            const parts: string[] = [];
                            const total = request.participantCount || 0;
                            const students = request.studentCount || 0;
                            const staffCount = Math.max(0, total - students);
                            if (staffCount > 0) parts.push(`Staff - ${staffCount}`);
                            if (students > 0) parts.push(`Students - ${students}`);
                            return parts.join(', ') || `${total} Participants`;
                          })()}
                        </ThemedText>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={[
                      styles.statusBadge,
                      (() => {
                        const s = (request.requestType === 'VISITOR' ? request.status : (request.hrApproval || request.status)) || 'PENDING';
                        if (s === 'APPROVED') return { backgroundColor: theme.success };
                        if (s === 'REJECTED') return { backgroundColor: theme.error };
                        return { backgroundColor: theme.warning };
                      })(),
                    ]}>
                      <ThemedText style={[styles.statusText, { color: '#FFFFFF' }]}>
                        {(() => {
                          const s = (request.requestType === 'VISITOR' ? request.status : (request.hrApproval || request.status)) || 'PENDING';
                          return (s === 'PENDING_HR' || s === 'PENDING' || !s) ? 'PENDING' : s;
                        })()}
                      </ThemedText>
                    </View>
                    {request.requestType === 'BULK' && (
                      <View style={[styles.viewBadge, { backgroundColor: theme.surfaceHighlight }]}>
                        <Ionicons name="people" size={14} color={theme.textSecondary} />
                        <ThemedText style={[styles.viewBadgeText, { color: theme.textSecondary }]}>Bulk Gatepass</ThemedText>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-done-circle-outline" size={64} color={theme.border} />
                  <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>No {activeTab.toLowerCase()} requests</ThemedText>
                </View>
              }
            />
            )}
          </ScreenContentContainer>
        </>
      )}

      {bottomTab === 'EXITS' && null}



      {/* Bottom Navigation — inline like staff/HOD */}
      <View style={[styles.bottomNav, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => setBottomTab('HOME')}>
          <Ionicons name={bottomTab === 'HOME' ? 'home' : 'home-outline'} size={22} color={bottomTab === 'HOME' ? theme.primary : theme.textTertiary} />
          <ThemedText style={[styles.navLabel, { color: theme.textTertiary }, bottomTab === 'HOME' && { color: theme.primary }]}>Home</ThemedText>
          {bottomTab === 'HOME' && <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => { setBottomTab('GUEST'); onNavigate('GUEST_PRE_REQUEST'); }}>
          <Ionicons name={bottomTab === 'GUEST' ? 'person-add' : 'person-add-outline'} size={22} color={bottomTab === 'GUEST' ? theme.primary : theme.textTertiary} />
          <ThemedText style={[styles.navLabel, { color: theme.textTertiary }, bottomTab === 'GUEST' && { color: theme.primary }]}>Guest</ThemedText>
          {bottomTab === 'GUEST' && <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => { setBottomTab('EXITS'); onNavigate('HR_EXITS'); }}>
          <Ionicons name={bottomTab === 'EXITS' ? 'log-out' : 'log-out-outline'} size={22} color={bottomTab === 'EXITS' ? theme.primary : theme.textTertiary} />
          <ThemedText style={[styles.navLabel, { color: theme.textTertiary }, bottomTab === 'EXITS' && { color: theme.primary }]}>Exits</ThemedText>
          {bottomTab === 'EXITS' && <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => { setBottomTab('PROFILE'); onNavigate('PROFILE'); }}>
          <Ionicons name={bottomTab === 'PROFILE' ? 'person' : 'person-outline'} size={22} color={bottomTab === 'PROFILE' ? theme.primary : theme.textTertiary} />
          <ThemedText style={[styles.navLabel, { color: theme.textTertiary }, bottomTab === 'PROFILE' && { color: theme.primary }]}>Profile</ThemedText>
          {bottomTab === 'PROFILE' && <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />}
        </TouchableOpacity>
      </View>
      </TopRefreshControl>

      {/* Notification Dropdown */}
      <NotificationDropdown
        visible={showNotificationDropdown}
        onClose={() => setShowNotificationDropdown(false)}
        userId={hr.hrCode}
        userType="hr"
      />

      {/* Bulk Detail Modal */}
      <BulkDetailsModal
        visible={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        requestId={selectedBulkId || 0}
        requesterInfo={selectedBulkRequester}
        onApprove={(id, remark) => handleApprove(id, remark)}
        onReject={(id, remark) => handleReject(id, remark)}
        showActions={selectedRequest && (selectedRequest.hrApproval === 'PENDING_HR' || selectedRequest.hrApproval === 'PENDING' || !selectedRequest.hrApproval)}
        currentUserId={hr.hrCode}
        processing={processing}
      />

      {/* Request Detail Modal */}
      {/* Single Pass Detail Modal */}
      <SinglePassDetailsModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        request={selectedRequest}
        onApprove={(id, remark) => handleApprove(id, remark)}
        onReject={(id, remark) => handleReject(id, remark)}
        showActions={selectedRequest && (selectedRequest.hrApproval === 'PENDING_HR' || selectedRequest.hrApproval === 'PENDING' || !selectedRequest.hrApproval || (selectedRequest.requestType === 'VISITOR' && selectedRequest.status === 'PENDING'))}
        processing={processing}
      />

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title={modalTitle}
        message={modalMessage}
        onClose={() => setShowSuccessModal(false)}
        autoClose={true}
        autoCloseDelay={2500}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        type="api"
        title={modalTitle}
        message={modalMessage}
        onClose={() => setShowErrorModal(false)}
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

      {/* Full-screen processing overlay */}
      {processing && (
        <View style={styles.processingOverlay} pointerEvents="box-only">
          <View style={styles.processingBox}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={[styles.processingText, { color: theme.text }]}>Processing...</ThemedText>
          </View>
        </View>
      )}

      {/* Downloading overlay */}
      {isDownloading && (
        <View style={styles.processingOverlay} pointerEvents="box-only">
          <View style={styles.processingBox}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={[styles.processingText, { color: theme.text }]}>Generating PDF...</ThemedText>
          </View>
        </View>
      )}

      {/* Date Range Picker — full screen Skyscanner style */}
      {rangeModalVisible && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#ffffff', zIndex: 999 }]}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 }}>
              <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }} onPress={() => setRangeModalVisible(false)}>
                <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
              </TouchableOpacity>
              <ThemedText style={{ fontSize: 17, fontWeight: '700', color: '#1a1a1a' }}>Select dates</ThemedText>
              <View style={{ width: 36 }} />
            </View>
            <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 4, borderRadius: 14, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' }}>
              <TouchableOpacity style={[{ flex: 1, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' }, selectingDateType === 'FROM' && { backgroundColor: '#EFF6FF' }]} onPress={() => setSelectingDateType('FROM')}>
                <ThemedText style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: '#9CA3AF', marginBottom: 2 }}>FROM</ThemedText>
                <ThemedText style={{ fontSize: 14, fontWeight: '700', color: selectingDateType === 'FROM' ? theme.primary : '#1a1a1a' }}>{fromDate || '—'}</ThemedText>
              </TouchableOpacity>
              <View style={{ width: 1, backgroundColor: '#E5E7EB', marginVertical: 8 }} />
              <TouchableOpacity style={[{ flex: 1, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' }, selectingDateType === 'TO' && { backgroundColor: '#EFF6FF' }]} onPress={() => setSelectingDateType('TO')}>
                <ThemedText style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: '#9CA3AF', marginBottom: 2 }}>TO</ThemedText>
                <ThemedText style={{ fontSize: 14, fontWeight: '700', color: selectingDateType === 'TO' ? theme.primary : '#1a1a1a' }}>{toDate || '—'}</ThemedText>
              </TouchableOpacity>
            </View>
            <ThemedText style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 8, marginBottom: 4 }}>
              {selectingDateType === 'FROM' ? 'Tap a start date' : 'Tap an end date'}
            </ThemedText>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
              <Calendar
                onDayPress={(day) => {
                  const d = day.dateString;
                  if (selectingDateType === 'FROM') {
                    setFromDate(d);
                    setSelectingDateType('TO');
                    if (toDate && toDate < d) setToDate('');
                  } else {
                    if (fromDate && d < fromDate) return;
                    setToDate(d);
                  }
                }}
                markedDates={(() => {
                  const marks: Record<string, any> = {};
                  if (!fromDate) return marks;
                  if (!toDate || fromDate === toDate) {
                    marks[fromDate] = { startingDay: true, endingDay: true, color: theme.primary, textColor: '#fff' };
                  } else {
                    marks[fromDate] = { startingDay: true, color: theme.primary, textColor: '#fff' };
                    marks[toDate] = { endingDay: true, color: theme.primary, textColor: '#fff' };
                    const cur = new Date(fromDate + 'T00:00:00');
                    cur.setDate(cur.getDate() + 1);
                    const end = new Date(toDate + 'T00:00:00');
                    while (cur < end) {
                      const y = cur.getFullYear();
                      const mo = String(cur.getMonth() + 1).padStart(2, '0');
                      const d2 = String(cur.getDate()).padStart(2, '0');
                      marks[`${y}-${mo}-${d2}`] = { color: '#E8F4FD', textColor: '#1a1a1a' };
                      cur.setDate(cur.getDate() + 1);
                    }
                  }
                  return marks;
                })()}
                markingType="period"
                theme={{
                  calendarBackground: '#ffffff',
                  textSectionTitleColor: '#9CA3AF',
                  selectedDayBackgroundColor: theme.primary,
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: theme.primary,
                  dayTextColor: '#1a1a1a',
                  textDisabledColor: '#D1D5DB',
                  arrowColor: '#1a1a1a',
                  monthTextColor: '#1a1a1a',
                  textMonthFontSize: 18,
                  textMonthFontWeight: '800',
                  textDayFontSize: 15,
                  textDayFontWeight: '500',
                  textDayHeaderFontSize: 12,
                  textDayHeaderFontWeight: '700',
                }}
              />
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#F3F4F6' }} onPress={() => { setFromDate(''); setToDate(''); setSelectingDateType('FROM'); }}>
                <ThemedText style={{ fontSize: 15, fontWeight: '700', color: '#6B7280' }}>Clear</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: fromDate && toDate ? theme.primary : '#D1D5DB' }}
                disabled={!fromDate || !toDate}
                onPress={() => { setRangeModalVisible(false); loadExitLogs(fromDate || undefined, toDate || undefined); }}
              >
                <ThemedText style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>Apply</ThemedText>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerInfo: { gap: 2, flex: 1 },
  greeting: { fontSize: 13 },
  userName: { fontSize: 18, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  notificationIndicator: { position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  searchInput: { flex: 1, fontSize: 16 },
  statsContainer: { flexDirection: 'row', marginBottom: 16, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  statTab: { flex: 1, paddingVertical: 16, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  statLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },
  statValue: { fontSize: 24, fontWeight: '700' },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyState: { paddingVertical: 80, alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 16 },
  requestCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardAvatarText: { fontSize: 16, fontWeight: '700' },
  headerMainInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 8, flexShrink: 1 },
  requestStudentName: { fontSize: 17, fontWeight: '700', flexShrink: 1 },
  passTypeLabel: { fontSize: 9, fontWeight: '500' },
  studentIdSub: { fontSize: 13, marginTop: 2 },
  timeAgoContainer: { alignSelf: 'flex-start', paddingTop: 4 },
  timeAgoText: { fontSize: 12 },
  detailsBlock: { borderRadius: 12, padding: 12, gap: 8, marginBottom: 16 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  viewBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 4 },
  viewBadgeText: { fontSize: 9, fontWeight: '600' },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, borderTopWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 8 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, position: 'relative' },
  navLabel: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  activeIndicator: { position: 'absolute', bottom: 0, width: 32, height: 3, borderRadius: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  dragHandle: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  dragHandleBar: { width: 40, height: 4, borderRadius: 2 },
  modalContainer: { flex: 1, marginTop: 60, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  closeButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  modalContent: { flex: 1, maxHeight: '100%' },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  rangeModalCard: { borderRadius: 20, padding: 0, marginHorizontal: 16, overflow: 'hidden' },
  rangeModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  rangeCloseBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  rangePillRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  rangePill: { flex: 1, flexDirection: 'column', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, gap: 2 },
  rangePillLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  rangePillValue: { fontSize: 13, fontWeight: '700' },
  modalScrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  modalSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12, letterSpacing: 0.5 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalLabel: { fontSize: 14 },
  modalValue: { fontSize: 14, fontWeight: '600' },
  dateTypeTabs: { flexDirection: 'row', borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
  dateTypeTab: { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  dateTypeTabText: { fontSize: 13, fontWeight: '700' },
  calendarWrap: { marginHorizontal: 12, marginBottom: 4, borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  rangeSummaryRow: { flexDirection: 'row', marginTop: 10, gap: 10 },
  rangeSummaryCell: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1 },
  rangeSummaryLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
  rangeSummaryValue: { fontSize: 14, fontWeight: '800' },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 16, paddingHorizontal: 16 },
  rejectButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, paddingVertical: 14, borderRadius: 12, gap: 8 },
  rejectButtonText: { fontSize: 15, fontWeight: '700' },
  approveButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  approveButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  remarkBox: { borderRadius: 8, padding: 12, marginBottom: 8, borderLeftWidth: 3 },
  remarkLabel: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  remarkValue: { fontSize: 14, fontWeight: '500' },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  processingBox: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', gap: 14, minWidth: 160, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  processingText: { fontSize: 15, fontWeight: '600' },
  // Exit card styles
  exitCard: { borderRadius: 14, marginBottom: 12, borderWidth: 1, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
  exitTopRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  exitAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  exitAvatarText: { fontSize: 15, fontWeight: '800' },
  exitInfo: { flex: 1, minWidth: 0 },
  exitName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  exitSub: { fontSize: 12 },
  exitTypeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexShrink: 0 },
  exitTypeText: { fontSize: 11, fontWeight: '700' },
  exitDetails: { paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  exitDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  exitDetailText: { fontSize: 13, flex: 1 },
  // Exits section header + actions
  exitsHeaderCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 16, marginBottom: 12, padding: 16, borderRadius: 14, borderWidth: 1 },
  exitsHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exitsIconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  exitsTitle: { fontSize: 16, fontWeight: '700' },
  exitsCount: { fontSize: 13, marginTop: 2 },
  exitsActions: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 16 },
  exitsBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12 },
  exitsBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});

export default NewHRDashboard;
