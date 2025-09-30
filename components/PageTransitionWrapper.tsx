import React, { useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

interface PageTransitionWrapperProps {
  children: React.ReactNode;
  transitionType?: 'fade' | 'slideUp' | 'slideRight' | 'scale' | 'none';
  duration?: number;
  delay?: number;
}

export default function PageTransitionWrapper({
  children,
  transitionType = 'fade',
  duration = 300,
  delay = 0,
}: PageTransitionWrapperProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const animateIn = () => {
    const animations: Animated.CompositeAnimation[] = [];

    switch (transitionType) {
      case 'fade':
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          })
        );
        break;

      case 'slideUp':
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          })
        );
        break;

      case 'slideRight':
        slideAnim.setValue(-50);
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          })
        );
        break;

      case 'scale':
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          })
        );
        break;

      case 'none':
        fadeAnim.setValue(1);
        slideAnim.setValue(0);
        scaleAnim.setValue(1);
        return;
    }

    if (delay > 0) {
      setTimeout(() => {
        Animated.parallel(animations).start();
      }, delay);
    } else {
      Animated.parallel(animations).start();
    }
  };

  const resetAnimation = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(transitionType === 'slideRight' ? -50 : 50);
    scaleAnim.setValue(0.95);
  };

  useFocusEffect(
    React.useCallback(() => {
      resetAnimation();
      animateIn();
    }, [transitionType, duration, delay, fadeAnim, slideAnim, scaleAnim])
  );

  const getAnimatedStyle = () => {
    const baseStyle = {
      opacity: fadeAnim,
    };

    switch (transitionType) {
      case 'slideUp':
      case 'slideRight':
        return {
          ...baseStyle,
          transform: [
            {
              translateY: transitionType === 'slideUp' ? slideAnim : 0,
            },
            {
              translateX: transitionType === 'slideRight' ? slideAnim : 0,
            },
          ],
        };

      case 'scale':
        return {
          ...baseStyle,
          transform: [{ scale: scaleAnim }],
        };

      default:
        return baseStyle;
    }
  };

  if (transitionType === 'none') {
    return <View style={styles.container}>{children}</View>;
  }

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