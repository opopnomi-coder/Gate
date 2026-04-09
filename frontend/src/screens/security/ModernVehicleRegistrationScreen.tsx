import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SecurityPersonnel, ScreenName } from '../../types';
import { apiService } from '../../services/api';
import SecurityBottomNav from '../../components/SecurityBottomNav';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import ThemedText from '../../components/ThemedText';
import { VerticalScrollView } from '../../components/navigation/VerticalScrollViews';
import SearchableDropdown from '../../components/SearchableDropdown';
import { useTheme } from '../../context/ThemeContext';

interface ModernVehicleRegistrationScreenProps {
  security: SecurityPersonnel;
  onBack: () => void;
  onNavigate: (screen: ScreenName) => void;
}

interface Vehicle {
  id: number;
  licensePlate: string;
  vehicleType: string;
  ownerName: string;
  ownerPhone: string;
  registeredAt: string;
}

const ModernVehicleRegistrationScreen: React.FC<ModernVehicleRegistrationScreenProps> = ({
  security,
  onBack,
  onNavigate,
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Vehicle[]>([]);
  const [recentVehicles, setRecentVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Registration form
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerType, setOwnerType] = useState('VISITOR');

  const vehicleTypeOptions = [
    { label: 'Two Wheeler', value: 'Two Wheeler' },
    { label: 'Four Wheeler', value: 'Four Wheeler' },
    { label: 'Auto', value: 'Auto' },
    { label: 'Bus', value: 'Bus' },
    { label: 'Truck', value: 'Truck' },
    { label: 'Other', value: 'Other' },
  ];

  const ownerTypeOptions = [
    { label: 'Visitor', value: 'VISITOR' },
    { label: 'Delivery', value: 'DELIVERY' },
    { label: 'Contractor', value: 'CONTRACTOR' },
    { label: 'Vendor', value: 'VENDOR' },
    { label: 'Student', value: 'STUDENT' },
    { label: 'Faculty', value: 'FACULTY' },
    { label: 'Staff', value: 'STAFF' },
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await apiService.searchVehicle(searchQuery);
      if (response.success && response.data && response.data.length > 0) {
        setSearchResults(response.data);
        const vehicle = response.data[0];
        fillFormWithVehicleData(vehicle);
        setSuccessMessage('Vehicle details have been loaded. You can update the information if needed.');
        setShowSuccessModal(true);
      } else {
        setSearchResults([]);
        setErrorMessage('No vehicles found with that license plate. You can register a new vehicle.');
        setShowErrorModal(true);
      }
    } catch (error) {
      setErrorMessage('Failed to search vehicle');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const fillFormWithVehicleData = (vehicle: any) => {
    setLicensePlate(vehicle.licensePlate || '');
    setVehicleType(vehicle.vehicleType || '');
    setVehicleModel(vehicle.vehicleModel || vehicle.model || '');
    setVehicleColor(vehicle.vehicleColor || vehicle.color || '');
    setOwnerName(vehicle.ownerName || '');
    setOwnerPhone(vehicle.ownerPhone || vehicle.contactNumber || '');
    setOwnerType(vehicle.ownerType || 'VISITOR');
  };

  const handleRegister = () => {
    if (!licensePlate.trim() || !vehicleType || !ownerName.trim() || !ownerPhone.trim()) {
      setErrorMessage('Please fill all required fields');
      setShowErrorModal(true);
      return;
    }

    const payload = {
      licensePlate: licensePlate.toUpperCase(),
      vehicleType,
      vehicleModel: vehicleModel.trim() || 'Not specified',
      vehicleColor: vehicleColor.trim() || 'Not specified',
      ownerName,
      ownerPhone,
      ownerType,
      registeredBy: security.securityId,
    };
    resetForm();
    setSuccessMessage('Vehicle registered successfully');
    setShowSuccessModal(true);
    apiService.registerVehicle(payload).catch(err => console.error('Vehicle registration error:', err));
  };

  const resetForm = () => {
    setLicensePlate('');
    setVehicleType('');
    setVehicleModel('');
    setVehicleColor('');
    setOwnerName('');
    setOwnerPhone('');
    setOwnerType('VISITOR');
  };

  const getVehicleIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'CAR': return 'car';
      case 'BIKE': return 'bicycle';
      case 'TRUCK': return 'bus';
      default: return 'car';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.surfaceHighlight }]} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>Vehicle Registration</ThemedText>
        <View style={styles.headerRight} />
      </View>

      <VerticalScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Search Section */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Search Vehicle</ThemedText>
          <View style={[styles.searchCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.searchInputContainer, { backgroundColor: theme.surfaceHighlight, borderColor: theme.border }]}>
              <Ionicons name="search" size={20} color={theme.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Enter license plate number"
                placeholderTextColor={theme.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="characters"
              />
            </View>
            <TouchableOpacity
              style={[styles.searchButton, { backgroundColor: theme.primary }]}
              onPress={handleSearch}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <ThemedText style={styles.searchButtonText}>Search</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <ThemedText style={[styles.resultsHeader, { color: theme.textSecondary }]}>
              Found {searchResults.length} vehicle{searchResults.length > 1 ? 's' : ''}. Tap to load details.
            </ThemedText>
            {searchResults.map((vehicle) => (
              <TouchableOpacity
                key={vehicle.id}
                style={[styles.vehicleCard, { backgroundColor: theme.surfaceHighlight, borderColor: theme.border }]}
                onPress={() => {
                  fillFormWithVehicleData(vehicle);
                  setSuccessMessage('Vehicle details have been loaded into the form. You can update the information if needed.');
                  setShowSuccessModal(true);
                }}
              >
                <View style={[styles.vehicleIcon, { backgroundColor: theme.primary + '20' }]}>
                  <Ionicons name={getVehicleIcon(vehicle.vehicleType) as any} size={24} color={theme.primary} />
                </View>
                <View style={styles.vehicleInfo}>
                  <ThemedText style={[styles.vehiclePlate, { color: theme.text }]}>{vehicle.licensePlate}</ThemedText>
                  <ThemedText style={[styles.vehicleType, { color: theme.textSecondary }]}>{vehicle.vehicleType}</ThemedText>
                  <ThemedText style={[styles.vehicleOwner, { color: theme.textSecondary }]}>{vehicle.ownerName}</ThemedText>
                </View>
                <Ionicons name="arrow-down-circle" size={20} color={theme.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Registration Form */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            {searchResults.length > 0 ? 'Update Vehicle Details' : 'Register New Vehicle'}
          </ThemedText>
          
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Owner Type *</ThemedText>
            <SearchableDropdown
              items={ownerTypeOptions}
              selectedValue={ownerType}
              onSelect={(val) => setOwnerType(val)}
              placeholder="Select owner type"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>License Plate *</ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: theme.surfaceHighlight, borderColor: theme.border }]}>
              <Ionicons name="card-outline" size={20} color={theme.textTertiary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="ABC 1234"
                placeholderTextColor={theme.textTertiary}
                value={licensePlate}
                onChangeText={setLicensePlate}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Vehicle Type *</ThemedText>
            <SearchableDropdown
              items={vehicleTypeOptions}
              selectedValue={vehicleType}
              onSelect={(val) => setVehicleType(val)}
              placeholder="Select vehicle type"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Vehicle Model</ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: theme.surfaceHighlight, borderColor: theme.border }]}>
              <Ionicons name="car-sport-outline" size={20} color={theme.textTertiary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="e.g., Maruti Swift"
                placeholderTextColor={theme.textTertiary}
                value={vehicleModel}
                onChangeText={setVehicleModel}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Vehicle Color</ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: theme.surfaceHighlight, borderColor: theme.border }]}>
              <Ionicons name="color-palette-outline" size={20} color={theme.textTertiary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="e.g., Red"
                placeholderTextColor={theme.textTertiary}
                value={vehicleColor}
                onChangeText={setVehicleColor}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Owner Name *</ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: theme.surfaceHighlight, borderColor: theme.border }]}>
              <Ionicons name="person-outline" size={20} color={theme.textTertiary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Enter owner name"
                placeholderTextColor={theme.textTertiary}
                value={ownerName}
                onChangeText={setOwnerName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Owner Phone *</ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: theme.surfaceHighlight, borderColor: theme.border }]}>
              <Ionicons name="call-outline" size={20} color={theme.textTertiary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Enter phone number"
                placeholderTextColor={theme.textTertiary}
                value={ownerPhone}
                onChangeText={setOwnerPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <TouchableOpacity
          style={[styles.registerButton, { backgroundColor: loading ? theme.textTertiary : theme.primary }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />
              <ThemedText style={styles.registerButtonText}>
                {searchResults.length > 0 ? 'Update Vehicle' : 'Register Vehicle'}
              </ThemedText>
            </>
          )}
        </TouchableOpacity>
        </View>

        {/* Recent Vehicles */}
        {recentVehicles.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Recent Registrations</ThemedText>
            {recentVehicles.map((vehicle) => (
              <TouchableOpacity
                key={vehicle.id}
                style={[styles.vehicleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => {
                  setSelectedVehicle(vehicle);
                  setShowDetailModal(true);
                }}
              >
                <View style={[styles.vehicleIcon, { backgroundColor: theme.primary + '20' }]}>
                  <Ionicons name={getVehicleIcon(vehicle.vehicleType) as any} size={24} color={theme.primary} />
                </View>
                <View style={styles.vehicleInfo}>
                  <ThemedText style={[styles.vehiclePlate, { color: theme.text }]}>{vehicle.licensePlate}</ThemedText>
                  <ThemedText style={[styles.vehicleType, { color: theme.primary }]}>{vehicle.vehicleType}</ThemedText>
                  <ThemedText style={[styles.vehicleDate, { color: theme.textTertiary }]}>{formatDate(vehicle.registeredAt)}</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </VerticalScrollView>

      {/* Vehicle Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <ThemedText style={[styles.modalTitle, { color: theme.text }]}>Vehicle Details</ThemedText>
              <TouchableOpacity
                onPress={() => setShowDetailModal(false)}
                style={[styles.closeButton, { backgroundColor: theme.surfaceHighlight }]}
              >
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedVehicle && (
              <VerticalScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
                <View style={[styles.modalVehicleIcon, { backgroundColor: theme.primary + '20' }]}>
                  <Ionicons name={getVehicleIcon(selectedVehicle.vehicleType) as any} size={48} color={theme.primary} />
                </View>

                <View style={styles.modalSection}>
                  <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Vehicle Information</ThemedText>
                  <View style={styles.modalRow}>
                    <ThemedText style={[styles.modalLabel, { color: theme.textSecondary }]}>License Plate</ThemedText>
                    <ThemedText style={[styles.modalValue, { color: theme.text }]}>{selectedVehicle.licensePlate}</ThemedText>
                  </View>
                  <View style={styles.modalRow}>
                    <ThemedText style={[styles.modalLabel, { color: theme.textSecondary }]}>Type</ThemedText>
                    <ThemedText style={[styles.modalValue, { color: theme.text }]}>{selectedVehicle.vehicleType}</ThemedText>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Owner Information</ThemedText>
                  <View style={styles.modalRow}>
                    <ThemedText style={[styles.modalLabel, { color: theme.textSecondary }]}>Name</ThemedText>
                    <ThemedText style={[styles.modalValue, { color: theme.text }]}>{selectedVehicle.ownerName}</ThemedText>
                  </View>
                  <View style={styles.modalRow}>
                    <ThemedText style={[styles.modalLabel, { color: theme.textSecondary }]}>Phone</ThemedText>
                    <ThemedText style={[styles.modalValue, { color: theme.text }]}>{selectedVehicle.ownerPhone}</ThemedText>
                  </View>
                  <View style={styles.modalRow}>
                    <ThemedText style={[styles.modalLabel, { color: theme.textSecondary }]}>Registered</ThemedText>
                    <ThemedText style={[styles.modalValue, { color: theme.text }]}>{formatDate(selectedVehicle.registeredAt)}</ThemedText>
                  </View>
                </View>
              </VerticalScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <SecurityBottomNav activeTab="vehicle" onNavigate={onNavigate} />

      <SuccessModal
        visible={showSuccessModal}
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
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
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
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
  headerRight: {
    width: 40,
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
    marginBottom: 12,
  },
  searchCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  searchButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  resultsContainer: {
    marginTop: 12,
  },
  resultsHeader: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehiclePlate: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  vehicleType: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  vehicleOwner: {
    fontSize: 13,
  },
  vehicleDate: {
    fontSize: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  typeChips: {
    flexDirection: 'row',
    gap: 12,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    gap: 8,
  },
  typeChipActive: {
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: '#FFF',
  },
  ownerTypeScroll: {
    marginHorizontal: -4,
  },
  ownerTypeChips: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  ownerTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    gap: 6,
  },
  ownerTypeChipActive: {
  },
  ownerTypeChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  ownerTypeChipTextActive: {
    color: '#FFF',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  registerButtonDisabled: {
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalVehicleIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 14,
  },
  modalValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ModernVehicleRegistrationScreen;
