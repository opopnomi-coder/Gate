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
import { formatDateShort } from '../../utils/dateUtils';
import GatePassQRModal from '../../components/GatePassQRModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import ErrorModal from '../../components/ErrorModal';
import ScreenContentContainer from '../../components/ScreenContentContainer';
import ThemedText from '../../components/ThemedText';
import TopRefreshControl from '../../components/TopRefreshControl';

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
  const [bottomTab, setBottomTab] = useState<'HOME' | 'REQUESTS' | 'GUEST' | 'PROFILE'>('HOME');
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { unreadCount, loadNotifications } = useNotifications();
  const { refreshCount } = useRefresh();
  const { profileImage } = useProfile();

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
    loadNotifications(ntf.staffCode, 'staff');
  }, []);

  useEffect(() => { if (refreshCount > 0) loadData(); }, [refreshCount]);

  const loadData = async () => {
    try {
      const reqRes = await apiService.getNTFOwnGatePassRequests(ntf.staffCode);
      const all: any[] = (reqRes as any).requests || reqRes.data || [];
      const isUsed = (r: any) => r.qrUsed === true || r.status === 'USED' || r.status === 'EXITED';
      const isToday = (v?: string) => {
        if (!v) return false;
        const d = new Date(v), n = new Date();
        return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
      };
      const filtered = all
        .filter(r => !isUsed(r))
        .filter(r => ['PENDING', 'PENDING_HR', 'REJECTED', 'APPROVED'].includes(r.status) || isToday(r.requestDate || r.createdAt))
        .sort((a, b) => new Date(b.requestDate || b.createdAt).getTime() - new Date(a.requestDate || a.createdAt).getTime());
      setRequests(filtered);
    } catch (e) {
      console.error('NTF load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleViewQR = async (req: any) => {
    setSelectedRequest(req);
    setQrCodeData(null);
    setManualCode(null);
    setShowQRModal(true);
    try {
      const res = await apiService.getGatePassQRCode(req.id, ntf.staffCode, true);
      if (res.success && res.qrCode) {
        setQrCodeData(res.qrCode);
        if (res.manualCode) setManualCode(res.manualCode);
      } else {
        setShowQRModal(false);
        setErrorMsg(res.message || 'Could not fetch QR code.');
        setShowErrorModal(true);
      }
    } catch {
      setShowQRModal(false);
      setErrorMsg('Failed to load QR code.');
      setShowErrorModal(true);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'APPROVED') return theme.success;
    if (status === 'REJECTED') return theme.error;
    return theme.warning;
  };

  const getStatusLabel = (status: string) => {
    if (status === 'PENDING_HR') return 'PENDING HR';
    if (status === 'APPROVED') return 'APPROVED';
    if (status === 'REJECTED') return 'REJECTED';
    return status;
  };

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
                <ThemedText style={[styles.avatarText, { color: '#FFFFFF' }]}>{getInitials(ntf.staffName || 'NF')}</ThemedText>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <ThemedText style={[styles.greeting, { color: theme.textSecondary }]}>{getGreeting()}</ThemedText>
            <ThemedText style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
              {(ntf.staffName || '').toUpperCase()}
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
          {/* Request Gate Pass Card */}
          <View style={styles.staticHeader}>
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
                <TouchableOpacity
                  style={[styles.applyBtn, { backgroundColor: theme.primary }]}
                  onPress={() => onNavigate('NEW_PASS_REQUEST')}
                >
                  <ThemedText style={styles.applyBtnText}>Apply Now</ThemedText>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>RECENT REQUESTS</ThemedText>
            </View>
          </View>

          {/* Recent Requests */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 20 }} />
            ) : requests.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={theme.border} />
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>No recent requests</ThemedText>
              </View>
            ) : (
              requests.slice(0, 10).map((req) => (
                <TouchableOpacity
                  key={req.id}
                  style={[styles.requestItem, { backgroundColor: theme.cardBackground || theme.surface }]}
                  onPress={() => req.status === 'APPROVED' && handleViewQR(req)}
                  activeOpacity={0.85}
                >
                  <View style={styles.requestItemTop}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.requestPurpose, { color: theme.text }]} numberOfLines={1}>
                        {req.purpose || 'Gate Pass Request'}
                      </ThemedText>
                      <ThemedText style={[styles.requestDate, { color: theme.textSecondary }]}>
                        {formatDateShort(req.requestDate || req.createdAt)}
                      </ThemedText>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(req.status) }]}>
                      <ThemedText style={styles.statusText}>{getStatusLabel(req.status)}</ThemedText>
                    </View>
                  </View>
                  {req.status === 'APPROVED' && (
                    <TouchableOpacity
                      style={[styles.viewQRBtn, { backgroundColor: theme.primary }]}
                      onPress={() => handleViewQR(req)}
                    >
                      <Ionicons name="qr-code-outline" size={16} color="#FFF" />
                      <ThemedText style={styles.viewQRText}>View QR</ThemedText>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </ScreenContentContainer>
      </TopRefreshControl>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        {[
          { key: 'HOME',     icon: 'home',           label: 'Home',     screen: undefined },
          { key: 'GUEST',    icon: 'person-add',      label: 'Guest',    screen: 'GUEST_PRE_REQUEST' as ScreenName },
          { key: 'REQUESTS', icon: 'document-text',   label: 'Requests', screen: 'NTF_MY_REQUESTS' as ScreenName },
          { key: 'PROFILE',  icon: 'person',          label: 'Profile',  screen: 'PROFILE' as ScreenName },
        ].map(({ key, icon, label, screen }) => {
          const active = bottomTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={styles.navItem}
              onPress={() => {
                setBottomTab(key as any);
                if (screen) onNavigate(screen);
              }}
            >
              <Ionicons
                name={active ? icon : `${icon}-outline`}
                size={24}
                color={active ? theme.primary : theme.textTertiary}
              />
              <ThemedText style={[styles.navLabel, { color: active ? theme.primary : theme.textTertiary, fontWeight: active ? '700' : '500' }]}>
                {label}
              </ThemedText>
              {active && <View style={[styles.activeBar, { backgroundColor: theme.primary }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <GatePassQRModal
        visible={showQRModal}
        onClose={() => setShowQRModal(false)}
        qrCodeData={qrCodeData}
        manualCode={manualCode}
        personName={ntf.staffName}
        personId={ntf.staffCode}
        reason={selectedRequest?.reason || selectedRequest?.purpose}
      />
      <ErrorModal visible={showErrorModal} title="Error" message={errorMsg} onClose={() => setShowErrorModal(false)} type="general" />
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 52, height: 52, borderRadius: 26 },
  avatarText: { fontSize: 20, fontWeight: '700' },
  headerInfo: { gap: 2, flex: 1 },
  greeting: { fontSize: 12, fontWeight: '500', letterSpacing: 0.5 },
  userName: { fontSize: 20, fontWeight: '700' },
  iconButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  notifBadge: {
    position: 'absolute', top: 4, right: 4, borderRadius: 10,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  notifBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  staticHeader: { paddingHorizontal: 20, paddingTop: 16 },
  requestCard: { borderRadius: 20, overflow: 'hidden', elevation: 4 },
  requestCardTop: { paddingVertical: 52, alignItems: 'center', justifyContent: 'center' },
  requestCardBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 18,
  },
  requestCardTitle: { fontSize: 18, fontWeight: '800' },
  applyBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, marginLeft: 12 },
  applyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  sectionHeader: { paddingTop: 28, paddingBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyState: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  requestItem: { marginBottom: 12, padding: 16, borderRadius: 14, elevation: 2 },
  requestItemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  requestPurpose: { fontSize: 16, fontWeight: '700' },
  requestDate: { fontSize: 13, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  viewQRBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14,
    marginTop: 12, gap: 6, alignSelf: 'flex-start',
  },
  viewQRText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8,
    borderTopWidth: 1, elevation: 8,
  },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 4, position: 'relative' },
  navLabel: { fontSize: 12, marginTop: 4 },
  activeBar: { position: 'absolute', bottom: 0, width: 32, height: 3, borderRadius: 2 },
});

export default NTFDashboard;
