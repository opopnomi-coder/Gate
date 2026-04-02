import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Animated,
  ActivityIndicator,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImagePicker from '../../utils/safeImagePicker';
import LinearGradient from 'react-native-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { HOD } from '../../types';
import { apiService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import ThemedText from '../../components/ThemedText';
import { VerticalScrollView } from '../../components/navigation/VerticalScrollViews';


interface HODGatePassRequestScreenProps {
  user: HOD;
  onBack?: () => void;
}

const HODGatePassRequestScreen: React.FC<HODGatePassRequestScreenProps> = ({ user, onBack }) => {
  const { theme, isDark } = useTheme();
  const [purpose, setPurpose] = useState('');
  const [reason, setReason] = useState('');
  const [requestDate, setRequestDate] = useState(new Date());
  const [attachment, setAttachment] = useState<{ name: string; base64Uri: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(requestDate);
      newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setRequestDate(newDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(requestDate);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setRequestDate(newDate);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const mimeType = asset.mimeType || 'image/jpeg';
        const base64Uri = `data:${mimeType};base64,${asset.base64}`;
        setAttachment({ name: asset.fileName || 'attachment.jpg', base64Uri });
      }
    } catch (error) { console.error('Image pick error:', error); }
  };

  const handleSubmit = async () => {
    if (!purpose.trim()) {
      setErrorMessage('Please enter the purpose of your gate pass request');
      setShowErrorModal(true);
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('Please provide a reason for your gate pass request');
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    try {
      const result = await apiService.submitHODGatePassRequest(
        user.hodCode,
        purpose.trim(),
        reason.trim(),
        attachment?.base64Uri
      );
      if (result.success) {
        setShowSuccessModal(true);
      } else {
        setErrorMessage(result.message || 'Failed to submit request');
        setShowErrorModal(true);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'An error occurred');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'H';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.surfaceHighlight, borderColor: theme.border }]} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>New Gate Pass Request</ThemedText>
        <View style={{ width: 44 }} />
      </View>

      <VerticalScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 120 }}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* User Info Card */}
          <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <ThemedText style={[styles.avatarText, { color: '#FFFFFF' }]}>{getInitials(user.hodName)}</ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.userName, { color: theme.text }]} numberOfLines={1}>{user.hodName}</ThemedText>
                <ThemedText style={[styles.userDetail, { color: theme.textSecondary }]}>Department: {user.department}</ThemedText>
              </View>
            </View>
            <View style={[styles.activeBadge, { backgroundColor: theme.success }]}>
              <ThemedText style={[styles.activeText, { color: '#FFFFFF' }]}>ACTIVE</ThemedText>
            </View>
          </View>

          {/* Date & Time */}
          <View style={styles.formSection}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>REQUEST DATE & TIME</ThemedText>
            <View style={styles.row}>
              <TouchableOpacity style={[styles.selector, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                <ThemedText style={[styles.selectorText, { color: theme.text }]}>{requestDate.toLocaleDateString()}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.selector, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => setShowTimePicker(true)}>
                <Ionicons name="time-outline" size={20} color={theme.primary} />
                <ThemedText style={[styles.selectorText, { color: theme.text }]}>
                  {requestDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase()}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Purpose */}
          <View style={styles.formSection}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>PURPOSE</ThemedText>
            <TextInput
              style={[styles.purposeInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              placeholder="e.g. Conference, Official Meeting..."
              placeholderTextColor={theme.textTertiary}
              value={purpose}
              onChangeText={setPurpose}
            />
          </View>

          {/* Reason */}
          <View style={styles.formSection}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>REASON</ThemedText>
            <TextInput
              style={[styles.textArea, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              placeholder="e.g. Medical Appointment, Family Emergency..."
              placeholderTextColor={theme.textTertiary}
              multiline
              value={reason}
              onChangeText={setReason}
            />
          </View>

          {/* Attachment */}
          <View style={styles.formSection}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>ATTACHMENT (OPTIONAL)</ThemedText>
            <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: theme.surfaceHighlight, borderColor: theme.border }]} onPress={pickDocument}>
              <Ionicons name="attach-outline" size={22} color={theme.textTertiary} />
              <ThemedText style={[styles.uploadText, { color: theme.textSecondary }]}>
                {attachment ? attachment.name : 'Tap to upload image'}
              </ThemedText>
              {attachment && (
                <TouchableOpacity onPress={() => setAttachment(null)}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            {attachment && (
              <Image source={{ uri: attachment.base64Uri }} style={styles.attachmentPreview} resizeMode="cover" />
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={theme.gradients.primary as [string, string, ...string[]]}
              style={styles.btnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <View style={styles.btnContent}>
                  <Ionicons name="send" size={20} color="#FFF" />
                  <ThemedText style={styles.submitText}>SUBMIT REQUEST</ThemedText>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

        </Animated.View>
      </VerticalScrollView>

      {showDatePicker && (
        <DateTimePicker value={requestDate} mode="date" display="default" onChange={handleDateChange} minimumDate={new Date()} />
      )}
      {showTimePicker && (
        <DateTimePicker value={requestDate} mode="time" display="default" onChange={handleTimeChange} />
      )}

      <SuccessModal
        visible={showSuccessModal}
        title="Request Submitted"
        message="Your gate pass request has been submitted successfully. It will be reviewed by HR."
        onClose={() => { setShowSuccessModal(false); if (onBack) onBack(); }}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  infoCard: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
  avatarContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  userName: { fontSize: 15, fontWeight: '700' },
  userDetail: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  activeText: { fontSize: 10, fontWeight: '700' },
  formSection: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 0.8 },
  row: { flexDirection: 'row', gap: 10 },
  selector: { flex: 1, height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8, borderWidth: 1 },
  selectorText: { fontSize: 13, fontWeight: '600', flex: 1 },
  purposeInput: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontWeight: '500', borderWidth: 1 },
  textArea: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 90, textAlignVertical: 'top', fontSize: 14, fontWeight: '500', borderWidth: 1 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  uploadText: { flex: 1, fontSize: 13, fontWeight: '500' },
  attachmentPreview: { width: '100%', height: 140, borderRadius: 12, marginTop: 8 },
  submitBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8, marginBottom: 24, elevation: 4 },
  btnGradient: { paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitText: { color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.8 },
});

export default HODGatePassRequestScreen;
