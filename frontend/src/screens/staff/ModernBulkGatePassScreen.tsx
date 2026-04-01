import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as DocumentPicker from '../../shims/expoDocumentPicker';
import * as FileSystem from '../../shims/expoFileSystem';
import { Staff } from '../../types';
import { apiService } from '../../services/api';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import { formatDateGB, formatTime } from '../../utils/dateUtils';
import ThemedText from '../../components/ThemedText';
import { VerticalScrollView } from '../../components/navigation/VerticalScrollViews';
import { useTheme } from '../../context/ThemeContext';


interface ModernBulkGatePassScreenProps {
  user: Staff;
  navigation?: any;
  onBack?: () => void;
}

interface Student {
  id: number;
  regNo: string;
  fullName: string;
  department: string;
  section?: string;
  year?: string;
}

const ModernBulkGatePassScreen: React.FC<ModernBulkGatePassScreenProps> = ({ user, navigation, onBack }) => {
  const { theme } = useTheme();
  const [purpose, setPurpose] = useState('');
  const [reason, setReason] = useState('');
  const [requestDateTime] = useState(new Date());
  const [includeStaff, setIncludeStaff] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [attachment, setAttachment] = useState<{
    name: string;
    base64Uri: string;
    uri?: string;
    mimeType?: string;
  } | null>(null);
  // Track which sections are collapsed
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const handleGoBack = () => {
    if (navigation?.goBack) navigation.goBack();
    else if (onBack) onBack();
  };

  useEffect(() => { loadStudents(); }, []);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getStudentsByStaffDepartment(user.staffCode);
      if (response.success && response.students) {
        setAvailableStudents(response.students);
      }
    } catch (error) {
      console.error('Error loading students:', error);
      setErrorMessage('Failed to load students');
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Group students by section (fall back to year, then "General")
  const getSectionKey = (s: Student) => {
    const sec = s.section?.trim();
    const yr = s.year?.trim();
    if (sec && sec !== '') return sec;
    if (yr && yr !== '') return yr;
    return 'General';
  };

  const getGroupedStudents = (): { key: string; students: Student[] }[] => {
    const filtered = getFilteredStudents();
    const map = new Map<string, Student[]>();
    for (const s of filtered) {
      const key = getSectionKey(s);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    // Sort sections alphabetically
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, students]) => ({ key, students }));
  };

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleStudentSelection = (regNo: string) => {
    const next = new Set(selectedStudents);
    if (next.has(regNo)) {
      next.delete(regNo);
      if (receiverId === regNo) setReceiverId(null);
    } else {
      next.add(regNo);
    }
    setSelectedStudents(next);
  };

  const toggleSectionSelection = (students: Student[]) => {
    const regNos = students.map(s => s.regNo);
    const allSelected = regNos.every(r => selectedStudents.has(r));
    const next = new Set(selectedStudents);
    if (allSelected) {
      regNos.forEach(r => {
        next.delete(r);
        if (receiverId === r) setReceiverId(null);
      });
    } else {
      regNos.forEach(r => next.add(r));
    }
    setSelectedStudents(next);
  };

  const selectAllStudents = () => {
    const filtered = getFilteredStudents();
    if (selectedStudents.size === filtered.length) {
      setSelectedStudents(new Set());
      setReceiverId(null);
    } else {
      setSelectedStudents(new Set(filtered.map(s => s.regNo)));
    }
  };

  const getFilteredStudents = () => {
    if (!searchQuery.trim()) return availableStudents;
    const q = searchQuery.toLowerCase();
    return availableStudents.filter(s =>
      s.fullName.toLowerCase().includes(q) ||
      s.regNo.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q)
    );
  };

  const pickAttachment = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) return;
    const file = result.assets?.[0];
    if (!file) return;

    const mimeType = file.mimeType || (file.uri?.toLowerCase?.().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
    // Convert to base64 data URI so the backend can store it reliably.
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: (FileSystem as any).EncodingType?.Base64 ?? 'base64',
    });
    setAttachment({
      name: file.name || 'attachment',
      base64Uri: `data:${mimeType};base64,${base64}`,
      uri: file.uri,
      mimeType,
    });
  };

  const handleSubmit = async () => {
    if (!purpose.trim()) { setErrorMessage('Please enter a purpose'); setShowErrorModal(true); return; }
    if (!reason.trim()) { setErrorMessage('Please describe the reason'); setShowErrorModal(true); return; }
    if (selectedStudents.size === 0) { setErrorMessage('Please select at least one student'); setShowErrorModal(true); return; }
    if (!includeStaff && !receiverId) { setErrorMessage('Please select a receiver (student who will hold the QR code)'); setShowErrorModal(true); return; }

    setIsSubmitting(true);
    try {
      const response = await apiService.createBulkGatePass({
        staffCode: user.staffCode,
        purpose: purpose.trim(),
        reason: reason.trim(),
        exitDateTime: new Date().toISOString(),
        returnDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        students: Array.from(selectedStudents),
        includeStaff,
        receiverId: includeStaff ? undefined : (receiverId || undefined),
        attachmentUri: attachment?.base64Uri,
      } as any);
      if (response.success) {
        setShowSuccessModal(true);
      } else {
        setErrorMessage(response.message || 'Failed to submit bulk gate pass');
        setShowErrorModal(true);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'An error occurred');
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const groups = getGroupedStudents();
  const filteredCount = getFilteredStudents().length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleGoBack} style={[styles.backButton, { backgroundColor: theme.inputBackground }]}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>Bulk Gate Pass</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: theme.primary + '15' }]}>
        <Ionicons name="information-circle" size={20} color={theme.primary} />
        <ThemedText style={[styles.infoBannerText, { color: theme.primary }]}>Create a gate pass for multiple students at once</ThemedText>
      </View>

      <VerticalScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Include Staff toggle */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <TouchableOpacity
            style={[styles.checkboxRow, { backgroundColor: theme.inputBackground }]}
            onPress={() => { setIncludeStaff(v => { if (!v) setReceiverId(null); return !v; }); }}
            disabled={isSubmitting}
          >
            <Ionicons name={includeStaff ? 'checkbox' : 'square-outline'} size={24} color="#8B5CF6" />
            <View style={styles.checkboxContent}>
              <ThemedText style={[styles.checkboxLabel, { color: theme.text }]}>Include Staff in this Pass</ThemedText>
              <ThemedText style={[styles.checkboxSubtext, { color: theme.textSecondary }]}>
                {includeStaff
                  ? 'Staff will hold the QR code for the group'
                  : 'One student will be selected as receiver to hold the QR code'}
              </ThemedText>
            </View>
          </TouchableOpacity>
        </View>

        {/* Student Selection — grouped by section */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
              Selected: {selectedStudents.size} / {availableStudents.length}
            </ThemedText>
            <TouchableOpacity onPress={selectAllStudents} style={[styles.selectAllButton, { backgroundColor: theme.inputBackground }]}>
              <ThemedText style={styles.selectAllText}>
                {selectedStudents.size === filteredCount && filteredCount > 0 ? 'Deselect All' : 'Select All'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: theme.inputBackground }]}>
            <Ionicons name="search" size={20} color={theme.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search students..."
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
          ) : groups.length === 0 ? (
            <ThemedText style={[styles.emptyText, { color: theme.textTertiary }]}>No students found</ThemedText>
          ) : (
            groups.map(({ key, students }) => {
              const isCollapsed = collapsedSections.has(key);
              const sectionSelected = students.filter(s => selectedStudents.has(s.regNo)).length;
              const allSectionSelected = sectionSelected === students.length;
              const someSectionSelected = sectionSelected > 0 && !allSectionSelected;

              return (
                <View key={key} style={[styles.sectionGroup, { borderColor: theme.border }]}>
                  {/* Section header row */}
                  <View style={[styles.sectionGroupHeader, { backgroundColor: theme.inputBackground }]}>
                    {/* Checkbox for whole section */}
                    <TouchableOpacity
                      onPress={() => toggleSectionSelection(students)}
                      style={styles.sectionCheckbox}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={allSectionSelected ? 'checkbox' : someSectionSelected ? 'checkbox-outline' : 'square-outline'}
                        size={22}
                        color={allSectionSelected || someSectionSelected ? '#8B5CF6' : theme.textTertiary}
                      />
                    </TouchableOpacity>

                    {/* Section label — tap to collapse */}
                    <TouchableOpacity style={styles.sectionGroupLabelRow} onPress={() => toggleSection(key)}>
                      <View style={styles.sectionGroupLabelInner}>
                        <ThemedText style={[styles.sectionGroupLabel, { color: theme.text }]}>Section {key}</ThemedText>
                        <View style={styles.sectionCountBadge}>
                          <ThemedText style={styles.sectionCountText}>
                            {sectionSelected}/{students.length}
                          </ThemedText>
                        </View>
                      </View>
                      <Ionicons
                        name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                        size={18}
                        color={theme.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Students in section */}
                  {!isCollapsed && (
                    <View style={styles.studentList}>
                      {students.map(student => {
                        const isSelected = selectedStudents.has(student.regNo);
                        return (
                          <TouchableOpacity
                            key={student.regNo}
                            style={[styles.studentItem, { backgroundColor: theme.inputBackground }, isSelected && styles.studentItemSelected]}
                            onPress={() => toggleStudentSelection(student.regNo)}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={isSelected ? 'checkbox' : 'square-outline'}
                              size={22}
                              color={isSelected ? '#8B5CF6' : theme.textTertiary}
                            />
                            <View style={styles.studentInfo}>
                              <ThemedText style={[styles.studentName, { color: theme.text }, isSelected && styles.studentNameSelected]}>
                                {student.fullName}
                              </ThemedText>
                              <ThemedText style={[styles.studentDetails, { color: theme.textSecondary }]}>{student.regNo}</ThemedText>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Receiver Selection — only when staff NOT included */}
        {!includeStaff && selectedStudents.size > 0 && (
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Select Receiver (QR Code Holder)</ThemedText>
            <View style={[styles.receiverInfo, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="information-circle" size={16} color="#8B5CF6" />
              <ThemedText style={styles.receiverInfoText}>
                The receiver will hold the QR code for the entire group
              </ThemedText>
            </View>
            <View style={styles.receiverList}>
              {Array.from(selectedStudents).map(regNo => {
                const student = availableStudents.find(s => s.regNo === regNo);
                if (!student) return null;
                const isRcv = receiverId === regNo;
                return (
                  <TouchableOpacity
                    key={regNo}
                    style={[styles.receiverItem, { backgroundColor: theme.inputBackground }, isRcv && styles.receiverItemActive]}
                    onPress={() => setReceiverId(regNo)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isRcv ? 'radio-button-on' : 'radio-button-off'}
                      size={24}
                      color={isRcv ? '#8B5CF6' : theme.textTertiary}
                    />
                    <View style={styles.receiverStudentInfo}>
                      <View style={styles.receiverNameRow}>
                        <ThemedText style={[styles.receiverStudentName, { color: theme.text }, isRcv && styles.receiverStudentNameActive]}>
                          {student.fullName}
                        </ThemedText>
                        {isRcv && (
                          <View style={styles.receiverActiveBadge}>
                            <Ionicons name="qr-code" size={12} color="#FFF" />
                            <ThemedText style={styles.receiverActiveBadgeText}>RECEIVER</ThemedText>
                          </View>
                        )}
                      </View>
                      <ThemedText style={[styles.receiverStudentDetails, { color: theme.textSecondary }]}>
                        {student.regNo} • {getSectionKey(student)}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Gate Pass Details */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Gate Pass Details</ThemedText>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>REQUEST DATE & TIME</ThemedText>
            <View style={styles.requestDateTimeRow}>
              <View style={[styles.requestDateTimeBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
                <ThemedText style={[styles.requestDateTimeText, { color: theme.text }]}>
                  {formatDateGB(requestDateTime)}
                </ThemedText>
              </View>
              <View style={[styles.requestDateTimeBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="time-outline" size={18} color={theme.textSecondary} />
                <ThemedText style={[styles.requestDateTimeText, { color: theme.text }]}>
                  {formatTime(requestDateTime)}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Purpose *</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
              placeholder="Enter purpose for gate pass"
              placeholderTextColor={theme.textTertiary}
              value={purpose}
              onChangeText={setPurpose}
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Reason *</ThemedText>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
              placeholder="Describe the reason for gate pass..."
              placeholderTextColor={theme.textTertiary}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Attachment (Optional)</ThemedText>
            <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: theme.inputBackground, borderColor: theme.border }]} onPress={pickAttachment}>
              <Ionicons name="attach-outline" size={24} color={theme.textTertiary} />
              <ThemedText style={[styles.uploadText, { color: theme.textSecondary }]}>
                {attachment ? attachment.name : 'Tap to upload (image/PDF)'}
              </ThemedText>
              {attachment && (
                <TouchableOpacity onPress={() => setAttachment(null)}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            {attachment && (
              attachment.mimeType?.startsWith('image') ? (
                <Image source={{ uri: attachment.base64Uri }} style={styles.attachmentPreview} resizeMode="cover" />
              ) : (
                <TouchableOpacity
                  style={[styles.filePreview, { borderColor: theme.border, backgroundColor: theme.surface }]}
                  onPress={() => {
                    const uri = attachment.uri || attachment.base64Uri;
                    if (uri) Linking.openURL(uri);
                  }}
                >
                  <Ionicons name="document-text-outline" size={20} color="#1D4ED8" />
                  <ThemedText style={[styles.filePreviewText, { color: theme.text }]} numberOfLines={1}>
                    Tap to preview {attachment.name}
                  </ThemedText>
                  <Ionicons name="open-outline" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              )
            )}
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, (isSubmitting || selectedStudents.size === 0) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || selectedStudents.size === 0}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <ThemedText style={styles.submitButtonText}>
                Submit for {selectedStudents.size} Student{selectedStudents.size !== 1 ? 's' : ''}
              </ThemedText>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </VerticalScrollView>

      <SuccessModal
        visible={showSuccessModal}
        title="Bulk Pass Submitted"
        message={`Gate pass request submitted for ${selectedStudents.size} student${selectedStudents.size !== 1 ? 's' : ''}. Awaiting HOD approval.`}
        onClose={() => { setShowSuccessModal(false); handleGoBack(); }}
        autoClose={true}
        autoCloseDelay={2500}
      />
      <ErrorModal
        visible={showErrorModal}
        type="api"
        title="Submission Failed"
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
      />
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  backButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  infoBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  infoBannerText: { flex: 1, fontSize: 14 },
  content: { flex: 1 },
  section: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  selectAllButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  selectAllText: { fontSize: 14, fontWeight: '600', color: '#8B5CF6' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16, gap: 8 },
  searchInput: { flex: 1, fontSize: 16 },
  loadingContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { textAlign: 'center', fontSize: 14, paddingVertical: 24 },
  // Section group
  sectionGroup: { marginBottom: 8, borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  sectionGroupHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, gap: 8 },
  sectionCheckbox: { width: 28, alignItems: 'center' },
  sectionGroupLabelRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionGroupLabelInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionGroupLabel: { fontSize: 14, fontWeight: '700' },
  sectionCountBadge: { backgroundColor: '#8B5CF6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  sectionCountText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  // Student items
  studentList: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  studentItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 10, gap: 10 },
  studentItemSelected: { backgroundColor: '#EDE9FE' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  studentNameSelected: { color: '#6B21A8' },
  studentDetails: { fontSize: 12 },
  // Receiver
  receiverInfo: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 16, gap: 8 },
  receiverInfoText: { flex: 1, fontSize: 13, color: '#6B21A8', fontWeight: '600' },
  receiverList: { gap: 10 },
  receiverItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, gap: 12, borderWidth: 2, borderColor: 'transparent' },
  receiverItemActive: { backgroundColor: '#EDE9FE', borderColor: '#8B5CF6' },
  receiverStudentInfo: { flex: 1 },
  receiverNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  receiverStudentName: { fontSize: 16, fontWeight: '600' },
  receiverStudentNameActive: { color: '#6B21A8' },
  receiverActiveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8B5CF6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 4 },
  receiverActiveBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
  receiverStudentDetails: { fontSize: 13 },
  // Form
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  textArea: { height: 100, paddingTop: 12 },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderRadius: 12, gap: 12, marginBottom: 20 },
  checkboxContent: { flex: 1 },
  checkboxLabel: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  checkboxSubtext: { fontSize: 13 },
  requestDateTimeRow: { flexDirection: 'row', gap: 12 },
  requestDateTimeBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  requestDateTimeText: { fontSize: 15, fontWeight: '600' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  uploadText: { flex: 1, fontSize: 14, fontWeight: '500' },
  attachmentPreview: { width: '100%', height: 160, borderRadius: 12, marginTop: 10 },
  filePreview: { marginTop: 10, borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  filePreviewText: { flex: 1, fontSize: 14, fontWeight: '600' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', marginHorizontal: 20, marginTop: 20, paddingVertical: 16, borderRadius: 12, gap: 8, elevation: 3 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});

export default ModernBulkGatePassScreen;
