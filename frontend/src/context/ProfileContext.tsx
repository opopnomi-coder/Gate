import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking, Platform } from 'react-native';

interface ProfileContextType {
  profileImage: string | null;
  captureImage: (source: 'camera' | 'gallery') => Promise<void>;
  clearProfileImage: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    loadProfileImage();
  }, []);

  const loadProfileImage = async () => {
    try {
      const savedImage = await AsyncStorage.getItem('profile_image');
      if (savedImage) {
        setProfileImage(savedImage);
      }
    } catch (error) {
      console.error('Error loading profile image:', error);
    }
  };

  const openAppSettings = () => {
    Alert.alert(
      'Permission Required',
      'Please enable photo access in your device Settings to use this feature.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  };

  const captureImage = async (source: 'camera' | 'gallery') => {
    try {
      let result;

      if (source === 'camera') {
        const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          if (!canAskAgain) {
            openAppSettings();
          } else {
            Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
          }
          return;
        }

        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'] as any,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        // On Android 13+ READ_MEDIA_IMAGES is already granted (shown in permissions screen).
        // Just try to launch the picker — if the OS denies it, it will return canceled.
        // Only show settings dialog if canAskAgain is false (permanently denied).
        const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permResult.status !== 'granted' && !permResult.canAskAgain) {
          openAppSettings();
          return;
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'] as any,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setProfileImage(imageUri);
        await AsyncStorage.setItem('profile_image', imageUri);
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      Alert.alert('Error', 'Failed to open image picker. Please try again.');
    }
  };

  const clearProfileImage = async () => {
    try {
      setProfileImage(null);
      await AsyncStorage.removeItem('profile_image');
    } catch (error) {
      console.error('Error clearing profile image:', error);
    }
  };

  return (
    <ProfileContext.Provider value={{ profileImage, captureImage, clearProfileImage }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
