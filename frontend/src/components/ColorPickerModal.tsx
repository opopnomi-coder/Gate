import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import ThemedText from './ThemedText';

interface ColorPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectColor: (color: string) => void;
  title: string;
  currentColor: string;
}

const PRESET_COLORS = [
  '#22D3EE', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Green
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#F97316', // Orange
  '#84CC16', // Lime
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#6B7280', // Gray
  '#1F2937', // Dark Gray
  '#FFFFFF', // White
];

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  visible,
  onClose,
  onSelectColor,
  title,
  currentColor,
}) => {
  const [customColor, setCustomColor] = useState('');

  const handleSelectColor = (color: string) => {
    onSelectColor(color);
    onClose();
  };

  const handleCustomColor = () => {
    if (customColor.match(/^#[0-9A-F]{6}$/i)) {
      onSelectColor(customColor);
      setCustomColor('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <ThemedText style={styles.sectionTitle}>Preset Colors</ThemedText>
            <View style={styles.colorGrid}>
              {PRESET_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorBox,
                    { backgroundColor: color },
                    currentColor === color && styles.selectedColor,
                  ]}
                  onPress={() => handleSelectColor(color)}
                >
                  {currentColor === color && (
                    <Ionicons name="checkmark" size={24} color="#FFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <ThemedText style={styles.sectionTitle}>Custom Color</ThemedText>
            <View style={styles.customColorSection}>
              <TextInput
                style={styles.input}
                placeholder="#000000"
                placeholderTextColor="#9CA3AF"
                value={customColor}
                onChangeText={setCustomColor}
                autoCapitalize="characters"
                maxLength={7}
              />
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleCustomColor}
              >
                <ThemedText style={styles.applyButtonText}>Apply</ThemedText>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 16,
    marginTop: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  colorBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  selectedColor: {
    borderColor: '#22D3EE',
    borderWidth: 3,
  },
  customColorSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  applyButton: {
    backgroundColor: '#22D3EE',
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ColorPickerModal;
