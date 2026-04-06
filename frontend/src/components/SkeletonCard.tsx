/**
 * SkeletonCard + SkeletonList
 *
 * Skeleton shimmer placeholder matching the request card layout.
 * Uses react-native-skeleton-placeholder for smooth left-to-right shimmer.
 *
 * Usage:
 *   import { SkeletonList } from './SkeletonCard';
 *   {refreshing ? <SkeletonList /> : <FlatList ... />}
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTheme } from '../context/ThemeContext';

const SkeletonCard: React.FC = () => {
  const { theme, isDark } = useTheme();
  const bg = isDark ? '#2A2A2A' : '#E8E8E8';
  const highlight = isDark ? '#3A3A3A' : '#F5F5F5';

  return (
    <SkeletonPlaceholder
      backgroundColor={bg}
      highlightColor={highlight}
      speed={900}
      borderRadius={8}
    >
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        {/* Top row: avatar + name block + time */}
        <View style={styles.topRow}>
          <View style={styles.avatar} />
          <View style={styles.nameBlock}>
            <View style={styles.nameLine} />
            <View style={styles.subtitleLine} />
          </View>
          <View style={styles.timeLine} />
        </View>

        {/* Info box */}
        <View style={styles.infoBox}>
          <View style={styles.infoLine} />
          <View style={styles.infoLineShort} />
        </View>

        {/* Status pill */}
        <View style={styles.statusPill} />
      </View>
    </SkeletonPlaceholder>
  );
};

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <View style={styles.list}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    elevation: 1,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  nameBlock: { flex: 1, gap: 8 },
  nameLine: { width: '60%', height: 14, borderRadius: 7 },
  subtitleLine: { width: '40%', height: 11, borderRadius: 6 },
  timeLine: { width: 40, height: 11, borderRadius: 6 },
  infoBox: {
    borderRadius: 12,
    padding: 14,
    gap: 10,
    backgroundColor: 'transparent',
  },
  infoLine: { width: '90%', height: 13, borderRadius: 6 },
  infoLineShort: { width: '60%', height: 13, borderRadius: 6 },
  statusPill: { width: 80, height: 26, borderRadius: 13 },
});

export default SkeletonCard;
