import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, StatusBar, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
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

interface NCIDashboardProps {
  nci: NonTeachingFaculty;
  onLogout: () => void;
  onNavigate: (screen: ScreenName) => void;
}

const NCIDashboard: React.FC<NCIDashboardProps> = ({ nci, onLogout, onNavigate }) => {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bottomTab, setBottomTab] = useState<'HOME' | 'REQUESTS' | 'EXITS' | 'GUEST' | 'PROFILE'>('HOME');

  // Principal/Director get the Exits tab; regular non-class-incharges don't
  const isPrincipalOrDirector = (() => {
    const r = ((nci as any).role || nci.designation || '').toUpperCase();
    return r.includes('PRINCIPAL') || r.includes('DIRECTOR');
  })();
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
    loadNotifications(nci.staffCode, 'staff');
  }, []);

  useEffect(() => { if (refreshCount > 0) loadData(); }, [refreshCount]);

  const loadData = async () => {
    try {
      const reqRes = await apiService.getNonClassInchargeOwnRequests(nci.staffCode);
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
      console.error('NCI load error:', e);
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
      const res = await apiService.getGatePassQRCode(req.id, nci.staffCode, true);
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
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => { setBottomTab('PROFILE'); onNavigate('PROFILE'); }}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: '#1E293B' }]}>
              <ThemedText style={styles.avatarText}>{getInitials(nci.staffName || 'ST')}</ThemedText>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <ThemedText style={[styles.greeting, { color: theme.textSecondary }]}>{getGreeting()}</ThemedText>
          <ThemedText style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
            {(nci.staffName || '').toUpperCase()}
          </ThemedText>
        </View>
        <TouchableOpacity
          style={[styles.notifBtn, { backgroundColor: theme.surfaceHighlight }]}
          onPress={() => onNavigate('NOTIFICATIONS')}
        >
          <Ionicons name="notifications-outline" size={22} color={theme.text} />
          {unreadCount > 0 && <View style={[styles.notifDot, { backgroundColor: '#EF4444', borderColor: theme.surface }]} />}
        </TouchableOpacity>
      </View>

      <TopRefreshControl refreshing={refreshing} onRefresh={onRefresh} color={theme.primary}>
        <ScreenContentContainer>
          {/* Request Gate Pass Card */}
          <TouchableOpacity
            style={[styles.gatePassCard, { backgroundColor: theme.surface }]}
            onPress={() => onNavigate('NEW_PASS_REQUEST')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#0F172A', '#1E293B']}
              style={styles.gatePassBanner}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Ionicons name="shield-checkmark" size={56} color="rgba(255,255,255,0.3)" />
            </LinearGradient>
            <View style={styles.gatePassBottom}>
              <View style={styles.gatePassTextWrap}>
                <ThemedText style={[styles.gatePassTitle, { color: theme.text }]}>Request Gate Pass</ThemedText>
              </View>
              <TouchableOpacity style={styles.applyBtn} onPress={() => onNavigate('NEW_PASS_REQUEST')}>
                <ThemedText style={styles.applyBtnText}>Apply Now</ThemedText>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* Recent Requests */}
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>RECENT REQUESTS</ThemedText>

          {loading ? (
            <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 20 }} />
          ) : requests.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
              <Ionicons name="document-outline" size={40} color={theme.border} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>No requests yet</ThemedText>
            </View>
          ) : (
            requests.slice(0, 5).map((req) => (
              <View key={req.id} style={[styles.requestCard, { backgroundColor: theme.surface }]}>
                <View style={styles.requestTop}>
                  <View style={styles.requestInfo}>
                    <ThemedText style={[styles.requestPurpose, { color: theme.text }]} numberOfLines={1}>
                      {req.purpose || 'Gate Pass'}
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
                    style={[styles.viewQRBtn, { backgroundColor: '#0F172A' }]}
                    onPress={() => handleViewQR(req)}
                  >
                    <Ionicons name="qr-code-outline" size={16} color="#FFF" />
                    <ThemedText style={styles.viewQRText}>View QR</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScreenContentContainer>
      </TopRefreshControl>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        {(isPrincipalOrDirector ? [
          { key: 'HOME',     icon: 'home',           label: 'Home',     screen: undefined },
          { key: 'GUEST',    icon: 'person-add',      label: 'Guest',    screen: 'GUEST_PRE_REQUEST' as ScreenName },
          { key: 'EXITS',    icon: 'log-out',         label: 'Exits',    screen: 'NCI_EXITS' as ScreenName },
          { key: 'REQUESTS', icon: 'document-text',   label: 'Requests', screen: 'NCI_MY_REQUESTS' as ScreenName },
          { key: 'PROFILE',  icon: 'person',          label: 'Profile',  screen: 'PROFILE' as ScreenName },
        ] : [
          { key: 'HOME',     icon: 'home',           label: 'Home',     screen: undefined },
          { key: 'GUEST',    icon: 'person-add',      label: 'Guest',    screen: 'GUEST_PRE_REQUEST' as ScreenName },
          { key: 'REQUESTS', icon: 'document-text',   label: 'Requests', screen: 'NCI_MY_REQUESTS' as ScreenName },
          { key: 'PROFILE',  icon: 'person',          label: 'Profile',  screen: 'PROFILE' as ScreenName },
        ]).map(({ key, icon, label, screen }) => {
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
                size={22}
                color={active ? theme.text : theme.textTertiary}
              />
              <ThemedText style={[styles.navLabel, { color: active ? theme.text : theme.textTertiary }]}>
                {label}
              </ThemedText>
              {active && <View style={[styles.activeBar, { backgroundColor: theme.text }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <GatePassQRModal
        visible={showQRModal}
        onClose={() => setShowQRModal(false)}
        qrCodeData={qrCodeData}
        manualCode={manualCode}
        personName={nci.staffName}
        personId={nci.staffCode}
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, elevation: 2 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  avatarText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  headerInfo: { flex: 1 },
  greeting: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  userName: { fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  notifBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, borderWidth: 1.5 },
  gatePassCard: { borderRadius: 16, overflow: 'hidden', elevation: 2 },
  gatePassBanner: { height: 160, alignItems: 'center', justifyContent: 'center' },
  gatePassBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18 },
  gatePassTextWrap: { flex: 1, marginRight: 12 },
  gatePassTitle: { fontSize: 20, fontWeight: '800' },
  applyBtn: { backgroundColor: '#0F172A', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  applyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 4 },
  emptyCard: { borderRadius: 16, padding: 32, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14, fontWeight: '600' },
  requestCard: { borderRadius: 16, padding: 14, elevation: 1, gap: 10 },
  requestTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  requestInfo: { flex: 1, marginRight: 10 },
  requestPurpose: { fontSize: 15, fontWeight: '700' },
  requestDate: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  viewQRBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, alignSelf: 'flex-start' },
  viewQRText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  bottomNav: { flexDirection: 'row', borderTopWidth: 1, paddingBottom: 8, paddingTop: 6 },
  navItem: { flex: 1, alignItems: 'center', gap: 3, position: 'relative', paddingVertical: 4 },
  navLabel: { fontSize: 11, fontWeight: '600' },
  activeBar: { position: 'absolute', bottom: 0, width: 20, height: 3, borderRadius: 2 },
});

export default NCIDashboard;
