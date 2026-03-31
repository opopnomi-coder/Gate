import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { THEME } from '../config/api.config';
import ThemedText from './ThemedText';

interface ProfessionalNotificationProps {
  visible: boolean;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  onClose: () => void;
  autoDismiss?: boolean;
  dismissTimeout?: number;
}

const ProfessionalNotification: React.FC<ProfessionalNotificationProps> = ({
  visible,
  type,
  title,
  message,
  onClose,
  autoDismiss = true,
  dismissTimeout = 3000,
}) => {
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(animation, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      if (autoDismiss) {
        const timer = setTimeout(() => {
          handleClose();
        }, dismissTimeout);
        return () => clearTimeout(timer);
      }
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(animation, {
      toValue: 0,
      duration: 200,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'info':
        return 'information-circle';
      default:
        return 'information-circle';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'success':
        return '#10B981';
      case 'error':
        return '#EF4444';
      case 'warning':
        return '#F59E0B';
      case 'info':
        return '#00BCD4';
      default:
        return '#00BCD4';
    }
  };

  if (!visible) return null;

  return (
    <TouchableOpacity
      style={styles.overlay}
      activeOpacity={1}
      onPress={handleClose}
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              {
                translateY: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-100, 0],
                }),
              },
            ],
            opacity: animation,
          },
        ]}
      >
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: getColor() }]}>
            <Ionicons name={getIcon()} size={24} color="#FFFFFF" />
          </View>
          <View style={styles.textContainer}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <ThemedText style={styles.message}>{message}</ThemedText>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },
});

export default ProfessionalNotification;
