import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

interface AnimatedTabIconProps {
  Icon: LucideIcon;
  color: string;
  focused: boolean;
  size?: number;
}

export default function AnimatedTabIcon({ Icon, color, focused, size = 24 }: AnimatedTabIconProps) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.1 : 1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Анімація масштабування
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.15 : 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();

      // Анімація підскакування при фокусі
      if (focused) {
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -3,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.spring(bounceAnim, {
            toValue: 0,
            tension: 300,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();

        // Легке обертання при активації
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [focused, scaleAnim, rotateAnim, bounceAnim]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '5deg'],
  });

  if (Platform.OS === 'web') {
    // Для веб-версії використовуємо простіший підхід
    return (
      <Animated.View style={[styles.webContainer, { transform: [{ scale: focused ? 1.1 : 1 }] }]}>
        <Icon size={size} color={color} />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { scale: scaleAnim },
            { translateY: bounceAnim },
            { rotate: rotateInterpolate },
          ],
        },
      ]}
    >
      <Icon size={size} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  webContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});