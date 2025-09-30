import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

interface ScreenTransitionProps {
  children: React.ReactNode;
  transitionKey: string;
  animationType?: 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'fade' | 'scale';
  duration?: number;
}

export default function ScreenTransition({ 
  children, 
  transitionKey,
  animationType = 'slideLeft',
  duration = 350 
}: ScreenTransitionProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const getInitialSlideValue = useCallback(() => {
    switch (animationType) {
      case 'slideLeft':
        return 50;
      case 'slideRight':
        return -50;
      case 'slideUp':
        return 50;
      case 'slideDown':
        return -50;
      default:
        return 50;
    }
  }, [animationType]);

  useEffect(() => {
    // Скидаємо анімації при зміні ключа
    fadeAnim.setValue(0);
    slideAnim.setValue(getInitialSlideValue());
    scaleAnim.setValue(0.95);

    if (Platform.OS !== 'web') {
      // Запускаємо анімацію входу
      const animations = [];

      switch (animationType) {
        case 'fade':
          animations.push(
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration,
              useNativeDriver: true,
            })
          );
          break;
        
        case 'scale':
          animations.push(
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration,
                useNativeDriver: true,
              }),
              Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
              }),
            ])
          );
          break;
        
        default:
          animations.push(
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration,
                useNativeDriver: true,
              }),
              Animated.spring(slideAnim, {
                toValue: 0,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
              }),
            ])
          );
          break;
      }

      if (animations.length > 0) {
        Animated.sequence(animations).start();
      }
    } else {
      // Для веб-версії просто показуємо контент
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      scaleAnim.setValue(1);
    }
  }, [transitionKey, animationType, duration, fadeAnim, slideAnim, scaleAnim, getInitialSlideValue]);

  const getAnimatedStyle = () => {
    const baseStyle = { opacity: fadeAnim };

    switch (animationType) {
      case 'slideLeft':
      case 'slideRight':
        return {
          ...baseStyle,
          transform: [{ translateX: slideAnim }],
        };
      
      case 'slideUp':
      case 'slideDown':
        return {
          ...baseStyle,
          transform: [{ translateY: slideAnim }],
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

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        {children}
      </View>
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