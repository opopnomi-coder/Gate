import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import Modal from 'react-native-modal';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const TypedModal = Modal as any;
const TypedLinearGradient = LinearGradient as any;

interface PassTypeBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectSingle: () => void;
  onSelectBulk: () => void;
  /** Pre-register guest (instant QR) — Staff / HOD flows */
  onSelectGuest?: () => void;
}

const { width } = Dimensions.get('window');

const PassTypeBottomSheet: React.FC<PassTypeBottomSheetProps> = ({
  visible,
  onClose,
  onSelectSingle,
  onSelectBulk,
  onSelectGuest,
}) => {
  const { theme } = useTheme();

  return (
    <TypedModal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropOpacity={0.5}
      useNativeDriver={true}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Handle Bar */}
        <View style={styles.handleBar}>
          <View style={[styles.handle, { backgroundColor: theme.textSecondary + '40' }]} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Select Pass Type</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Choose the type of gate pass you want to create
          </Text>
        </View>

        {/* Pass Type Cards */}
        <View style={styles.cardsContainer}>
          {/* Single Pass Card */}
          <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={onSelectSingle}
            activeOpacity={0.8}
          >
            <TypedLinearGradient
              colors={['#4facfe', '#00f2fe']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconContainer}
            >
              <Ionicons name="person" size={28} color="#FFF" />
            </TypedLinearGradient>

            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Myself (Single Pass)</Text>
              <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
                Create a gate pass for yourself
              </Text>
            </View>

            <View style={styles.arrowContainer}>
              <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Bulk Pass Card */}
          <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={onSelectBulk}
            activeOpacity={0.8}
          >
            <TypedLinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconContainer}
            >
              <Ionicons name="people" size={28} color="#FFF" />
            </TypedLinearGradient>

            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Bulk Student Pass</Text>
              <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
                Create a gate pass for multiple students
              </Text>
            </View>

            <View style={styles.arrowContainer}>
              <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
            </View>
          </TouchableOpacity>

          {onSelectGuest ? (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={() => {
                onClose();
                onSelectGuest();
              }}
              activeOpacity={0.8}
            >
              <TypedLinearGradient
                colors={['#0d9488', '#14b8a6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconContainer}
              >
                <Ionicons name="person-add" size={28} color="#FFF" />
              </TypedLinearGradient>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Pre-register guest</Text>
                <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
                  Instant visitor pass — QR &amp; manual code (share via WhatsApp)
                </Text>
              </View>
              <View style={styles.arrowContainer}>
                <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Cancel Button */}
        <TouchableOpacity
          style={[styles.cancelButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </TypedModal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    fontWeight: '500',
  },
  arrowContainer: {
    marginLeft: 8,
  },
  cancelButton: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default PassTypeBottomSheet;
