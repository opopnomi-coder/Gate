import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import Clipboard from '@react-native-clipboard/clipboard';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { useTheme } from '../context/ThemeContext';
import ThemedText from './ThemedText';

interface GatePassQRModalProps {
  visible: boolean;
  onClose: () => void;
  personName: string;
  personId: string;
  qrCodeData: string | null;
  manualCode?: string | null;
  reason?: string;
  validUntil?: string;
  /** If true, show share buttons inside the modal (for guest pre-register) */
  showShare?: boolean;
  visitorName?: string;
}

const isQRString = (val: string) => {
  const v = val.trim();
  return v.startsWith('GP|') || v.startsWith('ST|') || v.startsWith('SF|') ||
         v.startsWith('VG|') || v.startsWith('HD|');
};

const GatePassQRModal: React.FC<GatePassQRModalProps> = ({
  visible,
  onClose,
  personName,
  personId,
  qrCodeData,
  manualCode,
  reason,
  validUntil = 'One time',
  showShare = false,
  visitorName,
}) => {
  const { theme } = useTheme();
  const qrRef = useRef<any>(null);

  const exportQrPng = async (): Promise<string | null> => {
    if (!qrRef.current?.toDataURL) return null;
    const base64 = await new Promise<string | null>((resolve) => {
      // Export at 800px with quiet zone padding built in
      qrRef.current.toDataURL((data: string) => resolve(data || null), { width: 800, height: 800 });
    });
    if (!base64) return null;
    const path = `${RNFS.CachesDirectoryPath}/guest-qr-${Date.now()}.png`;
    await RNFS.writeFile(path, base64, 'base64');
    return `file://${path}`;
  };

  const shareMessage = `🏛️ RIT Gate — Guest Pass\n\n👤 Name: ${visitorName || personName}\n🔢 Manual Code: ${manualCode || ''}\n\n📱 Show the QR code image at the security gate for entry.`;

  const handleShare = async () => {
    try {
      const url = await exportQrPng();
      await Share.open({
        title: 'Guest Gate Pass',
        message: shareMessage,
        url: url || undefined,
        type: url ? 'image/png' : 'text/plain',
      });
    } catch {
      // user cancelled or error — ignore
    }
  };

  const handleWhatsApp = async () => {
    try {
      const url = await exportQrPng();
      if (url) {
        // Share image + message via WhatsApp
        await Share.shareSingle({
          title: 'Guest Gate Pass',
          message: shareMessage,
          url,
          type: 'image/png',
          social: Share.Social.WHATSAPP as any,
          filename: 'guest-pass-qr.png',
        });
      } else {
        // No image — share text only
        await Share.shareSingle({
          title: 'Guest Gate Pass',
          message: shareMessage,
          social: Share.Social.WHATSAPP as any,
        });
      }
    } catch {
      // Fallback to generic share
      await handleShare();
    }
  };

  const handleCopy = () => {
    if (manualCode) Clipboard.setString(manualCode);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()} style={[styles.card, { backgroundColor: theme.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <ThemedText style={[styles.title, { color: theme.text }]}>Gate Pass QR Code</ThemedText>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.surfaceHighlight }]}>
              <Ionicons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Person Info */}
            <ThemedText style={[styles.personName, { color: theme.text }]}>{personName.toUpperCase()}</ThemedText>
            <ThemedText style={[styles.personId, { color: theme.textSecondary }]}>{personId}</ThemedText>

            {/* QR Code */}
            <View style={[styles.qrCard, { backgroundColor: '#FFFFFF' }]}>
              {qrCodeData ? (
                isQRString(qrCodeData) ? (
                  <QRCode
                    value={qrCodeData.trim()}
                    size={220}
                    color="#000000"
                    backgroundColor="#FFFFFF"
                    getRef={(c: any) => { qrRef.current = c; }}
                    quietZone={10}
                  />
                ) : (
                  <Image
                    source={{ uri: qrCodeData.startsWith('data:image') ? qrCodeData : `data:image/png;base64,${qrCodeData}` }}
                    style={styles.qrImage}
                    resizeMode="contain"
                    onError={() => console.warn('QR image failed to load:', qrCodeData?.substring(0, 50))}
                  />
                )
              ) : (
                <View style={styles.qrLoading}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <ThemedText style={[styles.qrLoadingText, { color: theme.textTertiary }]}>Loading...</ThemedText>
                </View>
              )}
            </View>

            {/* Manual Entry Code */}
            {manualCode ? (
              <View style={[styles.manualBox, { borderColor: theme.border }]}>
                <ThemedText style={[styles.manualLabel, { color: theme.textSecondary }]}>MANUAL ENTRY CODE</ThemedText>
                <ThemedText style={[styles.manualValue, { color: theme.text }]}>{manualCode}</ThemedText>
              </View>
            ) : null}

            <ThemedText style={[styles.scanText, { color: theme.textTertiary }]}>SCAN AT MAIN GATE</ThemedText>

            {/* Details */}
            <View style={[styles.detailsCard, { backgroundColor: theme.inputBackground }]}>
              <View style={styles.detailRow}>
                <ThemedText style={[styles.detailLabel, { color: theme.textSecondary }]}>Reason:</ThemedText>
                <ThemedText style={[styles.detailValue, { color: theme.text }]} numberOfLines={2}>{reason || 'Gate Pass'}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText style={[styles.detailLabel, { color: theme.textSecondary }]}>Valid Until:</ThemedText>
                <ThemedText style={[styles.detailValue, { color: theme.text }]}>{validUntil}</ThemedText>
              </View>
            </View>

            {/* Share buttons — only shown for guest pre-register */}
            {showShare && (
              <View style={styles.shareSection}>
                <TouchableOpacity style={[styles.shareBtn, { backgroundColor: '#25D366' }]} onPress={handleWhatsApp}>
                  <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                  <ThemedText style={styles.shareBtnText}>WhatsApp</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.shareBtn, { backgroundColor: theme.primary }]} onPress={handleShare}>
                  <Ionicons name="share-outline" size={18} color="#fff" />
                  <ThemedText style={styles.shareBtnText}>Share</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.shareBtn, { backgroundColor: theme.surfaceHighlight }]} onPress={handleCopy}>
                  <Ionicons name="copy-outline" size={18} color={theme.text} />
                  <ThemedText style={[styles.shareBtnText, { color: theme.text }]}>Copy Code</ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 20,
    width: '100%',
    maxWidth: 360,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '800' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  body: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 },
  personName: { fontSize: 17, fontWeight: '800', textAlign: 'center', letterSpacing: 0.5 },
  personId: { fontSize: 13, fontWeight: '600', marginTop: 4, marginBottom: 16, textAlign: 'center' },
  qrCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: { width: 220, height: 220 },
  qrLoading: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', gap: 12 },
  qrLoadingText: { fontSize: 14, fontWeight: '500' },
  manualBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  manualLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 5 },
  manualValue: { fontSize: 28, fontWeight: '700', letterSpacing: 6 },
  scanText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 14 },
  detailsCard: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, width: '100%', gap: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  detailLabel: { fontSize: 14, fontWeight: '500', flex: 1 },
  detailValue: { fontSize: 14, fontWeight: '800', flex: 2, textAlign: 'right' },
  // Share section inside modal
  shareSection: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, width: '100%', justifyContent: 'center' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 12 },
  shareBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});

export default GatePassQRModal;
