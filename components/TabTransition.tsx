import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet } from 'react-native';

interface TabTransitionProps {
  children: React.ReactNode;
  isActive: boolean;
  transitionType?: 'fade' | 'scale' | 'slideHorizontal';
  duration?: number;
}

export default function TabTransition({
  children,
  isActive,
  transitionType = 'fade',
  duration = 250,
}: TabTransitionProps) {
  const fadeAnim = useRef(new Animated.Value(isActive ? 1 : 0.7)).current;
  const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0.95)).current;
  const slideAnim = useRef(new Animated.Value(isActive ? 0 : 20)).current;

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [];

    switch (transitionType) {
      case 'fade':
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: isActive ? 1 : 0.7,
            duration,
            useNativeDriver: true,
          })
        );
        break;

      case 'scale':
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: isActive ? 1 : 0.8,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: isActive ? 1 : 0.95,
            duration,
            useNativeDriver: true,
          })
        );
        break;

      case 'slideHorizontal':
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: isActive ? 1 : 0.6,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: isActive ? 0 : 20,
            duration,
            useNativeDriver: true,
          })
        );
        break;
    }

    Animated.parallel(animations).start();
  }, [isActive, transitionType, duration, fadeAnim, scaleAnim, slideAnim]);

  const getAnimatedStyle = () => {
    const baseStyle = {
      opacity: fadeAnim,
    };

    switch (transitionType) {
      case 'scale':
        return {
          ...baseStyle,
          transform: [{ scale: scaleAnim }],
        };

      case 'slideHorizontal':
        return {
          ...baseStyle,
          transform: [{ translateX: slideAnim }],
        };

      default:
        return baseStyle;
    }
  };

  return (
    <Animated.View style={[styles.container, getAnimatedStyle()]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});