/***
 * CinematicSplash — Grade-A Professional Light Mode Splash Screen
 * Adapted for RIT Gate LoadingScreen (no onFinish prop needed — app controls dismissal)
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, Image, StyleSheet, Animated, Easing,
  Dimensions, StatusBar, Platform,
} from 'react-native';

const runAction = (callback: () => void) => { callback(); return Animated.delay(0); };

const BG     = '#F7F9FF';
const TEXT_C = '#1E293B';
const ACCENT = '#2563EB';
const RING_C = 'rgba(37,99,235,0.15)';
const SUBTLE = 'rgba(37,99,235,0.03)';
const GLOW_C = 'rgba(37,99,235,0.08)';

const HEADING_FONT = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif-medium', default: 'System' }) as string;
const BODY_FONT    = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif',        default: 'System' }) as string;

const QUINT_OUT  = Easing.bezier(0.22, 1.0, 0.36, 1.0);
const SINE_INOUT = Easing.inOut(Easing.sin);
const SMOOTH     = Easing.bezier(0.25, 0.46, 0.45, 0.94);
const MATERIAL   = Easing.bezier(0.4, 0.0, 0.2, 1.0);
const EXPO_INOUT = Easing.bezier(0.87, 0, 0.13, 1);
const MAGNETIC   = Easing.bezier(0.34, 1.56, 0.64, 1);
const EXPO_OUT   = Easing.bezier(0.16, 1.0, 0.3, 1.0);

const { width: W, height: H } = Dimensions.get('window');
const CARD_SIZE = 210;
const CARD_R    = 105;

const AnimLetter = React.memo(function AnimLetter({ ch, delayMs, size, color }: { ch: string; delayMs: number; size: number; color: string }) {
  const s = useRef(new Animated.Value(0.7)).current;
  const a = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delayMs),
      Animated.parallel([
        Animated.timing(a, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(s, { toValue: 1.25, duration: 60, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(x, { toValue: -2, duration: 30, useNativeDriver: true }),
          Animated.timing(x, { toValue: 2,  duration: 30, useNativeDriver: true }),
          Animated.timing(x, { toValue: 0,  duration: 30, useNativeDriver: true }),
        ]),
      ]),
      Animated.spring(s, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.Text style={{ fontFamily: HEADING_FONT, fontSize: size, fontWeight: '900', letterSpacing: 16, color, opacity: a, transform: [{ scale: s }, { translateX: x }], includeFontPadding: false }}>
      {ch}
    </Animated.Text>
  );
});

const Particle = React.memo(function Particle({ delayMs }: { delayMs: number }) {
  const x = useRef(new Animated.Value(Math.random() * W)).current;
  const y = useRef(new Animated.Value(H + 50)).current;
  const a = useRef(new Animated.Value(0)).current;
  const sz = useRef(new Animated.Value(Math.random() * 2 + 1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delayMs),
      Animated.timing(a, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(y, { toValue: -100, duration: 8000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0,    duration: 8000, useNativeDriver: true }),
      ]),
    ])).start();
  }, []);
  return <Animated.View style={{ position: 'absolute', left: x, top: y, width: sz, height: sz, borderRadius: 10, backgroundColor: ACCENT, opacity: a }} />;
});

const Orb = React.memo(function Orb({ style, delay }: { style: any; delay: number }) {
  const move = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(move, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(move, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={[style, { transform: [{ translateY: move.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }) }, { scale: move.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }] }]} />;
});

const RippleRing = React.memo(function RippleRing({ delayMs, finalR }: { delayMs: number; finalR: number }) {
  const s = useRef(new Animated.Value(1)).current;
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delayMs),
      Animated.parallel([
        Animated.timing(s, { toValue: finalR / (CARD_SIZE / 2), duration: 700, easing: QUINT_OUT, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(a, { toValue: 0.55, duration: 100, easing: SMOOTH, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0,    duration: 600, easing: SMOOTH, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);
  return <Animated.View style={{ position: 'absolute', width: CARD_SIZE, height: CARD_SIZE, borderRadius: CARD_SIZE / 2, borderWidth: 1, borderColor: RING_C, opacity: a, transform: [{ scale: s }] }} />;
});

const CardShimmer = React.memo(function CardShimmer({ startDelay }: { startDelay: number }) {
  const x   = useRef(new Animated.Value(-CARD_SIZE * 1.5)).current;
  const vis = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(startDelay),
      Animated.timing(vis, { toValue: 1, duration: 80,  easing: SMOOTH, useNativeDriver: true }),
      Animated.timing(x,   { toValue: CARD_SIZE * 1.8, duration: 500, easing: QUINT_OUT, useNativeDriver: true }),
      Animated.timing(vis, { toValue: 0, duration: 120, easing: SMOOTH, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: CARD_SIZE, height: CARD_SIZE, borderRadius: CARD_R, overflow: 'hidden', opacity: vis }}>
      <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, width: 40, transform: [{ translateX: x }, { skewX: '-20deg' }], backgroundColor: 'rgba(255,255,255,0.6)' }} />
    </Animated.View>
  );
});

const LoadingDots = React.memo(function LoadingDots({ visible }: { visible: boolean }) {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    if (!visible) return;
    const loops = dots.map((d, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 150),
      Animated.timing(d, { toValue: 1, duration: 250, easing: SINE_INOUT, useNativeDriver: true }),
      Animated.timing(d, { toValue: 0, duration: 250, easing: SINE_INOUT, useNativeDriver: true }),
      Animated.delay((dots.length - 1 - i) * 150),
    ])));
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [visible]);
  return (
    <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)', opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }), transform: [{ scale: d.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }] }} />
      ))}
    </View>
  );
});

const LoadingScreen: React.FC = () => {
  const bgA    = useRef(new Animated.Value(0)).current;
  const cardY  = useRef(new Animated.Value(-40)).current;
  const cardS  = useRef(new Animated.Value(0.62)).current;
  const cardA  = useRef(new Animated.Value(0)).current;
  const ringS  = useRef(new Animated.Value(0.5)).current;
  const ringA  = useRef(new Animated.Value(0)).current;
  const glowS  = useRef(new Animated.Value(1.0)).current;
  const glowA  = useRef(new Animated.Value(0)).current;
  const wordA  = useRef(new Animated.Value(0)).current;
  const wordY  = useRef(new Animated.Value(20)).current;
  const barW   = useRef(new Animated.Value(0)).current;
  const barA   = useRef(new Animated.Value(0)).current;
  const dotsA  = useRef(new Animated.Value(0)).current;
  const [showDots, setShowDots] = useState(false);

  const startGlowBreathe = useCallback(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glowS, { toValue: 1.15, duration: 1500, easing: SINE_INOUT, useNativeDriver: true }),
      Animated.timing(glowS, { toValue: 1.00, duration: 1500, easing: SINE_INOUT, useNativeDriver: true }),
    ])).start();
  }, [glowS]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(bgA,   { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(cardA, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(cardS, { toValue: 1, duration: 800, easing: MAGNETIC, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(cardY, { toValue: 0,   duration: 800,  easing: MAGNETIC,   useNativeDriver: true }),
        Animated.timing(cardY, { toValue: -80, duration: 1200, easing: EXPO_INOUT, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(900),
        Animated.parallel([
          Animated.timing(wordA, { toValue: 1, duration: 800, easing: SMOOTH,    useNativeDriver: true }),
          Animated.timing(wordY, { toValue: 0, duration: 1000, easing: EXPO_OUT, useNativeDriver: true }),
          runAction(() => startGlowBreathe()),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.timing(ringA, { toValue: 0.8, duration: 400, useNativeDriver: true }),
          Animated.timing(ringS, { toValue: 1.3, duration: 1200, easing: EXPO_OUT, useNativeDriver: true }),
        ]),
        Animated.timing(ringA, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(1200),
        Animated.timing(barA, { toValue: 1, duration: 400, easing: SMOOTH, useNativeDriver: true }),
        Animated.timing(barW, { toValue: W, duration: 1400, easing: MATERIAL, useNativeDriver: false }),
      ]),
      Animated.sequence([
        Animated.delay(1000),
        runAction(() => setShowDots(true)),
        Animated.timing(dotsA, { toValue: 1, duration: 500, easing: SMOOTH, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const ROW1 = ['R', 'I', 'T'];
  const ROW2 = ['G', 'A', 'T', 'E'];
  const FS   = 72;

  return (
    <Animated.View style={[s.root, { opacity: bgA }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} translucent />
      <Orb style={s.orb1} delay={0} />
      <Orb style={s.orb2} delay={1000} />
      {[...Array(12)].map((_, i) => <Particle key={i} delayMs={i * 600} />)}
      <Animated.View style={[s.bg, { opacity: bgA }]}>
        <View style={s.orb1} />
        <View style={s.orb2} />
      </Animated.View>
      <View style={s.ringsAnchor}>
        <RippleRing delayMs={0}   finalR={W * 0.38} />
        <RippleRing delayMs={160} finalR={W * 0.52} />
      </View>
      <View style={s.stage}>
        <Animated.View style={{ transform: [{ translateY: cardY }], alignItems: 'center', width: '100%' }}>
          <Animated.View style={[s.card, { opacity: cardA, transform: [{ scale: cardS }] }]}>
            <Animated.View style={[s.orbitalRing, { opacity: ringA, transform: [{ scale: ringS }], borderColor: ACCENT, borderWidth: 2 }]} />
            <Image source={require('../../assets/rit-logo.png')} style={s.logo} resizeMode="contain" />
            <CardShimmer startDelay={600} />
            <Animated.View style={[s.glow, { opacity: glowA, transform: [{ scale: glowS }] }]} />
          </Animated.View>
          <Animated.View style={[s.wordmark, { opacity: wordA, transform: [{ translateY: wordY }] }]}>
            <View style={s.textGlowBloom} />
            <View style={s.letterRow}>
              {ROW1.map((ch, i) => <AnimLetter key={`r${i}`} ch={ch} delayMs={i * 70} size={FS} color={['#0A1C52','#142A68','#1F387E'][i] || TEXT_C} />)}
            </View>
            <View style={{ height: 2 }} />
            <View style={s.letterRow}>
              {ROW2.map((ch, i) => <AnimLetter key={`g${i}`} ch={ch} delayMs={250 + i * 70} size={FS} color={['#294794','#3455A9','#3E64BF','#4972D5'][i] || TEXT_C} />)}
            </View>
          </Animated.View>
        </Animated.View>
      </View>
      <Animated.View style={[s.dotsRow, { opacity: dotsA }]}>
        <LoadingDots visible={showDots} />
      </Animated.View>
      <Animated.View style={[s.barTrack, { opacity: barA }]}>
        <Animated.View style={[s.barFill, { width: barW }]} />
      </Animated.View>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  bg:           { ...StyleSheet.absoluteFillObject, backgroundColor: BG },
  orb1:         { position: 'absolute', width: W * 1.0, height: W * 1.0, borderRadius: W * 0.5, top: -W * 0.32, left: -W * 0.22, backgroundColor: SUBTLE },
  orb2:         { position: 'absolute', width: W * 0.82, height: W * 0.82, borderRadius: W * 0.41, bottom: -W * 0.28, right: -W * 0.18, backgroundColor: SUBTLE },
  ringsAnchor:  { position: 'absolute', alignSelf: 'center', top: H / 2 - CARD_SIZE / 2 - H * 0.1, alignItems: 'center', justifyContent: 'center', width: CARD_SIZE, height: CARD_SIZE },
  stage:        { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  card:         { width: CARD_SIZE, height: CARD_SIZE, borderRadius: CARD_R, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', marginBottom: 54, overflow: 'visible' },
  glow:         { position: 'absolute', width: CARD_SIZE, height: CARD_SIZE, borderRadius: CARD_R, backgroundColor: GLOW_C },
  orbitalRing:  { position: 'absolute', width: CARD_SIZE, height: CARD_SIZE, borderRadius: CARD_SIZE / 2, borderWidth: 1.2, borderColor: RING_C, backgroundColor: 'transparent' },
  logo:         { width: 170, height: 170, borderRadius: 85 },
  wordmark:     { marginTop: -10, alignItems: 'center', marginBottom: 10 },
  textGlowBloom:{ position: 'absolute', top: -8, bottom: -12, left: -20, right: -20, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  letterRow:    { flexDirection: 'row', alignItems: 'flex-end', overflow: 'visible' },
  dotsRow:      { position: 'absolute', bottom: H * 0.115 },
  barTrack:     { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, backgroundColor: 'rgba(37,87,214,0.08)', overflow: 'hidden' },
  barFill:      { height: 2.5, backgroundColor: ACCENT, borderRadius: 1.5, opacity: 0.75 },
});

export default LoadingScreen;
