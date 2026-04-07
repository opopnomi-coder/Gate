import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, StatusBar,
  Image, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NonTeachingFaculty, ScreenName } from '../../types';
import { apiService } from '../../services/api.service';
import { useNotifications } from '../../context/NotificationContext';
import { useRefresh } from '../../context/RefreshContext';
import { useProfile } from '../../context/ProfileContext';
import { useTheme } from '../../context/ThemeContext';
import { getRelativeTime } from '../../utils/dateUtils';
import ConfirmationModal from '../../components/ConfirmationModal';
import ErrorModal from '../../components/ErrorModal';
import SuccessModal from '../../components/SuccessModal';
import ScreenContentContainer from '../../components/ScreenContentContainer';
import ThemedText from '../../components/ThemedText';
import TopRefreshControl from '../../components/TopRefreshControl';

interface NCIDashboardProps {
  nci: NonTeachingFaculty;
  onLogout: () => void;
  onNavigate: (screen: ScreenName) => void;
}

const NCIDashboard: React.FC<NCIDashboardProps> = ({ nci, onLogout, onNavigate }) => {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [visitorRequests, setVisitorRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bottomTab, setBottomTab] = useState<'HOME' | 'REQUESTS' | 'EXITS' | 'GUEST' | 'PROFILE'>('HOME');
  const [processing, setProcessing] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [modalMsg, setModalMsg] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { unreadCount, loadNotifications } = useNotifications();
  const { refreshCount } = useRefresh();
  const { profileImage } = useProfile();

  const isPrincipalOrDirector = (() => {
    const r = ((nci as any).role || nci.designation || '').toUpperCase();
    return r.includes('PRINCIPAL') || r.includes('DIRECTOR');
  })();

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'GOOD MORNING,';
    if (h < 17) return 'GOOD AFTERNOON,';
    return 'GOOD EVENING,';
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  useEffect(() => {
    loadData();
    loadNotifications(nci.staffCode, 'staff');
  }, []);

  useEffect(() => { if (refreshCount > 0) loadData(); }, [refreshCount]);

  const loadData = async () => {
    try {
      const res = await apiService.getVisitorRequestsForStaff(nci.staffCode);
      const all: any[] = res.requests || [];
      // Only show visitors from the website (registered_by starts with 'WEB-' or equals 'WEBSITE')
      const websiteOnly = all.filter((r: any) => {
        const rb = (r.registeredBy || r.registered_by || '').toString();
        return rb === 'WEBSITE' || rb.toUpperCase().startsWith('WEB-');
      });
      const sorted = websiteOnly.sort((a, b) => {
        if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
        if (b.status === 'PENDING' && a.status !== 'PENDING') return 1;
        return new Date(b.createdAt || b.requestDate || 0).getTime() - new Date(a.createdAt || a.requestDate || 0).getTime();
      });
      setVisitorRequests(sorted);
    } catch (e) {
      console.error('NCI visitor load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleApprove = async (req: any) => {
    const id = req.requestId || req.id;
    setProcessing(id);
    try {
      const res = await apiService.approveVisitorRequest(id, nci.staffCode);
      if (res.success) {
        setModalMsg('Visitor request approved.');
        setShowSuccess(true);
        loadData();
      } else {
        setModalMsg(res.message || 'Failed to approve.');
        setShowError(true);
      }
    } catch (e: any) {
      setModalMsg(e.message || 'Error occurred.');
      setShowError(true);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (req: any) => {
    const id = req.requestId || req.id;
    setProcessing(id);
    try {
      const res = await apiService.rejectVisitorRequest(id, 'Rejected by staff');
      if (res.success) {
        setModalMsg('Visitor request rejected.');
        setShowSuccess(true);
        loadData();
      } else {
        setModalMsg(res.message || 'Failed to reject.');
        setShowError(true);
      }
    } catch (e: any) {
      setModalMsg(e.message || 'Error occurred.');
      setShowError(true);
    } finally {
      setProcessing(null);
    }
  };

  const pendingCount = visitorRequests.filter(r => r.status === 'PENDING').length;

  const navItems = isPrincipalOrDirector ? [
    { key: 'HOME',     icon: 'home',           label: 'Home',     screen: undefined },
    { key: 'GUEST',    icon: 'person-add',      label: 'Guest',    screen: 'GUEST_PRE_REQUEST' as ScreenName },
    { key: 'EXITS',    icon: 'log-out',         label: 'Exits',    screen: 'NCI_EXITS' as ScreenName },
    { key: 'REQUESTS', icon: 'document-text',   label: 'My Passes', screen: 'NCI_MY_REQUESTS' as ScreenName },
    { key: 'PROFILE',  icon: 'person',          label: 'Profile',  screen: 'PROFILE' as ScreenName },
  ] : [
    { key: 'HOME',     icon: 'home',           label: 'Home',     screen: undefined },
    { key: 'GUEST',    icon: 'person-add',      label: 'Guest',    screen: 'GUEST_PRE_REQUEST' as ScreenName },
    { key: 'REQUESTS', icon: 'document-text',   label: 'My Passes', screen: 'NCI_MY_REQUESTS' as ScreenName },
    { key: 'PROFILE',  icon: 'person',          label: 'Profile',  screen: 'PROFILE' as ScreenName },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => { setBottomTab('PROFILE'); onNavigate('PROFILE'); }}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <ThemedText style={[styles.avatarText, { color: '#FFFFFF' }]}>{getInitials(nci.staffName || 'ST')}</ThemedText>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <ThemedText style={[styles.greeting, { color: theme.textSecondary }]}>{getGreeting()}</ThemedText>
            <ThemedText style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
              {(nci.staffName || '').toUpperCase()}
            </ThemedText>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.surfaceHighlight }]}
          onPress={() => onNavigate('NOTIFICATIONS')}
        >
          <Ionicons name="notifications-outline" size={24} color={theme.text} />
          {unreadCount > 0 && (
            <View style={[styles.notifBadge, { backgroundColor: theme.error }]}>
              <ThemedText style={styles.notifBadgeText}>{unreadCount}</ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <TopRefreshControl refreshing={refreshing} onRefresh={onRefresh} color={theme.primary}>
        <ScreenContentContainer>
          <View style={styles.staticHeader}>
            {/* Request Gate Pass Card */}
            <TouchableOpacity
              style={[styles.requestCard, { backgroundColor: theme.cardBackground || theme.surface }]}
              onPress={() => onNavigate('NEW_PASS_REQUEST')}
              activeOpacity={0.9}
            >
              <View style={[styles.requestCardTop, { backgroundColor: theme.primary }]}>
                <Ionicons name="shield-checkmark" size={40} color="rgba(255,255,255,0.7)" />
              </View>
              <View style={[styles.requestCardBottom, { backgroundColor: theme.cardBackground || theme.surface }]}>
                <ThemedText style={[styles.requestCardTitle, { color: theme.text }]}>Request Gate Pass</ThemedText>
                <TouchableOpacity style={[styles.applyBtn, { backgroundColor: theme.primary }]} onPress={() => onNavigate('NEW_PASS_REQUEST')}>
                  <ThemedText style={styles.applyBtnText}>Apply Now</ThemedText>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            {/* Visitor Requests Header */}
            <View style={styles.sectionRow}>
              <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>VISITOR REQUESTS</ThemedText>
              {pendingCount > 0 && (
                <View style={[styles.pendingBadge, { backgroundColor: theme.warning }]}>
                  <ThemedText style={styles.pendingBadgeText}>{pendingCount} pending</ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Visitor Requests List */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 20 }} />
            ) : visitorRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={theme.border} />
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>No visitor requests</ThemedText>
              </View>
            ) : (
              visitorRequests.map((req) => {
                const id = req.requestId || req.id;
                const isPending = req.status === 'PENDING';
                const isProcessing = processing === id;
                return (
                  <View key={id} style={[styles.visitorCard, { backgroundColor: theme.cardBackground || theme.surface }]}>
                    {/* Top row */}
                    <View style={styles.cardTop}>
                      <View style={[styles.visitorAvatar, { backgroundColor: theme.surfaceHighlight }]}>
                        <ThemedText style={[styles.visitorAvatarText, { color: theme.textSecondary }]}>
                          {getInitials(req.requesterName || req.visitorName || req.name || 'VR')}
                        </ThemedText>
                      </View>
                      <View style={styles.cardInfo}>
                        <View style={styles.nameRow}>
                          <ThemedText style={[styles.visitorName, { color: theme.text }]} numberOfLines={1}>
                            {req.requesterName || req.visitorName || req.name || 'Visitor'}
                          </ThemedText>
                          <View style={[styles.typePill, { backgroundColor: theme.surfaceHighlight }]}>
                            <ThemedText style={[styles.typePillText, { color: theme.textSecondary }]}>Visitor</ThemedText>
                          </View>
                        </View>
                        <ThemedText style={[styles.visitorSub, { color: theme.textSecondary }]} numberOfLines={1}>
                          {req.visitorEmail || req.email || ''}{req.visitorPhone || req.phone ? ` • ${req.visitorPhone || req.phone}` : ''}
                        </ThemedText>
                      </View>
                      <ThemedText style={[styles.timeAgo, { color: theme.textTertiary }]}>
                        {getRelativeTime(req.createdAt || req.requestDate)}
                      </ThemedText>
                    </View>

                    {/* Details */}
                    <View style={[styles.detailsBlock, { backgroundColor: theme.inputBackground || theme.background }]}>
                      {(req.purpose || req.reason) && (
                        <View style={styles.detailRow}>
                          <Ionicons name="document-text-outline" size={14} color={theme.textTertiary} />
                          <ThemedText style={[styles.detailText, { color: theme.text }]} numberOfLines={2}>
                            {req.purpose || req.reason}
                          </ThemedText>
                        </View>
                      )}
                      {(req.visitDate || req.visitTime) && (
                        <View style={styles.detailRow}>
                          <Ionicons name="calendar-outline" size={14} color={theme.textTertiary} />
                          <ThemedText style={[styles.detailText, { color: theme.text }]}>
                            {req.visitDate}{req.visitTime ? ` at ${req.visitTime}` : ''}
                          </ThemedText>
                        </View>
                      )}
                      {req.numberOfPeople && req.numberOfPeople > 1 && (
                        <View style={styles.detailRow}>
                          <Ionicons name="people-outline" size={14} color={theme.textTertiary} />
                          <ThemedText style={[styles.detailText, { color: theme.text }]}>{req.numberOfPeople} people</ThemedText>
                        </View>
                      )}
                    </View>

                    {/* Status / Actions */}
                    {isPending ? (
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={[styles.rejectBtn, { borderColor: theme.error }]}
                          onPress={() => handleReject(req)}
                          disabled={isProcessing}
                          activeOpacity={0.8}
                        >
                          {isProcessing ? <ActivityIndicator size="small" color={theme.error} /> : (
                            <>
                              <Ionicons name="close-outline" size={16} color={theme.error} />
                              <ThemedText style={[styles.rejectBtnText, { color: theme.error }]}>Reject</ThemedText>
                            </>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.approveBtn, { backgroundColor: theme.success }]}
                          onPress={() => handleApprove(req)}
                          disabled={isProcessing}
                          activeOpacity={0.8}
                        >
                          {isProcessing ? <ActivityIndicator size="small" color="#FFF" /> : (
                            <>
                              <Ionicons name="checkmark-outline" size={16} color="#FFF" />
                              <ThemedText style={styles.approveBtnText}>Approve</ThemedText>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.statusRow}>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: req.status === 'APPROVED' ? theme.success + '20' : theme.error + '20' },
                        ]}>
                          <View style={[styles.statusDot, { backgroundColor: req.status === 'APPROVED' ? theme.success : theme.error }]} />
                          <ThemedText style={[styles.statusText, { color: req.status === 'APPROVED' ? theme.success : theme.error }]}>
                            {req.status}
                          </ThemedText>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </ScreenContentContainer>
      </TopRefreshControl>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        {navItems.map(({ key, icon, label, screen }) => {
          const active = bottomTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={styles.navItem}
              onPress={() => { setBottomTab(key as any); if (screen) onNavigate(screen); }}
            >
              <Ionicons name={active ? icon : `${icon}-outline`} size={24} color={active ? theme.primary : theme.textTertiary} />
              <ThemedText style={[styles.navLabel, { color: active ? theme.primary : theme.textTertiary, fontWeight: active ? '700' : '500' }]}>
                {label}
              </ThemedText>
              {active && <View style={[styles.activeBar, { backgroundColor: theme.primary }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <SuccessModal visible={showSuccess} title="Done" message={modalMsg} onClose={() => setShowSuccess(false)} autoClose autoCloseDelay={2000} />
      <ErrorModal visible={showError} type="general" title="Error" message={modalMsg} onClose={() => setShowError(false)} />
      <ConfirmationModal visible={showLogoutModal} title="Logout" message="Are you sure you want to logout?" onConfirm={onLogout} onCancel={() => setShowLogoutModal(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 52, height: 52, borderRadius: 26 },
  avatarText: { fontSize: 20, fontWeight: '700' },
  headerInfo: { gap: 2, flex: 1 },
  greeting: { fontSize: 12, fontWeight: '500', letterSpacing: 0.5 },
  userName: { fontSize: 20, fontWeight: '700' },
  iconButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  notifBadge: { position: 'absolute', top: 4, right: 4, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  notifBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  staticHeader: { paddingHorizontal: 20, paddingTop: 16 },
  requestCard: { borderRadius: 20, overflow: 'hidden', elevation: 4 },
  requestCardTop: { paddingVertical: 52, alignItems: 'center', justifyContent: 'center' },
  requestCardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18 },
  requestCardTitle: { fontSize: 18, fontWeight: '800' },
  applyBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, marginLeft: 12 },
  applyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 28, paddingBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  pendingBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  pendingBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyState: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  visitorCard: { marginBottom: 12, borderRadius: 16, padding: 14, elevation: 2, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  visitorAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  visitorAvatarText: { fontSize: 14, fontWeight: '800' },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  visitorName: { fontSize: 14, fontWeight: '700' },
  typePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  typePillText: { fontSize: 11, fontWeight: '600' },
  visitorSub: { fontSize: 12, marginTop: 2 },
  timeAgo: { fontSize: 12 },
  detailsBlock: { borderRadius: 10, padding: 10, gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  detailText: { fontSize: 13, flex: 1, lineHeight: 18 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  rejectBtnText: { fontSize: 13, fontWeight: '700' },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10 },
  approveBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  statusRow: { flexDirection: 'row', marginTop: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, borderTopWidth: 1, elevation: 8 },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 4, position: 'relative' },
  navLabel: { fontSize: 11, marginTop: 4 },
  activeBar: { position: 'absolute', bottom: 0, width: 32, height: 3, borderRadius: 2 },
});

export default NCIDashboard;
