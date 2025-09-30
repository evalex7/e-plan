import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

interface PageTransitionProps {
  children: React.ReactNode;
  isVisible?: boolean;
  animationType?: 'fade' | 'slide' | 'scale' | 'slideUp' | 'slideFromRight' | 'slideFromBottom';
  duration?: number;
  delay?: number;
  onAnimationComplete?: () => void;
}

export default function PageTransition({ 
  children, 
  isVisible = true, 
  animationType = 'fade',
  duration = 300,
  delay = 0,
  onAnimationComplete
}: PageTransitionProps) {
  const [isMounted, setIsMounted] = useState(false);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideUpAnim = useRef(new Animated.Value(100)).current;
  const slideRightAnim = useRef(new Animated.Value(screenWidth)).current;
  const slideBottomAnim = useRef(new Animated.Value(screenHeight)).current;

  useFocusEffect(
    React.useCallback(() => {
      setIsMounted(true);
      return () => setIsMounted(false);
    }, [])
  );

  useEffect(() => {
    if (!isMounted) return;

    const runAnimation = () => {
      if (Platform.OS !== 'web') {
        let animation: Animated.CompositeAnimation;

        switch (animationType) {
          case 'fade':
            animation = Animated.timing(fadeAnim, {
              toValue: isVisible ? 1 : 0,
              duration,
              useNativeDriver: true,
            });
            break;
          
          case 'slide':
            animation = Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: isVisible ? 1 : 0,
                duration,
                useNativeDriver: true,
              }),
              Animated.spring(slideAnim, {
                toValue: isVisible ? 0 : 50,
                tension: 120,
                friction: 8,
                useNativeDriver: true,
              }),
            ]);
            break;
          
          case 'scale':
            animation = Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: isVisible ? 1 : 0,
                duration,
                useNativeDriver: true,
              }),
              Animated.spring(scaleAnim, {
                toValue: isVisible ? 1 : 0.95,
                tension: 120,
                friction: 8,
                useNativeDriver: true,
              }),
            ]);
            break;
          
          case 'slideUp':
            animation = Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: isVisible ? 1 : 0,
                duration,
                useNativeDriver: true,
              }),
              Animated.spring(slideUpAnim, {
                toValue: isVisible ? 0 : 100,
                tension: 120,
                friction: 8,
                useNativeDriver: true,
              }),
            ]);
            break;

          case 'slideFromRight':
            animation = Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: isVisible ? 1 : 0,
                duration,
                useNativeDriver: true,
              }),
              Animated.spring(slideRightAnim, {
                toValue: isVisible ? 0 : screenWidth,
                tension: 120,
                friction: 8,
                useNativeDriver: true,
              }),
            ]);
            break;

          case 'slideFromBottom':
            animation = Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: isVisible ? 1 : 0,
                duration,
                useNativeDriver: true,
              }),
              Animated.spring(slideBottomAnim, {
                toValue: isVisible ? 0 : screenHeight,
                tension: 120,
                friction: 8,
                useNativeDriver: true,
              }),
            ]);
            break;

          default:
            animation = Animated.timing(fadeAnim, {
              toValue: isVisible ? 1 : 0,
              duration,
              useNativeDriver: true,
            });
        }

        if (delay > 0) {
          setTimeout(() => {
            animation.start(({ finished }) => {
              if (finished && onAnimationComplete) {
                onAnimationComplete();
              }
            });
          }, delay);
        } else {
          animation.start(({ finished }) => {
            if (finished && onAnimationComplete) {
              onAnimationComplete();
            }
          });
        }
      } else {
        // Для веб-версії просто встановлюємо значення
        fadeAnim.setValue(isVisible ? 1 : 0);
        if (onAnimationComplete) {
          setTimeout(onAnimationComplete, duration);
        }
      }
    };

    runAnimation();
  }, [isVisible, animationType, duration, delay, isMounted, fadeAnim, slideAnim, scaleAnim, slideUpAnim, slideRightAnim, slideBottomAnim, screenWidth, screenHeight, onAnimationComplete]);

  const getAnimatedStyle = () => {
    const baseStyle = { opacity: fadeAnim };

    switch (animationType) {
      case 'slide':
        return {
          ...baseStyle,
          transform: [{ translateX: slideAnim }],
        };
      
      case 'scale':
        return {
          ...baseStyle,
          transform: [{ scale: scaleAnim }],
        };
      
      case 'slideUp':
        return {
          ...baseStyle,
          transform: [{ translateY: slideUpAnim }],
        };

      case 'slideFromRight':
        return {
          ...baseStyle,
          transform: [{ translateX: slideRightAnim }],
        };

      case 'slideFromBottom':
        return {
          ...baseStyle,
          transform: [{ translateY: slideBottomAnim }],
        };
      
      default:
        return baseStyle;
    }
  };

  if (Platform.OS === 'web') {
    // Для веб-версії використовуємо CSS переходи
    return (
      <Animated.View 
        style={[
          styles.webContainer, 
          { 
            opacity: fadeAnim,
            transition: `opacity ${duration}ms ease-in-out`,
          }
        ]}
      >
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