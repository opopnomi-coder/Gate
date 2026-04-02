import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Image,
  Modal,
  NativeSyntheticEvent,
  TextInputKeyPressEventData
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { apiService } from '../../services/api.service';
import { detectUserRole } from '../../utils/roleDetection';
import { UserRole } from '../../types';
import { THEME } from '../../config/api.config';
import QRLoginScanner from './QRLoginScanner';
import ErrorModal from '../../components/ErrorModal';
import SuccessModal from '../../components/SuccessModal';
import { useErrorModal } from '../../hooks/useErrorModal';
import { useSuccessModal } from '../../hooks/useSuccessModal';
import { AppError } from '../../utils/errorHandler';
import ThemedText from '../../components/ThemedText';
import { VerticalScrollView } from '../../components/navigation/VerticalScrollViews';


interface ModernUnifiedLoginScreenProps {
  onLoginSuccess: (user: any, role: UserRole) => void;
  onBack?: () => void;
}

const ModernUnifiedLoginScreen: React.FC<ModernUnifiedLoginScreenProps> = ({ onLoginSuccess, onBack }) => {
  const extractLoginId = (rawScan: string): string => {
    const raw = (rawScan || '').trim();
    if (!raw) return '';
    if (!raw.includes('/') && !raw.includes('|')) return raw;

    const tokens = raw
      .split(/[|/:\s,;]+/)
      .map(t => t.trim())
      .filter(Boolean);

    const preferred = tokens.find(token => {
      const upper = token.toUpperCase();
      if (/^\d{8,}$/.test(upper)) return true;
      if (/^(SEC|HR|HOD)[A-Z0-9]+$/.test(upper)) return true;
      if (/^[A-Z]{2,4}\d{2,}$/.test(upper)) return true;
      return false;
    });

    return preferred || raw;
  };

  const [userId, setUserId] = useState('');
  const [otp, setOtp] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showOTPSuccessModal, setShowOTPSuccessModal] = useState(false);
  const [detectedRole, setDetectedRole] = useState<UserRole | null>(null);
  const resolvedRoleRef = useRef<UserRole | null>(null); // always holds the backend-confirmed role
  const [maskedEmail, setMaskedEmail] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Connecting...');

  const { errorInfo, showError, hideError, handleRetry, isVisible } = useErrorModal();
  const { successInfo, showSuccess, hideSuccess, isVisible: isSuccessVisible } = useSuccessModal();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const modalScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    apiService.wakeUpBackend();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (userId.trim().length > 0) {
      const role = detectUserRole(userId);
      setDetectedRole(role);
    } else {
      setDetectedRole(null);
    }
    // Reset resolved role whenever ID changes
    resolvedRoleRef.current = null;
  }, [userId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  useEffect(() => {
    if (showOTPSuccessModal) {
      Animated.spring(modalScale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      modalScale.setValue(0.9);
    }
  }, [showOTPSuccessModal]);

  const handleOtpChange = (text: string, index: number) => {
    // Allow only digits
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setOtp(newDigits.join(''));
    // Auto-advance
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (otpDigits[index] === '' && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        setOtp(newDigits.join(''));
        otpRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
        setOtp(newDigits.join(''));
      }
    }
  };

  const resetOtp = () => {
    setOtpDigits(['', '', '', '', '', '']);
    setOtp('');
  };

  const handleSendOTP = async (idOverride?: string) => {
    const effectiveUserId = (idOverride ?? userId).trim();
    if (!effectiveUserId) {
      showError(new AppError('validation', 'Please enter your ID', 'Missing ID'));
      return;
    }
    setLoading(true);
    setLoadingMessage('Detecting role...');
    try {
      let role = detectUserRole(effectiveUserId);

      // For staff-pattern IDs (HOD/HR/STAFF all share the same ID format),
      // always ask the backend to confirm the actual role FIRST.
      // This prevents HODs from being misrouted to the Staff dashboard.
      if (role === 'STAFF') {
        setLoadingMessage('Verifying credentials...');
        role = await apiService.detectRole(effectiveUserId);
        console.log(`🔍 Backend detected role for ${effectiveUserId}: ${role}`);
      }

      // Update detected role immediately so UI reflects it
      setDetectedRole(role);

      setLoadingMessage('Sending OTP...');
      const response = await apiService.sendOTP(effectiveUserId, role);
      if (response.success) {
        setUserId(effectiveUserId);
        setMaskedEmail(response.maskedEmail || response.email || 'm***@institution.edu');
        setDetectedRole(role);
        resolvedRoleRef.current = role;
        setOtpTimer(120);
        setShowOTPSuccessModal(true);
        console.log(`✅ OTP sent for ${effectiveUserId} as ${role}`);
      } else {
        showError(new AppError('api', response.message || 'Failed to send OTP', 'OTP Send Failed'), handleSendOTP);
      }
    } catch (error: any) {
      showError(error, handleSendOTP);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length !== 6) {
      showError(new AppError('validation', 'Please enter a valid 6-digit OTP', 'Invalid OTP'));
      return;
    }
    // Use ref (set during sendOTP) — state update may not have flushed yet
    const role = resolvedRoleRef.current || detectedRole;
    if (!role) {
      showError(new AppError('validation', 'Role not detected. Please go back and try again.', 'Error'));
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.verifyOTP(userId, otp, role);
      if (response.success && response.user) {
        onLoginSuccess(response.user, role);
      } else {
        showError(new AppError('auth', response.message || 'Invalid OTP', 'Verification Failed'), handleVerifyOTP);
      }
    } catch (error: any) {
      showError(error, handleVerifyOTP);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    if (otpTimer > 0) {
      showError(new AppError('general', `You can resend OTP in ${otpTimer} seconds`, 'Please Wait'));
      return;
    }
    resetOtp();
    handleSendOTP();
  };

  const handleQRScanSuccess = async (qrData: string) => {
    const scannedId = extractLoginId(qrData);
    setShowQRScanner(false);
    setUserId(scannedId);
    await handleSendOTP(scannedId);
  };

  if (showQRScanner) return <QRLoginScanner onScanSuccess={handleQRScanSuccess} onClose={() => setShowQRScanner(false)} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <VerticalScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {onBack && (
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
              <Ionicons name="arrow-back" size={24} color={THEME.colors.text} />
            </TouchableOpacity>
          )}
          <Animated.View style={[styles.mainContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.hero}>
              <View style={styles.logoCont}><Image source={require('../../../assets/rit-logo.png')} style={styles.logo} /></View>
              <ThemedText style={styles.mainTitle}>RIT GATE</ThemedText>
              <ThemedText style={styles.heroSubtitle}>Secure Access Control System</ThemedText>
              <View style={styles.featureRow}>
                <View style={styles.featurePill}>
                  <Ionicons name="finger-print-outline" size={14} color="#0F172A" />
                  <ThemedText style={styles.featureText}>Biometric</ThemedText>
                </View>
                <View style={styles.featurePill}>
                  <Ionicons name="qr-code-outline" size={14} color="#0F172A" />
                  <ThemedText style={styles.featureText}>Badge Scan</ThemedText>
                </View>
                <View style={styles.featurePill}>
                  <Ionicons name="flash-outline" size={14} color="#0F172A" />
                  <ThemedText style={styles.featureText}>Instant</ThemedText>
                </View>
              </View>
            </View>
            <View style={styles.loginCard}>
              <ThemedText style={styles.cardTitle}>{otpSent ? 'Verify Identity' : 'Welcome Back'}</ThemedText>
              <ThemedText style={styles.cardSubtitle}>
                {otpSent ? 'Enter the one-time password sent to your email.' : 'Sign in with your institute credential.'}
              </ThemedText>
            
              {!otpSent ? (
               <View style={{ width: '100%', alignItems: 'center' }}>
                <View style={styles.inputWrap}>
                  <ThemedText style={styles.label}>IDENTIFICATION</ThemedText>
                  <TextInput style={styles.input} placeholder="Security ID / Staff ID / Roll No" placeholderTextColor="#94A3B8" value={userId} onChangeText={setUserId} autoCapitalize="none" editable={!loading} />
                </View>
                <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={() => handleSendOTP()} disabled={loading}>
                  {loading ? (
                    <View style={styles.loaderWrap}>
                       <ActivityIndicator color="#FFF" size="small" />
                       <ThemedText style={styles.loaderTxt}>{loadingMessage}</ThemedText>
                    </View>
                  ) : <ThemedText style={styles.btnTxt}>Continue</ThemedText>}
                </TouchableOpacity>
                <View style={styles.divider}><View style={styles.line} /><ThemedText style={styles.divTxt}>OR</ThemedText><View style={styles.line} /></View>
                <TouchableOpacity style={styles.qrBtn} onPress={() => setShowQRScanner(true)}>
                  <View style={styles.qrIcon}><Ionicons name="qr-code-outline" size={24} color="#1E293B" /></View>
                  <ThemedText style={styles.qrTxt}>Scan QR Code</ThemedText>
                  <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                </TouchableOpacity>
              </View>
              ) : (
                <View style={{ width: '100%', alignItems: 'center' }}>
                    <View style={styles.inputWrap}>
                      <ThemedText style={styles.label}>VERIFICATION CODE</ThemedText>
                      <View style={styles.otpBoxRow}>
                        {otpDigits.map((digit, i) => (
                          <TextInput
                            key={i}
                            ref={ref => { otpRefs.current[i] = ref; }}
                            style={[
                              styles.otpBox,
                              digit ? styles.otpBoxFilled : null,
                              i === otpDigits.findIndex(d => d === '') ? styles.otpBoxActive : null,
                            ]}
                            value={digit}
                            onChangeText={text => handleOtpChange(text, i)}
                            onKeyPress={e => handleOtpKeyPress(e, i)}
                            keyboardType="number-pad"
                            maxLength={1}
                            selectTextOnFocus
                            caretHidden
                            autoFocus={i === 0}
                          />
                        ))}
                      </View>
                      <ThemedText style={styles.otpSubText}>Sent to {maskedEmail}</ThemedText>
                    </View>

                    <View style={styles.otpActions}>
                      {otpTimer > 0 ? (
                        <ThemedText style={styles.timerTxt}>Resend in {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, '0')}</ThemedText>
                      ) : (
                        <TouchableOpacity onPress={handleResendOTP}><ThemedText style={styles.resendLink}>Resend OTP</ThemedText></TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => setOtpSent(false)}><ThemedText style={styles.changeId}>Change ID</ThemedText></TouchableOpacity>
                    </View>

                    <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleVerifyOTP} disabled={loading}>
                      {loading ? <ActivityIndicator color="#FFF" /> : <ThemedText style={styles.btnTxt}>Verify & Login</ThemedText>}
                    </TouchableOpacity>
                </View>
              )}
            </View>
          </Animated.View>
        </VerticalScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showOTPSuccessModal} transparent animationType="fade" onRequestClose={() => setShowOTPSuccessModal(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalBox, { transform: [{ scale: modalScale }] }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}><Ionicons name="shield-checkmark" size={32} color="#FFFFFF" /></View>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowOTPSuccessModal(false)}><Ionicons name="close" size={24} color="#64748B" /></TouchableOpacity>
            </View>
            <ThemedText style={styles.modalTitle}>OTP Sent</ThemedText>
            <ThemedText style={styles.modalSub}>A 6-digit code has been sent to <ThemedText style={styles.emailHighlight}>{maskedEmail}</ThemedText></ThemedText>
            <TouchableOpacity style={styles.verifyBtn} onPress={() => { setShowOTPSuccessModal(false); setOtpSent(true); }}>
              <ThemedText style={styles.verifyTxt}>Enter Code</ThemedText>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <ErrorModal visible={isVisible} type={errorInfo?.type || 'general'} title={errorInfo?.title} message={errorInfo?.message || ''} onClose={hideError} onRetry={errorInfo?.canRetry ? handleRetry : undefined} />
      <SuccessModal visible={isSuccessVisible} title={successInfo?.title} message={successInfo?.message || ''} onClose={hideSuccess} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  mainContent: { flex: 1, alignItems: 'center', paddingTop: 8 },
  hero: { width: '100%', alignItems: 'center', marginBottom: 16 },
  logoCont: { marginBottom: 10 },
  logo: { width: 120, height: 120, borderRadius: 60 },
  mainTitle: { fontSize: 36, fontWeight: '900', color: '#000000', letterSpacing: 2 },
  heroSubtitle: { fontSize: 12, color: '#000000', marginTop: 6, marginBottom: 12, letterSpacing: 1.3, textTransform: 'uppercase' },
  featureRow: { flexDirection: 'row', gap: 8, width: '100%', justifyContent: 'center' },
  featurePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  featureText: { fontSize: 11, color: '#000000', fontWeight: '700' },
  loginCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 6 },
  cardTitle: { fontSize: 24, fontWeight: '800', color: '#000000', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#000000', marginBottom: 16 },
  inputWrap: { width: '100%', marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '800', color: '#000000', letterSpacing: 1, marginBottom: 8 },
  input: { width: '100%', height: 56, backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 16, fontSize: 16, color: '#000000', borderWidth: 1, borderColor: '#E2E8F0' },
  btn: { width: '100%', height: 58, backgroundColor: '#1E293B', borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  btnTxt: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  btnDisabled: { opacity: 0.7 },
  loaderWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loaderTxt: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 32 },
  line: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  divTxt: { marginHorizontal: 16, color: '#000000', fontWeight: '700', fontSize: 12 },
  qrBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  qrIcon: { width: 44, height: 44, backgroundColor: '#FFF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  qrTxt: { flex: 1, fontSize: 16, fontWeight: '700', color: '#000000' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { width: '100%', maxWidth: 360, backgroundColor: '#FFF', borderRadius: 32, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 40, elevation: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalIcon: { width: 62, height: 62, borderRadius: 20, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  modalClose: { width: 36, height: 36, backgroundColor: '#F1F5F9', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#000000', marginBottom: 8 },
  modalSub: { fontSize: 14, color: '#000000', lineHeight: 20, marginBottom: 24 },
  emailHighlight: { color: '#000000', fontWeight: '800' },
  verifyBtn: { width: '100%', height: 58, backgroundColor: '#1E293B', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  verifyTxt: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  otpSubText: { fontSize: 12, color: '#000000', marginTop: 10, textAlign: 'center' },
  otpBoxRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  otpBox: {
    flex: 1,
    height: 68,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: '#1E293B',
    backgroundColor: '#F1F5F9',
  },
  otpBoxActive: {
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  otpActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 32, paddingHorizontal: 4 },
  timerTxt: { fontSize: 13, color: '#000000', fontWeight: '600' },
  resendLink: { fontSize: 13, color: '#000000', fontWeight: '700', textDecorationLine: 'underline' },
  changeId: { fontSize: 13, color: '#000000', fontWeight: '600' },
});

export default ModernUnifiedLoginScreen;
