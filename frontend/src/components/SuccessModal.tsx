import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Pressable
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme } from '../context/ThemeContext';
import ThemedText from './ThemedText';

interface SuccessModalProps {
  visible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  title = 'Completed Successfully',
  message,
  onClose,
  autoClose = true,
  autoCloseDelay = 2000,
}) => {
  const { theme } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const contentTranslateY = React.useRef(new Animated.Value(16)).current;
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const [secondsRemaining, setSecondsRemaining] = React.useState(
    Math.max(1, Math.ceil(autoCloseDelay / 1000))
  );

  React.useEffect(() => {
    if (visible) {
      const initialSeconds = Math.max(1, Math.ceil(autoCloseDelay / 1000));
      setSecondsRemaining(initialSeconds);
      progressAnim.setValue(0);
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 44,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();

      if (autoClose) {
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: autoCloseDelay,
          useNativeDriver: false,
        }).start();
        const countdownTimer = setInterval(() => {
          setSecondsRemaining((prev) => Math.max(0, prev - 1));
        }, 1000);
        const timer = setTimeout(() => {
          onClose();
        }, autoCloseDelay);
        return () => {
          clearTimeout(timer);
          clearInterval(countdownTimer);
        };
      }
    } else {
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.9);
      contentTranslateY.setValue(16);
    }
  }, [visible, autoClose, autoCloseDelay]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              backgroundColor: theme.surface,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }, { translateY: contentTranslateY }],
            },
          ]}
        >
          <View style={styles.hero}>
            <View style={[styles.heroStripe, { backgroundColor: theme.success }]} />
            <View style={styles.heroIconRow}>
              <View style={[styles.heroIconOuter, { borderColor: theme.success + '55' }]}>
                <View style={[styles.heroIconInner, { backgroundColor: theme.success + '18' }]}>
                  <Ionicons name="checkmark" size={34} color={theme.success} />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.content}>
            <ThemedText style={[styles.title, { color: theme.text }]}>{title}</ThemedText>
            <ThemedText style={[styles.message, { color: theme.textSecondary }]}>{message}</ThemedText>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: theme.surfaceHighlight }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <View style={styles.closeButtonInner}>
                <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: theme.success,
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
                <ThemedText style={[styles.closeButtonText, { color: theme.textSecondary }]}>
                  {autoClose ? `OK (${secondsRemaining}s)` : 'OK'}
                </ThemedText>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.6)' },
  modalContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 20,
  },
  hero: { paddingTop: 18, paddingBottom: 6 },
  heroStripe: { height: 6, width: '100%' },
  heroIconRow: { alignItems: 'center', marginTop: 16 },
  heroIconOuter: { width: 82, height: 82, borderRadius: 41, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  heroIconInner: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 28, paddingTop: 18, paddingBottom: 10, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 8, textAlign: 'center', letterSpacing: -0.3 },
  message: { fontSize: 15, textAlign: 'center', lineHeight: 22, fontWeight: '500' },
  actions: { padding: 20, paddingTop: 10 },
  closeButton: { paddingVertical: 14, borderRadius: 16, alignItems: 'center', overflow: 'hidden' },
  closeButtonInner: { width: '100%', alignItems: 'center', gap: 10 },
  progressTrack: { width: '86%', height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  closeButtonText: { fontSize: 15, fontWeight: '700' },
});

export default SuccessModal;
