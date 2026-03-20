import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Modal,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { Student } from '../../types';
import { apiService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import RequestTimeline from '../../components/RequestTimeline';
import MyRequestsBulkModal from '../../components/MyRequestsBulkModal';
import GatePassQRModal from '../../components/GatePassQRModal';

interface StudentRequestsScreenProps {
  student: Student;
  onTabChange: (tab: 'HOME' | 'REQUESTS' | 'HISTORY' | 'PROFILE') => void;
}

const StudentRequestsScreen: React.FC<StudentRequestsScreenProps> = ({
  student,
  onTabChange,
}) => {
  const { theme, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [manualEntryCode, setManualEntryCode] = useState<string | null>(null);
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false);
  const [previewAttachmentUri, setPreviewAttachmentUri] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const regNo = student.regNo || '';
      const response = await apiService.getStudentGatePassRequests(regNo);

      if (response.success && response.requests) {
        // Sort by approval status first (APPROVED first), then by date (newest first)
        const sorted = response.requests.sort((a: any, b: any) => {
          // Priority 1: APPROVED requests first
          if (a.status === 'APPROVED' && b.status !== 'APPROVED') return -1;
          if (a.status !== 'APPROVED' && b.status === 'APPROVED') return 1;
          
          // Priority 2: Within same status, sort by date (newest first)
          return new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime();
        });
        setRequests(sorted);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = searchQuery === '' ||
      request.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.id?.toString().includes(searchQuery);

    return matchesSearch;
  });

  const handleViewQR = async (request: any) => {
    if (!request.id) return;
    setSelectedRequest(request);
    setQrCodeData(null);
    setManualEntryCode(null);
    setShowQRModal(true);

    try {
      if (request.qrCode) {
        setQrCodeData(request.qrCode);
        const manualCode = request.manualEntryCode || request.manualCode || null;
        if (manualCode) {
          setManualEntryCode(manualCode);
        }
        return;
      }

      const response = await apiService.getGatePassQRCode(request.id, student.regNo, false);

      if (response.success && response.qrCode) {
        if (response.qrCode.startsWith('GP|') || 
            response.qrCode.startsWith('ST|') || 
            response.qrCode.startsWith('SF|') || 
            response.qrCode.startsWith('VG|')) {
          setQrCodeData(response.qrCode);
        } else {
          const qrCodeWithPrefix = response.qrCode.startsWith('data:image')
            ? response.qrCode
            : `data:image/png;base64,${response.qrCode}`;
          setQrCodeData(qrCodeWithPrefix);
        }

        const manualCodeValue = response.manualCode || null;
        setManualEntryCode(manualCodeValue);
      } else {
        Alert.alert('Error', response.message || 'Could not fetch QR code');
        setShowQRModal(false);
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);
      Alert.alert('Error', 'Failed to load QR code');
      setShowQRModal(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return '#10B981';
      case 'REJECTED':
        return '#EF4444';
      case 'PENDING_HOD':
        return '#3B82F6';
      default:
        return '#F59E0B';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING_STAFF': return 'AWAITING STAFF';
      case 'PENDING_HOD': return 'AWAITING HOD';
      case 'APPROVED': return 'APPROVED';
      case 'REJECTED': return 'REJECTED';
      default: return status || 'PENDING';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Requests</Text>
      </View>

      {/* Search Bar */}
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

      {/* Request List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={theme.border} />
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>No requests found</Text>
          </View>
        ) : (
          filteredRequests.map((request) => (
            <TouchableOpacity
              key={request.id}
              style={[styles.requestCard, { backgroundColor: theme.cardBackground }]}
              onPress={() => {
                setSelectedRequest(request);
                setSelectedRequestId(request.id);
                if (request.requestType === 'BULK') {
                  setShowBulkModal(true);
                } else {
                  setShowDetailModal(true);
                }
              }}
            >
              <View style={styles.requestHeader}>
                <Text style={[styles.requestTitle, { color: theme.text }]} numberOfLines={1}>
                  {request.purpose || 'Gate Pass Request'}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                    {getStatusLabel(request.status)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.requestDate, { color: theme.textTertiary }]}>{formatDate(request.requestDate)}</Text>
              {request.status === 'APPROVED' && (
                <TouchableOpacity
                  style={[styles.quickQrButton, { backgroundColor: theme.success + '20' }]}
                  onPress={(e) => { e.stopPropagation(); handleViewQR(request); }}
                  activeOpacity={0.7}
                >
                  <View style={styles.quickQrContent}>
                    <Ionicons name="qr-code-outline" size={16} color={theme.success} />
                    <Text style={[styles.quickQrText, { color: theme.success }]}>
                      {request.requestType === 'BULK' ? 'View Group Pass QR' : 'View QR Code'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => onTabChange('HOME')}>
          <Ionicons name="home-outline" size={24} color={theme.textTertiary} />
          <Text style={[styles.navLabel, { color: theme.textTertiary }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => onTabChange('REQUESTS')}>
          <Ionicons name="document-text" size={24} color={theme.primary} />
          <Text style={[styles.navLabelActive, { color: theme.primary }]}>Requests</Text>
          <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => onTabChange('HISTORY')}>
          <Ionicons name="time-outline" size={24} color={theme.textTertiary} />
          <Text style={[styles.navLabel, { color: theme.textTertiary }]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => onTabChange('PROFILE')}>
          <Ionicons name="person-outline" size={24} color={theme.textTertiary} />
          <Text style={[styles.navLabel, { color: theme.textTertiary }]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Request Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModalContainer, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Request Details</Text>
                {selectedRequest && (
                  <Text style={[styles.modalSubtitle, { color: theme.textTertiary }]}>
                    {formatDate(selectedRequest.requestDate)}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowDetailModal(false)} style={[styles.closeButton, { backgroundColor: theme.surfaceHighlight }]}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <ScrollView style={styles.detailModalContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.infoSection, { backgroundColor: theme.surfaceHighlight }]}>
                  <Text style={[styles.sectionTitleBold, { color: theme.text }]}>Pass Details</Text>
                  <View style={styles.detailChipRow}>
                    <View style={[styles.detailChip, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                      <Ionicons name="flag-outline" size={14} color={theme.textSecondary} />
                      <Text style={[styles.detailChipLabel, { color: theme.textTertiary }]}>Purpose</Text>
                      <Text style={[styles.detailChipValue, { color: theme.text }]}>{selectedRequest.purpose || 'N/A'}</Text>
                    </View>
                    <View style={[styles.detailChip, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                      <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
                      <Text style={[styles.detailChipLabel, { color: theme.textTertiary }]}>Date</Text>
                      <Text style={[styles.detailChipValue, { color: theme.text }]}>
                        {new Date(selectedRequest.requestDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                  {selectedRequest.reason && (
                    <View style={[styles.reasonBox, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                      <Text style={[styles.reasonLabel, { color: theme.textTertiary }]}>Reason</Text>
                      <Text style={[styles.reasonText, { color: theme.textSecondary }]}>{selectedRequest.reason}</Text>
                    </View>
                  )}
                </View>

                {selectedRequest.attachmentUri && (
                  <View style={[styles.infoSection, { backgroundColor: theme.surfaceHighlight }]}>
                    <Text style={[styles.sectionTitleBold, { color: theme.text }]}>Attachment</Text>
                    <TouchableOpacity onPress={() => { setPreviewAttachmentUri(selectedRequest.attachmentUri); setShowAttachmentPreview(true); }} activeOpacity={0.85}>
                      <View style={[styles.attachmentContainer, { borderColor: theme.border }]}>
                        <Image source={{ uri: selectedRequest.attachmentUri }} style={styles.attachmentImage} resizeMode="cover" />
                        <View style={[styles.attachmentTapHint, { backgroundColor: theme.surfaceHighlight, borderTopColor: theme.border }]}>
                          <Ionicons name="eye-outline" size={16} color={theme.textSecondary} />
                          <Text style={[styles.attachmentTapText, { color: theme.textSecondary }]}>Tap to preview full image</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={[styles.infoSection, { backgroundColor: theme.surfaceHighlight }]}>
                  <Text style={[styles.sectionTitleBold, { color: theme.text }]}>Request Status</Text>
                  <RequestTimeline
                    status={selectedRequest.status}
                    staffApproval={selectedRequest.staffApproval || 'PENDING'}
                    hodApproval={selectedRequest.hodApproval || 'PENDING'}
                    requestDate={selectedRequest.requestDate}
                    staffRemark={selectedRequest.staffRemark || selectedRequest.rejectionReason}
                    hodRemark={selectedRequest.hodRemark}
                  />
                </View>

                <View style={styles.finalStatusRow}>
                  <View style={[styles.finalStatusBadge, { backgroundColor: getStatusColor(selectedRequest.status) + '18', borderColor: getStatusColor(selectedRequest.status) }]}>
                    <Ionicons
                      name={selectedRequest.status === 'APPROVED' ? 'checkmark-circle' : selectedRequest.status === 'REJECTED' ? 'close-circle' : 'time'}
                      size={18} color={getStatusColor(selectedRequest.status)}
                    />
                    <Text style={[styles.finalStatusText, { color: getStatusColor(selectedRequest.status) }]}>
                      {getStatusLabel(selectedRequest.status)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={[styles.closeModalButton, { backgroundColor: theme.surfaceHighlight }]} onPress={() => setShowDetailModal(false)}>
                  <Text style={[styles.closeModalButtonText, { color: theme.text }]}>Close</Text>
                </TouchableOpacity>
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <MyRequestsBulkModal
        visible={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        requestId={selectedRequestId || 0}
        requesterInfo={{ name: `${student.firstName} ${student.lastName || ''}`, role: 'STUDENT', department: student.department || 'N/A' }}
      />

      <Modal visible={showAttachmentPreview} animationType="fade" transparent={true} onRequestClose={() => setShowAttachmentPreview(false)}>
        <View style={styles.attachmentPreviewOverlay}>
          <TouchableOpacity style={styles.attachmentPreviewClose} onPress={() => setShowAttachmentPreview(false)}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          {previewAttachmentUri && (
            <Image source={{ uri: previewAttachmentUri }} style={styles.attachmentPreviewImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      <GatePassQRModal
        visible={showQRModal}
        onClose={() => setShowQRModal(false)}
        personName={`${student.firstName} ${student.lastName || ''}`}
        personId={student.regNo}
        qrCodeData={qrCodeData}
        manualCode={manualEntryCode}
        reason={selectedRequest?.reason || selectedRequest?.purpose}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginTop: 16,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 12, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 16 },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  emptyState: { paddingVertical: 80, alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 16 },
  requestCard: {
    borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  requestTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  requestDate: { fontSize: 13, marginTop: 4 },
  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8,
    borderTopWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 8,
  },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 8, position: 'relative' },
  navLabel: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  navLabelActive: { fontSize: 12, marginTop: 4, fontWeight: '700' },
  activeIndicator: { position: 'absolute', bottom: 0, width: 32, height: 3, borderRadius: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailModalContainer: { borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '90%', paddingBottom: 20 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalSubtitle: { fontSize: 12, marginTop: 3, fontWeight: '500' },
  closeButton: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  detailModalContent: { paddingHorizontal: 20 },
  infoSection: { borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitleBold: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  detailChipRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  detailChip: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1, gap: 4 },
  detailChipLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailChipValue: { fontSize: 14, fontWeight: '700' },
  reasonBox: { borderRadius: 12, padding: 12, borderWidth: 1 },
  reasonLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  reasonText: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  attachmentContainer: { borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  attachmentImage: { width: '100%', height: 200 },
  attachmentTapHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6, borderTopWidth: 1 },
  attachmentTapText: { fontSize: 13, fontWeight: '600' },
  finalStatusRow: { alignItems: 'center', marginBottom: 16, marginTop: 4 },
  finalStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, borderWidth: 1.5 },
  finalStatusText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  closeModalButton: { paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  closeModalButtonText: { fontWeight: '800' },
  quickQrButton: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' },
  quickQrContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quickQrText: { fontSize: 12, fontWeight: '700' },
  attachmentPreviewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', justifyContent: 'center', alignItems: 'center' },
  attachmentPreviewClose: { position: 'absolute', top: 52, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 10 },
  attachmentPreviewImage: { width: '95%', height: '78%', borderRadius: 12 },
});

export default StudentRequestsScreen;
