import React, { useRef, useCallback } from 'react';
import { View, Animated, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

interface PageTransitionContainerProps {
  children: React.ReactNode;
  animationType?: 'slide' | 'fade' | 'scale' | 'slideUp';
  duration?: number;
  delay?: number;
}



export default function PageTransitionContainer({
  children,
  animationType = 'slide',
  duration = 300,
  delay = 0,
}: PageTransitionContainerProps) {
  const { width: screenWidth } = useWindowDimensions();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;

  const animateIn = useCallback(() => {
    const animations: Animated.CompositeAnimation[] = [];

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
      
      case 'slide':
        animations.push(
          Animated.timing(slideAnim, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: duration * 0.8,
            useNativeDriver: true,
          })
        );
        break;
      
      case 'scale':
        animations.push(
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: duration * 0.6,
            useNativeDriver: true,
          })
        );
        break;
      
      case 'slideUp':
        animations.push(
          Animated.timing(slideUpAnim, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: duration * 0.8,
            useNativeDriver: true,
          })
        );
        break;
    }

    if (delay > 0) {
      setTimeout(() => {
        Animated.parallel(animations).start();
      }, delay);
    } else {
      Animated.parallel(animations).start();
    }
  }, [animationType, duration, delay, fadeAnim, slideAnim, scaleAnim, slideUpAnim]);

  const resetAnimations = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(screenWidth);
    scaleAnim.setValue(0.9);
    slideUpAnim.setValue(50);
  }, [fadeAnim, slideAnim, scaleAnim, slideUpAnim, screenWidth]);

  useFocusEffect(
    React.useCallback(() => {
      resetAnimations();
      animateIn();
    }, [resetAnimations, animateIn])
  );

  const getAnimatedStyle = () => {
    const baseStyle = {
      opacity: fadeAnim,
    };

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
      
      default:
        return baseStyle;
    }
  };

  // На веб використовуємо CSS переходи для кращої продуктивності
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, styles.webContainer]}>
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
    animation: 'fadeInSlide 0.3s ease-out',
  },
});

// CSS анімації для веб (додаються через StyleSheet на веб)
if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInSlide {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
}