import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SecurityPersonnel, ScreenName, Department, StaffMember } from '../../types';
import { apiService } from '../../services/api';
import SecurityBottomNav from '../../components/SecurityBottomNav';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import ThemedText from '../../components/ThemedText';
import { VerticalScrollView } from '../../components/navigation/VerticalScrollViews';
import SearchableDropdown from '../../components/SearchableDropdown';
import { useTheme } from '../../context/ThemeContext';


interface ModernVisitorRegistrationScreenProps {
  security: SecurityPersonnel;
  onBack: () => void;
  onNavigate: (screen: ScreenName) => void;
}

const ModernVisitorRegistrationScreen: React.FC<ModernVisitorRegistrationScreenProps> = ({
  security,
  onBack,
  onNavigate,
}) => {
  const { theme } = useTheme();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  
  const [numberOfVisitors, setNumberOfVisitors] = useState('1');
  const [visitorNames, setVisitorNames] = useState<string[]>(['']);
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [purpose, setPurpose] = useState('');
  const [role, setRole] = useState<'VISITOR' | 'VENDOR'>('VISITOR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [registeredVisitorName, setRegisteredVisitorName] = useState('');

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      loadStaffMembers(selectedDepartment);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    // Update visitor names array when number changes
    const num = parseInt(numberOfVisitors) || 1;
    const newNames = Array(num).fill('').map((_, index) => visitorNames[index] || '');
    setVisitorNames(newNames);
  }, [numberOfVisitors]);

  const loadDepartments = async () => {
    try {
      const response = await apiService.getDepartments();
      if (response.success && response.data) {
        setDepartments(response.data);
      } else {
        setErrorMessage('Failed to load departments. Please try again.');
        setShowErrorModal(true);
      }
    } catch (error) {
      setErrorMessage('Failed to load departments. Please check your connection.');
      setShowErrorModal(true);
    }
  };

  const loadStaffMembers = async (deptId: string) => {
    try {
      const response = await apiService.getStaffByDepartment(deptId);
      if (response.success && response.data) {
        setStaffMembers(response.data);
      } else {
        setStaffMembers([]);
      }
    } catch (error) {
      setStaffMembers([]);
    }
  };

  const handleSubmit = async () => {
    if (visitorNames.some(name => !name.trim())) {
      setErrorMessage('Please enter names for all visitors');
      setShowErrorModal(true);
      return;
    }
    if (!visitorEmail.trim() || !visitorEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      setShowErrorModal(true);
      return;
    }
    if (!visitorPhone.trim() || visitorPhone.length < 10) {
      setErrorMessage('Please enter a valid phone number (minimum 10 digits)');
      setShowErrorModal(true);
      return;
    }
    if (!selectedDepartment) {
      setErrorMessage('Please select a department');
      setShowErrorModal(true);
      return;
    }
    if (!selectedStaff) {
      setErrorMessage('Please select a staff member to meet');
      setShowErrorModal(true);
      return;
    }
    if (!purpose.trim()) {
      setErrorMessage('Please enter the purpose of visit');
      setShowErrorModal(true);
      return;
    }
    if (vehicleNumber.trim() && !vehicleType) {
      setErrorMessage('Please select a vehicle type for the vehicle');
      setShowErrorModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const resolvedSecurityId = security.securityId || (security as any).userId || (security as any).id?.toString() || '';
      const response = await apiService.registerVisitorForSecurity({
        name: visitorNames[0],
        phone: visitorPhone,
        email: visitorEmail,
        role,
        numberOfPeople: parseInt(numberOfVisitors) || 1,
        departmentId: selectedDepartment,
        staffCode: selectedStaff,
        purpose,
        vehicleNumber: vehicleNumber || undefined,
        vehicleType: vehicleNumber ? vehicleType : undefined,
        securityId: resolvedSecurityId,
      });

      if (response.success) {
        setRegisteredVisitorName(visitorNames[0]);
        resetForm();
        setShowSuccessModal(true);
      } else {
        setErrorMessage(response.message || 'Could not register visitor. Please try again.');
        setShowErrorModal(true);
      }
    } catch (err) {
      setErrorMessage('Failed to register visitor. Please check your connection.');
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNumberOfVisitors('1');
    setVisitorNames(['']);
    setVisitorPhone('');
    setVisitorEmail('');
    setVehicleNumber('');
    setVehicleType('');
    setSelectedDepartment('');
    setSelectedStaff('');
    setPurpose('');
    setRole('VISITOR');
  };

  const updateVisitorName = (index: number, value: string) => {
    const newNames = [...visitorNames];
    newNames[index] = value;
    setVisitorNames(newNames);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.surfaceHighlight }]} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>Visitor Registration</ThemedText>
        <TouchableOpacity 
          style={styles.qrButton} 
          onPress={() => onNavigate('VISITOR_QR')}
        >
          <Ionicons name="qr-code-outline" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <VerticalScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Visitor Information */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Visitor Information</ThemedText>
          
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Number of Visitors *</ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="people-outline" size={20} color={theme.textTertiary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="1"
                placeholderTextColor={theme.textTertiary}
                value={numberOfVisitors}
                onChangeText={setNumberOfVisitors}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Dynamic Visitor Names */}
          {visitorNames.map((name, index) => (
            <View key={index} style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                {index === 0 ? 'Main Visitor Name *' : `Visitor ${index + 1} Name *`}
              </ThemedText>
              <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="person-outline" size={20} color={theme.textTertiary} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder={`Enter visitor ${index + 1} name`}
                  placeholderTextColor={theme.textTertiary}
                  value={name}
                  onChangeText={(value) => updateVisitorName(index, value)}
                />
              </View>
            </View>
          ))}

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Email *</ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="mail-outline" size={20} color={theme.textTertiary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Enter email address"
                placeholderTextColor={theme.textTertiary}
                value={visitorEmail}
                onChangeText={setVisitorEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Phone Number *</ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="call-outline" size={20} color={theme.textTertiary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Enter phone number (min 10 digits)"
                placeholderTextColor={theme.textTertiary}
                value={visitorPhone}
                onChangeText={setVisitorPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Vehicle Number (Optional)</ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="car-outline" size={20} color={theme.textTertiary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Enter vehicle number"
                placeholderTextColor={theme.textTertiary}
                value={vehicleNumber}
                onChangeText={(v) => { setVehicleNumber(v.toUpperCase()); if (!v.trim()) setVehicleType(''); }}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* Vehicle Type — shown and mandatory when vehicle number is entered */}
          {vehicleNumber.trim().length > 0 && (
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, { color: theme.error || '#EF4444' }]}>
                Vehicle Type *
              </ThemedText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['Two Wheeler', 'Four Wheeler', 'Auto', 'Bus', 'Truck', 'Other'].map((vt) => (
                  <TouchableOpacity
                    key={vt}
                    onPress={() => setVehicleType(vt)}
                    style={[
                      styles.vehicleTypePill,
                      vehicleType === vt
                        ? { backgroundColor: theme.primary, borderColor: theme.primary }
                        : { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}
                  >
                    <ThemedText style={[
                      styles.vehicleTypePillText,
                      { color: vehicleType === vt ? '#FFFFFF' : theme.textSecondary },
                    ]}>
                      {vt}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Visit Details */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Visit Details</ThemedText>
          
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Role *</ThemedText>
            <SearchableDropdown
              items={[{ label: 'Visitor', value: 'VISITOR' }, { label: 'Vendor', value: 'VENDOR' }]}
              selectedValue={role}
              onSelect={(value) => setRole(value as 'VISITOR' | 'VENDOR')}
              placeholder="Select role"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Department *</ThemedText>
            <SearchableDropdown
              items={departments.map(d => ({ label: d.name, value: d.id.toString() }))}
              selectedValue={selectedDepartment}
              onSelect={(value) => setSelectedDepartment(value)}
              placeholder="Select or type department name"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Staff to Meet *</ThemedText>
            <SearchableDropdown
              items={staffMembers.map(s => ({ label: s.name, value: s.id.toString() }))}
              selectedValue={selectedStaff}
              onSelect={(value) => setSelectedStaff(value)}
              placeholder={selectedDepartment ? 'Select or type staff name' : 'Select department first'}
              disabled={!selectedDepartment}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Purpose of Visit *</ThemedText>
            <View style={[styles.textAreaContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="document-text-outline" size={20} color={theme.textTertiary} style={styles.textAreaIcon} />
              <TextInput
                style={[styles.textArea, { color: theme.text }]}
                placeholder="Enter purpose of visit"
                placeholderTextColor={theme.textTertiary}
                value={purpose}
                onChangeText={setPurpose}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: isSubmitting ? theme.textTertiary : theme.primary }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <ThemedText style={styles.submitButtonText}>Register Visitor</ThemedText>
            </>
          )}
        </TouchableOpacity>
      </VerticalScrollView>

      {/* Bottom Navigation */}
      <SecurityBottomNav activeTab="visitor" onNavigate={onNavigate} />

      <SuccessModal
        visible={showSuccessModal}
        title="Visitor Registered!"
        message={`${registeredVisitorName} has been registered successfully. The staff member has been notified for approval.`}
        onClose={() => setShowSuccessModal(false)}
        autoClose={false}
      />
      <ErrorModal
        visible={showErrorModal}
        type="validation"
        message={errorMessage}
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
  qrButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
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
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingLeft: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pickerIcon: {
    marginRight: 12,
  },
  picker: {
    flex: 1,
    height: 50,
    color: '#1F2937',
    backgroundColor: 'transparent',
  },
  textAreaContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  textAreaIcon: {
    marginTop: 2,
  },
  textArea: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 100,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00BCD4',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  vehicleTypePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  vehicleTypePillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  successName: {
    fontWeight: '700',
    color: '#1F2937',
  },
  successActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00BCD4',
    gap: 6,
  },
  actionButtonSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00BCD4',
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#00BCD4',
    gap: 6,
  },
  actionButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default ModernVisitorRegistrationScreen;
