import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';

interface AnimatedTabTransitionProps {
  children: React.ReactNode;
  tabKey: string;
  animationType?: 'slideHorizontal' | 'fadeScale' | 'flipHorizontal' | 'slideVertical';
  duration?: number;
}

export default function AnimatedTabTransition({ 
  children, 
  tabKey,
  animationType = 'slideHorizontal',
  duration = 300
}: AnimatedTabTransitionProps) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const previousTabKey = useRef(tabKey);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Для веб-версії використовуємо простіші анімації
      return;
    }

    const getExitAnimations = (): Animated.CompositeAnimation[] => {
      switch (animationType) {
        case 'slideHorizontal':
          return [
            Animated.timing(translateXAnim, {
              toValue: -50,
              duration: duration * 0.4,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: duration * 0.4,
              useNativeDriver: true,
            }),
          ];

        case 'slideVertical':
          return [
            Animated.timing(translateYAnim, {
              toValue: -30,
              duration: duration * 0.4,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: duration * 0.4,
              useNativeDriver: true,
            }),
          ];

        case 'fadeScale':
          return [
            Animated.timing(scaleAnim, {
              toValue: 0.9,
              duration: duration * 0.4,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: duration * 0.4,
              useNativeDriver: true,
            }),
          ];

        case 'flipHorizontal':
          return [
            Animated.timing(rotateAnim, {
              toValue: 0.5,
              duration: duration * 0.4,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: duration * 0.2,
              useNativeDriver: true,
            }),
          ];

        default:
          return [
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: duration * 0.4,
              useNativeDriver: true,
            }),
          ];
      }
    };

    const getEnterAnimations = (): Animated.CompositeAnimation[] => {
      switch (animationType) {
        case 'slideHorizontal':
          return [
            Animated.spring(translateXAnim, {
              toValue: 0,
              tension: 100,
              friction: 8,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: duration * 0.6,
              useNativeDriver: true,
            }),
          ];

        case 'slideVertical':
          return [
            Animated.spring(translateYAnim, {
              toValue: 0,
              tension: 100,
              friction: 8,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: duration * 0.6,
              useNativeDriver: true,
            }),
          ];

        case 'fadeScale':
          return [
            Animated.spring(scaleAnim, {
              toValue: 1,
              tension: 100,
              friction: 8,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: duration * 0.6,
              useNativeDriver: true,
            }),
          ];

        case 'flipHorizontal':
          return [
            Animated.timing(rotateAnim, {
              toValue: 0,
              duration: duration * 0.6,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: duration * 0.4,
              useNativeDriver: true,
            }),
          ];

        default:
          return [
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: duration * 0.6,
              useNativeDriver: true,
            }),
          ];
      }
    };

    const resetAnimations = () => {
      switch (animationType) {
        case 'slideHorizontal':
          translateXAnim.setValue(50);
          break;
        case 'slideVertical':
          translateYAnim.setValue(30);
          break;
        case 'fadeScale':
          scaleAnim.setValue(1.1);
          break;
        case 'flipHorizontal':
          rotateAnim.setValue(-0.5);
          break;
      }
    };

    if (previousTabKey.current !== tabKey) {
      // Анімація виходу
      const exitAnimations = getExitAnimations();
      
      Animated.parallel(exitAnimations).start(() => {
        // Скидаємо позиції для анімації входу
        resetAnimations();
        
        // Анімація входу
        const enterAnimations = getEnterAnimations();
        Animated.parallel(enterAnimations).start();
      });

      previousTabKey.current = tabKey;
    }
  }, [tabKey, animationType, duration, fadeAnim, translateXAnim, translateYAnim, scaleAnim, rotateAnim]);

  const getAnimatedStyle = () => {
    const baseStyle = { opacity: fadeAnim };

    switch (animationType) {
      case 'slideHorizontal':
        return {
          ...baseStyle,
          transform: [{ translateX: translateXAnim }],
        };

      case 'slideVertical':
        return {
          ...baseStyle,
          transform: [{ translateY: translateYAnim }],
        };

      case 'fadeScale':
        return {
          ...baseStyle,
          transform: [{ scale: scaleAnim }],
        };

      case 'flipHorizontal':
        return {
          ...baseStyle,
          transform: [
            {
              rotateY: rotateAnim.interpolate({
                inputRange: [-0.5, 0, 0.5],
                outputRange: ['-90deg', '0deg', '90deg'],
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
      <Animated.View style={styles.webContainer}>
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