import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Animated,
  Easing,
  Alert
} from 'react-native';
import ImagePicker from '../utils/safeImagePicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@react-native-vector-icons/ionicons';
import { THEME } from '../config/api.config';
import ThemedText from './ThemedText';

interface ProfilePhotoManagerProps {
  userId: string;
  currentPhoto: string | null;
  onPhotoChange: (photoUri: string | null) => void;
  size?: number;
  showEditBadge?: boolean;
}

const ProfilePhotoManager: React.FC<ProfilePhotoManagerProps> = ({
  userId,
  currentPhoto,
  onPhotoChange,
  size = 100,
  showEditBadge = true,
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const optionsAnimation = React.useRef(new Animated.Value(0)).current;
  const removeAnimation = React.useRef(new Animated.Value(0)).current;

  const openOptions = () => {
    setShowOptions(true);
    Animated.spring(optionsAnimation, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const closeOptions = () => {
    Animated.timing(optionsAnimation, {
      toValue: 0,
      duration: 250,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start(() => {
      setShowOptions(false);
    });
  };

  const openRemoveConfirm = () => {
    closeOptions();
    setTimeout(() => {
      setShowRemoveConfirm(true);
      Animated.spring(removeAnimation, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }, 300);
  };

  const closeRemoveConfirm = () => {
    Animated.timing(removeAnimation, {
      toValue: 0,
      duration: 250,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start(() => {
      setShowRemoveConfirm(false);
    });
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please enable photo library access to select a photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        await AsyncStorage.setItem(`profile_image_${userId}`, imageUri);
        onPhotoChange(imageUri);
        closeOptions();
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please enable camera access to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        await AsyncStorage.setItem(`profile_image_${userId}`, imageUri);
        onPhotoChange(imageUri);
        closeOptions();
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const removePhoto = async () => {
    try {
      await AsyncStorage.removeItem(`profile_image_${userId}`);
      onPhotoChange(null);
      closeRemoveConfirm();
    } catch (error) {
      console.error('Error removing photo:', error);
      Alert.alert('Error', 'Failed to remove photo');
    }
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <TouchableOpacity onPress={openOptions} activeOpacity={0.8}>
        <View style={[styles.photoContainer, { width: size, height: size, borderRadius: size / 2 }]}>
          {currentPhoto ? (
            <Image source={{ uri: currentPhoto }} style={styles.photo} />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="person" size={size * 0.5} color={THEME.colors.textSecondary} />
            </View>
          )}
          {showEditBadge && (
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Options Modal */}
      <Modal
        visible={showOptions}
        animationType="fade"
        transparent={true}
        onRequestClose={closeOptions}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeOptions}>
          <Animated.View
            style={[
              styles.optionsContainer,
              {
                transform: [
                  {
                    scale: optionsAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
                opacity: optionsAnimation,
              },
            ]}
          >
            <View style={styles.optionsHeader}>
              <ThemedText style={styles.optionsTitle}>Profile Photo</ThemedText>
              <ThemedText style={styles.optionsSubtitle}>Choose an option</ThemedText>
            </View>

            <View style={styles.optionsBody}>
              <TouchableOpacity style={styles.optionButton} onPress={takePhoto} activeOpacity={0.7}>
                <View style={styles.optionIcon}>
                  <Ionicons name="camera" size={24} color={THEME.colors.primary} />
                </View>
                <ThemedText style={styles.optionText}>Take Photo</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionButton} onPress={pickImage} activeOpacity={0.7}>
                <View style={styles.optionIcon}>
                  <Ionicons name="images" size={24} color={THEME.colors.primary} />
                </View>
                <ThemedText style={styles.optionText}>Choose from Gallery</ThemedText>
              </TouchableOpacity>

              {currentPhoto && (
                <TouchableOpacity
                  style={[styles.optionButton, styles.dangerOption]}
                  onPress={openRemoveConfirm}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIcon, styles.dangerIcon]}>
                    <Ionicons name="trash" size={24} color={THEME.colors.error} />
                  </View>
                  <ThemedText style={[styles.optionText, styles.dangerText]}>Remove Photo</ThemedText>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.cancelButton} onPress={closeOptions} activeOpacity={0.7}>
              <ThemedText style={styles.cancelText}>Cancel</ThemedText>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Remove Confirmation Modal */}
      <Modal
        visible={showRemoveConfirm}
        animationType="fade"
        transparent={true}
        onRequestClose={closeRemoveConfirm}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeRemoveConfirm}>
          <Animated.View
            style={[
              styles.confirmContainer,
              {
                transform: [
                  {
                    scale: removeAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
                opacity: removeAnimation,
              },
            ]}
          >
            <View style={styles.confirmHeader}>
              <ThemedText style={styles.confirmTitle}>Remove Photo</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                Are you sure you want to remove your profile photo?
              </ThemedText>
            </View>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={closeRemoveConfirm}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.confirmCancelText}>Cancel</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmDanger]}
                onPress={removePhoto}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.confirmDangerText}>Remove</ThemedText>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  photoContainer: {
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  optionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  optionsHeader: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  optionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  optionsSubtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
  },
  optionsBody: {
    padding: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  dangerOption: {
    backgroundColor: '#FEF2F2',
  },
  dangerIcon: {
    backgroundColor: '#FFFFFF',
  },
  dangerText: {
    color: THEME.colors.error,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  confirmContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  confirmHeader: {
    padding: 24,
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  confirmDanger: {
    backgroundColor: THEME.colors.error,
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
  },
  confirmDangerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ProfilePhotoManager;
