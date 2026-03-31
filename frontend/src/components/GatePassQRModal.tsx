import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
  Share,
  ToastAndroid,
  Platform
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import QRCode from 'react-native-qrcode-svg';
import Clipboard from '@react-native-clipboard/clipboard';
import RNFS from 'react-native-fs';
import { useTheme } from '../context/ThemeContext';
import ThemedText from './ThemedText';

interface GatePassQRModalProps {
  visible: boolean;
  onClose: () => void;
  // Person info shown at top
  personName: string;
  personId: string; // regNo / staffCode / hodCode
  // QR data
  qrCodeData: string | null;
  manualCode?: string | null;
  // Footer details
  reason?: string;
  validUntil?: string; // defaults to "One time"
}

const isQRString = (val: string) =>
  val.startsWith('GP|') || val.startsWith('ST|') || val.startsWith('SF|') || val.startsWith('VG|') || val.startsWith('HD|');

const GatePassQRModal: React.FC<GatePassQRModalProps> = ({
  visible,
  onClose,
  personName,
  personId,
  qrCodeData,
  manualCode,
  reason,
  validUntil = 'One time',
}) => {
  const { theme } = useTheme();
  const qrSvgRef = React.useRef<any>(null);

  const getPngBase64 = React.useCallback(async (): Promise<string | null> => {
    if (!qrCodeData) return null;
    if (isQRString(qrCodeData)) {
      const ref = qrSvgRef.current;
      if (!ref?.toDataURL) return null;
      return await new Promise((resolve) => {
        ref.toDataURL((data: string) => resolve(data || null));
      });
    }
    if (qrCodeData.startsWith('data:image')) {
      const idx = qrCodeData.indexOf('base64,');
      return idx >= 0 ? qrCodeData.slice(idx + 'base64,'.length) : null;
    }
    return qrCodeData;
  }, [qrCodeData]);

  const writeTempPng = React.useCallback(async (): Promise<string | null> => {
    const base64 = await getPngBase64();
    if (!base64) return null;
    const filename = `gatepass-qr-${Date.now()}.png`;
    const path = `${RNFS.CachesDirectoryPath}/${filename}`;
    await RNFS.writeFile(path, base64, 'base64');
    return `file://${path}`;
  }, [getPngBase64]);

  const handleShare = async () => {
    if (!qrCodeData) return;
    try {
      const url = await writeTempPng();
      await Share.share({
        title: 'Share Gate Pass',
        message: `Gate Pass QR Code\nManual Entry Code: ${manualCode || 'N/A'}\nValid Until: ${validUntil}\nReason: ${reason || 'Gate Pass'}`,
        ...(url ? { url } : {}),
      });
    } catch (e) {
      // silent
    }
  };

  const handleCopyManualCode = () => {
    if (!manualCode) return;
    Clipboard.setString(manualCode);
    if (Platform.OS === 'android') ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT);
  };
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
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
            <View style={[styles.qrCard, { backgroundColor: theme.surface }]}>
              {qrCodeData ? (
                isQRString(qrCodeData) ? (
                  <QRCode
                    value={qrCodeData}
                    size={220}
                    color="#000000"
                    backgroundColor="#FFFFFF"
                    getRef={(c: any) => {
                      qrSvgRef.current = c;
                    }}
                  />
                ) : (
                  <Image
                    source={{ uri: qrCodeData.startsWith('data:image') ? qrCodeData : `data:image/png;base64,${qrCodeData}` }}
                    style={styles.qrImage}
                    resizeMode="contain"
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

            {/* Scan instruction */}
            <ThemedText style={[styles.scanText, { color: theme.textTertiary }]}>SCAN AT MAIN GATE EXIT</ThemedText>

            {/* Details card */}
            <View style={[styles.detailsCard, { backgroundColor: theme.inputBackground }]}>
              <View style={styles.detailRow}>
                <ThemedText style={[styles.detailLabel, { color: theme.textSecondary }]}>Reason:</ThemedText>
                <ThemedText style={[styles.detailValue, { color: theme.text }]} numberOfLines={2}>
                  {reason || 'Gate Pass'}
                </ThemedText>
              </View>
              <View style={styles.detailRow}>
                <ThemedText style={[styles.detailLabel, { color: theme.textSecondary }]}>Valid Until:</ThemedText>
                <ThemedText style={[styles.detailValue, { color: theme.text }]}>{validUntil}</ThemedText>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                onPress={handleShare}
                disabled={!qrCodeData}
              >
                <Ionicons name="share-outline" size={18} color="#FFF" />
                <ThemedText style={styles.actionTextPrimary}>Share</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: theme.surfaceHighlight, opacity: manualCode ? 1 : 0.5 },
                ]}
                onPress={handleCopyManualCode}
                disabled={!manualCode}
              >
                <Ionicons name="copy-outline" size={18} color={theme.text} />
                <ThemedText style={[styles.actionText, { color: theme.text }]}>Copy code</ThemedText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
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
    maxHeight: '88%',
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
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
  },
  personName: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  personId: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 16,
    textAlign: 'center',
  },
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
  qrImage: {
    width: 220,
    height: 220,
  },
  qrLoading: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  qrLoadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
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
  manualLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 5,
  },
  manualValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 6,
  },
  scanText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  detailsCard: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '800',
    flex: 2,
    textAlign: 'right',
  },
  actions: {
    marginTop: 14,
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionTextPrimary: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '800',
  },
});

export default GatePassQRModal;
