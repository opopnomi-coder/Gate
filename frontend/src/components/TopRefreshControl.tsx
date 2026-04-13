/**
 * TopRefreshControl
 *
 * Custom pull-to-refresh that works regardless of font size or device density.
 * Uses a scroll position tracker + PanResponder to intercept downward swipes
 * only when the inner scroll is at the top (scrollY === 0).
 */
import React, { useRef, useEffect, createContext } from 'react';
import {
  View,
  Animated,
  PanResponder,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';

const PULL_THRESHOLD = 60;   // px to drag before triggering refresh
const INDICATOR_HEIGHT = 52;
const MIN_DY = 8;            // minimum downward movement to start capturing

export const RefreshContext = createContext<{ scrollY: Animated.Value; onScroll: any }>({
  scrollY: new Animated.Value(0),
  onScroll: null,
});

interface TopRefreshControlProps {
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
  color?: string;
  pullEnabled?: boolean;
}

const TopRefreshControl: React.FC<TopRefreshControlProps> = ({
  refreshing,
  onRefresh,
  children,
  color = '#F59E0B',
  pullEnabled = true,
}) => {
  const translateY   = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulling      = useRef(false);
  const triggered    = useRef(false);
  const scrollY      = useRef(new Animated.Value(0)).current;
  const scrollYValue = useRef(0);
  const progressLoop = useRef<Animated.CompositeAnimation | null>(null);
  const pullEnabledRef = useRef(pullEnabled);
  const refreshingRef  = useRef(refreshing);

  useEffect(() => { pullEnabledRef.current = pullEnabled; }, [pullEnabled]);
  useEffect(() => { refreshingRef.current = refreshing; }, [refreshing]);

  // Track scroll position so we only intercept when at top
  useEffect(() => {
    const id = scrollY.addListener(({ value }) => { scrollYValue.current = value; });
    return () => scrollY.removeListener(id);
  }, []);

  useEffect(() => {
    if (refreshing) {
      progressAnim.setValue(0);
      progressLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(progressAnim, { toValue: 0.8, duration: 1000, useNativeDriver: false }),
          Animated.timing(progressAnim, { toValue: 0.3, duration: 400, useNativeDriver: false }),
        ])
      );
      progressLoop.current.start();
    } else {
      progressLoop.current?.stop();
      Animated.timing(progressAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start(() => {
        Animated.timing(progressAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
      });
      if (triggered.current) {
        triggered.current = false;
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
      }
    }
    return () => progressLoop.current?.stop();
  }, [refreshing]);

  const animateTo = (toValue: number, cb?: () => void) => {
    Animated.spring(translateY, { toValue, useNativeDriver: true, tension: 80, friction: 10 }).start(cb);
  };

  const isAtTop = () => scrollYValue.current <= 2;

  const panResponder = useRef(
    PanResponder.create({
      // Capture at start if clearly pulling down from top
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,

      onMoveShouldSetPanResponder: (_, g) => {
        if (!pullEnabledRef.current || refreshingRef.current) return false;
        if (!isAtTop()) return false;
        return g.dy > MIN_DY && g.dy > Math.abs(g.dx) * 1.5;
      },
      onMoveShouldSetPanResponderCapture: (_, g) => {
        if (!pullEnabledRef.current || refreshingRef.current) return false;
        if (!isAtTop()) return false;
        // More aggressive capture — lower ratio requirement
        return g.dy > MIN_DY * 1.5 && g.dy > Math.abs(g.dx) * 1.2;
      },

      onPanResponderGrant: () => {
        pulling.current = true;
        triggered.current = false;
      },
      onPanResponderMove: (_, g) => {
        if (!pulling.current) return;
        const drag = Math.min(g.dy * 0.5, PULL_THRESHOLD + 20);
        if (drag > 0) translateY.setValue(drag);
      },
      onPanResponderRelease: (_, g) => {
        pulling.current = false;
        const drag = g.dy * 0.5;
        if (drag >= PULL_THRESHOLD && !triggered.current) {
          triggered.current = true;
          console.log('🔄 [TopRefreshControl] Pull-to-refresh triggered');
          animateTo(INDICATOR_HEIGHT, () => onRefresh());
        } else {
          animateTo(0);
        }
      },
      onPanResponderTerminate: () => {
        pulling.current = false;
        animateTo(0);
      },
    })
  ).current;

  const indicatorOpacity = translateY.interpolate({
    inputRange: [0, PULL_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Scroll event handler to pass to inner FlatList/ScrollView via context
  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  if (!pullEnabled) {
    return (
      <RefreshContext.Provider value={{ scrollY, onScroll }}>
        <View style={styles.container}>
          <Animated.View
            pointerEvents="none"
            style={[styles.progressBar, { width: progressWidth, backgroundColor: color, opacity: refreshing ? 1 : 0 }]}
          />
          {children}
        </View>
      </RefreshContext.Provider>
    );
  }

  return (
    <RefreshContext.Provider value={{ scrollY, onScroll }}>
      <View style={styles.container}>
        {/* Spinner at top */}
        <Animated.View pointerEvents="none" style={[styles.indicator, { opacity: refreshing ? 1 : indicatorOpacity }]}>
          <ActivityIndicator size="small" color={color} />
        </Animated.View>

        {/* Progress bar */}
        <Animated.View
          pointerEvents="none"
          style={[styles.progressBar, { width: progressWidth, backgroundColor: color, opacity: refreshing ? 1 : 0 }]}
        />

        {/* Content shifts down on pull */}
        <Animated.View
          style={[styles.content, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          {children}
        </Animated.View>
      </View>
    </RefreshContext.Provider>
  );
};

export const RefreshBlurOverlay: React.FC<{ cardBg: string; refreshing?: boolean }> = () => null;

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  indicator: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: INDICATOR_HEIGHT, alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  progressBar: {
    position: 'absolute', top: 0, left: 0, height: 3, zIndex: 20, borderRadius: 2,
  },
  content: { flex: 1 },
});

export default TopRefreshControl;
