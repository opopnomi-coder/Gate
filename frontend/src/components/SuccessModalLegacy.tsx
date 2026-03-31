import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
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

const SuccessModalLegacy: React.FC<SuccessModalProps> = ({
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
  const contentTranslateY = React.useRef(new Animated.Value(20)).current;
  const [secondsRemaining, setSecondsRemaining] = React.useState(
    Math.max(1, Math.ceil(autoCloseDelay / 1000))
  );

  React.useEffect(() => {
    if (visible) {
      const initialSeconds = Math.max(1, Math.ceil(autoCloseDelay / 1000));
      setSecondsRemaining(initialSeconds);
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      if (autoClose) {
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
      contentTranslateY.setValue(20);
    }
  }, [visible, autoClose, autoCloseDelay]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
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
          <View style={[styles.headerDecoration, { backgroundColor: theme.success }]}>
            <View style={styles.decorationCircle1} />
            <View style={styles.decorationCircle2} />
            <View style={styles.iconWrapper}>
              <View style={styles.iconCircle}>
                <Ionicons name="checkmark-sharp" size={40} color={theme.success} />
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
              <ThemedText style={[styles.closeButtonText, { color: theme.textSecondary }]}>
                {autoClose ? `OK (${secondsRemaining}s)` : 'OK'}
              </ThemedText>
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
    maxWidth: 340,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 20,
  },
  headerDecoration: { height: 140, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  decorationCircle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255, 255, 255, 0.1)', top: -100, right: -50 },
  decorationCircle2: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255, 255, 255, 0.08)', bottom: -75, left: -30 },
  iconWrapper: { zIndex: 10 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  content: { paddingHorizontal: 32, paddingTop: 32, paddingBottom: 16, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center', letterSpacing: -0.5 },
  message: { fontSize: 15, textAlign: 'center', lineHeight: 22, fontWeight: '500' },
  actions: { padding: 24, paddingTop: 8 },
  closeButton: { paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  closeButtonText: { fontSize: 15, fontWeight: '700' },
});

export default SuccessModalLegacy;

