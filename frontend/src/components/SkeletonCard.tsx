import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const { width } = Dimensions.get('window');

interface SkeletonCardProps {
  colors?: [string, string, string];
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({
  colors = ['#E0E0E0', '#F5F5F5', '#E0E0E0'],
}) => {
  return (
    <View style={styles.card}>
      <SkeletonPlaceholder
        backgroundColor={colors[0]}
        highlightColor={colors[1]}
        speed={800}>
        <View style={styles.container}>
          {/* Left: Avatar placeholder */}
          <View style={styles.avatar} />

          {/* Right: Content lines */}
          <View style={styles.content}>
            {/* Title line */}
            <View style={styles.titleLine} />
            {/* Subtitle line */}
            <View style={styles.subtitleLine} />
            {/* Content lines */}
            <View style={styles.contentLine} />
            <View style={[styles.contentLine, { width: '70%' }]} />
          </View>
        </View>
      </SkeletonPlaceholder>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  content: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  titleLine: {
    width: '60%',
    height: 18,
    borderRadius: 4,
    marginBottom: 8,
  },
  subtitleLine: {
    width: '40%',
    height: 14,
    borderRadius: 4,
    marginBottom: 12,
  },
  contentLine: {
    width: '100%',
    height: 12,
    borderRadius: 4,
    marginBottom: 8,
  },
});

export default SkeletonCard;
