import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, StatusBar, Image,
  ActivityIndicator, TextInput, Modal, Animated, ScrollView,
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
import { useBottomSheetSwipe } from '../../hooks/useBottomSheetSwipe';
import { VerticalFlatList } from '../../components/navigation/VerticalScrollViews';
import { SkeletonList } from '../../components/SkeletonCard';

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
  const { translateY: detailSheetY, panHandlers: detailPanHandlers, openSheet: openDetailSheet } = useBottomSheetSwipe(() => setShowDetailModal(false));
  const { unreadCount, loadNotifications } = useNotifications();
  const { refreshCount } = useRefresh();
  const { profileImage } = useProfile();

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
    if (activeTab === 'PENDING') return r.status === 'PENDING';
    if (activeTab === 'APPROVED') return r.status === 'APPROVED';
    return r.status === 'REJECTED';
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

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => { setBottomTab('PROFILE'); onNavigate('PROFILE'); }}>
            {profileImage
              ? <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              : <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                  <ThemedText style={[styles.avatarText, { color: '#FFF' }]}>{getInitials(nci.staffName)}</ThemedText>
                </View>
            }
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <ThemedText style={[styles.greeting, { color: theme.textSecondary }]}>{getGreeting()}</ThemedText>
            <ThemedText style={[styles.userName, { color: theme.text }]} numberOfLines={1}>{(nci.staffName || '').toUpperCase()}</ThemedText>
          </View>
        </View>
        <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.surfaceHighlight }]} onPress={() => onNavigate('NOTIFICATIONS')}>
          <Ionicons name="notifications-outline" size={24} color={theme.text} />
          {unreadCount > 0 && <View style={[styles.notifBadge, { backgroundColor: theme.error }]}><ThemedText style={styles.notifBadgeText}>{unreadCount}</ThemedText></View>}
        </TouchableOpacity>
      </View>

      {/* Stats Tabs */}
      <View style={[styles.statsRow, { backgroundColor: theme.surface }]}>
        {([['PENDING', stats.pending, theme.warning], ['APPROVED', stats.approved, theme.success], ['REJECTED', stats.rejected, theme.error]] as [TabType, number, string][]).map(([tab, count, color]) => (
          <TouchableOpacity key={tab} style={[styles.statTab, activeTab === tab && { borderBottomColor: color, borderBottomWidth: 2 }]} onPress={() => setActiveTab(tab)}>
            <ThemedText style={[styles.statLabel, { color: activeTab === tab ? color : theme.textTertiary }]}>{tab}</ThemedText>
            <ThemedText style={[styles.statCount, { color: activeTab === tab ? theme.text : theme.textSecondary }]}>{count}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      <TopRefreshControl refreshing={refreshing} onRefresh={onRefresh} color={theme.primary}>
        <ScreenContentContainer style={{ flex: 1 }}>
          {(loading || refreshing) ? (
            <SkeletonList count={5} />
          ) : (
            <VerticalFlatList
              style={styles.list}
              contentContainerStyle={styles.listContent}
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
                    style={[styles.card, { backgroundColor: theme.cardBackground || theme.surface, borderColor: theme.border }]}
                    onPress={() => { setSelectedVisitor(req); setShowDetailModal(true); }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.cardTop}>
                      <View style={[styles.cardAvatar, { backgroundColor: theme.surfaceHighlight }]}>
                        <ThemedText style={[styles.cardAvatarText, { color: theme.textSecondary }]}>{getInitials(req.requesterName || req.name || 'VR')}</ThemedText>
                      </View>
                      <View style={styles.cardMeta}>
                        <View style={styles.nameRow}>
                          <ThemedText style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>{req.requesterName || req.name || 'Visitor'}</ThemedText>
                          <View style={[styles.typePill, { backgroundColor: theme.surfaceHighlight }]}>
                            <ThemedText style={[styles.typePillText, { color: theme.textSecondary }]}>Visitor</ThemedText>
                          </View>
                        </View>
                        <ThemedText style={[styles.cardSub, { color: theme.textSecondary }]} numberOfLines={1}>
                          {req.visitorEmail || req.email || ''}{req.visitorPhone ? ` • ${req.visitorPhone}` : ''}
                        </ThemedText>
                      </View>
                      <ThemedText style={[styles.timeAgo, { color: theme.textTertiary }]}>{getRelativeTime(req.createdAt)}</ThemedText>
                    </View>

                    <View style={[styles.detailsBlock, { backgroundColor: theme.inputBackground || theme.background }]}>
                      {req.purpose && <View style={styles.detailRow}><Ionicons name="document-text-outline" size={14} color={theme.textTertiary} /><ThemedText style={[styles.detailText, { color: theme.text }]} numberOfLines={1}>{req.purpose}</ThemedText></View>}
                      {req.visitDate && <View style={styles.detailRow}><Ionicons name="calendar-outline" size={14} color={theme.textTertiary} /><ThemedText style={[styles.detailText, { color: theme.text }]}>{req.visitDate}{req.visitTime ? ` at ${req.visitTime}` : ''}</ThemedText></View>}
                    </View>

                    {isPending ? (
                      <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.rejectBtn, { borderColor: theme.error }]} onPress={() => handleReject(req)} disabled={isProcessing} activeOpacity={0.8}>
                          {isProcessing ? <ActivityIndicator size="small" color={theme.error} /> : <><Ionicons name="close-outline" size={16} color={theme.error} /><ThemedText style={[styles.rejectBtnText, { color: theme.error }]}>Reject</ThemedText></>}
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.approveBtn, { backgroundColor: theme.success }]} onPress={() => handleApprove(req)} disabled={isProcessing} activeOpacity={0.8}>
                          {isProcessing ? <ActivityIndicator size="small" color="#FFF" /> : <><Ionicons name="checkmark-outline" size={16} color="#FFF" /><ThemedText style={styles.approveBtnText}>Approve</ThemedText></>}
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.statusRow}>
                        <View style={[styles.statusBadge, { backgroundColor: req.status === 'APPROVED' ? theme.success + '20' : theme.error + '20' }]}>
                          <View style={[styles.statusDot, { backgroundColor: req.status === 'APPROVED' ? theme.success : theme.error }]} />
                          <ThemedText style={[styles.statusText, { color: req.status === 'APPROVED' ? theme.success : theme.error }]}>{req.status}</ThemedText>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={56} color={theme.border} />
                  <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>No {activeTab.toLowerCase()} visitor requests</ThemedText>
                </View>
              }
            />
          )}
        </ScreenContentContainer>
      </TopRefreshControl>

      {/* Bottom Nav */}
      <View style={[styles.bottomNav, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        {([
          { key: 'HOME',      icon: 'home',           label: 'Home',      action: () => setBottomTab('HOME') },
          { key: 'NEW_PASS',  icon: 'add-circle',     label: 'New Pass',  action: () => { setBottomTab('NEW_PASS'); setShowPassSheet(true); } },
          ...(isPrincipalOrDirector ? [{ key: 'EXITS', icon: 'log-out', label: 'Exits', action: () => { setBottomTab('MY_PASSES' as any); onNavigate('NCI_EXITS'); } }] : []),
          { key: 'MY_PASSES', icon: 'document-text',  label: 'My Passes', action: () => { setBottomTab('MY_PASSES'); onNavigate('NCI_MY_REQUESTS'); } },
          { key: 'PROFILE',   icon: 'person',         label: 'Profile',   action: () => { setBottomTab('PROFILE'); onNavigate('PROFILE'); } },
        ] as { key: string; icon: string; label: string; action: () => void }[]).map(({ key, icon, label, action }) => {
          const active = bottomTab === key;
          const isAdd = key === 'NEW_PASS';
          return (
            <TouchableOpacity key={key} style={styles.navItem} onPress={action}>
              <Ionicons name={isAdd ? icon : (active ? icon : `${icon}-outline`)} size={isAdd ? 32 : 24} color={active ? theme.primary : theme.textTertiary} />
              <ThemedText style={[styles.navLabel, { color: active ? theme.primary : theme.textTertiary, fontWeight: active ? '700' : '500' }]}>{label}</ThemedText>
              {active && !isAdd && <View style={[styles.activeBar, { backgroundColor: theme.primary }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <PassTypeBottomSheet
        visible={showPassSheet}
        onClose={() => { setShowPassSheet(false); setBottomTab('HOME'); }}
        onSelectSingle={() => { setShowPassSheet(false); onNavigate('NEW_PASS_REQUEST'); }}
        onSelectGuest={() => { setShowPassSheet(false); onNavigate('GUEST_PRE_REQUEST'); }}
      />

      <SuccessModal visible={showSuccess} title="Done" message={modalMsg} onClose={() => setShowSuccess(false)} autoClose autoCloseDelay={2000} />
      <ErrorModal visible={showError} type="general" title="Error" message={modalMsg} onClose={() => setShowError(false)} />

      {/* Detail Bottom Sheet */}
      <Modal visible={showDetailModal} transparent animationType="none" onShow={openDetailSheet} onRequestClose={() => setShowDetailModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDetailModal(false)}>
          <Animated.View style={[styles.detailSheet, { backgroundColor: theme.surface, transform: [{ translateY: detailSheetY }] }]} {...detailPanHandlers}>
            <View style={styles.dragHandle}><View style={[styles.dragBar, { backgroundColor: theme.border }]} /></View>
            <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
              {selectedVisitor && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
                  <View style={[styles.detailHeader, { borderBottomColor: theme.border }]}>
                    <ThemedText style={[styles.detailTitle, { color: theme.text }]}>Visitor Request</ThemedText>
                    <TouchableOpacity onPress={() => setShowDetailModal(false)} style={[styles.closeBtn, { backgroundColor: theme.surfaceHighlight }]}>
                      <Ionicons name="close" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.detailCard, { backgroundColor: theme.surfaceHighlight }]}>
                    <View style={[styles.detailAvatar, { backgroundColor: theme.primary }]}>
                      <ThemedText style={styles.detailAvatarText}>{getInitials(selectedVisitor.requesterName || selectedVisitor.name || 'VR')}</ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.detailName, { color: theme.text }]}>{selectedVisitor.requesterName || selectedVisitor.name || 'Visitor'}</ThemedText>
                      {selectedVisitor.visitorEmail && <ThemedText style={[styles.detailSub, { color: theme.textSecondary }]}>{selectedVisitor.visitorEmail}</ThemedText>}
                      {selectedVisitor.visitorPhone && <ThemedText style={[styles.detailSub, { color: theme.textSecondary }]}>{selectedVisitor.visitorPhone}</ThemedText>}
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: selectedVisitor.status === 'APPROVED' ? theme.success + '20' : selectedVisitor.status === 'REJECTED' ? theme.error + '20' : theme.warning + '20' }]}>
                      <ThemedText style={[styles.statusPillText, { color: selectedVisitor.status === 'APPROVED' ? theme.success : selectedVisitor.status === 'REJECTED' ? theme.error : theme.warning }]}>{selectedVisitor.status}</ThemedText>
                    </View>
                  </View>
                  {[
                    { icon: 'document-text-outline', label: 'Purpose', value: selectedVisitor.purpose },
                    { icon: 'calendar-outline', label: 'Visit Date', value: selectedVisitor.visitDate ? `${selectedVisitor.visitDate}${selectedVisitor.visitTime ? ` at ${selectedVisitor.visitTime}` : ''}` : null },
                    { icon: 'people-outline', label: 'Number of People', value: selectedVisitor.numberOfPeople ? String(selectedVisitor.numberOfPeople) : null },
                    { icon: 'person-outline', label: 'Person to Meet', value: selectedVisitor.personToMeet },
                    { icon: 'business-outline', label: 'Department', value: selectedVisitor.department },
                    { icon: 'time-outline', label: 'Requested', value: formatDateShort(selectedVisitor.createdAt) },
                  ].filter(r => r.value).map((row, i) => (
                    <View key={i} style={[styles.detailRow2, { borderBottomColor: theme.border }]}>
                      <Ionicons name={row.icon as any} size={16} color={theme.textTertiary} />
                      <View style={{ flex: 1 }}>
                        <ThemedText style={[styles.detailRowLabel, { color: theme.textTertiary }]}>{row.label}</ThemedText>
                        <ThemedText style={[styles.detailRowValue, { color: theme.text }]}>{row.value}</ThemedText>
                      </View>
                    </View>
                  ))}
                  {selectedVisitor.status === 'PENDING' && (
                    <View style={styles.detailActions}>
                      <TouchableOpacity style={[styles.rejectBtn, { borderColor: theme.error, flex: 1 }]} onPress={() => { setShowDetailModal(false); handleReject(selectedVisitor); }} activeOpacity={0.8}>
                        <Ionicons name="close-outline" size={16} color={theme.error} />
                        <ThemedText style={[styles.rejectBtnText, { color: theme.error }]}>Reject</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.approveBtn, { backgroundColor: theme.success, flex: 1 }]} onPress={() => { setShowDetailModal(false); handleApprove(selectedVisitor); }} activeOpacity={0.8}>
                        <Ionicons name="checkmark-outline" size={16} color="#FFF" />
                        <ThemedText style={styles.approveBtnText}>Approve</ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
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
  iconButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  notifBadge: { position: 'absolute', top: 4, right: 4, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  notifBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 0 },
  statTab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  statLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  statCount: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100, gap: 12 },
  card: { borderRadius: 16, padding: 14, borderWidth: 1, elevation: 1, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardAvatarText: { fontSize: 14, fontWeight: '800' },
  cardMeta: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cardName: { fontSize: 14, fontWeight: '700' },
  typePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  typePillText: { fontSize: 11, fontWeight: '600' },
  cardSub: { fontSize: 12, marginTop: 2 },
  timeAgo: { fontSize: 12 },
  detailsBlock: { borderRadius: 10, padding: 10, gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, flex: 1 },
  actionRow: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  rejectBtnText: { fontSize: 13, fontWeight: '700' },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10 },
  approveBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  statusRow: { flexDirection: 'row' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600' },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, borderTopWidth: 1, elevation: 8 },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 4, position: 'relative' },
  navLabel: { fontSize: 11, marginTop: 4 },
  activeBar: { position: 'absolute', bottom: 0, width: 32, height: 3, borderRadius: 2 },
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
});

export default NCIDashboard;
