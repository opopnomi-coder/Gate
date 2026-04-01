import React from 'react';
import {
  ScrollView,
  ScrollViewProps,
  FlatList,
  FlatListProps,
  SectionList,
  SectionListProps,
  Platform,
} from 'react-native';

/**
 * A safe ScrollView that explicitly disables horizontal scrolling,
 * prevents diagonal drifting, and blocks horizontal bounce.
 * 
 * Perfect for main page layouts to prevent gesture conflicts 
 * with edge-swipes or nested horizontal carousels.
 */
export const VerticalScrollView = React.forwardRef<ScrollView, ScrollViewProps>(
  (props, ref) => {
    return (
      <ScrollView
        ref={ref}
        {...props}
        horizontal={false}
        showsHorizontalScrollIndicator={false}
        alwaysBounceHorizontal={false}
        decelerationRate="normal"
        directionalLockEnabled={Platform.OS === 'ios' ? true : undefined}
      />
    );
  }
);
VerticalScrollView.displayName = 'VerticalScrollView';

/**
 * A safe FlatList that explicitly disables horizontal scrolling,
 * prevents diagonal drifting, and blocks horizontal bounce.
 */
export const VerticalFlatList = React.forwardRef<FlatList<any>, FlatListProps<any>>(
  (props, ref) => {
    return (
      <FlatList
        ref={ref}
        {...props}
        horizontal={false}
        showsHorizontalScrollIndicator={false}
        alwaysBounceHorizontal={false}
        decelerationRate="normal"
        directionalLockEnabled={Platform.OS === 'ios' ? true : undefined}
      />
    );
  }
);
VerticalFlatList.displayName = 'VerticalFlatList';

/**
 * A safe SectionList that explicitly disables horizontal scrolling,
 * prevents diagonal drifting, and blocks horizontal bounce.
 */
export const VerticalSectionList = React.forwardRef<SectionList<any, any>, SectionListProps<any, any>>(
  (props, ref) => {
    return (
      <SectionList
        ref={ref}
        {...props}
        horizontal={false}
        showsHorizontalScrollIndicator={false}
        alwaysBounceHorizontal={false}
        directionalLockEnabled={Platform.OS === 'ios' ? true : undefined}
      />
    );
  }
);
VerticalSectionList.displayName = 'VerticalSectionList';
