import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, RefreshControl, Modal,
  ActivityIndicator, StatusBar, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { HR } from '../../types';
import { apiService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { notificationService } from '../../services/NotificationService';
import { formatDateShort } from '../../utils/dateUtils';
import ThemedText from '../../components/ThemedText';
import ScreenContentContainer from '../../components/ScreenContentContainer';
import { VerticalFlatList, VerticalScrollView } from '../../components/navigation/VerticalScrollViews';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';

interface HRExitsScreenProps {
  hr: HR;
  onBack: () => void;
}

const getInitials = (name: string) =>
  (name || 'NA').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

const HRExitsScreen: React.FC<HRExitsScreenProps> = ({ hr, onBack }) => {
  const { theme } = useTheme();
  const [exitLogs, setExitLogs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rangeModalVisible, setRangeModalVisible] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectingDateType, setSelectingDateType] = useState<'FROM' | 'TO'>('FROM');
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [modalMsg, setModalMsg] = useState('');
  const [rangeLabel, setRangeLabel] = useState("Today's exits");

  useEffect(() => {
    loadExitLogs();
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, []);

  const loadExitLogs = async (rangeFrom?: string, rangeTo?: string) => {
    try {
      const response = await apiService.getHRExits(rangeFrom, rangeTo);
      if (response.success) setExitLogs(response.exits || []);
    } catch (e) {
      console.error('Error loading HR exits:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadExitLogs(fromDate || undefined, toDate || undefined); };

  const exportPdf = async () => {
    if (exitLogs.length === 0) {
      setModalMsg('No exit records to download. Please select a date range with records first.');
      setShowError(true);
      return;
    }
    setIsDownloading(true);
    const filename = `Exit_Report_${new Date().toISOString().slice(0, 10)}`;
    try {
      const result = await notificationService.generatePdfReport({
        title: 'Staff & Student Exit Report',
        subtitle: rangeLabel,
        sectionHeading: 'Exit records',
        brandFooterLine: 'RIT Gate Management System',
        filename,
        columns: [
          { key: 'userType', label: 'ROLE' },
          { key: 'userId', label: 'ID' },
          { key: 'name', label: 'NAME' },
          { key: 'department', label: 'DEPARTMENT' },
          { key: 'purpose', label: 'PURPOSE' },
          { key: 'exitTime', label: 'EXIT TIME' },
        ],
        rows: exitLogs.map((r: any) => ({
          userType: r.userType || '-',
          userId: r.userId || '-',
          name: r.name || '-',
          department: r.department || '-',
          purpose: r.purpose || '-',
          exitTime: formatDateShort(r.exitTime),
        })),
      });
      if (result.success) {
        setModalMsg('PDF saved to Downloads. Tap the notification to open it.');
        setShowSuccess(true);
      } else {
        setModalMsg(result.message || 'Failed to generate PDF.');
        setShowError(true);
      }
    } catch (e: any) {
      setModalMsg(e?.message || 'Failed to generate PDF.');
      setShowError(true);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />

      {/* Header — same style as GuestPreRequestScreen */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.surfaceHighlight }]} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>Exit Records</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScreenContentContainer style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {/* Hint */}
          <ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
            {rangeLabel} — {loading ? 'Loading…' : `${exitLogs.length} record${exitLogs.length !== 1 ? 's' : ''}`}
          </ThemedText>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary }]} onPress={() => setRangeModalVisible(true)}>
              <Ionicons name="calendar-outline" size={16} color="#fff" />
              <ThemedText style={[styles.actionBtnText, { color: '#FFF' }]}>Date Range</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: exitLogs.length > 0 ? theme.success : theme.border }]}
              onPress={exportPdf}
              disabled={isDownloading}
            >
              {isDownloading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="download-outline" size={16} color="#fff" />}
              <ThemedText style={[styles.actionBtnText, { color: '#FFF' }]}>Download PDF</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <VerticalFlatList
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
          data={exitLogs}
          keyExtractor={(item) => `exit-${item.id}`}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          decelerationRate="normal"
          ListHeaderComponent={null}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, marginHorizontal: 4 }]}>
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { backgroundColor: theme.error + '18' }]}>
                  <ThemedText style={[styles.avatarText, { color: theme.error }]}>{getInitials(item.name || item.userId)}</ThemedText>
                </View>
                <View style={styles.cardInfo}>
                  <ThemedText style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>{item.name || item.userId || 'Unknown'}</ThemedText>
                  <ThemedText style={[styles.cardSub, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.userId}{item.department ? ` • ${item.department}` : ''}
                  </ThemedText>
                </View>
                <View style={[styles.badge, { backgroundColor: theme.error + '15' }]}>
                  <ThemedText style={[styles.badgeText, { color: theme.error }]}>{item.userType || 'EXIT'}</ThemedText>
                </View>
              </View>
              <View style={[styles.cardDetails, { backgroundColor: theme.inputBackground }]}>
                {item.purpose ? (
                  <View style={styles.detailRow}>
                    <Ionicons name="document-text-outline" size={13} color={theme.textTertiary} />
                    <ThemedText style={[styles.detailText, { color: theme.text }]} numberOfLines={1}>{item.purpose}</ThemedText>
                  </View>
                ) : null}
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={13} color={theme.error} />
                  <ThemedText style={[styles.detailText, { color: theme.error }]}>{formatDateShort(item.exitTime)}</ThemedText>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyCard}>
                <View style={[styles.emptyIconWrap, { backgroundColor: theme.border + '40' }]}>
                  <Ionicons name="log-out-outline" size={40} color={theme.textTertiary} />
                </View>
                <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>No exit records</ThemedText>
                <ThemedText style={[styles.emptySub, { color: theme.textSecondary }]}>
                  No exits found for the selected period.{'\n'}Use Date Range to filter by a specific date.
                </ThemedText>
              </View>
            ) : (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            )
          }
        />
      </ScreenContentContainer>

      {/* Date Range Modal */}
      <Modal visible={rangeModalVisible} transparent animationType="slide" onRequestClose={() => setRangeModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setRangeModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()} style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <ThemedText style={[styles.modalTitle, { color: theme.text }]}>Select Date Range</ThemedText>
              <TouchableOpacity onPress={() => setRangeModalVisible(false)} style={[styles.closeBtn, { backgroundColor: theme.inputBackground }]}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.pillRow}>
              {(['FROM', 'TO'] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.pill, { backgroundColor: selectingDateType === type ? theme.primary : theme.inputBackground, borderColor: selectingDateType === type ? theme.primary : theme.border }]}
                  onPress={() => setSelectingDateType(type)}
                >
                  <Ionicons name="calendar-outline" size={13} color={selectingDateType === type ? '#fff' : theme.textSecondary} />
                  <ThemedText style={[styles.pillLabel, { color: selectingDateType === type ? '#fff' : theme.textSecondary }]}>{type}</ThemedText>
                  <ThemedText style={[styles.pillValue, { color: selectingDateType === type ? '#fff' : theme.text }]}>
                    {type === 'FROM' ? (fromDate || 'Select') : (toDate || 'Select')}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.calWrap, { borderColor: theme.border }]}>
              <Calendar
                onDayPress={(day) => {
                  const d = day.dateString;
                  if (selectingDateType === 'FROM') {
                    setFromDate(d);
                    setSelectingDateType('TO');
                    if (toDate && toDate < d) setToDate('');
                  } else {
                    if (fromDate && d < fromDate) return;
                    setToDate(d);
                  }
                }}
                minDate={selectingDateType === 'TO' && fromDate ? fromDate : undefined}
                markedDates={{
                  ...(fromDate ? { [fromDate]: { selected: true, selectedColor: theme.primary, startingDay: true } } : {}),
                  ...(toDate ? { [toDate]: { selected: true, selectedColor: theme.primary, endingDay: true } } : {}),
                }}
                markingType={(fromDate && toDate ? 'period' : 'dot') as any}
                theme={{ calendarBackground: theme.surface, selectedDayBackgroundColor: theme.primary, selectedDayTextColor: '#fff', todayTextColor: theme.primary, arrowColor: theme.primary, dayTextColor: theme.text, textDisabledColor: theme.textTertiary, monthTextColor: theme.text }}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.clearBtn, { borderColor: theme.border }]} onPress={() => { setFromDate(''); setToDate(''); setSelectingDateType('FROM'); setRangeLabel("Today's exits"); loadExitLogs(); setRangeModalVisible(false); }}>
                <ThemedText style={[styles.clearBtnText, { color: theme.textSecondary }]}>Reset</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: fromDate && toDate ? theme.primary : theme.border }]}
                disabled={!fromDate || !toDate}
                onPress={() => {
                  setRangeModalVisible(false);
                  setRangeLabel(`${fromDate} → ${toDate}`);
                  loadExitLogs(fromDate, toDate);
                }}
              >
                <ThemedText style={[styles.applyBtnText, { color: '#FFF' }]}>Apply</ThemedText>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <SuccessModal visible={showSuccess} title="Done" message={modalMsg} onClose={() => setShowSuccess(false)} autoClose autoCloseDelay={2500} />
      <ErrorModal visible={showError} type="general" title="Cannot Download" message={modalMsg} onClose={() => setShowError(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  // Header — same as GuestPreRequestScreen
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  listContent: { padding: 16, paddingBottom: 40 },
  hint: { fontSize: 14, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12 },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  centered: { paddingVertical: 60, alignItems: 'center' },
  // Empty state card
  emptyCard: { borderRadius: 16, padding: 32, alignItems: 'center', gap: 12, marginTop: 8 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  // Cards
  card: { borderRadius: 14, marginBottom: 12, borderWidth: 1, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { fontSize: 15, fontWeight: '800' },
  cardInfo: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardSub: { fontSize: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexShrink: 0 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardDetails: { paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, flex: 1 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  pillRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  pill: { flex: 1, flexDirection: 'column', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, gap: 2 },
  pillLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  pillValue: { fontSize: 13, fontWeight: '700' },
  calWrap: { marginHorizontal: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  modalActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14 },
  clearBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  clearBtnText: { fontSize: 15, fontWeight: '700' },
  applyBtn: { flex: 2, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  applyBtnText: { fontSize: 15, fontWeight: '700' },
});

export default HRExitsScreen;
