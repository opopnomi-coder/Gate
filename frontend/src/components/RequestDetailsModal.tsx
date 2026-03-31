import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import QRCode from 'react-native-qrcode-svg';
import RequestTimeline from './RequestTimeline';
import ThemedText from './ThemedText';

interface RequestDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  request: any;
  student: any;
  showQR?: boolean; // Show QR only in Recent Requests after approval
  qrCode?: string | null;
  manualCode?: string | null;
}

const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({
  visible,
  onClose,
  request,
  student,
  showQR = false,
  qrCode,
  manualCode,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  if (!request) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return '#10B981';
      case 'REJECTED':
        return '#EF4444';
      default:
        return '#F59E0B';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Request Details</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Status Badge */}
            <View style={styles.statusContainer}>
              <ThemedText style={styles.statusLabel}>Status</ThemedText>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(request.status) },
                ]}
              >
                <ThemedText style={styles.statusText}>{request.status || 'PENDING'}</ThemedText>
              </View>
            </View>

            {/* Student Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <ThemedText style={styles.sectionTitle}>Student Information</ThemedText>
                {request.requestType === 'VISITOR' && (
                  <View style={styles.visitorBadge}>
                    <Ionicons name="person-outline" size={12} color="#7C3AED" />
                    <ThemedText style={styles.visitorBadgeText}>VISITOR</ThemedText>
                  </View>
                )}
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Reg No</ThemedText>
                <ThemedText style={styles.infoValue}>{student.regNo || 'N/A'}</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Name</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {student.firstName} {student.lastName || ''}
                </ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Department</ThemedText>
                <ThemedText style={styles.infoValue}>{student.department || 'N/A'}</ThemedText>
              </View>
            </View>

            {/* Pass Details */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Pass Details</ThemedText>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Purpose</ThemedText>
                <ThemedText style={[styles.infoValue, { flex: 1, textAlign: 'right' }]}>
                  {request.purpose || request.reason || 'N/A'}
                </ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Reason</ThemedText>
                <ThemedText style={[styles.infoValue, { flex: 1, textAlign: 'right' }]}>
                  {request.reason || request.purpose || 'N/A'}
                </ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Requested On</ThemedText>
                <ThemedText style={[styles.infoValue, { flex: 1, textAlign: 'right' }]}>
                  {formatDate(request.requestDate)}
                </ThemedText>
              </View>
              {(request.exitDateTime || (request.requestType === 'VISITOR' && request.visitDate)) && (
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>
                    {request.requestType === 'VISITOR' ? 'Entry Schedule' : 'Exit Schedule'}
                  </ThemedText>
                  <ThemedText style={[styles.infoValue, { flex: 1, textAlign: 'right' }]}>
                    {formatDate(request.requestType === 'VISITOR' ? (request.visitDate || request.requestDate) : (request.exitDateTime || request.requestDate))}
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Attachment - Show in My Requests */}
            {!showQR && request.attachmentUri && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Attachment</ThemedText>
                <TouchableOpacity 
                  style={styles.attachmentContainer}
                  onPress={() => setIsFullScreen(true)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: request.attachmentUri }}
                    style={styles.attachmentImage}
                    resizeMode="contain"
                  />
                  <View style={styles.expandIconContainer}>
                    <Ionicons name="expand-outline" size={24} color="#6B7280" />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Timeline */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Timeline</ThemedText>
              <RequestTimeline
                status={request.status}
                staffApproval={request.staffApproval || request.classInchargeApproval || 'PENDING'}
                hodApproval={request.hodApproval || 'PENDING'}
                requestDate={request.requestDate}
                staffRemark={request.staffRemark}
                hodRemark={request.hodRemark}
              />
            </View>

            {/* QR Code - Show ONLY in Recent Requests after HOD approval */}
            {showQR && request.status === 'APPROVED' && qrCode && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>QR Code</ThemedText>
                <View style={styles.qrCodeContainer}>
                  <View style={styles.qrCodeWrapper}>
                    {(qrCode.startsWith('GP|') ||
                      qrCode.startsWith('ST|') ||
                      qrCode.startsWith('SF|') ||
                      qrCode.startsWith('VG|')) ? (
                      <QRCode
                        value={qrCode}
                        size={180}
                        color="#1F2937"
                        backgroundColor="#FFFFFF"
                      />
                    ) : (
                      <Image source={{ uri: qrCode }} style={styles.qrCodeImage} />
                    )}
                  </View>
                </View>

                {manualCode && (
                  <View style={styles.manualCodeContainer}>
                    <ThemedText style={styles.manualCodeLabel}>Manual Entry Code</ThemedText>
                    <ThemedText style={styles.manualCodeText}>{manualCode}</ThemedText>
                  </View>
                )}

                <ThemedText style={styles.qrInstructions}>
                  Scan this QR code at the Main Gate Exit
                </ThemedText>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>

      {/* Full Screen Image Modal */}
      <Modal
        visible={isFullScreen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsFullScreen(false)}
      >
        <View style={styles.fullScreenOverlay}>
          <TouchableOpacity 
            style={styles.fullScreenCloseButton}
            onPress={() => setIsFullScreen(false)}
          >
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          {request?.attachmentUri && (
             <Image
                source={{ uri: request.attachmentUri }}
                style={styles.fullScreenImage}
                resizeMode="contain"
             />
          )}
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  attachmentContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  attachmentImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  expandIconContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  qrCodeContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  qrCodeWrapper: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  qrCodeImage: {
    width: 180,
    height: 180,
  },
  manualCodeContainer: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  manualCodeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  manualCodeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 2,
  },
  qrInstructions: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  visitorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  visitorBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.5,
  },
});

export default RequestDetailsModal;
