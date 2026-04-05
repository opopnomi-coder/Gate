import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NonTeachingFaculty } from '../../types';
import { apiService } from '../../services/api.service';
import { useTheme } from '../../context/ThemeContext';
import GatePassQRModal from '../../components/GatePassQRModal';
import SinglePassDetailsModal from '../../components/SinglePassDetailsModal';
import ScreenContentContainer from '../../components/ScreenContentContainer';
import ThemedText from '../../components/ThemedText';
import { VerticalFlatList } from '../../components/navigation/VerticalScrollViews';
import { getRelativeTime, formatDateShort } from '../../utils/dateUtils';
import TopRefreshControl from '../../components/TopRefreshControl';
import SkeletonList from '../../components/SkeletonList';

interface NTFMyRequestsScreenProps {
  user: NonTeachingFaculty;
  onBack?: () => void;
}

const NTFMyRequestsScreen: React.FC<NTFMyRequestsScreenProps> = ({ user, onBack }) => {
  const { theme } = useTheme();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string | null>(null);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    try {
      const res = await apiService.getNTFOwnGatePassRequests(user.staffCode);
      const all: any[] = (res as any).requests || res.data || [];
      const isUsed = (r: any) => r.qrUsed === true || r.status === 'USED' || r.status === 'EXITED';
      const filtered = all
        .filter(r => !isUsed(r))
        .sort((a, b) => new Date(b.requestDate || b.createdAt).getTime() - new Date(a.requestDate || a.createdAt).getTime());
      setRequests(filtered);
    } catch (e) {
      console.error('NTF my requests error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchRequests(); };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  const getStatusStyle = (status: string) => {
    if (status === 'APPROVED') return { bg: '#DCFCE7', text: '#16A34A', dot: '#16A34A', label: 'ACTIVE' };
    if (status === 'REJECTED') return { bg: '#FEE2E2', text: '#DC2626', dot: '#DC2626', label: 'REJECTED' };
    return { bg: '#FEF9C3', text: '#CA8A04', dot: '#CA8A04', label: 'PENDING' };
  };

  const handleViewQR = async (req: any) => {
    setSelectedRequest(req);
    setQrCodeData(null);
    setManualCode(null);
    setShowQRModal(true);
    try {
      const res = await apiService.getGatePassQRCode(req.id, user.staffCode, true);
      if (res.success && res.qrCode) {
        setQrCodeData(res.qrCode);
        if (res.manualCode) setManualCode(res.manualCode);
      } else {
        setShowQRModal(false);
      }
    } catch {
      setShowQRModal(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F1F5F9' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#F1F5F9' }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.surface }]} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>My Requests</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <TopRefreshControl refreshing={refreshing} onRefresh={onRefresh} color={theme.primary} pullEnabled={false}>
      <ScreenContentContainer>
        {loading ? (
          <SkeletonList count={5} />
        ) : (
          <VerticalFlatList
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            decelerationRate="normal"
            data={requests}
            keyExtractor={(item) => item.id?.toString()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
            renderItem={({ item: req }) => {
              const st = getStatusStyle(req.status);
              return (
                <TouchableOpacity
                  style={styles.card}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (req.status === 'APPROVED') {
                      handleViewQR(req);
                    } else {
                      setSelectedRequest(req);
                      setShowDetailModal(true);
                    }
                  }}
                >
                  {/* Top row: avatar + name + pass type + time */}
                  <View style={styles.cardTop}>
                    <View style={styles.avatarWrap}>
                      <ThemedText style={styles.avatarText}>{getInitials(user.staffName)}</ThemedText>
                    </View>
                    <View style={styles.cardMeta}>
                      <View style={styles.nameRow}>
                        <ThemedText style={styles.cardName} numberOfLines={1}>{user.staffName.toUpperCase()}</ThemedText>
                        <View style={styles.passTypePill}>
                          <ThemedText style={styles.passTypeText}>Single Gatepass</ThemedText>
                        </View>
                      </View>
                      <ThemedText style={styles.cardDept}>
                        Non-Teaching • {user.department || 'Admin'}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.timeAgo}>{getRelativeTime(req.requestDate || req.createdAt)}</ThemedText>
                  </View>

                  {/* Details block */}
                  <View style={styles.detailsBlock}>
                    <View style={styles.detailRow}>
                      <Ionicons name="document-text-outline" size={15} color="#64748B" />
                      <ThemedText style={styles.detailText}>{req.purpose || req.reason || 'Gate Pass'}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={15} color="#64748B" />
                      <ThemedText style={styles.detailText}>{formatDateShort(req.requestDate || req.createdAt)}</ThemedText>
                    </View>
                  </View>

                  {/* Status */}
                  <View style={styles.cardFooter}>
                    <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                      <View style={[styles.statusDot, { backgroundColor: st.dot }]} />
                      <ThemedText style={[styles.statusText, { color: st.text }]}>{st.label}</ThemedText>
                    </View>
                    {req.status === 'APPROVED' && (
                      <ThemedText style={styles.tapHint}>Tap to view QR</ThemedText>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={56} color="#CBD5E1" />
                <ThemedText style={styles.emptyText}>No requests found</ThemedText>
              </View>
            }
          />
        )}
      </ScreenContentContainer>
      </TopRefreshControl>

      <SinglePassDetailsModal
        visible={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedRequest(null); }}
        request={selectedRequest}
        onApprove={undefined}
        onReject={undefined}
      />

      <GatePassQRModal
        visible={showQRModal}
        onClose={() => setShowQRModal(false)}
        qrCodeData={qrCodeData}
        manualCode={manualCode}
        personName={user.staffName}
        personId={user.staffCode}
        reason={selectedRequest?.reason || selectedRequest?.purpose}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', elevation: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  listContent: { padding: 14, paddingBottom: 24, gap: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, elevation: 1, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatarWrap: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FDE68A', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  cardMeta: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cardName: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  passTypePill: { backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  passTypeText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  cardDept: { fontSize: 12, color: '#64748B', marginTop: 2 },
  timeAgo: { fontSize: 12, color: '#94A3B8' },
  detailsBlock: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, color: '#334155' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  viewQRText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  tapHint: { fontSize: 12, color: '#64748B', fontStyle: 'italic' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#94A3B8' },
});

export default NTFMyRequestsScreen;
