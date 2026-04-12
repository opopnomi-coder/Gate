import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ThemedText from './ThemedText';

export type ErrorType = 'network' | 'api' | 'validation' | 'auth' | 'timeout' | 'general';

interface ErrorModalProps {
  visible: boolean;
  type: ErrorType;
  title?: string;
  message: string;
  onClose: () => void;
  onRetry?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const ErrorModalLegacy: React.FC<ErrorModalProps> = ({
  visible,
  type,
  title,
  message,
  onClose,
  onRetry,
  autoClose = true,
  autoCloseDelay = 3500,
}) => {
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

      if (autoClose && !onRetry) {
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
  }, [visible, autoClose, autoCloseDelay, onRetry, onClose]);

  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return { icon: 'cloud-offline' as const, color: '#F59E0B', defaultTitle: 'Network Connectivity Issue' };
      case 'api':
        return { icon: 'server' as const, color: '#EF4444', defaultTitle: 'Service Unavailable' };
      case 'validation':
        return { icon: 'alert-circle' as const, color: '#F59E0B', defaultTitle: 'Input Validation Required' };
      case 'auth':
        return { icon: 'lock-closed' as const, color: '#EF4444', defaultTitle: 'Authorization Required' };
      case 'timeout':
        return { icon: 'time-outline' as const, color: '#F59E0B', defaultTitle: 'Request Timed Out' };
      default:
        return { icon: 'warning' as const, color: '#EF4444', defaultTitle: 'Something Went Wrong' };
    }
  };

  const config = getErrorConfig();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }, { translateY: contentTranslateY }],
            },
          ]}
        >
          <View style={[styles.headerDecoration, { backgroundColor: config.color }]}>
            <View style={styles.decorationCircle1} />
            <View style={styles.decorationCircle2} />
            <View style={styles.iconWrapper}>
              <View style={styles.errorIconCircle}>
                <Ionicons name={config.icon} size={40} color={config.color} />
              </View>
            </View>
          </View>

          <View style={styles.content}>
            <ThemedText style={styles.title}>{title || config.defaultTitle}</ThemedText>
            <ThemedText style={styles.message}>{message}</ThemedText>
          </View>

          <View style={styles.actions}>
            {onRetry && (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: config.color }]}
                onPress={() => {
                  onClose();
                  onRetry();
                }}
              >
                <Ionicons name="refresh" size={20} color="#FFF" />
                <ThemedText style={styles.buttonTextRetry}>Retry</ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <ThemedText style={styles.closeButtonText}>
                {onRetry ? 'Cancel' : (autoClose ? `OK (${secondsRemaining}s)` : 'OK')}
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
    backgroundColor: '#FFFFFF',
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
  errorIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  content: { paddingHorizontal: 32, paddingTop: 32, paddingBottom: 16, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 8, textAlign: 'center', letterSpacing: -0.5 },
  message: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, fontWeight: '500' },
  actions: { padding: 24, paddingTop: 8, gap: 12 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, gap: 10 },
  buttonTextRetry: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  closeButton: { backgroundColor: '#F1F5F9', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  closeButtonText: { fontSize: 15, fontWeight: '700', color: '#64748B' },
});

export default ErrorModalLegacy;

