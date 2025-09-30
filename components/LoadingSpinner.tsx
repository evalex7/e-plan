import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/colors';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  style?: any;
}

export default function LoadingSpinner({ 
  size = 'medium', 
  color = colors.primary,
  style 
}: LoadingSpinnerProps) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Анімація обертання
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );

      // Анімація пульсації
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleValue, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      spinAnimation.start();
      pulseAnimation.start();

      return () => {
        spinAnimation.stop();
        pulseAnimation.stop();
      };
    }
  }, [spinValue, scaleValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getSize = () => {
    switch (size) {
      case 'small': return 20;
      case 'large': return 40;
      default: return 30;
    }
  };

  const spinnerSize = getSize();

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webSpinner, { width: spinnerSize, height: spinnerSize }, style]}>
        <View style={[styles.webSpinnerInner, { borderTopColor: color }]} />
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: spinnerSize,
          height: spinnerSize,
          transform: [{ rotate: spin }, { scale: scaleValue }],
        },
        style,
      ]}
    >
      <View style={[styles.spinner, { borderTopColor: color }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: '100%',
    height: '100%',
    borderWidth: 3,
    borderColor: colors.gray200,
    borderRadius: 50,
  },
  webSpinner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  webSpinnerInner: {
    width: '100%',
    height: '100%',
    borderWidth: 3,
    borderColor: colors.gray200,
    borderRadius: 50,
    animation: 'spin 1s linear infinite',
  },
});