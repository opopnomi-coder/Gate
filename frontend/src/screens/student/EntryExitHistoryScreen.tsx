import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Student } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { formatDateTime } from '../../utils/dateUtils';
import ThemedText from '../../components/ThemedText';
import ScreenContentContainer from '../../components/ScreenContentContainer';
import { VerticalScrollView } from '../../components/navigation/VerticalScrollViews';


interface EntryExitHistoryScreenProps {
  user: Student;
  navigation?: any;
  onBack?: () => void;
}

interface HistoryEntry {
  id: number;
  type: 'ENTRY' | 'EXIT';
  timestamp: string;
  gate: string;
  purpose?: string;
  isLate?: boolean;
  isGatePass?: boolean;
}

const EntryExitHistoryScreen: React.FC<EntryExitHistoryScreenProps> = ({ user, navigation, onBack }) => {
  const { theme, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleGoBack = () => {
    if (navigation?.goBack) navigation.goBack();
    else if (onBack) onBack();
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const { apiService } = await import('../../services/api');
      const response = await apiService.getUserEntryHistory(user.regNo);
      const historyData = (response as any).history || response || [];

      const transformed: HistoryEntry[] = historyData.map((item: any, index: number) => ({
        id: item.id ?? index,
        type: (item.type || 'ENTRY') as 'ENTRY' | 'EXIT',
        timestamp: item.timestamp || item.exitTime || item.entryTime || new Date().toISOString(),
        gate: item.gate || item.scanLocation || item.location || 'Main Gate',
        purpose: item.purpose || undefined,
        isLate: !!item.lateEntry || item.purpose?.toLowerCase().includes('late'),
        isGatePass: !!item.gatePassId || item.source === 'GATE_PASS',
      }));

      setHistory(transformed);
    } catch (error) {
      console.error('Error loading history:', error);
      setHistory([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
  };

  const formatTime = (timestamp: string) => formatDateTime(timestamp);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleGoBack} style={[styles.backButton, { backgroundColor: theme.surfaceHighlight }]}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>Entry / Exit History</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScreenContentContainer>
      <VerticalScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>Loading history...</ThemedText>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="time-outline" size={64} color={theme.border} />
            <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>No history yet</ThemedText>
            <ThemedText style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              Your campus entry and exit records will appear here
            </ThemedText>
          </View>
        ) : (
          history.map((entry) => (
            <View key={entry.id} style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={[
                styles.typeIcon,
                { backgroundColor: entry.type === 'ENTRY' ? theme.success + '20' : theme.error + '20' }
              ]}>
                <Ionicons
                  name={entry.type === 'ENTRY' ? 'enter-outline' : 'exit-outline'}
                  size={24}
                  color={entry.type === 'ENTRY' ? theme.success : theme.error}
                />
              </View>
              <View style={styles.cardBody}>
                <ThemedText style={[styles.cardTitle, { color: theme.text }]}>
                  {entry.type === 'ENTRY' ? 'Campus Entry' : 'Campus Exit'}
                </ThemedText>
                <ThemedText style={[styles.cardTime, { color: theme.textSecondary }]}>{formatTime(entry.timestamp)}</ThemedText>
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={14} color={theme.textTertiary} />
                  <ThemedText style={[styles.detailText, { color: theme.textTertiary }]}>{entry.gate}</ThemedText>
                </View>
                {entry.purpose ? (
                  <View style={styles.detailRow}>
                    <Ionicons name="document-text-outline" size={14} color={theme.textTertiary} />
                    <ThemedText style={[styles.detailText, { color: theme.textTertiary }]}>{entry.purpose}</ThemedText>
                  </View>
                ) : null}
                {entry.isLate && (
                  <View style={[styles.badge, { backgroundColor: theme.error + '18' }]}>
                    <Ionicons name="time-outline" size={13} color={theme.error} />
                    <ThemedText style={[styles.badgeText, { color: theme.error }]}>Late Arrival</ThemedText>
                  </View>
                )}
                {entry.isGatePass && (
                  <View style={[styles.badge, { backgroundColor: theme.primary + '18' }]}>
                    <Ionicons name="qr-code-outline" size={13} color={theme.primary} />
                    <ThemedText style={[styles.badgeText, { color: theme.primary }]}>Gate Pass</ThemedText>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </VerticalScrollView>
      </ScreenContentContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { flex: 1, padding: 16 },
  centered: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 12, fontSize: 15 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtext: { fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
  card: {
    flexDirection: 'row', borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, gap: 12,
  },
  typeIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardTime: { fontSize: 13, marginBottom: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailText: { fontSize: 13 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    marginTop: 6, alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
});

export default EntryExitHistoryScreen;
