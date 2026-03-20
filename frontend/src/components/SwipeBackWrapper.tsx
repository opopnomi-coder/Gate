import React, { useRef } from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Swipe must start within this many px from the left edge
const EDGE_HIT_SLOP = 30;
// Minimum horizontal distance to trigger back navigation
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;
// Minimum velocity (px/s) to trigger back even if distance is short
const VELOCITY_THRESHOLD = 600;

interface SwipeBackWrapperProps {
  children: React.ReactNode;
  onBack: () => void;
  /** Set to false on root/home screens where back should not fire */
  enabled?: boolean;
}

const SwipeBackWrapper: React.FC<SwipeBackWrapperProps> = ({
  children,
  onBack,
  enabled = true,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  // Track whether the gesture started from the left edge
  const startedFromEdge = useRef(false);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
    const { state, translationX, velocityX, x } = event.nativeEvent;

    if (state === State.BEGAN) {
      // Only allow gesture if it started near the left edge
      startedFromEdge.current = x <= EDGE_HIT_SLOP;
    }

    if (state === State.ACTIVE) {
      // Block if not from edge or moving left/up-dominant
      if (!startedFromEdge.current || translationX < 0) {
        translateX.setValue(0);
      }
    }

    if (state === State.END || state === State.FAILED || state === State.CANCELLED) {
      if (
        startedFromEdge.current &&
        (translationX >= SWIPE_THRESHOLD || velocityX >= VELOCITY_THRESHOLD)
      ) {
        // Commit: slide screen fully off to the right then call onBack
        Animated.timing(translateX, {
          toValue: SCREEN_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          translateX.setValue(0);
          onBack();
        });
      } else {
        // Cancel: snap back
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
      }
      startedFromEdge.current = false;
    }
  };

  if (!enabled) {
    return <>{children}</>;
  }

  // Clamp translation so it only moves right (never left)
  const clampedTranslate = translateX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [0, SCREEN_WIDTH],
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Subtle shadow/dim on the left edge as visual feedback
  const shadowOpacity = translateX.interpolate({
    inputRange: [0, SCREEN_WIDTH * 0.5],
    outputRange: [0, 0.15],
    extrapolate: 'clamp',
  });

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      activeOffsetX={[0, 15]}   // must move right at least 15px before activating
      failOffsetY={[-10, 10]}   // fail if vertical movement > 10px (prevents scroll conflict)
      minDist={5}
    >
      <Animated.View
        style={[
          styles.container,
          { transform: [{ translateX: clampedTranslate }] },
        ]}
      >
        {children}
        {/* Left-edge shadow overlay for visual drag feedback */}
        <Animated.View
          pointerEvents="none"
          style={[styles.edgeShadow, { opacity: shadowOpacity }]}
        />
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  edgeShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});

export default SwipeBackWrapper;
