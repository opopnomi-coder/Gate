import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  StatusBar,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraView } from '../../shims/expoCamera';
import Ionicons from '@react-native-vector-icons/ionicons';
import { SecurityPersonnel, ScreenName } from '../../types';
import { apiService } from '../../services/api';
import SecurityBottomNav from '../../components/SecurityBottomNav';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import ThemedText from '../../components/ThemedText';

interface ModernQRScannerScreenProps {
  security: SecurityPersonnel;
  onBack: () => void;
  onNavigate: (screen: ScreenName) => void;
}

const ModernQRScannerScreen: React.FC<ModernQRScannerScreenProps> = ({ security, onBack, onNavigate }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [scannerType, setScannerType] = useState<'ENTRY' | 'EXIT' | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');

  useEffect(() => {
    const getCameraPermissions = async () => {
      console.log('🎥 [MODERN] Requesting camera permissions...');
      const { status } = await Camera.requestCameraPermissionsAsync();
      console.log('🎥 [MODERN] Camera permission status:', status);
      setHasPermission(status === 'granted');
      if (status === 'granted') {
        console.log('✅ [MODERN] Camera permission GRANTED');
      } else {
        console.log('❌ [MODERN] Camera permission DENIED');
      }
    };
    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    // CRITICAL: Log immediately to verify camera is detecting
    console.log('========================================');
    console.log('🔍 [MODERN] QR CODE DETECTED BY CAMERA!');
    console.log('📦 [MODERN] Raw Data:', data);
    console.log('📍 [MODERN] Scanner Type:', scannerType);
    console.log('🔒 [MODERN] Scanned state:', scanned);
    console.log('========================================');
    
    if (scanned || !scannerType) {
      console.log('⚠️ [MODERN] Ignoring scan - scanned:', scanned, 'scannerType:', scannerType);
      return;
    }
    
    console.log('✅ [MODERN] Processing scan...');
    setScanned(true);
    setIsLoading(true);

    try {
      // Detect if this is a plain ID code (for late entry) or QR code format
      // QR codes use '/' (ST/userid/random) or '|' (GP|incharge|students|staff|subtype:token for bulk passes)
      const isQRCodeFormat = data.includes('/') || data.includes('|');
      const isEntryScanner = scannerType === 'ENTRY';
      
      console.log('🔍 [MODERN] Code format detection:');
      console.log('  - Is QR format (contains /):', isQRCodeFormat);
      console.log('  - Is Entry scanner:', isEntryScanner);
      console.log('  - Will use late entry:', !isQRCodeFormat && isEntryScanner);
      
      let response;
      
      // If ENTRY scanner and plain ID code (no /), use late entry endpoint
      if (isEntryScanner && !isQRCodeFormat) {
        console.log('🚀 [MODERN] Calling apiService.scanLateEntry (plain ID code)');
        console.log('👤 [MODERN] Security ID:', security.securityId);
        response = await apiService.scanLateEntry(data, security.securityId);
      } else {
        // Otherwise use regular QR scan endpoints
        console.log('🚀 [MODERN] Calling apiService.scanQR' + (scannerType === 'ENTRY' ? 'Entry' : 'Exit') + ' (QR code format)');
        console.log('👤 [MODERN] Security ID:', security.securityId);
        
        response = scannerType === 'ENTRY'
          ? await apiService.scanQREntry(data, security.securityId)
          : await apiService.scanQRExit(data, security.securityId);
      }

      console.log('📥 [MODERN] API Response:', JSON.stringify(response));

      if (response.success) {
        const scanLabel = scannerType === 'ENTRY' ? 'Entry' : 'Exit';
        setModalTitle(`${scanLabel} Recorded`);
        setModalMessage(response.message || `${scanLabel} recorded successfully`);
        setShowSuccessModal(true);
      } else {
        setModalTitle('Scan Failed');
        setModalMessage(response.message || 'Could not process the QR code. Please try again.');
        setShowErrorModal(true);
        resetScanner();
      }
    } catch (error) {
      console.error('❌ [MODERN] Error scanning QR code:', error);
      console.error('❌ [MODERN] Error details:', JSON.stringify(error));
      setModalTitle('Scan Error');
      setModalMessage('Failed to process scan. Please check your connection and try again.');
      setShowErrorModal(true);
      resetScanner();
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualEntry = async () => {
    if (!manualCode.trim() || !scannerType) return;

    setIsLoading(true);
    try {
      // Detect if this is a plain ID code (for late entry) or QR code format
      const isQRCodeFormat = manualCode.includes('/') || manualCode.includes('|');
      const isEntryScanner = scannerType === 'ENTRY';
      
      console.log('🔍 [MODERN] Manual entry code format detection:');
      console.log('  - Code:', manualCode);
      console.log('  - Is QR format (contains /):', isQRCodeFormat);
      console.log('  - Is Entry scanner:', isEntryScanner);
      console.log('  - Will use late entry:', !isQRCodeFormat && isEntryScanner);
      
      let response;
      
      // If ENTRY scanner and plain ID code (no /), use late entry endpoint
      if (isEntryScanner && !isQRCodeFormat) {
        console.log('🚀 [MODERN] Manual entry calling scanLateEntry');
        response = await apiService.scanLateEntry(manualCode, security.securityId);
      } else {
        // Otherwise use regular QR scan endpoints
        console.log('🚀 [MODERN] Manual entry calling scanQR' + (scannerType === 'ENTRY' ? 'Entry' : 'Exit'));
        response = scannerType === 'ENTRY'
          ? await apiService.scanQREntry(manualCode, security.securityId)
          : await apiService.scanQRExit(manualCode, security.securityId);
      }

      if (response.success) {
        const scanLabel = scannerType === 'ENTRY' ? 'Entry' : 'Exit';
        setModalTitle(`${scanLabel} Recorded`);
        setModalMessage(response.message || `${scanLabel} recorded successfully`);
        setManualCode('');
        setShowManualModal(false);
        setShowSuccessModal(true);
      } else {
        setModalTitle('Entry Failed');
        setModalMessage(response.message || 'Could not process the code. Please verify and try again.');
        setShowErrorModal(true);
      }
    } catch (error) {
      setModalTitle('Entry Error');
      setModalMessage('Failed to process manual entry. Please check your connection.');
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setShowCamera(false);
    setScannerType(null);
  };

  const startScanning = (type: 'ENTRY' | 'EXIT') => {
    console.log('📱 [MODERN] Scanner type selected:', type);
    setScannerType(type);
    setShowCamera(true);
    setScanned(false);
    console.log('📷 [MODERN] Camera should now be visible');
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00BCD4" />
          <ThemedText style={styles.loadingText}>Requesting camera permission...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="camera-reverse-outline" size={64} color="#EF4444" />
          <ThemedText style={styles.errorTitle}>Camera Access Denied</ThemedText>
          <ThemedText style={styles.errorText}>Please enable camera permissions in settings</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>QR/Barcode Scanner</ThemedText>
        <View style={styles.headerRight} />
      </View>

      {!showCamera ? (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {/* Scanner Type Selection */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Select Scan Type</ThemedText>
            
            <TouchableOpacity
              style={styles.scanTypeCard}
              onPress={() => startScanning('ENTRY')}
            >
              <View style={[styles.scanTypeIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="log-in" size={32} color="#3B82F6" />
              </View>
              <View style={styles.scanTypeInfo}>
                <ThemedText style={styles.scanTypeTitle}>Entry Scan</ThemedText>
                <ThemedText style={styles.scanTypeDesc}>Scan QR code or barcode for campus entry</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.scanTypeCard}
              onPress={() => startScanning('EXIT')}
            >
              <View style={[styles.scanTypeIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="log-out" size={32} color="#EF4444" />
              </View>
              <View style={styles.scanTypeInfo}>
                <ThemedText style={styles.scanTypeTitle}>Exit Scan</ThemedText>
                <ThemedText style={styles.scanTypeDesc}>Scan QR code or barcode for campus exit</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Manual Entry Option */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Manual Entry</ThemedText>
            <TouchableOpacity
              style={styles.manualButton}
              onPress={() => setShowManualModal(true)}
            >
              <Ionicons name="keypad" size={24} color="#00BCD4" />
              <ThemedText style={styles.manualButtonText}>Enter Code Manually</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <Ionicons name="information-circle" size={24} color="#00BCD4" />
            <View style={styles.instructionsContent}>
              <ThemedText style={styles.instructionsTitle}>How to Scan</ThemedText>
              <ThemedText style={styles.instructionsText}>
                Entry Scanner:{'\n'}
                • QR codes & Barcodes → Regular entry/exit{'\n'}
                • Plain ID codes → Late entry{'\n'}
                {'\n'}
                Exit Scanner:{'\n'}
                • QR codes & Barcodes → Exit records{'\n'}
                {'\n'}
                The system auto-detects the format!
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.cameraContainer}>
          {/* Camera View */}
          <CameraView
            style={styles.camera}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: [
                'qr',
                'ean13',
                'ean8',
                'code128',
                'code39',
                'code93',
                'upc_e',
                'pdf417',
                'aztec',
                'datamatrix',
                'itf14',
              ],
            }}
          >
            <View style={styles.cameraOverlay}>
              {/* Scan Type Badge */}
              <View style={styles.scanTypeBadge}>
                <Ionicons
                  name={scannerType === 'ENTRY' ? 'log-in' : 'log-out'}
                  size={20}
                  color="#FFF"
                />
                <ThemedText style={styles.scanTypeBadgeText}>
                  {scannerType === 'ENTRY' ? 'ENTRY SCAN' : 'EXIT SCAN'}
                </ThemedText>
              </View>

              {/* Scan Frame */}
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
              </View>

              {/* Instructions */}
              <View style={styles.scanInstructions}>
                <ThemedText style={styles.scanInstructionsText}>
                  Position QR code or barcode within frame
                </ThemedText>
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={resetScanner}
              >
                <Ionicons name="close-circle" size={24} color="#FFF" />
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
            </View>

            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#FFF" />
                <ThemedText style={styles.loadingOverlayText}>Processing...</ThemedText>
              </View>
            )}
          </CameraView>
        </View>
      )}

      {/* Manual Entry Modal */}
      <Modal
        visible={showManualModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowManualModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Manual Entry</ThemedText>
              <TouchableOpacity
                onPress={() => setShowManualModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <ThemedText style={styles.modalLabel}>Select Type</ThemedText>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    scannerType === 'ENTRY' && styles.typeButtonActive
                  ]}
                  onPress={() => setScannerType('ENTRY')}
                >
                  <ThemedText style={[
                    styles.typeButtonText,
                    scannerType === 'ENTRY' && styles.typeButtonTextActive
                  ]}>
                    Entry
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    scannerType === 'EXIT' && styles.typeButtonActive
                  ]}
                  onPress={() => setScannerType('EXIT')}
                >
                  <ThemedText style={[
                    styles.typeButtonText,
                    scannerType === 'EXIT' && styles.typeButtonTextActive
                  ]}>
                    Exit
                  </ThemedText>
                </TouchableOpacity>
              </View>

              <ThemedText style={styles.modalLabel}>Enter Code</ThemedText>
              <TextInput
                style={styles.manualInput}
                placeholder="Enter QR code manually"
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!manualCode.trim() || !scannerType) && styles.submitButtonDisabled
                ]}
                onPress={handleManualEntry}
                disabled={!manualCode.trim() || !scannerType || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <ThemedText style={styles.submitButtonText}>Submit</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <SecurityBottomNav activeTab="scanner" onNavigate={onNavigate} />

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title={modalTitle}
        message={modalMessage}
        onClose={() => {
          setShowSuccessModal(false);
          resetScanner();
        }}
        autoClose={true}
        autoCloseDelay={2500}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        type="api"
        title={modalTitle}
        message={modalMessage}
        onClose={() => setShowErrorModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  scanTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  scanTypeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scanTypeInfo: {
    flex: 1,
  },
  scanTypeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  scanTypeDesc: {
    fontSize: 14,
    color: '#6B7280',
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#00BCD4',
    borderStyle: 'dashed',
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00BCD4',
    marginLeft: 8,
  },
  instructionsCard: {
    flexDirection: 'row',
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  instructionsContent: {
    flex: 1,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 13,
    color: '#075985',
    lineHeight: 20,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  scanTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00BCD4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  scanTypeBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#00BCD4',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  scanInstructions: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  scanInstructionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#00BCD4',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: '#FFF',
  },
  manualInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00BCD4',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default ModernQRScannerScreen;
