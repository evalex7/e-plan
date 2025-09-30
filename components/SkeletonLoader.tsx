import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/colors';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
  children?: React.ReactNode;
}

export default function SkeletonLoader({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4,
  style,
  children 
}: SkeletonLoaderProps) {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const shimmerAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerValue, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      shimmerAnimation.start();

      return () => {
        shimmerAnimation.stop();
      };
    }
  }, [shimmerValue]);

  const opacity = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.webSkeleton,
          {
            width,
            height,
            borderRadius,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

// Компонент для скелетону карточки
export function SkeletonCard({ style }: { style?: any }) {
  return (
    <View style={[styles.card, style]}>
      <SkeletonLoader height={16} width="70%" style={styles.skeletonTitle} />
      <SkeletonLoader height={12} width="100%" style={styles.skeletonLine} />
      <SkeletonLoader height={12} width="80%" style={styles.skeletonLineShort} />
      <View style={styles.cardFooter}>
        <SkeletonLoader height={10} width="40%" />
        <SkeletonLoader height={10} width="30%" />
      </View>
    </View>
  );
}

// Компонент для скелетону списку
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={`skeleton-${index}`} style={styles.skeletonCardMargin} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.gray200,
  },
  webSkeleton: {
    backgroundColor: colors.gray200,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  card: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  skeletonTitle: {
    marginBottom: 8,
  },
  skeletonLine: {
    marginBottom: 4,
  },
  skeletonLineShort: {
    marginBottom: 8,
  },
  skeletonCardMargin: {
    marginBottom: 12,
  },
});