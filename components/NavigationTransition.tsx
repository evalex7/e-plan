import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Dimensions } from 'react-native';
import { useRouter, useSegments } from 'expo-router';

interface NavigationTransitionProps {
  children: React.ReactNode;
  transitionType?: 'slide' | 'fade' | 'scale' | 'flip' | 'push';
  duration?: number;
  delay?: number;
}

export default function NavigationTransition({
  children,
  transitionType = 'slide',
  duration = 300,
  delay = 0
}: NavigationTransitionProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  const segments = useSegments();
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
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

        case 'slide':
          animations.push(
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: duration * 0.8,
                useNativeDriver: true,
              }),
              Animated.spring(slideAnim, {
                toValue: 0,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
              })
            ])
          );
          break;

        case 'scale':
          animations.push(
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: duration * 0.6,
                useNativeDriver: true,
              }),
              Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 120,
                friction: 7,
                useNativeDriver: true,
              })
            ])
          );
          break;

        case 'flip':
          animations.push(
            Animated.sequence([
              Animated.timing(rotateAnim, {
                toValue: 0.5,
                duration: duration * 0.5,
                useNativeDriver: true,
              }),
              Animated.parallel([
                Animated.timing(fadeAnim, {
                  toValue: 1,
                  duration: duration * 0.3,
                  useNativeDriver: true,
                }),
                Animated.timing(rotateAnim, {
                  toValue: 1,
                  duration: duration * 0.5,
                  useNativeDriver: true,
                })
              ])
            ])
          );
          break;

        case 'push':
          slideAnim.setValue(screenWidth);
          animations.push(
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: duration * 0.7,
                useNativeDriver: true,
              }),
              Animated.spring(slideAnim, {
                toValue: 0,
                tension: 80,
                friction: 8,
                useNativeDriver: true,
              })
            ])
          );
          break;

        default:
          animations.push(
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration,
              useNativeDriver: true,
            })
          );
      }

      if (delay > 0) {
        Animated.sequence([
          Animated.delay(delay),
          ...animations
        ]).start();
      } else {
        Animated.parallel(animations).start();
      }
    };

    // Запускаємо анімацію тільки якщо не веб (для веб використовуємо CSS)
    if (Platform.OS !== 'web') {
      animateIn();
    } else {
      // Для веб встановлюємо фінальні значення
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      scaleAnim.setValue(1);
      rotateAnim.setValue(1);
    }
  }, [segments, transitionType, duration, delay, fadeAnim, slideAnim, scaleAnim, rotateAnim, screenWidth]);

  const getTransformStyle = () => {
    const transforms: any[] = [];

    switch (transitionType) {
      case 'slide':
        transforms.push({ translateY: slideAnim });
        break;
      case 'scale':
        transforms.push({ scale: scaleAnim });
        break;
      case 'flip':
        transforms.push({
          rotateY: rotateAnim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: ['0deg', '90deg', '0deg']
          })
        });
        break;
      case 'push':
        transforms.push({ translateX: slideAnim });
        break;
    }

    return transforms;
  };

  return (
    <Animated.View
      style={[
        { flex: 1 },
        {
          opacity: fadeAnim,
          transform: getTransformStyle()
        }
      ]}
    >
      {children}
    </Animated.View>
  );
}

// Хук для визначення типу переходу на основі маршруту
export function useNavigationTransition() {
  const segments = useSegments();
  const router = useRouter();

  const getTransitionType = (targetRoute: string): 'slide' | 'fade' | 'scale' | 'flip' | 'push' => {
    // Модальні екрани
    if (targetRoute.includes('add-') || targetRoute.includes('edit-') || targetRoute === 'sync-data') {
      return 'scale';
    }
    
    // Звіти та деталі
    if (targetRoute.includes('reports') || targetRoute.includes('contract-status')) {
      return 'slide';
    }
    
    // Архів та спеціальні екрани
    if (targetRoute === 'archive' || targetRoute.includes('maintenance')) {
      return 'push';
    }
    
    // Таби
    if (segments.some(segment => segment === '(tabs)')) {
      return 'fade';
    }
    
    return 'slide';
  };

  const navigateWithTransition = (route: string, transitionType?: 'slide' | 'fade' | 'scale' | 'flip' | 'push') => {
    // Валідація вхідних даних
    if (!route || typeof route !== 'string' || route.trim().length === 0) {
      console.warn('NavigationTransition: Invalid route provided');
      return;
    }
    
    if (route.length > 200) {
      console.warn('NavigationTransition: Route too long');
      return;
    }
    
    const sanitizedRoute = route.trim();
    
    // Для веб використовуємо стандартну навігацію
    if (Platform.OS === 'web') {
      router.push(sanitizedRoute as any);
      return;
    }

    // Для мобільних пристроїв можемо додати додаткову логіку
    router.push(sanitizedRoute as any);
  };

  return {
    navigateWithTransition,
    getTransitionType,
    currentSegments: segments
  };
}