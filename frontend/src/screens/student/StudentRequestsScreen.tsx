import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Student } from '../../types';
import { apiService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { getRelativeTime, formatDateTimeShort } from '../../utils/dateUtils';
import MyRequestsBulkModal from '../../components/MyRequestsBulkModal';
import SinglePassDetailsModal from '../../components/SinglePassDetailsModal';
import { useErrorModal } from '../../hooks/useErrorModal';
import ErrorModal from '../../components/ErrorModal';
import ThemedText from '../../components/ThemedText';
import ScreenContentContainer from '../../components/ScreenContentContainer';
import { VerticalFlatList, VerticalScrollView } from '../../components/navigation/VerticalScrollViews';
import TopRefreshControl from '../../components/TopRefreshControl';


interface StudentRequestsScreenProps {
  student: Student;
  onTabChange: (tab: 'HOME' | 'REQUESTS' | 'HISTORY' | 'PROFILE') => void;
}

const StudentRequestsScreen: React.FC<StudentRequestsScreenProps> = ({ student, onTabChange }) => {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedBulkId, setSelectedBulkId] = useState<number | null>(null);
  const { errorInfo, showError, hideError, handleRetry, isVisible: isErrorVisible } = useErrorModal();

  useEffect(() => {
    const onBackPress = () => { onTabChange('HOME'); return true; };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [onTabChange]);

  useEffect(() => { loadRequests(); }, []);
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const timer = setTimeout(() => loadRequests(), nextMidnight.getTime() - now.getTime() + 500);
    return () => clearTimeout(timer);
  }, []);

  const getRequestDate = (request: any) => request.requestDate || request.createdAt || request.exitDateTime;
  const isToday = (dateValue?: string) => {
    if (!dateValue) return false;
    const d = new Date(dateValue);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };
  const isUsedRequest = (request: any) =>
    request.qrUsed === true || request.status === 'USED' || request.status === 'EXITED';

  const loadRequests = async () => {
    try {
      const response = await apiService.getStudentGatePassRequests(student.regNo);
      if (response.success && response.requests) {
        const todayOnly = response.requests
          .filter((r: any) => isToday(getRequestDate(r)))
          .filter((r: any) => !isUsedRequest(r))
          .sort((a: any, b: any) => new Date(getRequestDate(b)).getTime() - new Date(getRequestDate(a)).getTime());
        setRequests(todayOnly);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    console.log('🔄 [REFRESH] Student/StudentRequests'); setRefreshing(true); loadRequests(); };

  const filteredRequests = requests.filter(r =>
    searchQuery === '' ||
    r.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.id?.toString().includes(searchQuery)
  );

  const getStatusBadge = (status: string) => {
    if (status === 'APPROVED') return { text: 'ACTIVE', color: theme.success, bg: theme.success + '22' };
    if (status === 'REJECTED') return { text: 'REJECTED', color: theme.error, bg: theme.error + '22' };
    if (status === 'PENDING_HOD') return { text: 'AWAITING HOD', color: theme.primary, bg: theme.primary + '22' };
    return { text: 'AWAITING STAFF', color: theme.warning, bg: theme.warning + '22' };
  };

  const getTimeAgo = (dateString: string) => getRelativeTime(dateString);

  const formatDate = (dateString: string) => formatDateTimeShort(dateString);

  // derive initials from student name
  const name = student.fullName || `${student.firstName} ${student.lastName}`.trim() || student.regNo || 'S';
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const renderCard = (request: any) => {
    const isBulk = request.requestType === 'BULK' || request.passType === 'BULK';
    const badge = getStatusBadge(request.status);
    const dateStr = getRequestDate(request);

    return (
      <TouchableOpacity
        key={request.id}
        style={[styles.card, { backgroundColor: theme.cardBackground }]}
        onPress={() => {
          if (isBulk) {
            setSelectedBulkId(request.id);
            setShowBulkModal(true);
          } else {
            setSelectedRequest(request);
            setShowDetailModal(true);
          }
        }}
        activeOpacity={0.85}
      >
        {/* Top row */}
        <View style={styles.cardTopRow}>
          <View style={[styles.avatar, { backgroundColor: theme.warning + '22' }]}>
            <ThemedText style={[styles.avatarText, { color: theme.warning }]}>{initials}</ThemedText>
          </View>
          <View style={styles.nameBlock}>
            <View style={styles.nameRow}>
              <ThemedText style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>{name}</ThemedText>
              <View style={[styles.typePill, { backgroundColor: theme.inputBackground }]}>
                <ThemedText style={[styles.typePillText, { color: theme.textSecondary }]}>
                  {isBulk ? 'Bulk Pass' : 'Single Pass'}
                </ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.cardSub, { color: theme.textSecondary }]}>
              Student • {student.department || 'Department'}
            </ThemedText>
          </View>
          <ThemedText style={[styles.timeAgo, { color: theme.textTertiary }]}>{getTimeAgo(dateStr)}</ThemedText>
        </View>

        {/* Info box */}
        <View style={[styles.infoBox, { backgroundColor: theme.inputBackground }]}>
          <View style={styles.infoRow}>
            <Ionicons name="document-text-outline" size={16} color={theme.textSecondary} />
            <ThemedText style={[styles.infoText, { color: theme.text }]} numberOfLines={1}>
              {request.purpose || request.reason || 'Gate Pass Request'}
            </ThemedText>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
            <ThemedText style={[styles.infoText, { color: theme.text }]}>{formatDate(dateStr)}</ThemedText>
          </View>
          {isBulk && (
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={16} color={theme.textSecondary} />
              <ThemedText style={[styles.infoText, { color: theme.text }]}>
                {request.participantCount || 1} Participants
              </ThemedText>
            </View>
          )}
        </View>

        {/* Status pill */}
        <View style={[styles.statusPill, { backgroundColor: badge.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: badge.color }]} />
          <ThemedText style={[styles.statusText, { color: badge.color }]}>{badge.text}</ThemedText>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />
      <TopRefreshControl refreshing={refreshing} onRefresh={onRefresh} color={theme.primary} pullEnabled={true}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>My Requests</ThemedText>
      </View>

      <ScreenContentContainer>
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

        <VerticalFlatList
          style={styles.scroll}
          data={filteredRequests}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          renderItem={({ item }) => renderCard(item)}          ListEmptyComponent={
            !refreshing ? (
              <View style={styles.empty}>
                <Ionicons name="document-text-outline" size={64} color={theme.border} />
                <ThemedText style={[styles.emptyText, { color: theme.textTertiary }]}>
                  No requests found
                </ThemedText>
              </View>
            ) : null
          }
        />
      </ScreenContentContainer>

      {/* Bottom nav */}
      <View style={[styles.bottomNav, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        {[
          { tab: 'HOME', icon: 'home-outline', label: 'Home' },
          { tab: 'REQUESTS', icon: 'document-text', label: 'Requests' },
          { tab: 'HISTORY', icon: 'time-outline', label: 'History' },
          { tab: 'PROFILE', icon: 'person-outline', label: 'Profile' },
        ].map(({ tab, icon, label }) => {
          const active = tab === 'REQUESTS';
          return (
            <TouchableOpacity key={tab} style={styles.navItem} onPress={() => onTabChange(tab as any)}>
              <Ionicons name={icon as any} size={24} color={active ? theme.primary : theme.textTertiary} />
              <ThemedText style={[styles.navLabel, { color: active ? theme.primary : theme.textTertiary, fontWeight: active ? '700' : '500' }]}>
                {label}
              </ThemedText>
              {active && <View style={[styles.navIndicator, { backgroundColor: theme.primary }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
      </TopRefreshControl>

      {/* Single pass details */}
      <SinglePassDetailsModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        request={selectedRequest}
        viewerRole="student"
        timelineSteps={selectedRequest ? (() => {
          const s = selectedRequest.status;
          const staffDone = s !== 'PENDING_STAFF';
          const hodApproved = s === 'APPROVED';
          const hodRejected = s === 'REJECTED';
          return [
            { label: 'Request Submitted', status: 'done' as const },
            { label: 'Staff Approval', status: staffDone ? 'done' as const : 'pending' as const, remark: selectedRequest.staffRemark },
            { label: 'HOD Approval', status: hodApproved ? 'done' as const : hodRejected ? 'rejected' as const : 'pending' as const, remark: selectedRequest.hodRemark || selectedRequest.rejectionReason },
          ];
        })() : []}
      />

      {/* Bulk pass details */}
      <MyRequestsBulkModal
        visible={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        requestId={selectedBulkId || 0}
        userRole="STAFF"
        viewerRole="STUDENT"
        currentUserId={student.regNo}
        requesterInfo={{
          name: student.fullName || `${student.firstName} ${student.lastName}`.trim() || student.regNo,
          role: 'Student',
          department: student.department || '',
        }}
      />

      <ErrorModal visible={isErrorVisible} type={errorInfo?.type || 'general'} title={errorInfo?.title} message={errorInfo?.message || ''} onClose={hideError} onRetry={errorInfo?.canRetry ? handleRetry : undefined} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, gap: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  empty: { paddingVertical: 80, alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 16 },

  /* Card */
  card: { borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { fontSize: 18, fontWeight: '700' },
  nameBlock: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardName: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  typePill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typePillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  cardSub: { fontSize: 13, marginTop: 2 },
  timeAgo: { fontSize: 12, flexShrink: 0 },

  infoBox: { borderRadius: 12, padding: 16, marginBottom: 12, gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 15, fontWeight: '500', flexShrink: 1 },

  statusPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },

  /* Bottom nav */
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, borderTopWidth: 1, elevation: 8 },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 8, position: 'relative' },
  navLabel: { fontSize: 12, marginTop: 4 },
  navIndicator: { position: 'absolute', bottom: 0, width: 32, height: 3, borderRadius: 2 },
});

export default StudentRequestsScreen;
