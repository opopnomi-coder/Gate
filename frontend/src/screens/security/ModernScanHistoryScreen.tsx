import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Modal,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SecurityPersonnel, ScreenName } from '../../types';
import { apiService } from '../../services/api';
import SecurityBottomNav from '../../components/SecurityBottomNav';
import { formatDateTime } from '../../utils/dateUtils';
import { notificationService } from '../../services/NotificationService';
import { Calendar } from 'react-native-calendars';
import ScreenContentContainer from '../../components/ScreenContentContainer';
import ThemedText from '../../components/ThemedText';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import { useTheme } from '../../context/ThemeContext';
import { VerticalFlatList, VerticalScrollView } from '../../components/navigation/VerticalScrollViews';
import TopRefreshControl from '../../components/TopRefreshControl';


interface ModernScanHistoryScreenProps {
  security: SecurityPersonnel;
  onBack: () => void;
  onNavigate: (screen: ScreenName) => void;
}

interface ScanRecord {
  id: number;
  name: string;
  type: string;
  purpose: string;
  inTime?: string;
  outTime?: string;
  entryTime?: string;
  exitTime?: string;
  status: string;
  isBulkPass?: boolean;
  incharge?: string;
  subtype?: string;
  participantCount?: string;
  reason?: string;
  participants?: Array<{
    id: string;
    name: string;
    type: string;
    department: string;
  }>;
  regNo?: string;
  department?: string;
}

