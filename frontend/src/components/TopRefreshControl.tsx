/**
 * TopRefreshControl
 *
 * Two modes:
 * 1. Default (dashboards): Custom pull-from-anywhere gesture.
 *    The FlatList inside should NOT have a RefreshControl.
 *
 * 2. Blur-only (other screens): Just wraps children.
 *    The FlatList inside uses native RefreshControl.
 *    Pass pullEnabled={false} to use this mode.
 *
 * RefreshBlurOverlay is kept as a no-op for backward compat.
 * Use <SkeletonList /> from SkeletonCard.tsx for loading states instead.
 */
import React, { useRef, useEffect, createContext } from 'react';
import {
  View,
  Animated,
  PanResponder,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

const PULL_THRESHOLD = 70;
const INDICATOR_HEIGHT = 52;

export const RefreshContext = createContext<Animated.Value>(new Animated.Value(0));

interface TopRefreshControlProps {
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
  color?: string;
  pullEnabled?: boolean; // default true for dashboards, false for other screens
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
  const progressLoop = useRef<Animated.CompositeAnimation | null>(null);

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

  // Use a ref so PanResponder always reads the latest pullEnabled value
  const pullEnabledRef = useRef(pullEnabled);
  useEffect(() => { pullEnabledRef.current = pullEnabled; }, [pullEnabled]);

  // Only create PanResponder for dashboards (pullEnabled=true)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        if (!pullEnabledRef.current || refreshing) return false;
        // Only capture clear downward swipes, not ambiguous ones
        return g.dy > 12 && g.dy > Math.abs(g.dx) * 2.5;
      },
      onMoveShouldSetPanResponderCapture: (_, g) => {
        if (!pullEnabledRef.current || refreshing) return false;
        return g.dy > 20 && g.dy > Math.abs(g.dx) * 3;
      },
      onPanResponderGrant: () => {
        pulling.current = true;
        triggered.current = false;
      },
      onPanResponderMove: (_, g) => {
        if (!pulling.current) return;
        const drag = Math.min(g.dy * 0.45, PULL_THRESHOLD + 20);
        if (drag > 0) translateY.setValue(drag);
      },
      onPanResponderRelease: (_, g) => {
        pulling.current = false;
        const drag = g.dy * 0.45;
        if (drag >= PULL_THRESHOLD && !triggered.current) {
          triggered.current = true;
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

  if (!pullEnabled) {
    // Blur-only mode: no gesture, no spinner, just context + progress bar
    return (
      <RefreshContext.Provider value={new Animated.Value(0)}>
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
    <RefreshContext.Provider value={new Animated.Value(0)}>
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

/**
 * RefreshBlurOverlay — kept as no-op for backward compatibility.
 * Use <SkeletonList /> from SkeletonCard.tsx for loading states instead.
 */
export const RefreshBlurOverlay: React.FC<{
  cardBg: string;
  refreshing?: boolean;
}> = () => null;

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
