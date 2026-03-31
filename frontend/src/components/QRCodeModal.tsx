import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Share,
} from 'react-native';
import Modal from 'react-native-modal';
import Ionicons from '@react-native-vector-icons/ionicons';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../context/ThemeContext';

const TypedModal = Modal as any;

interface QRCodeModalProps {
  visible: boolean;
  onClose: () => void;
  qrCodeData: string | null;
  manualCode?: string | null;
  request?: any;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  visible,
  onClose,
  qrCodeData,
  manualCode,
  request,
}) => {
  const { theme } = useTheme();

  // Check if qrCodeData is a base64 image or a QR string
  const isBase64Image = qrCodeData?.startsWith('data:image');
  // QR string formats: 
  // - Bulk: GP|staffCode|studentIds||SEG:signature
  // - Single: SF/ST/VG|staffCode/studentId/null|token
  const isQRString = qrCodeData && !isBase64Image;

  const handleShare = async () => {
    if (!qrCodeData) return;
    
    try {
      await Share.share({
        message: `Gate Pass QR Code${isQRString ? `\nQR Data: ${qrCodeData}` : ''}\nManual Entry Code: ${manualCode || 'N/A'}\nPurpose: ${request?.purpose || 'N/A'}`,
        title: 'Share Gate Pass',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <TypedModal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      animationIn="zoomIn"
      animationOut="zoomOut"
      backdropOpacity={0.5}
      style={styles.modal}
    >
      <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Gate Pass QR Code</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          {qrCodeData ? (
            isQRString ? (
              // Generate QR code from string (for bulk passes)
              <View style={styles.qrCodeWrapper}>
                <QRCode
                  value={qrCodeData}
                  size={250}
                  color={theme.text}
                  backgroundColor={theme.cardBackground}
                />
              </View>
            ) : (
              // Display base64 image (for regular passes)
              <Image
                source={{ uri: qrCodeData }}
                style={styles.qrCode}
                resizeMode="contain"
              />
            )
          ) : (
            <View style={styles.loadingContainer}>
              <Ionicons name="qr-code-outline" size={64} color={theme.textSecondary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Loading QR Code...
              </Text>
            </View>
          )}
        </View>

        {/* Manual Entry Code */}
        {manualCode && (
          <View style={[styles.manualCodeContainer, { backgroundColor: theme.background }]}>
            <Text style={[styles.manualCodeLabel, { color: theme.textSecondary }]}>
              Manual Entry Code
            </Text>
            <Text style={[styles.manualCode, { color: theme.primary }]}>
              {manualCode}
            </Text>
          </View>
        )}

        {/* Request Details */}
        {request && (
          <View style={styles.detailsContainer}>
            {/* Show pass type for bulk passes */}
            {request.passType === 'BULK' && (
              <View style={[styles.bulkPassBadge, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="people" size={16} color={theme.primary} />
                <Text style={[styles.bulkPassText, { color: theme.primary }]}>
                  Group Pass {request.includeStaff ? '(Staff Included)' : ''}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={20} color={theme.textSecondary} />
              <Text style={[styles.detailText, { color: theme.text }]}>
                {request.purpose || request.reason || 'Gate Pass'}
              </Text>
            </View>
            
            {request.requestDate && (
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} />
                <Text style={[styles.detailText, { color: theme.text }]}>
                  {formatDate(request.requestDate)}
                </Text>
              </View>
            )}

            {request.passType === 'BULK' && request.studentCount && (
              <View style={styles.detailRow}>
                <Ionicons name="people-outline" size={20} color={theme.textSecondary} />
                <Text style={[styles.detailText, { color: theme.text }]}>
                  {request.studentCount} student{request.studentCount > 1 ? 's' : ''} in group
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Ionicons 
                name={request.status === 'APPROVED' ? 'checkmark-circle' : 'time-outline'} 
                size={20} 
                color={request.status === 'APPROVED' ? '#10B981' : '#F59E0B'} 
              />
              <Text style={[styles.detailText, { color: theme.text }]}>
                Status: {request.status || 'PENDING'}
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: theme.primary }]}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={20} color="#FFFFFF" />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.closeButtonBottom, { backgroundColor: theme.background }]}
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: theme.text }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TypedModal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    minHeight: 250,
  },
  qrCodeWrapper: {
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCode: {
    width: 250,
    height: 250,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  manualCodeContainer: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  manualCodeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  manualCode: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 2,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  bulkPassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  bulkPassText: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButtonBottom: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QRCodeModal;