// Returns "YYYY-MM-DD" in local (IST) time — avoids UTC offset shifting the date
const toLocalDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const ModernScanHistoryScreen: React.FC<ModernScanHistoryScreenProps> = ({
  security,
  onBack,
  onNavigate,
}) => {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'SCANS' | 'VEHICLES'>('SCANS');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ENTRY' | 'EXIT'>('ALL');
  const [vehicleFilter, setVehicleFilter] = useState<'ALL' | 'ENTRY' | 'EXIT'>('ALL');
  const [vehicleRangeMode, setVehicleRangeMode] = useState(false);
  const [vehicleFromDate, setVehicleFromDate] = useState<Date | null>(null);
  const [vehicleToDate, setVehicleToDate] = useState<Date | null>(null);
  const [vehicleRangePickerPage, setVehicleRangePickerPage] = useState(false);
  const [vehicleRangeResultsVisible, setVehicleRangeResultsVisible] = useState(false);
  const [vehicleSelectingDateType, setVehicleSelectingDateType] = useState<'FROM' | 'TO'>('FROM');
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rangePickerPage, setRangePickerPage] = useState(false);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeResultsVisible, setRangeResultsVisible] = useState(false);
  const [selectingDateType, setSelectingDateType] = useState<'FROM' | 'TO'>('FROM');
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);
  const [showDownloadError, setShowDownloadError] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState('');
  const [downloadErrorMessage, setDownloadErrorMessage] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // Load on mount and whenever activeTab changes
    if (activeTab === 'SCANS') {
      loadScanHistory();
    } else {
      loadVehicleHistory();
    }
  }, [activeTab]);

  // Also reload both datasets on initial mount to ensure fresh data
  useEffect(() => {
    loadScanHistory();
    loadVehicleHistory();
  }, []);

  const loadScanHistory = async () => {
    try {
      setLoading(true);
      const response = await apiService.getScanHistory(security.securityId);
      if (response.success && response.data) {
        const mappedData = response.data.map((scan: any) => {
          const inTime = scan.entryTime || scan.inTime;
          const outTime = scan.exitTime || scan.outTime;
          // For exit-only records (RailwayExitLog), backend sets both entryTime and exitTime
          // to the same value with status="EXITED". Distinguish using status field.
          const isExitOnly = scan.status === 'EXITED' && inTime === outTime;
          
          // Normalize name to handle "Visitor-null" or missing names
          let normalizedName = scan.name || scan.fullName || scan.studentName || scan.staffName;
          
          if (!normalizedName || normalizedName === 'Visitor-null' || normalizedName.includes('-null')) {
            normalizedName = scan.type === 'VISITOR' ? 'Visitor' : (normalizedName || 'User');
          }

          return {
            ...scan,
            name: normalizedName,
            inTime: isExitOnly ? undefined : inTime,
            outTime,
          };
        });
        setScans(mappedData);
      }
    } catch (error) {
      console.error('Error loading scan history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadVehicleHistory = async () => {
    try {
      setLoading(true);
      const response = await apiService.getVehicles();
      if (response.success && response.data) {
        setVehicles(response.data);
      }
    } catch (error) {
      console.error('Error loading vehicle history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'SCANS') {
      loadScanHistory();
    } else {
      loadVehicleHistory();
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = searchQuery === '' ||
      vehicle.ownerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.licensePlate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.vehicleType?.toLowerCase().includes(searchQuery.toLowerCase());

    const eventDate = new Date(vehicle.createdAt || '');
    const inRange = (() => {
      if (!vehicleRangeMode) {
        const now = new Date();
        return eventDate.getFullYear() === now.getFullYear()
          && eventDate.getMonth() === now.getMonth()
          && eventDate.getDate() === now.getDate();
      }
      if (!vehicleFromDate && !vehicleToDate) return true;
      const fd = vehicleFromDate ?? new Date('1970-01-01');
      const td = vehicleToDate ?? new Date('2999-12-31');
      const from = new Date(fd.getFullYear(), fd.getMonth(), fd.getDate(), 0, 0, 0, 0);
      const to   = new Date(td.getFullYear(), td.getMonth(), td.getDate(), 23, 59, 59, 999);
      return eventDate >= from && eventDate <= to;
    })();

    const hasExited = vehicle.updatedAt && vehicle.updatedAt !== vehicle.createdAt;
    let matchesFilter = true;
    if (vehicleFilter === 'ENTRY') matchesFilter = !hasExited;
    else if (vehicleFilter === 'EXIT') matchesFilter = !!hasExited;

    return matchesSearch && inRange && matchesFilter;
  });

  const filteredScans = scans.filter(scan => {
    const inRange = (() => {
      const eventDate = new Date(scan.outTime || scan.inTime || scan.entryTime || scan.exitTime || '');
      if (!rangeMode) {
        const now = new Date();
        return eventDate.getFullYear() === now.getFullYear()
          && eventDate.getMonth() === now.getMonth()
          && eventDate.getDate() === now.getDate();
      }
      if (!fromDate && !toDate) return true;
      const fd = fromDate ?? new Date('1970-01-01');
      const td = toDate ?? new Date('2999-12-31');
      const from = new Date(fd.getFullYear(), fd.getMonth(), fd.getDate(), 0, 0, 0, 0);
      const to   = new Date(td.getFullYear(), td.getMonth(), td.getDate(), 23, 59, 59, 999);
      return eventDate >= from && eventDate <= to;
    })();

    const matchesSearch = searchQuery === '' ||
      scan.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scan.type?.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesFilter = true;
    if (activeFilter === 'ENTRY') {
      // Show records that are entries (person is inside / has entered)
      matchesFilter = scan.status === 'ENTERED' || (!scan.outTime && !!scan.inTime);
    } else if (activeFilter === 'EXIT') {
      matchesFilter = scan.status === 'EXITED' || !!scan.outTime;
    }

    return inRange && matchesSearch && matchesFilter;
  });

  const exportScanPdf = async () => {
    setIsDownloading(true);
    const filename = `Scan_History_${rangeMode ? 'Range' : 'Today'}_${new Date().toISOString().slice(0, 10)}`;
    try {
      const result = await notificationService.generatePdfReport({
        title: 'Security Scan History Report',
        subtitle: rangeMode
          ? `From ${fromDate ? fromDate.toLocaleDateString() : '-'} To ${toDate ? toDate.toLocaleDateString() : '-'}`
          : 'Today',
        sectionHeading: 'Scan records',
        brandFooterLine: 'RIT Gate Management System',
        filename,
        columns: [
          { key: 'name', label: 'NAME' },
          { key: 'type', label: 'TYPE' },
          { key: 'purpose', label: 'PURPOSE' },
          { key: 'status', label: 'STATUS' },
          { key: 'time', label: 'TIME' },
        ],
        rows: filteredScans.flatMap((scan) => {
          const base = {
            name: scan.name,
            type: scan.type,
            purpose: scan.purpose || scan.reason || '-',
          };
          const rows = [];
          if (scan.inTime) {
            rows.push({ ...base, status: 'ENTRY', time: formatTime(scan.inTime) });
          }
          if (scan.outTime) {
            rows.push({ ...base, status: 'EXIT', time: formatTime(scan.outTime) });
          }
          if (rows.length === 0) {
            rows.push({ ...base, status: scan.status, time: formatTime(scan.outTime || scan.inTime) });
          }
          return rows;
        }),
      });
      if (result.success) {
        setDownloadMessage('PDF saved to Downloads. Tap the notification to open it.');
        setShowDownloadSuccess(true);
      } else {
        setDownloadErrorMessage(result.message || 'Failed to generate PDF.');
        setShowDownloadError(true);
      }
    } catch (e: any) {
      setDownloadErrorMessage(e?.message || 'Failed to generate PDF.');
      setShowDownloadError(true);
    } finally {
      setIsDownloading(false);
    }
  };

  const applyDateRange = () => {
    if (!fromDate || !toDate) return;
    // Compare by date only (ignore time) to allow same-day selection
    const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
    const to   = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
    if (from > to) return;
    setRangeMode(true);
    setRangePickerPage(false);
    setRangeResultsVisible(true);
  };

  const applyVehicleDateRange = () => {
    if (!vehicleFromDate || !vehicleToDate) return;
    const from = new Date(vehicleFromDate.getFullYear(), vehicleFromDate.getMonth(), vehicleFromDate.getDate());
    const to   = new Date(vehicleToDate.getFullYear(), vehicleToDate.getMonth(), vehicleToDate.getDate());
    if (from > to) return;
    setVehicleRangeMode(true);
    setVehicleRangePickerPage(false);
    setVehicleRangeResultsVisible(true);
  };

  const exportVehiclePdf = async () => {
    setIsDownloading(true);
    const filename = `Vehicle_History_${vehicleRangeMode ? 'Range' : 'Today'}_${new Date().toISOString().slice(0, 10)}`;
    try {
      const result = await notificationService.generatePdfReport({
        title: 'Vehicle History Report',
        subtitle: vehicleRangeMode
          ? `From ${vehicleFromDate?.toLocaleDateString()} To ${vehicleToDate?.toLocaleDateString()}`
          : 'Today',
        sectionHeading: 'Vehicle records',
        brandFooterLine: 'RIT Gate Management System',
        filename,
        columns: [
          { key: 'plate', label: 'PLATE' },
          { key: 'type', label: 'TYPE' },
          { key: 'owner', label: 'OWNER' },
          { key: 'status', label: 'STATUS' },
          { key: 'entryTime', label: 'ENTRY' },
          { key: 'exitTime', label: 'EXIT' },
        ],
        rows: filteredVehicles.flatMap((v) => {
          const hasExited = v.updatedAt && v.updatedAt !== v.createdAt;
          const base = {
            plate: v.licensePlate || '-',
            type: v.vehicleType || '-',
            owner: v.ownerName || '-',
          };
          const rows = [];
          rows.push({ ...base, status: 'ENTRY', entryTime: formatTime(v.createdAt), exitTime: '-' });
          if (hasExited) {
            rows.push({ ...base, status: 'EXIT', entryTime: formatTime(v.createdAt), exitTime: formatTime(v.updatedAt) });
          }
          return rows;
        }),
      });
      if (result.success) {
        setDownloadMessage('PDF saved to Downloads.');
        setShowDownloadSuccess(true);
      } else {
        setDownloadErrorMessage(result.message || 'Failed to generate PDF.');
        setShowDownloadError(true);
      }
    } catch (e: any) {
      setDownloadErrorMessage(e?.message || 'Failed to generate PDF.');
      setShowDownloadError(true);
    } finally {
      setIsDownloading(false);
    }
  };

  const closeRangeResults = () => {
    setRangeResultsVisible(false);
    setRangeMode(false);
  };

  const closeVehicleRangeResults = () => {
    setVehicleRangeResultsVisible(false);
    setVehicleRangeMode(false);
  };

  const getInitials = (name: string) => {
    if (!name) return 'NA';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'N/A';
    try {
      return formatDateTime(timeString);
    } catch (error) {
      return timeString;
    }
  };

  if (vehicleRangeResultsVisible) {
    return (
      <SafeAreaView style={[styles.fsScreen, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <StatusBar barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
        <View style={[styles.fsHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity style={[styles.fsBackBtn, { backgroundColor: theme.surfaceHighlight }]} onPress={closeVehicleRangeResults}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <ThemedText style={[styles.fsHeaderTitle, { color: theme.text }]}>Date range results</ThemedText>
          <View style={[styles.fsStatusPill, { backgroundColor: theme.primary + '20' }]}>
            <ThemedText style={[styles.fsStatusPillText, { color: theme.primary }]}>{filteredVehicles.length}</ThemedText>
          </View>
        </View>
        <ScreenContentContainer style={{ flex: 1 }}>
          <VerticalFlatList
            style={styles.content}
            data={filteredVehicles}
            keyExtractor={(v, index) => `${v.id}-${index}`}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            decelerationRate="normal"
            ListHeaderComponent={
              <View style={styles.rangeResultsTop}>
                <ThemedText style={[styles.rangeResultsSub, { color: theme.textSecondary }]}>
                  {vehicleFromDate?.toLocaleDateString()} — {vehicleToDate?.toLocaleDateString()}
                </ThemedText>
                <TouchableOpacity style={[styles.rangeResultsDownloadBtn, { backgroundColor: theme.primary }]} onPress={exportVehiclePdf}>
                  <Ionicons name="download-outline" size={16} color="#ffffff" />
                  <ThemedText style={[styles.rangeResultsDownloadText, { color: '#ffffff' }]}>Download PDF</ThemedText>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item: vehicle }) => (
              <View style={[styles.scanCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.scanAvatar, { backgroundColor: theme.warning }]}>
                  <Ionicons name="car" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.scanInfo}>
                  <ThemedText style={[styles.scanName, { color: theme.text }]}>{vehicle.licensePlate || 'N/A'}</ThemedText>
                  <ThemedText style={[styles.scanType, { color: theme.textSecondary }]}>{vehicle.vehicleType || 'Unknown'}</ThemedText>
                  <ThemedText style={[styles.scanPurpose, { color: theme.textSecondary }]} numberOfLines={1}>
                    Owner: {vehicle.ownerName || 'N/A'}
                  </ThemedText>
                </View>
                <View style={styles.scanRight}>
                  <View style={[styles.scanStatusBadge, { backgroundColor: (vehicle.updatedAt && vehicle.updatedAt !== vehicle.createdAt) ? theme.error + '15' : theme.success + '15' }]}>
                    <Ionicons name={(vehicle.updatedAt && vehicle.updatedAt !== vehicle.createdAt) ? 'exit-outline' : 'enter-outline'} size={12} color={(vehicle.updatedAt && vehicle.updatedAt !== vehicle.createdAt) ? theme.error : theme.success} />
                    <ThemedText style={[styles.scanStatusText, { color: (vehicle.updatedAt && vehicle.updatedAt !== vehicle.createdAt) ? theme.error : theme.success }]}>
                      {(vehicle.updatedAt && vehicle.updatedAt !== vehicle.createdAt) ? 'EXITED' : 'ENTERED'}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.scanTime, { color: theme.textTertiary }]}>
                    {(vehicle.updatedAt && vehicle.updatedAt !== vehicle.createdAt) ? formatTime(vehicle.updatedAt) : formatTime(vehicle.createdAt)}
                  </ThemedText>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="car-outline" size={64} color={theme.border} />
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>No vehicle records found</ThemedText>
              </View>
            }
          />
        </ScreenContentContainer>
        <SecurityBottomNav activeTab="history" onNavigate={onNavigate} />
        {isDownloading && (
          <View style={styles.downloadingOverlay}>
            <View style={[styles.downloadingBox, { backgroundColor: theme.surface }]}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText style={[styles.downloadingText, { color: theme.text }]}>Generating PDF...</ThemedText>
            </View>
          </View>
        )}
        <SuccessModal visible={showDownloadSuccess} title="Download Complete" message={downloadMessage} onClose={() => setShowDownloadSuccess(false)} autoClose={true} autoCloseDelay={3000} />
        <ErrorModal visible={showDownloadError} type="general" title="Download Failed" message={downloadErrorMessage} onClose={() => setShowDownloadError(false)} />
      </SafeAreaView>
    );
  }

  if (vehicleRangePickerPage) {
    const buildVehicleMarks = () => {
      const marks: Record<string, any> = {};
      if (!vehicleFromDate) return marks;
      const fromKey = toLocalDateKey(vehicleFromDate);
      const toKey = vehicleToDate ? toLocalDateKey(vehicleToDate) : null;
      if (!toKey || fromKey === toKey) {
        marks[fromKey] = { startingDay: true, endingDay: true, color: theme.primary, textColor: '#fff' };
      } else {
        marks[fromKey] = { startingDay: true, color: theme.primary, textColor: '#fff' };
        marks[toKey] = { endingDay: true, color: theme.primary, textColor: '#fff' };
        const cur = new Date(vehicleFromDate);
        cur.setDate(cur.getDate() + 1);
        const end = new Date(vehicleToDate!);
        while (cur < end) {
          marks[toLocalDateKey(cur)] = { color: '#E8F4FD', textColor: '#1a1a1a' };
          cur.setDate(cur.getDate() + 1);
        }
      }
      return marks;
    };
    const vFromLabel = vehicleFromDate
      ? vehicleFromDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : null;
    const vToLabel = vehicleToDate
      ? vehicleToDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : null;
    return (
      <SafeAreaView style={[skStyles.screen, { backgroundColor: '#ffffff' }]} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        {/* Header */}
        <View style={skStyles.header}>
          <TouchableOpacity style={skStyles.backBtn} onPress={() => setVehicleRangePickerPage(false)}>
            <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
          </TouchableOpacity>
          <ThemedText style={skStyles.headerTitle}>Select dates</ThemedText>
          <View style={{ width: 36 }} />
        </View>

        {/* Selected range summary bar */}
        <View style={skStyles.summaryBar}>
          <TouchableOpacity
            style={[skStyles.summaryChip, vehicleSelectingDateType === 'FROM' && skStyles.summaryChipActive]}
            onPress={() => setVehicleSelectingDateType('FROM')}
          >
            <ThemedText style={skStyles.summaryLabel}>FROM</ThemedText>
            <ThemedText style={[skStyles.summaryValue, vehicleSelectingDateType === 'FROM' && { color: theme.primary }]}>
              {vFromLabel ?? '—'}
            </ThemedText>
          </TouchableOpacity>
          <View style={skStyles.summaryDivider} />
          <TouchableOpacity
            style={[skStyles.summaryChip, vehicleSelectingDateType === 'TO' && skStyles.summaryChipActive]}
            onPress={() => setVehicleSelectingDateType('TO')}
          >
            <ThemedText style={skStyles.summaryLabel}>TO</ThemedText>
            <ThemedText style={[skStyles.summaryValue, vehicleSelectingDateType === 'TO' && { color: theme.primary }]}>
              {vToLabel ?? '—'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Instruction */}
        <ThemedText style={skStyles.instruction}>
          {vehicleSelectingDateType === 'FROM' ? 'Tap a start date' : 'Tap an end date'}
        </ThemedText>

        <ScreenContentContainer style={{ flex: 1 }}>
          <VerticalScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
            <Calendar
              onDayPress={(day) => {
                const selected = new Date(`${day.dateString}T00:00:00`);
                if (vehicleSelectingDateType === 'FROM') {
                  setVehicleFromDate(selected);
                  setVehicleSelectingDateType('TO');
                  if (vehicleToDate && vehicleToDate < selected) setVehicleToDate(null);
                } else {
                  if (vehicleFromDate && selected < vehicleFromDate) return;
                  setVehicleToDate(selected);
                }
              }}
              markedDates={buildVehicleMarks()}
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
          </VerticalScrollView>
        </ScreenContentContainer>

        {/* Sticky bottom bar */}
        <View style={skStyles.bottomBar}>
          <TouchableOpacity style={skStyles.clearBtn} onPress={() => {
            setVehicleFromDate(null);
            setVehicleToDate(null);
            setVehicleSelectingDateType('FROM');
          }}>
            <ThemedText style={skStyles.clearBtnText}>Clear</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[skStyles.applyBtn, { backgroundColor: vehicleFromDate && vehicleToDate ? theme.primary : '#D1D5DB' }]}
            disabled={!vehicleFromDate || !vehicleToDate}
            onPress={applyVehicleDateRange}
          >
            <ThemedText style={skStyles.applyBtnText}>Apply</ThemedText>
          </TouchableOpacity>
        </View>
        <SecurityBottomNav activeTab="history" onNavigate={onNavigate} />
      </SafeAreaView>
    );
  }

  if (rangeResultsVisible) {
    return (
      <SafeAreaView style={[styles.fsScreen, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <StatusBar barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
        <View style={[styles.fsHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity style={[styles.fsBackBtn, { backgroundColor: theme.surfaceHighlight }]} onPress={closeRangeResults}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <ThemedText style={[styles.fsHeaderTitle, { color: theme.text }]}>Date range results</ThemedText>
          <View style={[styles.fsStatusPill, { backgroundColor: theme.primary + '20' }]}>
            <ThemedText style={[styles.fsStatusPillText, { color: theme.primary }]}>{filteredScans.length}</ThemedText>
          </View>
        </View>
        <ScreenContentContainer style={{ flex: 1 }}>
          <VerticalFlatList
            style={styles.content}
            data={filteredScans}
            keyExtractor={(scan, index) => `${scan.id}-${index}`}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            decelerationRate="normal"
            ListHeaderComponent={
              <View style={styles.rangeResultsTop}>
                <ThemedText style={[styles.rangeResultsSub, { color: theme.textSecondary }]}>
                  {fromDate?.toLocaleDateString()} — {toDate?.toLocaleDateString()}
                </ThemedText>
                <TouchableOpacity style={[styles.rangeResultsDownloadBtn, { backgroundColor: theme.primary }]} onPress={exportScanPdf}>
                  <Ionicons name="download-outline" size={16} color="#ffffff" />
                  <ThemedText style={[styles.rangeResultsDownloadText, { color: '#ffffff' }]}>Download PDF</ThemedText>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item: scan }) => (
              <View style={[styles.scanCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.scanAvatar, { backgroundColor: theme.primary + '20' }]}>
                  <ThemedText style={[styles.scanAvatarText, { color: theme.primary }]}>{scan.isBulkPass ? 'GP' : getInitials(scan.name)}</ThemedText>
                </View>
                <View style={styles.scanInfo}>
                  <ThemedText style={[styles.scanName, { color: theme.text }]}>{scan.name}</ThemedText>
                  <ThemedText style={[styles.scanType, { color: theme.textSecondary }]}>{scan.type}</ThemedText>
                  <ThemedText style={[styles.scanPurpose, { color: theme.textSecondary }]} numberOfLines={1}>{scan.purpose}</ThemedText>
                </View>
                <View style={styles.scanRight}>
                  <ThemedText style={[styles.scanTime, { color: theme.textTertiary }]}>{formatTime(scan.outTime || scan.inTime)}</ThemedText>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name={activeTab === 'SCANS' ? "time-outline" : "car-outline"} size={64} color={theme.border} />
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>No {activeTab === 'SCANS' ? 'scan' : 'vehicle'} records found</ThemedText>
              </View>
            }
          />
        </ScreenContentContainer>
        <SecurityBottomNav activeTab="history" onNavigate={onNavigate} />
        {isDownloading && (
          <View style={styles.downloadingOverlay}>
            <View style={[styles.downloadingBox, { backgroundColor: theme.surface }]}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText style={[styles.downloadingText, { color: theme.text }]}>Generating PDF...</ThemedText>
            </View>
          </View>
        )}
        <SuccessModal visible={showDownloadSuccess} title="Download Complete" message={downloadMessage} onClose={() => setShowDownloadSuccess(false)} autoClose={true} autoCloseDelay={3000} />
        <ErrorModal visible={showDownloadError} type="general" title="Download Failed" message={downloadErrorMessage} onClose={() => setShowDownloadError(false)} />
      </SafeAreaView>
    );
  }

  if (rangePickerPage) {
    const buildScanMarks = () => {
      const marks: Record<string, any> = {};
      if (!fromDate) return marks;
      const fromKey = toLocalDateKey(fromDate);
      const toKey = toDate ? toLocalDateKey(toDate) : null;
      if (!toKey || fromKey === toKey) {
        marks[fromKey] = { startingDay: true, endingDay: true, color: theme.primary, textColor: '#fff' };
      } else {
        marks[fromKey] = { startingDay: true, color: theme.primary, textColor: '#fff' };
        marks[toKey] = { endingDay: true, color: theme.primary, textColor: '#fff' };
        const cur = new Date(fromDate);
        cur.setDate(cur.getDate() + 1);
        const end = new Date(toDate!);
        while (cur < end) {
          marks[toLocalDateKey(cur)] = { color: '#E8F4FD', textColor: '#1a1a1a' };
          cur.setDate(cur.getDate() + 1);
        }
      }
      return marks;
    };
    const fromLabel = fromDate
      ? fromDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : null;
    const toLabel = toDate
      ? toDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : null;
    return (
      <SafeAreaView style={[skStyles.screen, { backgroundColor: '#ffffff' }]} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        {/* Header */}
        <View style={skStyles.header}>
          <TouchableOpacity style={skStyles.backBtn} onPress={() => setRangePickerPage(false)}>
            <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
          </TouchableOpacity>
          <ThemedText style={skStyles.headerTitle}>Select dates</ThemedText>
          <View style={{ width: 36 }} />
        </View>

        {/* Selected range summary bar */}
        <View style={skStyles.summaryBar}>
          <TouchableOpacity
            style={[skStyles.summaryChip, selectingDateType === 'FROM' && skStyles.summaryChipActive]}
            onPress={() => setSelectingDateType('FROM')}
          >
            <ThemedText style={skStyles.summaryLabel}>FROM</ThemedText>
            <ThemedText style={[skStyles.summaryValue, selectingDateType === 'FROM' && { color: theme.primary }]}>
              {fromLabel ?? '—'}
            </ThemedText>
          </TouchableOpacity>
          <View style={skStyles.summaryDivider} />
          <TouchableOpacity
            style={[skStyles.summaryChip, selectingDateType === 'TO' && skStyles.summaryChipActive]}
            onPress={() => setSelectingDateType('TO')}
          >
            <ThemedText style={skStyles.summaryLabel}>TO</ThemedText>
            <ThemedText style={[skStyles.summaryValue, selectingDateType === 'TO' && { color: theme.primary }]}>
              {toLabel ?? '—'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Instruction */}
        <ThemedText style={skStyles.instruction}>
          {selectingDateType === 'FROM' ? 'Tap a start date' : 'Tap an end date'}
        </ThemedText>

        <ScreenContentContainer style={{ flex: 1 }}>
          <VerticalScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
            <Calendar
              onDayPress={(day) => {
                const selected = new Date(`${day.dateString}T00:00:00`);
                if (selectingDateType === 'FROM') {
                  setFromDate(selected);
                  setSelectingDateType('TO');
                  if (toDate && toDate < selected) setToDate(null);
                } else {
                  if (fromDate && selected < fromDate) return;
                  setToDate(selected);
                }
              }}
              markedDates={buildScanMarks()}
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
          </VerticalScrollView>
        </ScreenContentContainer>

        {/* Sticky bottom bar */}
        <View style={skStyles.bottomBar}>
          <TouchableOpacity style={skStyles.clearBtn} onPress={() => {
            setFromDate(null);
            setToDate(null);
            setSelectingDateType('FROM');
          }}>
            <ThemedText style={skStyles.clearBtnText}>Clear</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[skStyles.applyBtn, { backgroundColor: fromDate && toDate ? theme.primary : '#D1D5DB' }]}
            disabled={!fromDate || !toDate}
            onPress={applyDateRange}
          >
            <ThemedText style={skStyles.applyBtnText}>Apply</ThemedText>
          </TouchableOpacity>
        </View>
        <SecurityBottomNav activeTab="history" onNavigate={onNavigate} />
        <SuccessModal visible={showDownloadSuccess} title="Download Complete" message={downloadMessage} onClose={() => setShowDownloadSuccess(false)} autoClose={true} autoCloseDelay={3000} />
        <ErrorModal visible={showDownloadError} type="general" title="Download Failed" message={downloadErrorMessage} onClose={() => setShowDownloadError(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.surfaceHighlight }]} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>History</ThemedText>
        <View style={styles.headerRight} />
      </View>

      <TopRefreshControl refreshing={refreshing} onRefresh={onRefresh} color={theme.primary} pullEnabled={false}>
      <ScreenContentContainer style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16 }}>
          {/* Main Tab Switcher */}
          <View style={[styles.mainTabContainer, { backgroundColor: theme.surfaceHighlight, marginTop: 10 }]}>
            <TouchableOpacity
              style={[styles.mainTab, activeTab === 'SCANS' && [styles.mainTabActive, { backgroundColor: theme.surface }]]}
              onPress={() => {
                setActiveTab('SCANS');
                setSearchQuery('');
                setActiveFilter('ALL');
              }}
            >
              <Ionicons 
                name="qr-code" 
                size={20} 
                color={activeTab === 'SCANS' ? theme.primary : theme.textTertiary} 
              />
              <ThemedText style={[styles.mainTabText, activeTab === 'SCANS' ? { color: theme.primary, fontWeight: '700' } : { color: theme.textTertiary }]}>
                Scan History
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mainTab, activeTab === 'VEHICLES' && [styles.mainTabActive, { backgroundColor: theme.surface }]]}
              onPress={() => {
                setActiveTab('VEHICLES');
                setSearchQuery('');
                setVehicleFilter('ALL');
              }}
            >
              <Ionicons 
                name="car" 
                size={20} 
                color={activeTab === 'VEHICLES' ? theme.primary : theme.textTertiary} 
              />
              <ThemedText style={[styles.mainTabText, activeTab === 'VEHICLES' ? { color: theme.primary, fontWeight: '700' } : { color: theme.textTertiary }]}>
                Vehicle History
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="search" size={20} color={theme.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder={activeTab === 'SCANS' ? "Search by name or type..." : "Search by owner, plate, or type..."}
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Filter Tabs - Only for Scan History */}
          {activeTab === 'SCANS' && (
            <>
            <View style={styles.rangeActionsRow}>
              <TouchableOpacity style={[styles.rangeActionBtn, { backgroundColor: theme.surface, borderColor: theme.primary + '33' }]} onPress={() => setRangePickerPage(true)}>
                <Ionicons name="calendar-outline" size={16} color={theme.primary} />
                <ThemedText style={[styles.rangeActionText, { color: theme.primary }]}>From / To</ThemedText>
              </TouchableOpacity>
            </View>
            <View style={[styles.filterContainer, { marginBottom: 16 }]}>
              <TouchableOpacity
                style={[styles.filterTab, activeFilter === 'ALL' && styles.filterTabActive]}
                onPress={() => setActiveFilter('ALL')}
              >
                <ThemedText style={[styles.filterText, activeFilter === 'ALL' && styles.filterTextActive]}>
                  All
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, activeFilter === 'ENTRY' && styles.filterTabActive]}
                onPress={() => setActiveFilter('ENTRY')}
              >
                <ThemedText style={[styles.filterText, activeFilter === 'ENTRY' && styles.filterTextActive]}>
                  Entry
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, activeFilter === 'EXIT' && styles.filterTabActive]}
                onPress={() => setActiveFilter('EXIT')}
              >
                <ThemedText style={[styles.filterText, activeFilter === 'EXIT' && styles.filterTextActive]}>
                  Exit
                </ThemedText>
              </TouchableOpacity>
            </View>
            </>
          )}

          {/* Filter Tabs - Vehicle History */}
          {activeTab === 'VEHICLES' && (
            <>
            <View style={styles.rangeActionsRow}>
              <TouchableOpacity style={[styles.rangeActionBtn, { backgroundColor: theme.surface, borderColor: theme.primary + '33' }]} onPress={() => setVehicleRangePickerPage(true)}>
                <Ionicons name="calendar-outline" size={16} color={theme.primary} />
                <ThemedText style={[styles.rangeActionText, { color: theme.primary }]}>From / To</ThemedText>
              </TouchableOpacity>
            </View>
            <View style={[styles.filterContainer, { marginBottom: 16 }]}>
              <TouchableOpacity
                style={[styles.filterTab, vehicleFilter === 'ALL' && styles.filterTabActive]}
                onPress={() => setVehicleFilter('ALL')}
              >
                <ThemedText style={[styles.filterText, vehicleFilter === 'ALL' && styles.filterTextActive]}>
                  All
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, vehicleFilter === 'ENTRY' && styles.filterTabActive]}
                onPress={() => setVehicleFilter('ENTRY')}
              >
                <ThemedText style={[styles.filterText, vehicleFilter === 'ENTRY' && styles.filterTextActive]}>
                  Entry
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, vehicleFilter === 'EXIT' && styles.filterTabActive]}
                onPress={() => setVehicleFilter('EXIT')}
              >
                <ThemedText style={[styles.filterText, vehicleFilter === 'EXIT' && styles.filterTextActive]}>
                  Exit
                </ThemedText>
              </TouchableOpacity>
            </View>
            </>
          )}
        </View>

        <VerticalFlatList
          style={styles.content}
          showsVerticalScrollIndicator={false}
          decelerationRate="normal"
          data={activeTab === 'SCANS' ? filteredScans : filteredVehicles}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
          renderItem={({ item }) => {
            if (activeTab === 'SCANS') {
              const scan = item as ScanRecord;
              return (
                <TouchableOpacity
                  style={[styles.scanCard]}
                  onPress={() => {
                    setSelectedScan(scan);
                    setShowDetailModal(true);
                  }}
                >
                  <View style={styles.scanAvatar}>
                    <ThemedText style={styles.scanAvatarText}>
                      {scan.isBulkPass ? 'GP' : getInitials(scan.name)}
                    </ThemedText>
                  </View>
                  <View style={styles.scanInfo}>
                    {scan.isBulkPass ? (
                      <>
                        <ThemedText style={styles.scanName}>Bulk Pass - {scan.incharge}</ThemedText>
                        <ThemedText style={styles.scanType}>
                          {scan.subtype} • {scan.participantCount} participants
                        </ThemedText>
                        <ThemedText style={styles.scanPurpose} numberOfLines={1}>
                          {scan.purpose || scan.reason}
                        </ThemedText>
                      </>
                    ) : (
                      <>
                        <ThemedText style={styles.scanName}>{scan.name}</ThemedText>
                        <ThemedText style={styles.scanType}>{scan.type}</ThemedText>
                        <ThemedText style={styles.scanPurpose} numberOfLines={1}>
                          {scan.purpose}
                        </ThemedText>
                      </>
                    )}
                  </View>
                  <View style={styles.scanRight}>
                    <View style={[
                      styles.scanStatusBadge,
                      { backgroundColor: (scan.status === 'EXITED' || scan.outTime ? theme.error : theme.success) + '15' }
                    ]}>
                      <Ionicons
                        name={scan.status === 'EXITED' || scan.outTime ? 'log-out' : 'log-in'}
                        size={12}
                        color={scan.status === 'EXITED' || scan.outTime ? theme.error : theme.success}
                      />
                      <ThemedText style={[
                        styles.scanStatusText,
                        { color: scan.status === 'EXITED' || scan.outTime ? theme.error : theme.success }
                      ]}>
                        {scan.status === 'EXITED' || scan.outTime ? 'EXIT' : 'ENTRY'}
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.scanTime, { color: theme.textTertiary }]}>{formatTime(scan.outTime || scan.inTime)}</ThemedText>
                  </View>
                </TouchableOpacity>
              );
            } else {
              const vehicle = item as any;
              return (
                <TouchableOpacity
                  style={[styles.scanCard]}
                  onPress={() => {
                    setSelectedVehicle(vehicle);
                    setShowVehicleModal(true);
                  }}
                >
                  <View style={[styles.scanAvatar, { backgroundColor: theme.warning }]}>
                    <Ionicons name="car" size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.scanInfo}>
                    <ThemedText style={styles.scanName}>{vehicle.licensePlate || 'N/A'}</ThemedText>
                    <ThemedText style={styles.scanType}>{vehicle.vehicleType || 'Unknown Type'}</ThemedText>
                    <ThemedText style={styles.scanPurpose} numberOfLines={1}>
                      Owner: {vehicle.ownerName || 'N/A'}
                    </ThemedText>
                  </View>
                  <View style={styles.scanRight}>
                    <View style={[styles.scanStatusBadge, { backgroundColor: (vehicle.updatedAt && vehicle.updatedAt !== vehicle.createdAt) ? theme.error + '15' : theme.success + '15' }]}>
                      <Ionicons name={(vehicle.updatedAt && vehicle.updatedAt !== vehicle.createdAt) ? "exit-outline" : "enter-outline"} size={12} color={(vehicle.updatedAt && vehicle.updatedAt !== vehicle.createdAt) ? theme.error : theme.success} />
                      <ThemedText style={[styles.scanStatusText, { color: (vehicle.updatedAt && vehicle.updatedAt !== vehicle.createdAt) ? theme.error : theme.success }]}>
                        {(vehicle.updatedAt && vehicle.updatedAt !== vehicle.createdAt) ? 'EXITED' : 'ENTERED'}
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.scanTime, { color: theme.textTertiary }]}>
                      {(vehicle.updatedAt && vehicle.updatedAt !== vehicle.createdAt) ? formatTime(vehicle.updatedAt) : formatTime(vehicle.createdAt)}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              );
            }
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons 
                name={activeTab === 'SCANS' ? "time-outline" : "car-outline"} 
                size={64} 
                color={theme.border} 
              />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                No {activeTab === 'SCANS' ? 'scan' : 'vehicle'} records found
              </ThemedText>
            </View>
          }
        />
      </ScreenContentContainer>
      </TopRefreshControl>

      {/* Scan Detail — full-screen modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={false}
        statusBarTranslucent
        onRequestClose={() => setShowDetailModal(false)}
      >
        <SafeAreaView style={styles.fsScreen} edges={['top', 'bottom']}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

          {/* Header */}
          {selectedScan && (() => {
            const isExited = selectedScan.status === 'EXITED' || !!selectedScan.outTime;
            const statusColor = isExited ? '#EF4444' : '#10B981';
            const statusLabel = isExited ? 'EXITED' : 'ACTIVE';
            return (
              <>
                <View style={[styles.fsHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                  <TouchableOpacity style={[styles.fsBackBtn, { backgroundColor: theme.surfaceHighlight }]} onPress={() => setShowDetailModal(false)}>
                    <Ionicons name="arrow-back" size={22} color={theme.text} />
                  </TouchableOpacity>
                  <ThemedText style={[styles.fsHeaderTitle, { color: theme.text }]}>Scan Details</ThemedText>
                  <View style={[styles.fsStatusPill, { backgroundColor: statusColor }]}>
                    <ThemedText style={[styles.fsStatusPillText, { color: '#FFFFFF' }]}>{statusLabel}</ThemedText>
                  </View>
                </View>

                <VerticalScrollView style={styles.fsScroll} showsVerticalScrollIndicator={false} decelerationRate="normal" contentContainerStyle={styles.fsScrollContent}>
                  {selectedScan.isBulkPass ? (
                    <>
                      {/* Bulk pass profile row */}
                      <View style={[styles.fsProfileRow, { backgroundColor: theme.surface }]}>
                        <View style={[styles.fsAvatar, { backgroundColor: theme.warning }]}>
                          <ThemedText style={styles.fsAvatarText}>GP</ThemedText>
                        </View>
                        <View style={styles.fsProfileInfo}>
                          <ThemedText style={[styles.fsProfileName, { color: theme.text }]}>Bulk Pass</ThemedText>
                          <ThemedText style={[styles.fsProfileSub, { color: theme.textSecondary }]}>
                            {selectedScan.incharge} • {selectedScan.subtype}
                          </ThemedText>
                        </View>
                      </View>

                      {/* Info grid */}
                      <View style={styles.fsInfoGrid}>
                        <View style={styles.fsInfoCell}>
                          <ThemedText style={styles.fsInfoLabel}>PURPOSE</ThemedText>
                          <ThemedText style={styles.fsInfoValue} numberOfLines={2}>{selectedScan.purpose || 'N/A'}</ThemedText>
                        </View>
                        <View style={styles.fsInfoDivider} />
                        <View style={styles.fsInfoCell}>
                          <ThemedText style={styles.fsInfoLabel}>PARTICIPANTS</ThemedText>
                          <ThemedText style={styles.fsInfoValue}>{selectedScan.participantCount || '—'}</ThemedText>
                        </View>
                      </View>

                      {/* Reason */}
                      {!!selectedScan.reason && (
                        <View style={styles.fsBlock}>
                          <ThemedText style={styles.fsBlockLabel}>REASON</ThemedText>
                          <ThemedText style={styles.fsReasonText}>{selectedScan.reason}</ThemedText>
                        </View>
                      )}

                      {/* Time info */}
                      <View style={[styles.fsBlock, { backgroundColor: theme.surface }]}>
                        <ThemedText style={[styles.fsBlockLabel, { color: theme.textTertiary }]}>TIME INFORMATION</ThemedText>
                        <View style={styles.fsTlItem}>
                          <View style={[styles.fsTlDot, { backgroundColor: theme.error }]}>
                            <Ionicons name="log-out" size={14} color="#FFF" />
                          </View>
                          <View style={styles.fsTlBody}>
                            <ThemedText style={[styles.fsTlTitle, { color: theme.text }]}>Exit Time</ThemedText>
                            <ThemedText style={[styles.fsTlSub, { color: theme.textSecondary }]}>{formatTime(selectedScan.inTime || selectedScan.outTime)}</ThemedText>
                          </View>
                        </View>
                      </View>

                      {/* Participants */}
                      {selectedScan.participants && selectedScan.participants.length > 0 && (
                        <View style={styles.fsBlock}>
                          <ThemedText style={styles.fsBlockLabel}>PARTICIPANTS</ThemedText>
                          {selectedScan.participants.map((p, i) => (
                            <View key={i} style={styles.participantCard}>
                              <View style={styles.participantAvatar}>
                                <ThemedText style={styles.participantAvatarText}>{getInitials(p.name)}</ThemedText>
                              </View>
                              <View style={styles.participantInfo}>
                                <ThemedText style={styles.participantName}>{p.name}</ThemedText>
                                <ThemedText style={styles.participantDetails}>{p.id} • {p.type}</ThemedText>
                                {p.department && <ThemedText style={styles.participantDept}>{p.department}</ThemedText>}
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Single pass profile row */}
                      <View style={[styles.fsProfileRow, { backgroundColor: theme.surface }]}>
                        <View style={[styles.fsAvatar, { backgroundColor: statusColor }]}>
                          <ThemedText style={styles.fsAvatarText}>{getInitials(selectedScan.name)}</ThemedText>
                        </View>
                        <View style={styles.fsProfileInfo}>
                          <ThemedText style={[styles.fsProfileName, { color: theme.text }]}>{selectedScan.name}</ThemedText>
                          <ThemedText style={[styles.fsProfileSub, { color: theme.textSecondary }]}>
                            {selectedScan.regNo ? `${selectedScan.regNo} • ` : ''}{selectedScan.type}
                            {selectedScan.department ? ` • ${selectedScan.department}` : ''}
                          </ThemedText>
                        </View>
                      </View>

                      {/* Info grid */}
                      <View style={styles.fsInfoGrid}>
                        <View style={styles.fsInfoCell}>
                          <ThemedText style={styles.fsInfoLabel}>{selectedScan.type === 'VISITOR' ? 'PURPOSE OF VISIT' : 'PURPOSE'}</ThemedText>
                          <ThemedText style={styles.fsInfoValue} numberOfLines={2}>{selectedScan.purpose || 'N/A'}</ThemedText>
                        </View>
                        <View style={styles.fsInfoDivider} />
                        <View style={styles.fsInfoCell}>
                          <ThemedText style={styles.fsInfoLabel}>TYPE</ThemedText>
                          <ThemedText style={styles.fsInfoValue}>{selectedScan.type || 'N/A'}</ThemedText>
                        </View>
                      </View>

                      {/* Reason — only for non-visitor types */}
                      {!!selectedScan.reason && selectedScan.type !== 'VISITOR' && (
                        <View style={styles.fsBlock}>
                          <ThemedText style={styles.fsBlockLabel}>REASON</ThemedText>
                          <ThemedText style={styles.fsReasonText}>{selectedScan.reason}</ThemedText>
                        </View>
                      )}

                      {/* Timeline */}
                      <View style={styles.fsBlock}>
                        <ThemedText style={styles.fsBlockLabel}>TIME INFORMATION</ThemedText>
                        {selectedScan.inTime && (
                          <View style={styles.fsTlItem}>
                            <View style={[styles.fsTlDot, { backgroundColor: '#10B981' }]}>
                              <Ionicons name="log-in" size={14} color="#FFF" />
                            </View>
                            <View style={styles.fsTlBody}>
                              <ThemedText style={styles.fsTlTitle}>Entry Time</ThemedText>
                              <ThemedText style={styles.fsTlSub}>{formatTime(selectedScan.inTime)}</ThemedText>
                            </View>
                          </View>
                        )}
                        {selectedScan.inTime && selectedScan.outTime && (
                          <View style={styles.fsTlConnector} />
                        )}
                        {selectedScan.outTime && (
                          <View style={styles.fsTlItem}>
                            <View style={[styles.fsTlDot, { backgroundColor: '#EF4444' }]}>
                              <Ionicons name="log-out" size={14} color="#FFF" />
                            </View>
                            <View style={styles.fsTlBody}>
                              <ThemedText style={styles.fsTlTitle}>Exit Time</ThemedText>
                              <ThemedText style={styles.fsTlSub}>{formatTime(selectedScan.outTime)}</ThemedText>
                            </View>
                          </View>
                        )}
                        {!selectedScan.inTime && !selectedScan.outTime && (
                          <ThemedText style={styles.noDataText}>No time data available</ThemedText>
                        )}
                      </View>
                    </>
                  )}
                  <View style={{ height: 16 }} />
                </VerticalScrollView>

                {/* Footer close button */}
                <View style={[styles.fsFooter, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
                  <TouchableOpacity style={[styles.fsCloseBtn, { backgroundColor: theme.primary }]} onPress={() => setShowDetailModal(false)}>
                    <ThemedText style={styles.fsCloseBtnText}>Close</ThemedText>
                  </TouchableOpacity>
                </View>
              </>
            );
          })()}
        </SafeAreaView>
      </Modal>

      {/* Vehicle Detail — full-screen modal */}
      <Modal
        visible={showVehicleModal}
        animationType="slide"
        transparent={false}
        statusBarTranslucent
        onRequestClose={() => setShowVehicleModal(false)}
      >
        <SafeAreaView style={styles.fsScreen} edges={['top', 'bottom']}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

          {selectedVehicle && (() => {
            const statusColor = '#10B981';
            return (
              <>
                <View style={styles.fsHeader}>
                  <TouchableOpacity style={styles.fsBackBtn} onPress={() => setShowVehicleModal(false)}>
                    <Ionicons name="arrow-back" size={22} color="#1F2937" />
                  </TouchableOpacity>
                  <ThemedText style={styles.fsHeaderTitle}>Vehicle Details</ThemedText>
                  <View style={[styles.fsStatusPill, { backgroundColor: statusColor + '22' }]}>
                    <ThemedText style={[styles.fsStatusPillText, { color: statusColor }]}>
                      REGISTERED
                    </ThemedText>
                  </View>
                </View>

                <VerticalScrollView style={styles.fsScroll} showsVerticalScrollIndicator={false} decelerationRate="normal" contentContainerStyle={styles.fsScrollContent}>
                  {/* Profile row */}
                  <View style={styles.fsProfileRow}>
                    <View style={[styles.fsAvatar, { backgroundColor: '#F59E0B' }]}>
                      <Ionicons name="car" size={24} color="#FFF" />
                    </View>
                    <View style={styles.fsProfileInfo}>
                      <ThemedText style={styles.fsProfileName}>{selectedVehicle.licensePlate || 'N/A'}</ThemedText>
                      <ThemedText style={styles.fsProfileSub}>
                        {selectedVehicle.vehicleType || 'Unknown'} • {selectedVehicle.ownerName || 'N/A'}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Info grid */}
                  <View style={styles.fsInfoGrid}>
                    <View style={styles.fsInfoCell}>
                      <ThemedText style={styles.fsInfoLabel}>ENTRY TIME</ThemedText>
                      <ThemedText style={styles.fsInfoValue} numberOfLines={2}>
                        {formatTime(selectedVehicle.createdAt || selectedVehicle.registeredAt)}
                      </ThemedText>
                    </View>
                    <View style={styles.fsInfoDivider} />
                    <View style={styles.fsInfoCell}>
                      <ThemedText style={styles.fsInfoLabel}>EXIT TIME</ThemedText>
                      <ThemedText style={styles.fsInfoValue} numberOfLines={2}>
                        {(selectedVehicle.updatedAt && selectedVehicle.updatedAt !== selectedVehicle.createdAt)
                          ? formatTime(selectedVehicle.updatedAt)
                          : '—'}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Vehicle info */}
                  <View style={styles.fsBlock}>
                    <ThemedText style={styles.fsBlockLabel}>VEHICLE INFORMATION</ThemedText>
                    {[
                      ['License Plate', selectedVehicle.licensePlate],
                      ['Vehicle Type', selectedVehicle.vehicleType],
                      ['Color', selectedVehicle.vehicleColor || selectedVehicle.color],
                      ['Model', selectedVehicle.vehicleModel || selectedVehicle.model],
                    ].filter(([, v]) => !!v).map(([label, value]) => (
                      <View key={label as string} style={styles.fsRow}>
                        <ThemedText style={styles.fsRowLabel}>{label}</ThemedText>
                        <ThemedText style={styles.fsRowValue}>{value}</ThemedText>
                      </View>
                    ))}
                  </View>

                  {/* Owner info */}
                  <View style={styles.fsBlock}>
                    <ThemedText style={styles.fsBlockLabel}>OWNER INFORMATION</ThemedText>
                    {[
                      ['Owner Name', selectedVehicle.ownerName],
                      ['Owner Type', selectedVehicle.ownerType],
                      ['Contact', selectedVehicle.ownerPhone || selectedVehicle.contactNumber],
                    ].filter(([, v]) => !!v).map(([label, value]) => (
                      <View key={label as string} style={styles.fsRow}>
                        <ThemedText style={styles.fsRowLabel}>{label}</ThemedText>
                        <ThemedText style={styles.fsRowValue}>{value}</ThemedText>
                      </View>
                    ))}
                  </View>

                  <View style={{ height: 16 }} />
                </VerticalScrollView>

                <View style={styles.fsFooter}>
                  <TouchableOpacity style={styles.fsCloseBtn} onPress={() => setShowVehicleModal(false)}>
                    <ThemedText style={styles.fsCloseBtnText}>Close</ThemedText>
                  </TouchableOpacity>
                </View>
              </>
            );
          })()}
        </SafeAreaView>
      </Modal>

      {/* Bottom Navigation */}
      <SecurityBottomNav activeTab="history" onNavigate={onNavigate} />

      {/* Downloading overlay */}
      {isDownloading && (
        <View style={styles.downloadingOverlay}>
          <View style={[styles.downloadingBox, { backgroundColor: theme.surface }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={[styles.downloadingText, { color: theme.text }]}>Generating PDF...</ThemedText>
          </View>
        </View>
      )}

      {/* Download Success Modal */}
      <SuccessModal
        visible={showDownloadSuccess}
        title="Download Complete"
        message={downloadMessage}
        onClose={() => setShowDownloadSuccess(false)}
        autoClose={true}
        autoCloseDelay={3000}
      />

      {/* Download Error Modal */}
      <ErrorModal
        visible={showDownloadError}
        type="general"
        title="Download Failed"
        message={downloadErrorMessage}
        onClose={() => setShowDownloadError(false)}
      />
    </SafeAreaView>
  );
};

const skStyles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  summaryBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  summaryChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  summaryChipActive: {
    backgroundColor: '#EFF6FF',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  instruction: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  clearBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
  },
  mainTabContainer: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 12,
    gap: 12,
  },
  mainTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  mainTabActive: {
    backgroundColor: '#E0F7FA',
    borderColor: '#00BCD4',
  },
  mainTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  mainTabTextActive: {
    color: '#00BCD4',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    color: '#1F2937',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterTabActive: {
    backgroundColor: '#00BCD4',
    borderColor: '#00BCD4',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  scanAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00BCD4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scanAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scanInfo: {
    flex: 1,
  },
  scanName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  scanType: {
    fontSize: 13,
    color: '#00BCD4',
    fontWeight: '600',
    marginBottom: 2,
  },
  scanPurpose: {
    fontSize: 13,
    color: '#6B7280',
  },
  scanRight: {
    alignItems: 'flex-end',
  },
  scanStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
    gap: 4,
  },
  scanStatusEntry: {
    backgroundColor: '#D1FAE5',
  },
  scanStatusExit: {
    backgroundColor: '#FEE2E2',
  },
  scanStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scanStatusTextEntry: {
    color: '#10B981',
  },
  scanStatusTextExit: {
    color: '#EF4444',
  },
  scanTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rangeActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  rangeActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 10,
  },
  rangeActionText: {
    color: '#00BCD4',
    fontSize: 13,
    fontWeight: '700',
  },
  rangeModalCard: {
    width: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#9CA3AF',
  },
  applyBtn: {
    backgroundColor: '#00BCD4',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    width: '100%',
  },
  dateInputText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'center',
  },
  dateTypeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    marginBottom: 10,
    width: '100%',
  },
  dateTypeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  dateTypeTabActive: {
    backgroundColor: '#FFFFFF',
  },
  dateTypeTabText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 12,
  },
  dateTypeTabTextActive: {
    color: '#00BCD4',
    fontWeight: '700',
  },
  calendarWrap: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rangeResultsTop: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rangeResultsSub: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  rangeResultsDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00BCD4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rangeResultsDownloadText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00BCD4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  participantDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  participantDept: {
    fontSize: 12,
    color: '#00BCD4',
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  // ── Full-screen detail styles ──────────────────────────────────────
  fsScreen: { flex: 1, backgroundColor: '#F9FAFB' },
  fsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 10,
  },
  fsBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fsHeaderTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: '#1F2937' },
  fsStatusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  fsStatusPillText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  fsScroll: { flex: 1 },
  fsScrollContent: { paddingBottom: 8 },
  fsProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  fsAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fsAvatarText: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  fsProfileInfo: { flex: 1 },
  fsProfileName: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  fsProfileSub: { fontSize: 12, marginTop: 2, color: '#6B7280' },
  fsInfoGrid: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  fsInfoCell: { flex: 1, padding: 12 },
  fsInfoDivider: { width: 1, backgroundColor: '#E5E7EB', marginVertical: 8 },
  fsInfoLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4, color: '#9CA3AF' },
  fsInfoValue: { fontSize: 13, fontWeight: '600', lineHeight: 18, color: '#1F2937' },
  fsBlock: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#FFFFFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  fsBlockLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, color: '#9CA3AF' },
  fsReasonText: { fontSize: 14, lineHeight: 20, fontWeight: '500', color: '#6B7280' },
  fsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  fsRowLabel: { fontSize: 13, color: '#6B7280' },
  fsRowValue: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  // Timeline
  fsTlItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  fsTlDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  fsTlBody: { flex: 1, paddingTop: 4, paddingBottom: 4 },
  fsTlTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  fsTlSub: { fontSize: 12, color: '#6B7280' },
  fsTlConnector: { width: 2, height: 20, marginLeft: 15, marginVertical: 2, backgroundColor: '#E5E7EB' },
  // Footer
  fsFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 8 : 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  fsCloseBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#00BCD4',
  },
  fsCloseBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  downloadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  downloadingBox: {
    borderRadius: 20,
    paddingHorizontal: 32,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 14,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  downloadingText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ModernScanHistoryScreen;
