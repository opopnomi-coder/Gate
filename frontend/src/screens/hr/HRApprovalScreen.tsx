import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { apiService } from '../../services/api';
import { Staff, GatePassRequest } from '../../types';
import { THEME } from '../../config/api.config';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import ThemedText from '../../components/ThemedText';
import { VerticalFlatList, VerticalScrollView } from '../../components/navigation/VerticalScrollViews';
import { useTheme } from '../../context/ThemeContext';


interface HRApprovalScreenProps {
  user: Staff;
  request: any;
  onBack: () => void;
}

const HRApprovalScreen: React.FC<HRApprovalScreenProps> = ({ user, request, onBack }) => {
  const { theme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false);
  const [previewAttachmentUri, setPreviewAttachmentUri] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackTitle, setFeedbackTitle] = useState('');

  const handleApprove = async () => {
    setLoading(true);
    try {
      const result = await apiService.approveRequestAsHR(request.id, user.staffCode);
      if (result.success) {
        setFeedbackTitle('Approved');
        setFeedbackMessage('Gate pass request approved successfully.');
        setShowSuccessModal(true);
      } else {
        setFeedbackTitle('Error');
        setFeedbackMessage(result.message || 'Failed to approve request.');
        setShowErrorModal(true);
      }
    } catch (error: any) {
      setFeedbackTitle('Error');
      setFeedbackMessage(error.message || 'Failed to approve request.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setFeedbackTitle('Reason Required');
      setFeedbackMessage('Please provide a reason for rejection.');
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    setRejectModalVisible(false);

    try {
      const result = await apiService.rejectRequestAsHR(
        request.id,
        user.staffCode,
        rejectReason.trim()
      );
      if (result.success) {
        setFeedbackTitle('Rejected');
        setFeedbackMessage('Gate pass request has been rejected.');
        setShowSuccessModal(true);
      } else {
        setFeedbackTitle('Error');
        setFeedbackMessage(result.message || 'Failed to reject request.');
        setShowErrorModal(true);
      }
    } catch (error: any) {
      setFeedbackTitle('Error');
      setFeedbackMessage(error.message || 'Failed to reject request.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
      setRejectReason('');
    }
  };

  if (!request) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: theme.inputBackground }]}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>Request Details</ThemedText>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={theme.error} />
          <ThemedText style={[styles.errorText, { color: theme.textSecondary }]}>Request not found</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: theme.inputBackground }]}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>Request Details</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <VerticalFlatList
        style={styles.scrollView}
        data={[request]}
        keyExtractor={(item: GatePassRequest) => (item.id ?? Math.random()).toString()}
        renderItem={null}
        ListHeaderComponent={
          <View style={styles.scrollContent}>
            {/* Request Info Card */}
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
                <Ionicons name="document-text" size={24} color={theme.primary} />
                <ThemedText style={[styles.cardTitle, { color: theme.text }]}>Request Information</ThemedText>
              </View>

              <View style={styles.infoRow}>
                <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>Request ID:</ThemedText>
                <ThemedText style={[styles.infoValue, { color: theme.text }]}>#{request.id}</ThemedText>
              </View>

              <View style={styles.infoRow}>
                <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>Purpose:</ThemedText>
                <ThemedText style={[styles.infoValue, { color: theme.text }]}>{request.purpose}</ThemedText>
              </View>

              <View style={styles.infoRow}>
                <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>Reason:</ThemedText>
                <ThemedText style={[styles.infoValue, { color: theme.text }]}>{request.reason}</ThemedText>
              </View>

              <View style={styles.infoRow}>
                <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>Exit Schedule:</ThemedText>
                <ThemedText style={[styles.infoValue, { color: theme.text }]}>
                  {new Date(request.requestDate).toLocaleString()}
                </ThemedText>
              </View>
            </View>

            {/* HOD Info Card */}
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
                <Ionicons name="person" size={24} color={theme.primary} />
                <ThemedText style={[styles.cardTitle, { color: theme.text }]}>HOD Information</ThemedText>
              </View>

              <View style={styles.infoRow}>
                <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>HOD Code:</ThemedText>
                <ThemedText style={[styles.infoValue, { color: theme.text }]}>{request.regNo}</ThemedText>
              </View>

              {request.studentName && (
                <View style={styles.infoRow}>
                  <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>Name:</ThemedText>
                  <ThemedText style={[styles.infoValue, { color: theme.text }]}>{request.studentName}</ThemedText>
                </View>
              )}

              {request.department && (
                <View style={styles.infoRow}>
                  <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>Department:</ThemedText>
                  <ThemedText style={[styles.infoValue, { color: theme.text }]}>{request.department}</ThemedText>
                </View>
              )}
            </View>

            {/* Attachment Section */}
            {request.attachmentUri && (
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
                  <Ionicons name="attach-outline" size={24} color={theme.textSecondary} />
                  <ThemedText style={[styles.cardTitle, { color: theme.text }]}>Attachment</ThemedText>
                </View>
                <TouchableOpacity 
                  style={[styles.vAttachmentCard, { backgroundColor: theme.inputBackground }]}
                  onPress={() => {
                    setPreviewAttachmentUri(request.attachmentUri);
                    setShowAttachmentPreview(true);
                  }}
                >
                  <Image
                    source={{ uri: request.attachmentUri }}
                    style={styles.vAttachmentImage}
                    resizeMode="cover"
                  />
                  <View style={[styles.vPreviewButton, { backgroundColor: theme.surface }]}>
                    <Ionicons name="expand-outline" size={20} color={theme.text} />
                    <ThemedText style={[styles.vPreviewText, { color: theme.text }]}>Preview Attachment</ThemedText>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Action Buttons */}
            {request.status === 'PENDING_HR' && (
              <View style={styles.actionContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton, { backgroundColor: theme.success }]}
                  onPress={handleApprove}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                      <ThemedText style={styles.actionButtonText}>Approve Request</ThemedText>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton, { backgroundColor: theme.error }]}
                  onPress={() => setRejectModalVisible(true)}
                  disabled={loading}
                >
                  <Ionicons name="close-circle" size={20} color="#FFF" />
                  <ThemedText style={styles.actionButtonText}>Reject Request</ThemedText>
                </TouchableOpacity>
              </View>
            )}

            {request.status !== 'PENDING_HR' && (
              <View style={[styles.statusCard, { backgroundColor: theme.surface }]}>
                <Ionicons
                  name={request.status === 'APPROVED' ? 'checkmark-circle' : 'close-circle'}
                  size={48}
                  color={request.status === 'APPROVED' ? theme.success : theme.error}
                />
                <ThemedText style={[styles.statusText, { color: theme.text }]}>
                  This request has been {request.status.toLowerCase()}
                </ThemedText>
              </View>
            )}
          </View>
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* Fullscreen Attachment Preview Modal */}
      <Modal
        visible={showAttachmentPreview}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAttachmentPreview(false)}
      >
        <View style={styles.attachmentPreviewOverlay}>
          <TouchableOpacity
            style={styles.attachmentPreviewClose}
            onPress={() => setShowAttachmentPreview(false)}
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          {previewAttachmentUri && (
            <Image
              source={{ uri: previewAttachmentUri }}
              style={styles.attachmentPreviewImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <ThemedText style={[styles.modalTitle, { color: theme.text }]}>Reject Request</ThemedText>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <ThemedText style={[styles.modalLabel, { color: theme.text }]}>Reason for Rejection *</ThemedText>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                placeholder="Provide a detailed reason for rejection..."
                placeholderTextColor={theme.textTertiary}
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              <ThemedText style={[styles.charCount, { color: theme.textSecondary }]}>{rejectReason.length}/500</ThemedText>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.error }]}
                onPress={handleReject}
                disabled={!rejectReason.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <ThemedText style={styles.modalButtonText}>Confirm Rejection</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SuccessModal
        visible={showSuccessModal}
        title={feedbackTitle}
        message={feedbackMessage}
        onClose={() => {
          setShowSuccessModal(false);
          onBack();
        }}
        autoClose={false}
      />

      <ErrorModal
        visible={showErrorModal}
        type="api"
        title={feedbackTitle}
        message={feedbackMessage}
        onClose={() => setShowErrorModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  actionContainer: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  approveButton: {
  },
  rejectButton: {
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusCard: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    borderWidth: 1,
    height: 120,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  modalButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  vAttachmentCard: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 300,
    position: 'relative',
    marginTop: 8,
  },
  vAttachmentImage: {
    width: '100%',
    height: '100%',
  },
  vPreviewButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -25 }],
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    width: 200,
    justifyContent: 'center',
  },
  vPreviewText: {
    fontSize: 15,
    fontWeight: '700',
  },
  attachmentPreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentPreviewClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  attachmentPreviewImage: {
    width: '90%',
    height: '80%',
  },
});

export default HRApprovalScreen;
