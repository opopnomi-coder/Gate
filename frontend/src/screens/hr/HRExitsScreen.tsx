import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Modal, ScrollView,
  ActivityIndicator, StatusBar, BackHandler, Animated,
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
import { VerticalFlatList } from '../../components/navigation/VerticalScrollViews';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import TopRefreshControl from '../../components/TopRefreshControl';

interface HRExitsScreenProps {
  hr: HR;
  onBack: () => void;
}

const getInitials = (name: string) =>
  (name || 'NA').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

const HRExitsScreen: React.FC<HRExitsScreenProps> = ({ hr, onBack }) => {
  const { theme } = useTheme();
  const [gateLogs, setGateLogs] = useState<any[]>([]);
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
  const [rangeLabel, setRangeLabel] = useState("Today's gate logs");

  useEffect(() => {
    loadGateLogs();
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, []);

  const loadGateLogs = async (rangeFrom?: string, rangeTo?: string) => {
    try {
      const response = await apiService.getGateLogs(rangeFrom, rangeTo);
      if (response.success) setGateLogs(response.logs || []);
    } catch (e) {
      console.error('Error loading gate logs:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    console.log('🔄 [REFRESH] HR/Exits'); setRefreshing(true); loadGateLogs(fromDate || undefined, toDate || undefined); };

  const exportPdf = async () => {
    if (gateLogs.length === 0) {
      setModalMsg('No records to download. Please select a date range with records first.');
      setShowError(true);
      return;
    }
    setIsDownloading(true);
    const filename = `Gate_Logs_${new Date().toISOString().slice(0, 10)}`;
    try {
      const result = await notificationService.generatePdfReport({
        title: 'Staff & Student Gate Log Report',
        subtitle: rangeLabel,
        sectionHeading: 'Entry & Exit records',
        brandFooterLine: 'RIT Gate Management System',
        filename,
        columns: [
          { key: 'scanType', label: 'TYPE' },
          { key: 'userType', label: 'ROLE' },
          { key: 'userId', label: 'ID' },
          { key: 'name', label: 'NAME' },
          { key: 'department', label: 'DEPARTMENT' },
          { key: 'purpose', label: 'PURPOSE' },
          { key: 'time', label: 'TIME' },
        ],
        rows: gateLogs.map((r: any) => ({
          scanType: r.scanType || '-',
          userType: r.userType || '-',
          userId: r.userId || '-',
          name: r.name || '-',
          department: r.department || '-',
          purpose: r.purpose || '-',
          time: formatDateShort(r.time),
        })),
      });
      if (result.success) {
        setModalMsg('PDF saved to Downloads.');
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

  const isEntry = (item: any) => item.scanType === 'ENTRY';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.surfaceHighlight }]} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>Gate Logs</ThemedText>
        <View style={{ width: 40 }} />
      </View>
      <TopRefreshControl refreshing={refreshing} onRefresh={onRefresh} color={theme.primary} pullEnabled={true}>

      <ScreenContentContainer style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
            {rangeLabel} — {loading ? 'Loading…' : `${gateLogs.length} record${gateLogs.length !== 1 ? 's' : ''}`}
          </ThemedText>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary }]} onPress={() => setRangeModalVisible(true)}>
              <Ionicons name="calendar-outline" size={16} color="#fff" />
              <ThemedText style={[styles.actionBtnText, { color: '#FFF' }]}>Date Range</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: gateLogs.length > 0 ? theme.success : theme.border }]}
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
          data={gateLogs}
          keyExtractor={(item) => `log-${item.id}`}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          decelerationRate="normal"
          renderItem={({ item }) => {
            const entry = isEntry(item);
            const badgeColor = entry ? theme.success : theme.error;
            return (
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, marginHorizontal: 4 }]}>
                <View style={styles.cardTop}>
                  <View style={[styles.avatar, { backgroundColor: badgeColor + '18' }]}>
                    <ThemedText style={[styles.avatarText, { color: badgeColor }]}>{getInitials(item.name || item.userId)}</ThemedText>
                  </View>
                  <View style={styles.cardInfo}>
                    <ThemedText style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>{item.name || item.userId || 'Unknown'}</ThemedText>
                    <ThemedText style={[styles.cardSub, { color: theme.textSecondary }]} numberOfLines={1}>
                      {item.userId}{item.department ? ` • ${item.department}` : ''}
                    </ThemedText>
                  </View>
                  <View style={[styles.badge, { backgroundColor: badgeColor + '15' }]}>
                    <ThemedText style={[styles.badgeText, { color: badgeColor }]}>{item.scanType || '-'}</ThemedText>
                  </View>
                </View>
                <View style={[styles.cardDetails, { backgroundColor: theme.inputBackground }]}>
                  {item.purpose && item.purpose !== '-' ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="document-text-outline" size={13} color={theme.textTertiary} />
                      <ThemedText style={[styles.detailText, { color: theme.text }]} numberOfLines={1}>{item.purpose}</ThemedText>
                    </View>
                  ) : null}
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={13} color={badgeColor} />
                    <ThemedText style={[styles.detailText, { color: badgeColor }]}>{formatDateShort(item.time)}</ThemedText>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyCard}>
                <View style={[styles.emptyIconWrap, { backgroundColor: theme.border + '40' }]}>
                  <Ionicons name="swap-vertical-outline" size={40} color={theme.textTertiary} />
                </View>
                <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>No gate log records</ThemedText>
                <ThemedText style={[styles.emptySub, { color: theme.textSecondary }]}>
                  No entry or exit records found for the selected period.{'\n'}Use Date Range to filter by a specific date.
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
      </TopRefreshControl>
      {/* Date Range Picker — full screen Skyscanner style */}
      {rangeModalVisible && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#ffffff', zIndex: 999 }]}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#ffffff' }}>
              <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }} onPress={() => setRangeModalVisible(false)}>
                <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
              </TouchableOpacity>
              <ThemedText style={{ fontSize: 17, fontWeight: '700', color: '#1a1a1a' }}>Select dates</ThemedText>
              <View style={{ width: 36 }} />
            </View>
            <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 4, borderRadius: 14, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' }}>
              <TouchableOpacity style={[{ flex: 1, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' }, selectingDateType === 'FROM' && { backgroundColor: '#EFF6FF' }]} onPress={() => setSelectingDateType('FROM')}>
                <ThemedText style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: '#9CA3AF', marginBottom: 2 }}>FROM</ThemedText>
                <ThemedText style={{ fontSize: 14, fontWeight: '700', color: selectingDateType === 'FROM' ? theme.primary : '#1a1a1a' }}>{fromDate || '—'}</ThemedText>
              </TouchableOpacity>
              <View style={{ width: 1, backgroundColor: '#E5E7EB', marginVertical: 8 }} />
              <TouchableOpacity style={[{ flex: 1, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' }, selectingDateType === 'TO' && { backgroundColor: '#EFF6FF' }]} onPress={() => setSelectingDateType('TO')}>
                <ThemedText style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: '#9CA3AF', marginBottom: 2 }}>TO</ThemedText>
                <ThemedText style={{ fontSize: 14, fontWeight: '700', color: selectingDateType === 'TO' ? theme.primary : '#1a1a1a' }}>{toDate || '—'}</ThemedText>
              </TouchableOpacity>
            </View>
            <ThemedText style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 8, marginBottom: 4 }}>
              {selectingDateType === 'FROM' ? 'Tap a start date' : 'Tap an end date'}
            </ThemedText>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
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
                markedDates={(() => {
                  const marks: Record<string, any> = {};
                  if (!fromDate) return marks;
                  if (!toDate || fromDate === toDate) {
                    marks[fromDate] = { startingDay: true, endingDay: true, color: theme.primary, textColor: '#fff' };
                  } else {
                    marks[fromDate] = { startingDay: true, color: theme.primary, textColor: '#fff' };
                    marks[toDate] = { endingDay: true, color: theme.primary, textColor: '#fff' };
                    const cur = new Date(fromDate + 'T00:00:00');
                    cur.setDate(cur.getDate() + 1);
                    const end = new Date(toDate + 'T00:00:00');
                    while (cur < end) {
                      const y = cur.getFullYear();
                      const m = String(cur.getMonth() + 1).padStart(2, '0');
                      const day2 = String(cur.getDate()).padStart(2, '0');
                      marks[`${y}-${m}-${day2}`] = { color: '#E8F4FD', textColor: '#1a1a1a' };
                      cur.setDate(cur.getDate() + 1);
                    }
                  }
                  return marks;
                })()}
                markingType="period"
                theme={{
                  calendarBackground: '#ffffff',
                  textSectionTitleColor: '#9CA3AF',
                  selectedDayBackgroundColor: theme.primary,
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: theme.primary,
                  dayTextColor: '#1a1a1a',
                  textDisabledColor: '#D1D5DB',
                  arrowColor: '#1a1a1a',
                  monthTextColor: '#1a1a1a',
                  textMonthFontSize: 18,
                  textMonthFontWeight: '800',
                  textDayFontSize: 15,
                  textDayFontWeight: '500',
                  textDayHeaderFontSize: 12,
                  textDayHeaderFontWeight: '700',
                }}
              />
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#F3F4F6' }} onPress={() => { setFromDate(''); setToDate(''); setSelectingDateType('FROM'); setRangeLabel("Today's gate logs"); loadGateLogs(); setRangeModalVisible(false); }}>
                <ThemedText style={{ fontSize: 15, fontWeight: '700', color: '#6B7280' }}>Clear</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: fromDate && toDate ? theme.primary : '#D1D5DB' }}
                disabled={!fromDate || !toDate}
                onPress={() => { setRangeModalVisible(false); setRangeLabel(`${fromDate} → ${toDate}`); loadGateLogs(fromDate, toDate); }}
              >
                <ThemedText style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>Apply</ThemedText>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      )}

      <SuccessModal visible={showSuccess} title="Done" message={modalMsg} onClose={() => setShowSuccess(false)} autoClose autoCloseDelay={2500} />
      <ErrorModal visible={showError} type="general" title="Cannot Download" message={modalMsg} onClose={() => setShowError(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  listContent: { padding: 16, paddingBottom: 40 },
  hint: { fontSize: 14, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12 },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  centered: { paddingVertical: 60, alignItems: 'center' },
  emptyCard: { borderRadius: 16, padding: 32, alignItems: 'center', gap: 12, marginTop: 8 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  card: { borderRadius: 14, marginBottom: 12, borderWidth: 1, overflow: 'hidden', elevation: 2 },
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
});

export default HRExitsScreen;
