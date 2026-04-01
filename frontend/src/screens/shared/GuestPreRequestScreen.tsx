import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Linking,
  Platform
} from 'react-native';
import Share from 'react-native-share';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import Clipboard from '@react-native-clipboard/clipboard';
import RNFS from 'react-native-fs';
import { apiService } from '../../services/api';
import ScreenContentContainer from '../../components/ScreenContentContainer';
import ErrorModal from '../../components/ErrorModal';
import { useTheme } from '../../context/ThemeContext';
import ThemedText from '../../components/ThemedText';
import { VerticalScrollView } from '../../components/navigation/VerticalScrollViews';


export type GuestPreRequestRole = 'STAFF' | 'HOD' | 'HR';

interface GuestPreRequestScreenProps {
  creatorRole: GuestPreRequestRole;
  creatorStaffCode: string;
  creatorName?: string;
  /** Prevents unreliable backend directory lookups; pass the department from the logged-in user */
  creatorDepartment?: string;
  onBack: () => void;
}

const GuestPreRequestScreen: React.FC<GuestPreRequestScreenProps> = ({
  creatorRole,
  creatorStaffCode,
  creatorName,
  creatorDepartment: creatorDepartmentProp,
  onBack,
}) => {
  const { theme } = useTheme();

  const [visitorName, setVisitorName] = useState('');
  const [phone, setPhone] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState('1');

  const [creatorDepartment, setCreatorDepartment] = useState(creatorDepartmentProp || '');
  const [creatorDisplayName, setCreatorDisplayName] = useState(creatorName || creatorRole);
  const [loadingCreator, setLoadingCreator] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showErr, setShowErr] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    // When we already know the department from the authenticated user, skip directory lookup.
    if (creatorDepartmentProp) {
      setCreatorDepartment(creatorDepartmentProp);
      setLoadingCreator(false);
      if (creatorName) setCreatorDisplayName(creatorName);
      return;
    }

    (async () => {
      setLoadingCreator(true);
      try {
        const dir = await apiService.getStaffDirectory();
        const list = Array.isArray(dir) ? dir : [];
        const creator = list.find((s: any) => {
          const id = s.staffId ?? s.staffCode ?? s.staff_id ?? s.id ?? '';
          return String(id) === String(creatorStaffCode);
        });

        if (!creator) {
          setErrMsg('Could not load your department details for guest pre-request.');
          setShowErr(true);
          return;
        }

        const dept = creator.department ?? '';
        if (!dept) {
          setErrMsg('Department not found for your account.');
          setShowErr(true);
          return;
        }

        setCreatorDepartment(dept);
        const nm = creator.staffName ?? creator.name ?? '';
        if (nm) setCreatorDisplayName(nm);
      } catch {
        setErrMsg('Could not load staff directory.');
        setShowErr(true);
      } finally {
        setLoadingCreator(false);
      }
    })();
  }, [creatorStaffCode, creatorDepartmentProp, creatorName]);

  const guestEmail = useMemo(() => {
    const digits = phone.replace(/\D/g, '');
    const local = digits ? digits.slice(-10) : 'guest';
    return `${local}@guest.ritgate.local`;
  }, [phone]);

  const qrSvgRef = React.useRef<any>(null);

  const writeTempQrPng = async () => {
    if (!qrCode) return null;
    const ref = qrSvgRef.current;
    if (!ref?.toDataURL) return null;
    // Export at 4x scale (720px) for high-quality sharing
    const base64 = await new Promise<string | null>((resolve) => {
      ref.toDataURL((data: string) => resolve(data || null), { width: 720, height: 720 });
    });
    if (!base64) return null;
    const filename = `visitor-qr-${Date.now()}.png`;
    const path = `${RNFS.CachesDirectoryPath}/${filename}`;
    await RNFS.writeFile(path, base64, 'base64');
    return `file://${path}`;
  };

  const shareWhatsApp = async () => {
    try {
      const url = await writeTempQrPng();
      await Share.shareSingle({
        title: 'Guest gate pass',
        message: `RIT Gate — Guest pass\nName: ${visitorName}\nManual code: ${manualCode}\nShow this QR at security.`,
        url: url || undefined,
        social: Share.Social.WHATSAPP as any,
      });
    } catch {
      await shareGeneric();
    }
  };

  const shareGeneric = async () => {
    try {
      const url = await writeTempQrPng();
      await Share.open({
        title: 'Guest gate pass',
        message: `RIT Gate — Guest pass\nName: ${visitorName}\nManual code: ${manualCode}\nShow this QR at security.`,
        url: url || undefined,
      });
    } catch {
      /* ignore */
    }
  };

  const copyManual = () => {
    if (!manualCode) return;
    Clipboard.setString(manualCode);
  };

  const submit = async () => {
    if (!visitorName.trim() || !phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setErrMsg('Enter valid guest name and phone (min 10 digits).');
      setShowErr(true);
      return;
    }
    if (!creatorDepartment) {
      setErrMsg('Department is missing. Please try again.');
      setShowErr(true);
      return;
    }

    const people = Math.max(1, parseInt(numberOfPeople, 10) || 1);

    setSubmitting(true);
    try {
      const res = await apiService.createInstantGuestPass({
        name: visitorName.trim(),
        email: guestEmail,
        phone: phone.trim(),
        department: creatorDepartment,
        // Backend sets personToMeet = staffCode for instant guests.
        staffCode: creatorStaffCode,
        purpose: 'Pre-request visitor',
        numberOfPeople: people,
        vehicleNumber: undefined,
        creatorStaffCode,
        creatorRole,
      });
      if (!res.success) {
        setErrMsg(res.message || 'Could not create guest pass');
        setShowErr(true);
        return;
      }
      setQrCode(res.qrCode || '');
      setManualCode(res.manualCode || '');
    } catch (e: any) {
      setErrMsg(e?.message || 'Request failed');
      setShowErr(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.surfaceHighlight }]} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>Pre-register guest</ThemedText>
        <View style={{ width: 40 }} />
      </View>
      <ScreenContentContainer>
        <VerticalScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false} decelerationRate="normal"
        >
          <ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
            Creates an approved visitor pass with QR and manual code (no waiting). Share with your guest.
          </ThemedText>
          {creatorName ? (
            <ThemedText style={[styles.subHint, { color: theme.textTertiary }]}>Logged in as {creatorName} ({creatorRole})</ThemedText>
          ) : null}

          {loadingCreator ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>Loading your profile…</ThemedText>
            </View>
          ) : (
            <>
              <View style={[styles.meetCard, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
                <ThemedText style={[styles.meetLabel, { color: theme.textTertiary }]}>Person to meet</ThemedText>
                <ThemedText style={[styles.meetValue, { color: theme.text }]}>{creatorDisplayName || creatorName || 'Creator'}</ThemedText>
              </View>

              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Number of people *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                value={numberOfPeople}
                onChangeText={setNumberOfPeople}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor={theme.textTertiary}
              />

              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Guest name *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                value={visitorName}
                onChangeText={setVisitorName}
                placeholder="Full name"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="words"
              />

              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Phone number *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+91..."
                placeholderTextColor={theme.textTertiary}
              />
            </>
          )}

          {!qrCode ? (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
              onPress={submit}
              disabled={submitting || loadingCreator}
            >
              {submitting ? (
                <ActivityIndicator color={theme.textInverse} />
              ) : (
                <ThemedText style={[styles.primaryBtnText, { color: theme.textInverse }]}>Register &amp; generate pass</ThemedText>
              )}
            </TouchableOpacity>
          ) : (
            <View style={[styles.resultCard, { backgroundColor: theme.success + 'EE', borderColor: theme.success }]}>
              <ThemedText ignoreGradient style={[styles.resultTitle, { color: '#FFFFFF' }]}>Pass generated</ThemedText>
              <View style={[styles.qrWrap, { backgroundColor: '#FFFFFF', borderColor: 'rgba(255,255,255,0.3)' }]}>
                <QRCode
                  value={qrCode}
                  size={220}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                  getRef={(c: any) => {
                    qrSvgRef.current = c;
                  }}
                />
              </View>
              <View style={styles.manualRow}>
                <Ionicons name="keypad-outline" size={18} color="rgba(255,255,255,0.8)" />
                <ThemedText ignoreGradient style={[styles.manualBig, { color: '#FFFFFF' }]}>{manualCode}</ThemedText>
              </View>
              <View style={styles.resultActions}>
                <TouchableOpacity style={styles.waBtnNew} onPress={shareWhatsApp}>
                  <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                  <ThemedText style={styles.waBtnNewText}>WhatsApp</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareBtnNew} onPress={shareGeneric}>
                  <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.shareBtnNewText}>Share</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.copyBtnNew} onPress={copyManual}>
                  <Ionicons name="copy-outline" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.copyBtnNewText}>Copy</ThemedText>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.doneBtnNew} onPress={onBack}>
                <ThemedText style={styles.doneBtnNewText}>Done</ThemedText>
              </TouchableOpacity>
            </View>
          )}
          <View style={{ height: 40 }} />
        </VerticalScrollView>
      </ScreenContentContainer>

      <ErrorModal
        visible={showErr}
        type="general"
        title="Could not register"
        message={errMsg}
        onClose={() => setShowErr(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 120 },
  hint: { fontSize: 14, marginBottom: 8 },
  subHint: { fontSize: 12, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  loadingWrap: { paddingVertical: 24, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, fontSize: 13, fontWeight: '600' },
  meetCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 8 },
  meetLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, marginBottom: 6 },
  meetValue: { fontSize: 16, fontWeight: '800' },
  primaryBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 24 },
  primaryBtnText: { fontSize: 16, fontWeight: '700' },
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    paddingHorizontal: 20,
  },
  waBtnText: { fontWeight: '700' },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  shareBtnText: { fontWeight: '700' },
  resultCard: {
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  resultTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  qrWrap: {
    alignSelf: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
  },
  manualBig: { fontSize: 20, fontWeight: '800', letterSpacing: 2, marginBottom: 16 },
  resultActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  copyBtnText: { fontWeight: '800' },
  doneBtn: { marginTop: 16, padding: 14, alignItems: 'center', borderRadius: 12 },
  doneBtnText: { fontWeight: '700' },
  // New result card styles
  manualRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  waBtnNew: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#FFFFFF' },
  waBtnNewText: { fontWeight: '700', color: '#1F2937', fontSize: 14 },
  shareBtnNew: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  shareBtnNewText: { fontWeight: '700', color: '#FFFFFF', fontSize: 14 },
  copyBtnNew: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  copyBtnNewText: { fontWeight: '700', color: '#FFFFFF', fontSize: 14 },
  doneBtnNew: { marginTop: 16, padding: 14, alignItems: 'center', borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.15)' },
  doneBtnNewText: { fontWeight: '700', color: '#FFFFFF', fontSize: 15 },
});

export default GuestPreRequestScreen;
