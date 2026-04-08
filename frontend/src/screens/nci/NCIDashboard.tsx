import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, StatusBar, Image,
  ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NonTeachingFaculty, ScreenName } from '../../types';
import { apiService } from '../../services/api.service';
import { useNotifications } from '../../context/NotificationContext';
import { useRefresh } from '../../context/RefreshContext';
import { useProfile } from '../../context/ProfileContext';
import { useTheme } from '../../context/ThemeContext';
import { getRelativeTime, formatDateShort } from '../../utils/dateUtils';
import ConfirmationModal from '../../components/ConfirmationModal';
import ErrorModal from '../../components/ErrorModal';
import SuccessModal from '../../components/SuccessModal';
import ScreenContentContainer from '../../components/ScreenContentContainer';
import ThemedText from '../../components/ThemedText';
import TopRefreshControl from '../../components/TopRefreshControl';
import PassTypeBottomSheet from '../../components/PassTypeBottomSheet';
import { VerticalFlatList } from '../../components/navigation/VerticalScrollViews';
import { SkeletonList } from '../../components/SkeletonCard';
import SinglePassDetailsModal from '../../components/SinglePassDetailsModal';

interface NCIDashboardProps {
  nci: NonTeachingFaculty;
  onLogout: () => void;
  onNavigate: (screen: ScreenName) => void;
}

type TabType = 'PENDING' | 'APPROVED' | 'REJECTED';

