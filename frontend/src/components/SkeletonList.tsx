import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import SkeletonCard from './SkeletonCard';

interface SkeletonListProps {
  count?: number;
  colors?: [string, string, string];
  headerHeight?: number;
}

const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 5,
  colors = ['#E0E0E0', '#F5F5F5', '#E0E0E0'],
  headerHeight = 0,
}) => {
  const data = Array.from({ length: count }, (_, i) => i);

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => `skeleton-${item}`}
      renderItem={() => <SkeletonCard colors={colors} />}
      contentContainerStyle={[
        styles.container,
        { paddingTop: headerHeight },
      ]}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
});

export default SkeletonList;
