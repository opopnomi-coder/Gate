import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface ScreenContentContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * A simple full-width container that prevents horizontal overflow.
 * No maxWidth clipping — content fills the screen width naturally.
 */
const ScreenContentContainer: React.FC<ScreenContentContainerProps> = ({ children, style }) => (
  <View style={[styles.container, style]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
});

export default ScreenContentContainer;
