import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, useWindowDimensions } from 'react-native';

interface EnhancedPageTransitionProps {
  children: React.ReactNode;
  isVisible?: boolean;
  animationType?: 'slideInRight' | 'slideInLeft' | 'slideInUp' | 'slideInDown' | 'fadeIn' | 'scaleIn' | 'flipIn' | 'bounceIn';
  duration?: number;
  delay?: number;
}

export default function EnhancedPageTransition({ 
  children, 
  isVisible = true, 
  animationType = 'slideInRight',
  duration = 400,
  delay = 0
}: EnhancedPageTransitionProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const fadeAnim = useRef(new Animated.Value(isVisible ? 1 : 0)).current;
  const translateXAnim = useRef(new Animated.Value(isVisible ? 0 : getInitialTranslateX(animationType, screenWidth))).current;
  const translateYAnim = useRef(new Animated.Value(isVisible ? 0 : getInitialTranslateY(animationType, screenHeight))).current;
  const scaleAnim = useRef(new Animated.Value(isVisible ? 1 : 0.8)).current;
  const rotateAnim = useRef(new Animated.Value(isVisible ? 0 : 1)).current;

  function getInitialTranslateX(type: string, width: number): number {
    switch (type) {
      case 'slideInRight': return width;
      case 'slideInLeft': return -width;
      default: return 0;
    }
  }

  function getInitialTranslateY(type: string, height: number): number {
    switch (type) {
      case 'slideInUp': return height;
      case 'slideInDown': return -height;
      default: return 0;
    }
  }

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Для веб-версії використовуємо простіші анімації
      fadeAnim.setValue(isVisible ? 1 : 0);
      return;
    }

    const animations: Animated.CompositeAnimation[] = [];

    switch (animationType) {
      case 'fadeIn':
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: isVisible ? 1 : 0,
            duration,
            useNativeDriver: true,
          })
        );
        break;

      case 'slideInRight':
      case 'slideInLeft':
        animations.push(
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: isVisible ? 1 : 0,
              duration: duration * 0.8,
              useNativeDriver: true,
            }),
            Animated.spring(translateXAnim, {
              toValue: isVisible ? 0 : getInitialTranslateX(animationType, screenWidth),
              tension: 80,
              friction: 8,
              useNativeDriver: true,
            }),
          ])
        );
        break;

      case 'slideInUp':
      case 'slideInDown':
        animations.push(
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: isVisible ? 1 : 0,
              duration: duration * 0.8,
              useNativeDriver: true,
            }),
            Animated.spring(translateYAnim, {
              toValue: isVisible ? 0 : getInitialTranslateY(animationType, screenHeight),
              tension: 80,
              friction: 8,
              useNativeDriver: true,
            }),
          ])
        );
        break;

      case 'scaleIn':
        animations.push(
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: isVisible ? 1 : 0,
              duration: duration * 0.6,
              useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
              toValue: isVisible ? 1 : 0.8,
              tension: 100,
              friction: 6,
              useNativeDriver: true,
            }),
          ])
        );
        break;

      case 'flipIn':
        animations.push(
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: isVisible ? 1 : 0,
              duration: duration * 0.7,
              useNativeDriver: true,
            }),
            Animated.spring(rotateAnim, {
              toValue: isVisible ? 0 : 1,
              tension: 80,
              friction: 8,
              useNativeDriver: true,
            }),
          ])
        );
        break;

      case 'bounceIn':
        animations.push(
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: isVisible ? 1 : 0,
              duration: duration * 0.5,
              useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
              toValue: isVisible ? 1 : 0.3,
              tension: 200,
              friction: 4,
              useNativeDriver: true,
            }),
          ])
        );
        break;
    }

    if (animations.length > 0) {
      const animation = delay > 0 
        ? Animated.sequence([
            Animated.delay(delay),
            ...animations
          ])
        : Animated.sequence(animations);
      
      animation.start();
    }
  }, [isVisible, animationType, duration, delay, fadeAnim, translateXAnim, translateYAnim, scaleAnim, rotateAnim, screenWidth, screenHeight]);

  const getAnimatedStyle = () => {
    const baseStyle = { opacity: fadeAnim };

    switch (animationType) {
      case 'slideInRight':
      case 'slideInLeft':
        return {
          ...baseStyle,
          transform: [{ translateX: translateXAnim }],
        };

      case 'slideInUp':
      case 'slideInDown':
        return {
          ...baseStyle,
          transform: [{ translateY: translateYAnim }],
        };

      case 'scaleIn':
      case 'bounceIn':
        return {
          ...baseStyle,
          transform: [{ scale: scaleAnim }],
        };

      case 'flipIn':
        return {
          ...baseStyle,
          transform: [
            {
              rotateY: rotateAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '180deg'],
              }),
            },
          ],
        };

      default:
        return baseStyle;
    }
  };

  if (Platform.OS === 'web') {
    return (
      <Animated.View style={[styles.webContainer, { opacity: fadeAnim }]}>
        {children}
      </Animated.View>
    );
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
  webContainer: {
    flex: 1,
  },
});