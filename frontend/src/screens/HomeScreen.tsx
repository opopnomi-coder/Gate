import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
  PanResponder,
  Image,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { UserType } from '../types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ThemedText from '../components/ThemedText';

interface HomeScreenProps {
  onSelectUserType: (type: UserType) => void;
}

const { width } = Dimensions.get('window');
const SLIDER_WIDTH = width - 60;
const BUTTON_SIZE = 64;
const SLIDE_THRESHOLD = SLIDER_WIDTH - BUTTON_SIZE - 8;

const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectUserType }) => {
  const { theme } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const slidePosition = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [isSliding, setIsSliding] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { setIsSliding(true); },
      onPanResponderMove: (_, gestureState) => {
        const newPosition = Math.max(0, Math.min(gestureState.dx, SLIDE_THRESHOLD));
        slidePosition.setValue(newPosition);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx >= SLIDE_THRESHOLD * 0.75) {
          Animated.spring(slidePosition, {
            toValue: SLIDE_THRESHOLD,
            useNativeDriver: false,
            tension: 40,
            friction: 6,
          }).start(() => { onSelectUserType('STUDENT'); });
        } else {
          Animated.spring(slidePosition, {
            toValue: 0,
            useNativeDriver: false,
            tension: 40,
            friction: 6,
          }).start(() => { setIsSliding(false); });
        }
      },
    })
  ).current;

  const buttonTranslateX = slidePosition;
  const textOpacity = slidePosition.interpolate({
    inputRange: [0, SLIDE_THRESHOLD / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F8FAFC"
      />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.mainContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/rit-logo.png')}
                style={styles.logoImage}
              />
            </View>
            <View style={styles.titleContainer}>
              <ThemedText style={[styles.titleMain, { color: "#0F172A" }]}>RIT</ThemedText>
              <ThemedText variant="primary" style={[styles.titleAccent, { color: "#1D4ED8" }]}>
                GATE
              </ThemedText>
            </View>
            <ThemedText style={[styles.subtitle, { color: "#475569" }]}>Secure Access Control System</ThemedText>
          </View>

          {/* Features Grid */}
          <View style={styles.featuresGrid}>
            {[
              { icon: 'finger-print', label: 'Biometric' },
              { icon: 'scan', label: 'Badge Scan' },
              { icon: 'flash', label: 'Instant' },
            ].map((item) => (
              <View key={item.label} style={styles.featureItem}>
                <View style={[styles.featureIconContainer, {
                  backgroundColor: "#FFFFFF",
                  borderColor: "#1D4ED8",
                }]}>
                  <Ionicons name={item.icon as any} size={24} color={"#1D4ED8"} />
                </View>
                <ThemedText style={[styles.featureText, { color: "#0F172A" }]}>{item.label}</ThemedText>
              </View>
            ))}
          </View>

          {/* Info Text */}
          <View style={styles.infoSection}>
            <ThemedText style={[styles.infoTitle, { color: "#0F172A" }]}>Universal Access</ThemedText>
            <ThemedText style={[styles.infoDescription, { color: "#475569" }]}>
              One credential for all roles{'\n'}Auto-detection enabled
            </ThemedText>
          </View>

          {/* Swipe to Unlock */}
          <View style={styles.sliderSection}>
            <View style={[styles.sliderTrack, { backgroundColor: "#FFFFFF", borderColor: "#1D4ED8" }]}>
              <Animated.View style={[styles.sliderTextContainer, { opacity: textOpacity }]}>
                <ThemedText variant="primary" style={[styles.sliderText, { color: "#1D4ED8" }]}>
                  Swipe to Access
                </ThemedText>
                <Ionicons name="arrow-forward" size={20} color={"#1D4ED8"} />
              </Animated.View>

              <Animated.View
                {...panResponder.panHandlers}
                style={[styles.sliderButton, { transform: [{ translateX: buttonTranslateX }] }]}
              >
                <View style={[styles.sliderButtonGradient, {
                  backgroundColor: "#2563EB",
                  shadowColor: "#2563EB",
                }]}>
                  <Ionicons name="chevron-forward" size={32} color={"#FFFFFF"} />
                </View>
              </Animated.View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <ThemedText style={[styles.footerText, { color: "#94A3B8" }]}>SECURE GATEWAY • RIT TECHNOLOGY © 2026</ThemedText>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  mainContent: {
    flex: 1,
    paddingHorizontal: 30,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  headerSection: { alignItems: 'center', marginTop: 40 },
  logoContainer: { marginBottom: 30 },
  logoImage: { width: 160, height: 160, borderRadius: 80, resizeMode: 'cover' },
  titleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  titleMain: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'monospace',
  },
  titleAccent: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'monospace',
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.7,
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  featuresGrid: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 40 },
  featureItem: { alignItems: 'center', gap: 12 },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  featureText: { fontSize: 12, fontWeight: '600' },
  infoSection: { alignItems: 'center', paddingVertical: 20 },
  infoTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8, letterSpacing: 1 },
  infoDescription: { fontSize: 14, opacity: 0.7, textAlign: 'center', lineHeight: 22 },
  sliderSection: { marginVertical: 30 },
  sliderTrack: {
    height: 72,
    borderRadius: 36,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sliderTextContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  sliderText: { fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  sliderButton: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
  },
  sliderButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  footer: { alignItems: 'center', paddingBottom: 10 },
  footerText: { fontSize: 10, opacity: 0.4, fontWeight: '600' },
});

export default HomeScreen;
