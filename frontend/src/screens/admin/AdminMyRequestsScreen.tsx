import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NonTeachingFaculty } from '../../types';
import { apiService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import ThemedText from '../../components/ThemedText';
import GatePassQRModal from '../../components/GatePassQRModal';
import SinglePassDetailsModal from '../../components/SinglePassDetailsModal';
import ScreenContentContainer from '../../components/ScreenContentContainer';
import { VerticalFlatList } from '../../components/navigation/VerticalScrollViews';
import TopRefreshControl from '../../components/TopRefreshControl';
import { SkeletonList } from '../../components/SkeletonCard';

interface AdminMyRequestsScreenProps {
  admin: NonTeachingFaculty;
  onBack: () => void;
}

const AdminMyRequestsScreen: React.FC<AdminMyRequestsScreenProps> = ({ admin, onBack }) => {
  const { theme } = useTheme();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await apiService.getStaffOwnGatePassRequests(admin.staffCode);
      const all: any[] = (res as any).requests || (res as any).data || [];
      const now = new Date();
      const filtered = all
        .filter(r => r.status !== 'USED' && r.status !== 'EXITED')
        .filter(r => {
          const d = new Date(r.requestDate || r.createdAt || 0);
          return (
            r.status === 'PENDING' || r.status === 'PENDING_STAFF' ||
            r.status === 'PENDING_HOD' || r.status === 'PENDING_HR' ||
            r.status === 'REJECTED' ||
            (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate())
          );
        })
        .sort((a, b) => new Date(b.requestDate || b.createdAt || 0).getTime() - new Date(a.requestDate || a.createdAt || 0).getTime());
      setRequests(filtered);
    } catch (e) { console.error('Admin my requests error:', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [admin.staffCode]);

  useEffect(() => { fetchRequests(); }, []);
  const onRefresh = () => {
    console.log('🔄 [REFRESH] Admin/MyRequests'); setRefreshing(true); fetchRequests(); };

  const handleViewQR = async (req: any) => {
    if (req.status !== 'APPROVED') return;
    setSelectedRequest(req);
    setQrCode(null); setManualCode(null); setShowQR(true);
    try {
      const res = await apiService.getGatePassQRCode(req.id, admin.staffCode, true);
      if (res.success) { setQrCode(res.qrCode || null); setManualCode(res.manualCode || null); }
    } catch { setShowQR(false); }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'APPROVED') return { text: 'APPROVED', bg: theme.success };
    if (status === 'REJECTED') return { text: 'REJECTED', bg: theme.error };
    return { text: 'PENDING', bg: theme.warning };
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getTimeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const initials = (admin.staffName || admin.name || 'AO').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.surfaceHighlight }]} onPress={onBack}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>My Requests</ThemedText>
          <View style={{ width: 40 }} />
        </View>
        <SkeletonList count={5} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.surfaceHighlight }]} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>My Requests</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <TopRefreshControl refreshing={refreshing} onRefresh={onRefresh} color={theme.primary} pullEnabled={true}>
        <ScreenContentContainer>
          {refreshing ? <SkeletonList count={5} /> : (
            <VerticalFlatList
              style={{ flex: 1 }}
              data={requests}
              keyExtractor={(item, i) => `${item.id}-${i}`}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              decelerationRate="normal"
              renderItem={({ item: req }) => {
                const badge = getStatusBadge(req.status);
                const dateStr = req.requestDate || req.createdAt;
                return (
                  <TouchableOpacity
                    style={[styles.card, { backgroundColor: theme.surface }]}
                    onPress={() => { setSelectedRequest(req); setShowDetail(true); }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.cardTop}>
                      <View style={[styles.avatar, { backgroundColor: theme.warning + '22' }]}>
                        <ThemedText style={[styles.avatarText, { color: theme.warning }]}>{initials}</ThemedText>
                      </View>
                      <View style={styles.cardInfo}>
                        <View style={styles.nameRow}>
                          <ThemedText style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                            {admin.staffName || admin.name}
                          </ThemedText>
                          <View style={[styles.typePill, { backgroundColor: theme.inputBackground }]}>
                            <ThemedText style={[styles.typePillText, { color: theme.textSecondary }]}>Single Pass</ThemedText>
                          </View>
                        </View>
                        <ThemedText style={[styles.sub, { color: theme.textSecondary }]}>Administrative Officer</ThemedText>
                      </View>
                      <ThemedText style={[styles.timeAgo, { color: theme.textTertiary }]}>{getTimeAgo(dateStr)}</ThemedText>
                    </View>
                    <View style={[styles.infoBox, { backgroundColor: theme.inputBackground }]}>
                      <View style={styles.infoRow}>
                        <Ionicons name="document-text-outline" size={15} color={theme.textSecondary} />
                        <ThemedText style={[styles.infoText, { color: theme.text }]} numberOfLines={1}>
                          {req.purpose || req.reason || 'Gate Pass'}
                        </ThemedText>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={15} color={theme.textSecondary} />
                        <ThemedText style={[styles.infoText, { color: theme.text }]}>{formatDate(dateStr)}</ThemedText>
                      </View>
                    </View>
                    <View style={styles.cardBottom}>
                      <View style={[styles.statusTag, { backgroundColor: badge.bg + '22' }]}>
                        <View style={[styles.statusDot, { backgroundColor: badge.bg }]} />
                        <ThemedText style={[styles.statusText, { color: badge.bg }]}>{badge.text}</ThemedText>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="document-text-outline" size={64} color={theme.textTertiary} />
                  <ThemedText style={[styles.emptyText, { color: theme.text }]}>No requests found</ThemedText>
                  <ThemedText style={[styles.emptySub, { color: theme.textSecondary }]}>Your gate pass requests will appear here</ThemedText>
                </View>
              }
            />
          )}
        </ScreenContentContainer>
      </TopRefreshControl>

      <SinglePassDetailsModal
        visible={showDetail}
        onClose={() => setShowDetail(false)}
        request={selectedRequest}
        viewerRole="staff"
        onViewQR={(req) => { setShowDetail(false); handleViewQR(req); }}
        timelineSteps={[]}
      />

      <GatePassQRModal
        visible={showQR}
        onClose={() => setShowQR(false)}
        personName={admin.staffName || admin.name || 'Admin'}
        personId={admin.staffCode}
        qrCodeData={qrCode}
        manualCode={manualCode}
        reason={selectedRequest?.purpose || selectedRequest?.reason}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { fontSize: 17, fontWeight: '700' },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  typePill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typePillText: { fontSize: 10, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 2 },
  timeAgo: { fontSize: 11, flexShrink: 0 },
  infoBox: { borderRadius: 10, padding: 12, gap: 8, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, fontWeight: '500', flex: 1 },
  cardBottom: { flexDirection: 'row', alignItems: 'center' },
  statusTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  empty: { paddingVertical: 80, alignItems: 'center' },
  emptyText: { fontSize: 17, fontWeight: '600', marginTop: 16 },
  emptySub: { fontSize: 13, marginTop: 6 },
});

export default AdminMyRequestsScreen;
