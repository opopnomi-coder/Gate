import React, { useRef } from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EDGE_HIT_SLOP = 30;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;
const VELOCITY_THRESHOLD = 600;

interface SwipeBackWrapperProps {
  children: React.ReactNode;
  onBack: () => void;
  /** Disable on root screens */
  enabled?: boolean;
  /** Disable during API calls / locked state */
  locked?: boolean;
}

const SwipeBackWrapper: React.FC<SwipeBackWrapperProps> = ({
  children,
  onBack,
  enabled = true,
  locked = false,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const startedFromEdge = useRef(false);
  const navigating = useRef(false);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
    if (!enabled || locked) {
      translateX.setValue(0);
      return;
    }

    const { state, translationX, velocityX, x } = event.nativeEvent;

    if (state === State.BEGAN) {
      startedFromEdge.current = x <= EDGE_HIT_SLOP;
      navigating.current = false;
    }

    if (state === State.ACTIVE) {
      // Only allow rightward swipe from edge
      if (!startedFromEdge.current || translationX < 0) {
        translateX.setValue(0);
      }
    }

    if (state === State.END || state === State.FAILED || state === State.CANCELLED) {
      const shouldNavigate =
        !navigating.current &&
        startedFromEdge.current &&
        (translationX >= SWIPE_THRESHOLD || velocityX >= VELOCITY_THRESHOLD);

      if (shouldNavigate) {
        navigating.current = true;
        // Animate slide out to the right, then trigger back
        Animated.timing(translateX, {
          toValue: SCREEN_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }).start(() => {
          translateX.setValue(0);
          navigating.current = false;
          onBack();
        });
      } else {
        // Snap back
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
          speed: 20,
        }).start();
      }
      startedFromEdge.current = false;
    }
  };

  if (!enabled) {
    return <>{children}</>;
  }

  // Clamp translation so it only moves right (never left)
  const clampedTranslateX = translateX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [0, SCREEN_WIDTH],
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      activeOffsetX={[0, 25]}
      failOffsetY={[-15, 15]}
      enabled={!locked}
    >
      <Animated.View
        style={[
          styles.container,
          { transform: [{ translateX: clampedTranslateX }] },
        ]}
      >
        {children}
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default SwipeBackWrapper;
