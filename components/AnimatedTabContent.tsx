import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, ViewStyle } from 'react-native';

interface AnimatedTabContentProps {
  children: React.ReactNode;
  isActive: boolean;
  style?: ViewStyle;
}

export default function AnimatedTabContent({ children, isActive, style }: AnimatedTabContentProps) {
  const fadeAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(isActive ? 0 : 20)).current;
  const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0.95)).current;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Комплексна анімація появи/зникнення контенту
      Animated.parallel([
        // Анімація прозорості
        Animated.timing(fadeAnim, {
          toValue: isActive ? 1 : 0,
          duration: 300,
          useNativeDriver: true,
        }),
        // Анімація зсуву
        Animated.spring(slideAnim, {
          toValue: isActive ? 0 : 20,
          tension: 200,
          friction: 8,
          useNativeDriver: true,
        }),
        // Анімація масштабування
        Animated.spring(scaleAnim, {
          toValue: isActive ? 1 : 0.95,
          tension: 200,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Для веб-версії використовуємо простішу анімацію
      Animated.timing(fadeAnim, {
        toValue: isActive ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, fadeAnim, slideAnim, scaleAnim]);

  if (Platform.OS === 'web') {
    return (
      <Animated.View style={[styles.container, style, { opacity: fadeAnim }]}>
        {children}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});