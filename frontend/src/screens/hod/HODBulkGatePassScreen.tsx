import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as DocumentPicker from '../../shims/expoDocumentPicker';
import * as FileSystem from '../../shims/expoFileSystem';
import { HOD } from '../../types';
import { apiService } from '../../services/api';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import ThemedText from '../../components/ThemedText';
import { VerticalScrollView } from '../../components/navigation/VerticalScrollViews';
import { useTheme } from '../../context/ThemeContext';


interface HODBulkGatePassScreenProps {
  user: HOD;
  navigation?: any;
  onBack?: () => void;
}

interface Student {
  id: number;
  regNo: string;
  fullName: string;
  department: string;
  year: string;
  section: string;
}

interface StaffMember {
  id: number;
  staffCode: string;
  fullName: string;
  department: string;
}

type ViewMode = 'students' | 'staff';

// Simple dropdown component
const Dropdown = ({ label, value, options, onSelect, placeholder }: {
  label: string; value: string; options: string[];
  onSelect: (v: string) => void; placeholder: string;
}) => {
  const [open, setOpen] = useState(false);
  const { theme } = useTheme();
  return (
    <View style={dd.wrap}>
      <ThemedText style={[dd.label, { color: theme.text }]}>{label}</ThemedText>
      <TouchableOpacity style={[dd.btn, { backgroundColor: theme.inputBackground, borderColor: theme.border }]} onPress={() => setOpen(true)}>
        <ThemedText style={[dd.btnText, { color: theme.text }, !value && { color: theme.textTertiary }]}>{value || placeholder}</ThemedText>
        <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={dd.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={[dd.sheet, { backgroundColor: theme.surface }]}>
            <ThemedText style={[dd.sheetTitle, { color: theme.text }]}>{label}</ThemedText>
            <VerticalScrollView>
              <TouchableOpacity style={[dd.option, { borderBottomColor: theme.border }]} onPress={() => { onSelect(''); setOpen(false); }}>
                <ThemedText style={[dd.optionText, { color: theme.text }]}>All</ThemedText>
              </TouchableOpacity>
              {options.map(o => (
                <TouchableOpacity key={o} style={[dd.option, { borderBottomColor: theme.border }, value === o && { backgroundColor: theme.primary + '20' }]}
                  onPress={() => { onSelect(o); setOpen(false); }}>
                  <ThemedText style={[dd.optionText, { color: theme.text }, value === o && { color: theme.primary, fontWeight: '700' }]}>{o}</ThemedText>
                  {value === o && <Ionicons name="checkmark" size={18} color={theme.primary} />}
                </TouchableOpacity>
              ))}
            </VerticalScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const HODBulkGatePassScreen: React.FC<HODBulkGatePassScreenProps> = ({ user, navigation, onBack }) => {
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('students');
  const [purpose, setPurpose] = useState('');
  const [reason, setReason] = useState('');
  const [includeHOD, setIncludeHOD] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [attachment, setAttachment] = useState<{
    name: string;
    base64Uri: string;
    uri?: string;
    mimeType?: string;
  } | null>(null);

  // All data
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);

  // Filters
  const [filterYear, setFilterYear] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');

  // Selection
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [receiverType, setReceiverType] = useState<'student' | 'staff' | null>(null);

  const handleGoBack = () => navigation?.goBack ? navigation.goBack() : onBack?.();

  useEffect(() => { loadParticipants(); }, []);

  const loadParticipants = async () => {
    setIsLoading(true);
    try {
      const [sr, stR] = await Promise.all([
        apiService.getHODDepartmentStudents(user.hodCode),
        apiService.getHODDepartmentStaff(user.hodCode),
      ]);
      if (sr.success) setAllStudents(sr.students || []);
      if (stR.success) setAllStaff(stR.staff || []);
    } catch (e) {
      console.error('Error loading participants:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Derive filter options from data
  const yearOptions = useMemo(() =>
    [...new Set(allStudents.map(s => s.year).filter(Boolean))].sort(), [allStudents]);

  const deptOptions = useMemo(() => {
    let src = allStudents;
    if (filterYear) src = src.filter(s => s.year === filterYear);
    return [...new Set(src.map(s => s.department).filter(Boolean))].sort();
  }, [allStudents, filterYear]);

  const sectionOptions = useMemo(() => {
    let src = allStudents;
    if (filterYear) src = src.filter(s => s.year === filterYear);
    if (filterDept) src = src.filter(s => s.department === filterDept);
    return [...new Set(src.map(s => s.section).filter(Boolean))].sort();
  }, [allStudents, filterYear, filterDept]);

  // Reset downstream filters when upstream changes
  const handleYearChange = (v: string) => { setFilterYear(v); setFilterDept(''); setFilterSection(''); };
  const handleDeptChange = (v: string) => { setFilterDept(v); setFilterSection(''); };

  const filteredStudents = useMemo(() => {
    let s = allStudents;
    if (filterYear) s = s.filter(x => x.year === filterYear);
    if (filterDept) s = s.filter(x => x.department === filterDept);
    if (filterSection) s = s.filter(x => x.section === filterSection);
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase();
      s = s.filter(x => x.fullName.toLowerCase().includes(q) || x.regNo.toLowerCase().includes(q));
    }
    return s;
  }, [allStudents, filterYear, filterDept, filterSection, studentSearch]);

  const filteredStaff = useMemo(() => {
    if (!staffSearch.trim()) return allStaff;
    const q = staffSearch.toLowerCase();
    return allStaff.filter(s => s.fullName.toLowerCase().includes(q) || s.staffCode.toLowerCase().includes(q));
  }, [allStaff, staffSearch]);

  const toggleStudent = (regNo: string) => {
    const s = new Set(selectedStudents);
    if (s.has(regNo)) { s.delete(regNo); if (receiverId === regNo) { setReceiverId(null); setReceiverType(null); } }
    else s.add(regNo);
    setSelectedStudents(s);
  };

  const toggleStaff = (code: string) => {
    const s = new Set(selectedStaff);
    if (s.has(code)) { s.delete(code); if (receiverId === code) { setReceiverId(null); setReceiverType(null); } }
    else s.add(code);
    setSelectedStaff(s);
  };

  const selectAll = () => {
    if (viewMode === 'students') {
      if (selectedStudents.size === filteredStudents.length && filteredStudents.length > 0) {
        setSelectedStudents(new Set());
      } else {
        setSelectedStudents(new Set(filteredStudents.map(s => s.regNo)));
      }
    } else {
      if (selectedStaff.size === filteredStaff.length && filteredStaff.length > 0) {
        setSelectedStaff(new Set());
      } else {
        setSelectedStaff(new Set(filteredStaff.map(s => s.staffCode)));
      }
    }
  };

  const totalSelected = selectedStudents.size + selectedStaff.size;

  const pickAttachment = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) return;
    const file = result.assets?.[0];
    if (!file) return;

    const mimeType =
      file.mimeType || (file.uri?.toLowerCase?.().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
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
    if (!reason.trim()) { setErrorMessage('Please enter a reason'); setShowErrorModal(true); return; }
    if (totalSelected === 0) { setErrorMessage('Please select at least one participant'); setShowErrorModal(true); return; }
    if (!includeHOD && !receiverId) { setErrorMessage('Please select a receiver for the QR code'); setShowErrorModal(true); return; }

    setIsSubmitting(true);
    try {
      const participants = [
        ...Array.from(selectedStudents).map(id => ({ id, type: 'student' })),
        ...Array.from(selectedStaff).map(id => ({ id, type: 'staff' })),
      ];
      const response = await apiService.submitBulkGatePass({
        hodCode: user.hodCode,
        purpose: purpose.trim(),
        reason: reason.trim(),
        exitDateTime: new Date().toISOString(),
        returnDateTime: new Date(Date.now() + 86400000).toISOString(),
        participantDetails: participants,
        participants: participants.map(p => p.id),
        includeHOD,
        receiverId: includeHOD ? undefined : (receiverId || undefined),
        attachmentUri: attachment?.base64Uri,
      } as any);
      if (response.success !== false) {
        setShowSuccessModal(true);
      } else {
        setErrorMessage(response.message || 'Failed to submit bulk gate pass');
        setShowErrorModal(true);
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'An error occurred');
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleGoBack} style={[s.backBtn, { backgroundColor: theme.inputBackground }]}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <ThemedText style={[s.headerTitle, { color: theme.text }]}>HOD Bulk Gate Pass</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <View style={[s.infoBanner, { backgroundColor: theme.primary + '15' }]}>
        <Ionicons name="information-circle" size={18} color={theme.primary} />
        <ThemedText style={[s.infoBannerText, { color: theme.primary }]}>Bulk passes — no HR approval required</ThemedText>
      </View>

      <VerticalScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={[s.card, { backgroundColor: theme.surface }]}>
          <View style={s.summaryRow}>
            {[['school', '#3B82F6', 'Students', selectedStudents.size],
              ['briefcase', '#10B981', 'Staff', selectedStaff.size],
              ['people', '#F59E0B', 'Total', totalSelected]].map(([icon, color, lbl, val]) => (
              <View key={lbl as string} style={s.summaryItem}>
                <Ionicons name={icon as any} size={22} color={color as string} />
                <View>
                  <ThemedText style={[s.summaryLabel, { color: theme.textSecondary }]}>{lbl as string}</ThemedText>
                  <ThemedText style={[s.summaryVal, { color: theme.text }]}>{val as number}</ThemedText>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Include HOD toggle */}
        <View style={[s.card, { backgroundColor: theme.surface }]}>
          <TouchableOpacity style={[s.checkRow, { backgroundColor: theme.primary + '20' }]} onPress={() => { setIncludeHOD(!includeHOD); if (!includeHOD) { setReceiverId(null); setReceiverType(null); } }}>
            <Ionicons name={includeHOD ? 'checkbox' : 'square-outline'} size={24} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <ThemedText style={[s.checkLabel, { color: theme.text }]}>Include HOD in this Pass</ThemedText>
              <ThemedText style={[s.checkSub, { color: theme.textSecondary }]}>{includeHOD ? 'HOD holds the QR code' : 'Select a receiver to hold the QR code'}</ThemedText>
            </View>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={[s.card, { backgroundColor: theme.surface }]}>
          <View style={[s.tabs, { backgroundColor: theme.inputBackground }]}>
            {(['students', 'staff'] as ViewMode[]).map(mode => (
              <TouchableOpacity key={mode} style={[s.tab, viewMode === mode && s.tabActive]} onPress={() => setViewMode(mode)}>
                <Ionicons name={mode === 'students' ? 'school' : 'briefcase'} size={18} color={viewMode === mode ? '#FFF' : theme.textSecondary} />
                <ThemedText style={[s.tabText, { color: viewMode === mode ? '#FFF' : theme.textSecondary }, viewMode === mode && s.tabTextActive]}>{mode === 'students' ? 'Students' : 'Staff'}</ThemedText>
                {(mode === 'students' ? selectedStudents.size : selectedStaff.size) > 0 && (
                  <View style={s.badge}><ThemedText style={s.badgeText}>{mode === 'students' ? selectedStudents.size : selectedStaff.size}</ThemedText></View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Student view */}
        {viewMode === 'students' && (
          <View style={[s.card, { backgroundColor: theme.surface }]}>
            {/* Cascading dropdowns */}
            <Dropdown label="Year" value={filterYear} options={yearOptions} onSelect={handleYearChange} placeholder="All Years" />
            <Dropdown label="Department" value={filterDept} options={deptOptions} onSelect={handleDeptChange} placeholder="All Departments" />
            <Dropdown label="Section" value={filterSection} options={sectionOptions} onSelect={setFilterSection} placeholder="All Sections" />

            <View style={s.rowBetween}>
              <ThemedText style={[s.countText, { color: theme.text }]}>Selected: {selectedStudents.size} / {filteredStudents.length}</ThemedText>
              <TouchableOpacity onPress={selectAll} style={[s.selectAllBtn, { backgroundColor: theme.inputBackground }]}>
                <ThemedText style={s.selectAllText}>{selectedStudents.size === filteredStudents.length && filteredStudents.length > 0 ? 'Deselect All' : 'Select All'}</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={[s.searchBox, { backgroundColor: theme.inputBackground }]}>
              <Ionicons name="search" size={18} color={theme.textTertiary} />
              <TextInput style={[s.searchInput, { color: theme.text }]} placeholder="Search students..." placeholderTextColor={theme.textTertiary} value={studentSearch} onChangeText={setStudentSearch} />
            </View>

            {isLoading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 30 }} /> : (
              filteredStudents.length === 0
                ? <View style={s.empty}><Ionicons name="people-outline" size={40} color={theme.textTertiary} /><ThemedText style={[s.emptyText, { color: theme.textTertiary }]}>No students found</ThemedText></View>
                : filteredStudents.map(st => (
                  <TouchableOpacity key={st.regNo} style={[s.item, { borderBottomColor: theme.border }]} onPress={() => toggleStudent(st.regNo)}>
                    <Ionicons name={selectedStudents.has(st.regNo) ? 'checkbox' : 'square-outline'} size={24} color={selectedStudents.has(st.regNo) ? theme.primary : theme.textTertiary} />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[s.itemName, { color: theme.text }]}>{st.fullName}</ThemedText>
                      <ThemedText style={[s.itemSub, { color: theme.textSecondary }]}>{st.regNo} • {st.year} • {st.department} • Sec {st.section}</ThemedText>
                    </View>
                  </TouchableOpacity>
                ))
            )}
          </View>
        )}

        {/* Staff view */}
        {viewMode === 'staff' && (
          <View style={[s.card, { backgroundColor: theme.surface }]}>
            <View style={s.rowBetween}>
              <ThemedText style={[s.countText, { color: theme.text }]}>Selected: {selectedStaff.size} / {filteredStaff.length}</ThemedText>
              <TouchableOpacity onPress={selectAll} style={[s.selectAllBtn, { backgroundColor: theme.inputBackground }]}>
                <ThemedText style={s.selectAllText}>{selectedStaff.size === filteredStaff.length && filteredStaff.length > 0 ? 'Deselect All' : 'Select All'}</ThemedText>
              </TouchableOpacity>
            </View>
            <View style={[s.searchBox, { backgroundColor: theme.inputBackground }]}>
              <Ionicons name="search" size={18} color={theme.textTertiary} />
              <TextInput style={[s.searchInput, { color: theme.text }]} placeholder="Search staff..." placeholderTextColor={theme.textTertiary} value={staffSearch} onChangeText={setStaffSearch} />
            </View>
            {isLoading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 30 }} /> : (
              filteredStaff.length === 0
                ? <View style={s.empty}><Ionicons name="briefcase-outline" size={40} color={theme.textTertiary} /><ThemedText style={[s.emptyText, { color: theme.textTertiary }]}>No staff found</ThemedText></View>
                : filteredStaff.map(st => (
                  <TouchableOpacity key={st.staffCode} style={[s.item, { borderBottomColor: theme.border }]} onPress={() => toggleStaff(st.staffCode)}>
                    <Ionicons name={selectedStaff.has(st.staffCode) ? 'checkbox' : 'square-outline'} size={24} color={selectedStaff.has(st.staffCode) ? theme.primary : theme.textTertiary} />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[s.itemName, { color: theme.text }]}>{st.fullName}</ThemedText>
                      <ThemedText style={[s.itemSub, { color: theme.textSecondary }]}>{st.staffCode} • {st.department}</ThemedText>
                    </View>
                  </TouchableOpacity>
                ))
            )}
          </View>
        )}

        {/* Receiver selection */}
        {!includeHOD && totalSelected > 0 && (
          <View style={[s.card, { backgroundColor: theme.surface }]}>
            <ThemedText style={[s.sectionTitle, { color: theme.text }]}>Select QR Code Receiver</ThemedText>
            <View style={[s.receiverInfo, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="information-circle" size={16} color={theme.primary} />
              <ThemedText style={[s.receiverInfoText, { color: theme.primary }]}>This person will hold the QR code for the group</ThemedText>
            </View>
            {selectedStudents.size > 0 && <ThemedText style={[s.catTitle, { color: theme.textTertiary }]}>STUDENTS</ThemedText>}
            {Array.from(selectedStudents).map(rn => {
              const st = allStudents.find(x => x.regNo === rn); if (!st) return null;
              const active = receiverId === rn;
              return (
                <TouchableOpacity key={rn} style={[s.receiverItem, { borderColor: 'transparent' }, active && s.receiverItemActive, active && { borderColor: theme.primary, backgroundColor: theme.primary + '15' }]} onPress={() => { setReceiverId(rn); setReceiverType('student'); }}>
                  <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? theme.primary : theme.textTertiary} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[s.itemName, { color: theme.text }, active && { color: theme.primary }]}>{st.fullName}</ThemedText>
                    <ThemedText style={[s.itemSub, { color: theme.textSecondary }]}>{st.regNo}</ThemedText>
                  </View>
                  {active && <View style={[s.receiverBadge, { backgroundColor: theme.primary }]}><ThemedText style={s.receiverBadgeText}>RECEIVER</ThemedText></View>}
                </TouchableOpacity>
              );
            })}
            {selectedStaff.size > 0 && <ThemedText style={[s.catTitle, { color: theme.textTertiary }]}>STAFF</ThemedText>}
            {Array.from(selectedStaff).map(code => {
              const st = allStaff.find(x => x.staffCode === code); if (!st) return null;
              const active = receiverId === code;
              return (
                <TouchableOpacity key={code} style={[s.receiverItem, { borderColor: 'transparent' }, active && s.receiverItemActive, active && { borderColor: theme.primary, backgroundColor: theme.primary + '15' }]} onPress={() => { setReceiverId(code); setReceiverType('staff'); }}>
                  <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? theme.primary : theme.textTertiary} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[s.itemName, { color: theme.text }, active && { color: theme.primary }]}>{st.fullName}</ThemedText>
                    <ThemedText style={[s.itemSub, { color: theme.textSecondary }]}>{st.staffCode}</ThemedText>
                  </View>
                  {active && <View style={[s.receiverBadge, { backgroundColor: theme.primary }]}><ThemedText style={s.receiverBadgeText}>RECEIVER</ThemedText></View>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Gate pass details */}
        <View style={[s.card, { backgroundColor: theme.surface }]}>
          <ThemedText style={[s.sectionTitle, { color: theme.text }]}>Gate Pass Details</ThemedText>
          <ThemedText style={[s.fieldLabel, { color: theme.textSecondary }]}>Purpose *</ThemedText>
          <TextInput style={[s.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]} placeholder="Enter purpose" placeholderTextColor={theme.textTertiary} value={purpose} onChangeText={setPurpose} />
          <ThemedText style={[s.fieldLabel, { color: theme.textSecondary }]}>Reason *</ThemedText>
          <TextInput style={[s.input, { height: 90, textAlignVertical: 'top', paddingTop: 12, backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]} placeholder="Describe the reason..." placeholderTextColor={theme.textTertiary} value={reason} onChangeText={setReason} multiline />
          <ThemedText style={[s.fieldLabel, { color: theme.textSecondary }]}>Attachment (Optional)</ThemedText>
          <TouchableOpacity style={[s.uploadBtn, { backgroundColor: theme.inputBackground, borderColor: theme.border }]} onPress={pickAttachment}>
            <Ionicons name="attach-outline" size={22} color={theme.textTertiary} />
            <ThemedText style={[s.uploadText, { color: theme.textSecondary }]}>{attachment ? attachment.name : 'Tap to upload (image/PDF)'}</ThemedText>
            {attachment && <TouchableOpacity onPress={() => setAttachment(null)}><Ionicons name="close-circle" size={20} color="#EF4444" /></TouchableOpacity>}
          </TouchableOpacity>
          {attachment && (
            attachment.mimeType?.startsWith('image') ? (
              <Image source={{ uri: attachment.base64Uri }} style={s.attachPreview} resizeMode="cover" />
            ) : (
              <TouchableOpacity
                style={[s.filePreview, { borderColor: theme.border, backgroundColor: theme.surface }]}
                onPress={() => {
                  const uri = attachment.uri || attachment.base64Uri;
                  if (uri) Linking.openURL(uri);
                }}
              >
                <Ionicons name="document-text-outline" size={20} color="#1D4ED8" />
                <ThemedText style={[s.filePreviewText, { color: theme.text }]} numberOfLines={1}>
                  Tap to preview {attachment.name}
                </ThemedText>
                <Ionicons name="open-outline" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity style={[s.submitBtn, { backgroundColor: theme.success }, totalSelected === 0 && s.submitBtnDisabled]} onPress={handleSubmit} disabled={totalSelected === 0 || isSubmitting}>
          <Ionicons name="checkmark-circle" size={20} color="#FFF" />
          <ThemedText style={s.submitBtnText}>Submit for {totalSelected} Participant{totalSelected !== 1 ? 's' : ''}</ThemedText>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </VerticalScrollView>

      <SuccessModal
        visible={showSuccessModal}
        title="Bulk Pass Submitted"
        message={`Gate pass request submitted for ${totalSelected} participant${totalSelected !== 1 ? 's' : ''}. Awaiting HR approval.`}
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

const dd = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  btnText: { fontSize: 15, color: '#1F2937', fontWeight: '500' },
  placeholder: { color: '#9CA3AF' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%', padding: 20 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  optionActive: { backgroundColor: '#FEF3C7', marginHorizontal: -4, paddingHorizontal: 4, borderRadius: 8 },
  optionText: { fontSize: 15, color: '#374151' },
  optionTextActive: { color: '#F59E0B', fontWeight: '700' },
});

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  infoBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  infoBannerText: { flex: 1, fontSize: 13 },
  card: { marginTop: 10, paddingHorizontal: 16, paddingVertical: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryLabel: { fontSize: 12, fontWeight: '600' },
  summaryVal: { fontSize: 22, fontWeight: '700' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 12 },
  checkLabel: { fontSize: 15, fontWeight: '600' },
  checkSub: { fontSize: 12, marginTop: 2 },
  tabs: { flexDirection: 'row', borderRadius: 10, padding: 4, gap: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  tabActive: { backgroundColor: '#F59E0B' },
  tabText: { fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#FFF' },
  badge: { backgroundColor: '#FFF', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#F59E0B' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  countText: { fontSize: 14, fontWeight: '600' },
  selectAllBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  selectAllText: { fontSize: 13, fontWeight: '600', color: '#F59E0B' },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemSub: { fontSize: 12, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyText: { fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  receiverInfo: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 12, gap: 8 },
  receiverInfoText: { flex: 1, fontSize: 13, fontWeight: '500' },
  catTitle: { fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 6, letterSpacing: 0.5 },
  receiverItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderRadius: 10, paddingHorizontal: 8, borderWidth: 1.5, marginBottom: 6 },
  receiverItemActive: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  receiverBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  receiverBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, gap: 10, marginTop: 4 },
  uploadText: { flex: 1, fontSize: 14 },
  attachPreview: { width: '100%', height: 150, borderRadius: 10, marginTop: 10 },
  filePreview: { marginTop: 10, borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  filePreviewText: { flex: 1, fontSize: 14, fontWeight: '600' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', marginHorizontal: 16, marginTop: 16, paddingVertical: 16, borderRadius: 12, gap: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});

export default HODBulkGatePassScreen;