const NCIDashboard: React.FC<NCIDashboardProps> = ({ nci, onLogout, onNavigate }) => {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('PENDING');
  const [bottomTab, setBottomTab] = useState<'HOME' | 'NEW_PASS' | 'MY_PASSES' | 'PROFILE'>('HOME');
  const [showPassSheet, setShowPassSheet] = useState(false);
  const [processing, setProcessing] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [modalMsg, setModalMsg] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const { unreadCount, loadNotifications } = useNotifications();
  const { refreshCount } = useRefresh();
  const { profileImage } = useProfile();
  const [searchQuery, setSearchQuery] = useState('');

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'GOOD MORNING,';
    if (h < 17) return 'GOOD AFTERNOON,';
    return 'GOOD EVENING,';
  };

  const isPrincipalOrDirector = (() => {
    const r = ((nci as any).role || nci.designation || '').toUpperCase();
    return r.includes('PRINCIPAL') || r.includes('DIRECTOR');
  })();

  const getInitials = (name: string) =>
    (name || 'NF').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  useEffect(() => { loadData(); loadNotifications(nci.staffCode, 'staff'); }, []);
  useEffect(() => { if (refreshCount > 0) loadData(); }, [refreshCount]);

  const loadData = async () => {
    try {
      const res = await apiService.getVisitorRequestsForStaff(nci.staffCode);
      const all: any[] = res.requests || [];
      const websiteOnly = all.filter((r: any) => {
        const rb = (r.registeredBy || r.registered_by || '').toString();
        return rb === 'WEBSITE' || rb.toUpperCase().startsWith('WEB-');
      });
      setAllRequests(websiteOnly);
    } catch (e) {
      console.error('NCI visitor load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const filtered = allRequests.filter(r => {
    const matchesTab = activeTab === 'PENDING' ? r.status === 'PENDING' : 
                      activeTab === 'APPROVED' ? r.status === 'APPROVED' : r.status === 'REJECTED';
    if (!matchesTab) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = (r.requesterName || r.name || '').toLowerCase();
      const email = (r.visitorEmail || r.email || '').toLowerCase();
      const phone = (r.visitorPhone || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    }
    return true;
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const stats = {
    pending: allRequests.filter(r => r.status === 'PENDING').length,
    approved: allRequests.filter(r => r.status === 'APPROVED').length,
    rejected: allRequests.filter(r => r.status === 'REJECTED').length,
  };

  const handleApprove = async (req: any) => {
    const id = req.requestId || req.id;
    setProcessing(id);
    setAllRequests(prev => prev.filter(r => (r.requestId || r.id) !== id));
    try {
      const res = await apiService.approveVisitorRequest(id, nci.staffCode);
      if (res.success) { setModalMsg('Visitor approved.'); setShowSuccess(true); }
      else { loadData(); setModalMsg(res.message || 'Failed to approve.'); setShowError(true); }
    } catch (e: any) { loadData(); setModalMsg(e.message || 'Error.'); setShowError(true); }
    finally { setProcessing(null); }
  };

  const handleReject = async (req: any) => {
    const id = req.requestId || req.id;
    setProcessing(id);
    setAllRequests(prev => prev.filter(r => (r.requestId || r.id) !== id));
    try {
      const res = await apiService.rejectVisitorRequest(id, 'Rejected by staff');
      if (res.success) { setModalMsg('Visitor rejected.'); setShowSuccess(true); }
      else { loadData(); setModalMsg(res.message || 'Failed to reject.'); setShowError(true); }
    } catch (e: any) { loadData(); setModalMsg(e.message || 'Error.'); setShowError(true); }
    finally { setProcessing(null); }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />

      <TopRefreshControl refreshing={refreshing} onRefresh={onRefresh} color={theme.primary}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => onNavigate('PROFILE')}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                  <ThemedText style={styles.avatarText}>{getInitials(nci.staffName || 'NF')}</ThemedText>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <ThemedText style={[styles.greeting, { color: theme.textSecondary }]}>{getGreeting()}</ThemedText>
              <ThemedText style={[styles.userName, { color: theme.text }]} numberOfLines={1}>{(nci.staffName || '').toUpperCase()}</ThemedText>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.surfaceHighlight }]}
              onPress={() => onNavigate('NOTIFICATIONS')}
            >
              <Ionicons name="notifications-outline" size={24} color={theme.text} />
              {unreadCount > 0 && (
                <View style={[styles.notificationIndicator, { backgroundColor: theme.error, borderColor: theme.surface }]} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {/* Search Input */}
          <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
            <Ionicons name="search" size={20} color={theme.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search visitor requests..."
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          {/* Stats Tabs */}
          <View style={[styles.statsContainer, { backgroundColor: theme.surface }]}>
            <TouchableOpacity style={[styles.statTab, activeTab === 'PENDING' && { borderBottomColor: theme.warning }]} onPress={() => setActiveTab('PENDING')}>
              <ThemedText style={[styles.statLabel, { color: theme.textTertiary }, activeTab === 'PENDING' && { color: theme.warning }]}>PENDING</ThemedText>
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
          {(loading || refreshing) ? (
            <SkeletonList count={5} />
          ) : (
            <VerticalFlatList
              style={styles.content}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              decelerationRate="normal"
              data={filtered}
              keyExtractor={(item) => (item.requestId || item.id)?.toString()}
              renderItem={({ item: req }) => {
                const id = req.requestId || req.id;
                const isPending = req.status === 'PENDING';
                const isProcessing = processing === id;
                return (
                  <TouchableOpacity
                    style={[styles.requestCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                    onPress={() => { setSelectedVisitor(req); setShowDetailModal(true); }}
                  >
                    <View style={styles.cardTopRow}>
                      <View style={[styles.avatarContainer, { backgroundColor: theme.surfaceHighlight }]}>
                        <ThemedText style={[styles.requestAvatarText, { color: theme.textSecondary }]}>
                          {getInitials(req.requesterName || req.name || 'VR')}
                        </ThemedText>
                      </View>

                      <View style={styles.headerMainInfo}>
                        <View style={styles.nameRow}>
                          <ThemedText style={[styles.requestStudentName, { color: theme.text }]} numberOfLines={1}>
                            {req.requesterName || req.name || 'Visitor'}
                          </ThemedText>
                          <View style={[styles.passTypePill, { backgroundColor: theme.surfaceHighlight, borderColor: theme.border }]}>
                            <ThemedText style={[styles.passTypePillText, { color: theme.text }]}>
                              {(req.role || req.type || 'Visitor').charAt(0).toUpperCase() + (req.role || req.type || 'Visitor').slice(1).toLowerCase()}
                            </ThemedText>
                          </View>
                        </View>
                        <ThemedText style={[styles.studentIdSub, { color: theme.textSecondary }]}>
                          {req.visitorEmail || req.email || ''}{req.visitorPhone ? ` • ${req.visitorPhone}` : ''}
                        </ThemedText>
                      </View>

                      <View style={styles.timeAgoContainer}>
                        <ThemedText style={[styles.timeAgoText, { color: theme.textTertiary }]}>
                          {getRelativeTime(req.createdAt)}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={[styles.detailsBlock, { backgroundColor: theme.inputBackground }]}>
                      {req.purpose && (
                        <View style={styles.detailItem}>
                          <Ionicons name="document-text-outline" size={16} color={theme.textSecondary} />
                          <ThemedText style={[styles.detailText, { color: theme.text }]} numberOfLines={1}>{req.purpose}</ThemedText>
                        </View>
                      )}
                      <View style={styles.detailItem}>
                        <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
                        <ThemedText style={[styles.detailText, { color: theme.text }]}>
                          {req.visitDate
                            ? `${req.visitDate}${req.visitTime ? ` at ${req.visitTime}` : ''}`
                            : formatDateShort(req.createdAt)}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.cardFooter}>
                      <View style={[
                        styles.statusBadge,
                        req.status === 'PENDING' && { backgroundColor: theme.warning },
                        req.status === 'APPROVED' && { backgroundColor: theme.success },
                        req.status === 'REJECTED' && { backgroundColor: theme.error },
                      ]}>
                        <ThemedText style={[styles.statusText, { color: '#FFFFFF' }]}>
                          {req.status}
                        </ThemedText>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={64} color={theme.border} />
                  <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>No {activeTab.toLowerCase()} visitor requests</ThemedText>
                </View>
              }
            />
          )}
        </ScreenContentContainer>
      </TopRefreshControl>

      {/* Bottom Nav */}
      <View style={[styles.bottomNav, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setBottomTab('HOME')}
        >
          <Ionicons
            name={bottomTab === 'HOME' ? 'home' : 'home-outline'}
            size={22}
            color={bottomTab === 'HOME' ? theme.primary : theme.textTertiary}
          />
          <ThemedText style={[styles.navLabel, { color: theme.textTertiary }, bottomTab === 'HOME' && { color: theme.primary }]}>
            Home
          </ThemedText>
          {bottomTab === 'HOME' && <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setBottomTab('NEW_PASS');
            setShowPassSheet(true);
          }}
        >
          <Ionicons name="add-circle-outline" size={32} color={theme.textSecondary} />
          <ThemedText style={[styles.navLabel, { color: theme.textTertiary }]}>New Pass</ThemedText>
        </TouchableOpacity>

        {isPrincipalOrDirector && (
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => {
              setBottomTab('EXITS' as any);
              onNavigate('NCI_EXITS');
            }}
          >
            <Ionicons
              name={bottomTab === ('EXITS' as any) ? 'exit' : 'exit-outline'}
              size={22}
              color={bottomTab === ('EXITS' as any) ? theme.primary : theme.textTertiary}
            />
            <ThemedText style={[styles.navLabel, { color: theme.textTertiary }, bottomTab === ('EXITS' as any) && { color: theme.primary }]}>
              Exits
            </ThemedText>
            {bottomTab === ('EXITS' as any) && <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setBottomTab('MY_PASSES');
            onNavigate('NCI_MY_REQUESTS');
          }}
        >
          <Ionicons
            name={bottomTab === 'MY_PASSES' ? 'list' : 'list-outline'}
            size={22}
            color={bottomTab === 'MY_PASSES' ? theme.primary : theme.textTertiary}
          />
          <ThemedText style={[styles.navLabel, { color: theme.textTertiary }, bottomTab === 'MY_PASSES' && { color: theme.primary }]}>
            My Passes
          </ThemedText>
          {bottomTab === 'MY_PASSES' && <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setBottomTab('PROFILE');
            onNavigate('PROFILE');
          }}
        >
          <Ionicons
            name={bottomTab === 'PROFILE' ? 'person' : 'person-outline'}
            size={22}
            color={bottomTab === 'PROFILE' ? theme.primary : theme.textTertiary}
          />
          <ThemedText style={[styles.navLabel, { color: theme.textTertiary }, bottomTab === 'PROFILE' && { color: theme.primary }]}>
            Profile
          </ThemedText>
          {bottomTab === 'PROFILE' && <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />}
        </TouchableOpacity>
      </View>

      <PassTypeBottomSheet
        visible={showPassSheet}
        onClose={() => { setShowPassSheet(false); setBottomTab('HOME'); }}
        onSelectSingle={() => { setShowPassSheet(false); onNavigate('NEW_PASS_REQUEST'); }}
        onSelectGuest={() => { setShowPassSheet(false); onNavigate('GUEST_PRE_REQUEST'); }}
      />

      <SuccessModal visible={showSuccess} title="Done" message={modalMsg} onClose={() => setShowSuccess(false)} autoClose autoCloseDelay={2000} />
      <ErrorModal visible={showError} type="general" title="Error" message={modalMsg} onClose={() => setShowError(false)} />

      <SinglePassDetailsModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        request={selectedVisitor ? {
          id: selectedVisitor.requestId || selectedVisitor.id,
          studentName: selectedVisitor.requesterName || selectedVisitor.name || 'Visitor',
          regNo: selectedVisitor.visitorPhone || selectedVisitor.phone || '',
          department: selectedVisitor.department || '',
          purpose: selectedVisitor.purpose || '',
          reason: selectedVisitor.purpose || '',
          requestDate: selectedVisitor.visitDate || selectedVisitor.createdAt,
          visitDate: selectedVisitor.visitDate,
          status: selectedVisitor.status,
          requestType: 'VISITOR',
          staffApproval: selectedVisitor.status,
        } : null}
        showActions={selectedVisitor?.status === 'PENDING'}
        viewerRole="staff"
        processing={processing === (selectedVisitor?.requestId || selectedVisitor?.id)}
        onApprove={async (_id, _remark) => { setShowDetailModal(false); await handleApprove(selectedVisitor); }}
        onReject={async (_id, _remark) => { setShowDetailModal(false); await handleReject(selectedVisitor); }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statTab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  requestCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  requestAvatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerMainInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  requestStudentName: {
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  studentIdSub: {
    fontSize: 13,
    marginTop: 2,
  },
  timeAgoContainer: {
    alignSelf: 'flex-start',
    paddingTop: 4,
  },
  timeAgoText: {
    fontSize: 12,
  },
  detailsBlock: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passTypePill: {
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
  },
  passTypePillText: {
    fontSize: 9,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 4,
    paddingTop: 4,
    height: 60,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  navLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 3,
    borderRadius: 2,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  dragHandle: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  dragBar: { width: 40, height: 4, borderRadius: 2 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, marginBottom: 16 },
  detailTitle: { fontSize: 18, fontWeight: '700' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  detailCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 16 },
  detailAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  detailAvatarText: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  detailName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  detailSub: { fontSize: 13 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  detailRow2: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  detailRowLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, marginBottom: 2 },
  detailRowValue: { fontSize: 14, fontWeight: '500' },
  detailActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 5,
  },
  rejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 5,
  },
  approveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default NCIDashboard;
