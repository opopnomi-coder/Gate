import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';

const EDGE_HIT_SLOP = 28;
const SWIPE_THRESHOLD = 80;   // px rightward to trigger
const VELOCITY_THRESHOLD = 500; // px/s rightward to trigger

interface SwipeBackWrapperProps {
  children: React.ReactNode;
  onBack: () => void;
  enabled?: boolean;
  locked?: boolean;
}

/**
 * Detects a left-edge swipe-right gesture and calls onBack().
 * NO visual translation — the screen stays in place.
 * This avoids the grey-background reveal while still supporting
 * the back gesture.
 */
const SwipeBackWrapper: React.FC<SwipeBackWrapperProps> = ({
  children,
  onBack,
  enabled = true,
  locked = false,
}) => {
  const startedFromEdge = useRef(false);
  const navigating = useRef(false);

  const onHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
    if (!enabled || locked) return;

    const { state, translationX, velocityX, x } = event.nativeEvent;

    if (state === State.BEGAN) {
      startedFromEdge.current = x <= EDGE_HIT_SLOP;
      navigating.current = false;
    }

    if (state === State.END) {
      const shouldNavigate =
        !navigating.current &&
        startedFromEdge.current &&
        translationX > 0 &&
        (translationX >= SWIPE_THRESHOLD || velocityX >= VELOCITY_THRESHOLD);

      if (shouldNavigate) {
        navigating.current = true;
        onBack();
      }
      startedFromEdge.current = false;
    }

    if (state === State.FAILED || state === State.CANCELLED) {
      startedFromEdge.current = false;
    }
  };

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <PanGestureHandler
      onHandlerStateChange={onHandlerStateChange}
      activeOffsetX={[0, 20]}
      failOffsetY={[-20, 20]}
      enabled={!locked}
    >
      {/* Plain View — no Animated.View, no translateX */}
      <View style={styles.container}>
        {children}
      </View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default SwipeBackWrapper;
