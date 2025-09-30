import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Animated, Platform, View, StyleSheet, Dimensions, Easing, InteractionManager } from 'react-native';
import { useRouter, useSegments, usePathname } from 'expo-router';
import { colors } from '@/constants/colors';

interface SmartPageTransitionProps {
  children: React.ReactNode;
  enableTransitions?: boolean;
  customTransition?: 'slide' | 'fade' | 'scale' | 'bounce' | 'flip' | 'elastic' | 'zoom' | 'rotate3d';
  transitionDuration?: number;
  enableParallax?: boolean;
}

export default function SmartPageTransition({
  children,
  enableTransitions = true,
  customTransition,
  transitionDuration = 400,
  enableParallax = true
}: SmartPageTransitionProps) {
  // Мемоізовані анімаційні значення для кращої продуктивності
  const animatedValues = useMemo(() => ({
    fadeAnim: new Animated.Value(0),
    slideAnim: new Animated.Value(30),
    scaleAnim: new Animated.Value(0.9),
    bounceAnim: new Animated.Value(0.8),
    rotateAnim: new Animated.Value(0),
    elasticAnim: new Animated.Value(0),
    zoomAnim: new Animated.Value(0.5),
    rotate3dAnim: new Animated.Value(0),
    parallaxAnim: new Animated.Value(0)
  }), []);
  
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const segments = useSegments();
  const pathname = usePathname();

  // Оптимізоване відстеження змін розміру екрану
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      // Дебаунс для уникнення частих оновлень
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      transitionTimeoutRef.current = setTimeout(() => {
        setScreenData(window);
      }, 100);
    });
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      if (Platform.OS !== 'web' && subscription?.remove) {
        subscription.remove();
      }
    };
  }, []);

  // Визначаємо тип переходу на основі маршруту та розміру екрану
  const getSmartTransitionType = useCallback((): 'slide' | 'fade' | 'scale' | 'bounce' | 'flip' | 'elastic' | 'zoom' | 'rotate3d' => {
    if (customTransition) return customTransition;
    
    const isTablet = screenData.width >= 768;
    const isLargeScreen = screenData.width >= 1024;
    
    // Модальні екрани (додавання/редагування)
    if (pathname.includes('add-') || pathname.includes('edit-')) {
      return isLargeScreen ? 'zoom' : 'scale';
    }
    
    // Звіти та аналітика
    if (pathname.includes('reports') || pathname.includes('gantt')) {
      return isTablet ? 'elastic' : 'slide';
    }
    
    // Архів та спеціальні функції
    if (pathname.includes('archive') || pathname.includes('sync-data')) {
      return 'bounce';
    }
    
    // Налаштування
    if (pathname.includes('settings')) {
      return isLargeScreen ? 'rotate3d' : 'flip';
    }
    
    // Деталі договорів та об'єктів
    if (pathname.includes('contract-') || pathname.includes('maintenance-')) {
      return 'elastic';
    }
    
    // Таби та основні екрани
    if (segments.some(segment => segment === '(tabs)')) {
      return 'fade';
    }
    
    return 'slide';
  }, [customTransition, pathname, segments, screenData]);

  useEffect(() => {
    if (!enableTransitions || Platform.OS === 'web') {
      // Для веб або коли анімації відключені - встановлюємо фінальні значення
      Object.values(animatedValues).forEach(anim => {
        if (anim === animatedValues.fadeAnim || 
            anim === animatedValues.scaleAnim || 
            anim === animatedValues.bounceAnim ||
            anim === animatedValues.rotateAnim ||
            anim === animatedValues.elasticAnim ||
            anim === animatedValues.zoomAnim ||
            anim === animatedValues.rotate3dAnim ||
            anim === animatedValues.parallaxAnim) {
          anim.setValue(1);
        } else {
          anim.setValue(0);
        }
      });
      setIsReady(true);
      return;
    }

    const transitionType = getSmartTransitionType();
    const duration = transitionDuration;
    
    setIsTransitioning(true);

    const runTransition = () => {
      // Використовуємо InteractionManager для кращої продуктивності
      InteractionManager.runAfterInteractions(() => {
        switch (transitionType) {
          case 'fade':
            Animated.timing(animatedValues.fadeAnim, {
              toValue: 1,
              duration: duration * 0.8,
              useNativeDriver: true,
            }).start(() => {
              setIsTransitioning(false);
              setIsReady(true);
            });
            break;

          case 'slide':
            Animated.parallel([
              Animated.timing(animatedValues.fadeAnim, {
                toValue: 1,
                duration: duration * 0.7,
                useNativeDriver: true,
              }),
              Animated.spring(animatedValues.slideAnim, {
                toValue: 0,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
              })
            ]).start(() => {
              setIsTransitioning(false);
              setIsReady(true);
            });
            break;

          case 'scale':
            Animated.parallel([
              Animated.timing(animatedValues.fadeAnim, {
                toValue: 1,
                duration: duration * 0.6,
                useNativeDriver: true,
              }),
              Animated.spring(animatedValues.scaleAnim, {
                toValue: 1,
                tension: 120,
                friction: 7,
                useNativeDriver: true,
              })
            ]).start(() => {
              setIsTransitioning(false);
              setIsReady(true);
            });
            break;

          case 'bounce':
            Animated.sequence([
              Animated.timing(animatedValues.fadeAnim, {
                toValue: 1,
                duration: duration * 0.4,
                useNativeDriver: true,
              }),
              Animated.spring(animatedValues.bounceAnim, {
                toValue: 1,
                tension: 150,
                friction: 6,
                useNativeDriver: true,
              })
            ]).start(() => {
              setIsTransitioning(false);
              setIsReady(true);
            });
            break;

          case 'flip':
            Animated.sequence([
              Animated.timing(animatedValues.rotateAnim, {
                toValue: 0.5,
                duration: duration * 0.4,
                useNativeDriver: true,
              }),
              Animated.parallel([
                Animated.timing(animatedValues.fadeAnim, {
                  toValue: 1,
                  duration: duration * 0.3,
                  useNativeDriver: true,
                }),
                Animated.timing(animatedValues.rotateAnim, {
                  toValue: 1,
                  duration: duration * 0.4,
                  useNativeDriver: true,
                })
              ])
            ]).start(() => {
              setIsTransitioning(false);
              setIsReady(true);
            });
            break;

          case 'elastic':
            Animated.parallel([
              Animated.timing(animatedValues.fadeAnim, {
                toValue: 1,
                duration: duration * 0.5,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.spring(animatedValues.elasticAnim, {
                toValue: 1,
                tension: 80,
                friction: 6,
                useNativeDriver: true,
              }),
              ...(enableParallax ? [Animated.timing(animatedValues.parallaxAnim, {
                toValue: 1,
                duration: duration * 1.2,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              })] : [])
            ]).start(() => {
              setIsTransitioning(false);
              setIsReady(true);
            });
            break;

          case 'zoom':
            Animated.sequence([
              Animated.parallel([
                Animated.timing(animatedValues.fadeAnim, {
                  toValue: 0.8,
                  duration: duration * 0.3,
                  easing: Easing.out(Easing.quad),
                  useNativeDriver: true,
                }),
                Animated.spring(animatedValues.zoomAnim, {
                  toValue: 1.1,
                  tension: 100,
                  friction: 8,
                  useNativeDriver: true,
                })
              ]),
              Animated.parallel([
                Animated.timing(animatedValues.fadeAnim, {
                  toValue: 1,
                  duration: duration * 0.4,
                  easing: Easing.out(Easing.cubic),
                  useNativeDriver: true,
                }),
                Animated.spring(animatedValues.zoomAnim, {
                  toValue: 1,
                  tension: 120,
                  friction: 7,
                  useNativeDriver: true,
                })
              ])
            ]).start(() => {
              setIsTransitioning(false);
              setIsReady(true);
            });
            break;

          case 'rotate3d':
            Animated.sequence([
              Animated.timing(animatedValues.rotate3dAnim, {
                toValue: 0.5,
                duration: duration * 0.4,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.parallel([
                Animated.timing(animatedValues.fadeAnim, {
                  toValue: 1,
                  duration: duration * 0.4,
                  easing: Easing.out(Easing.cubic),
                  useNativeDriver: true,
                }),
                Animated.timing(animatedValues.rotate3dAnim, {
                  toValue: 1,
                  duration: duration * 0.5,
                  easing: Easing.out(Easing.back(1.2)),
                  useNativeDriver: true,
                })
              ])
            ]).start(() => {
              setIsTransitioning(false);
              setIsReady(true);
            });
            break;
          default:
            Animated.timing(animatedValues.fadeAnim, {
              toValue: 1,
              duration: duration * 0.8,
              useNativeDriver: true,
            }).start(() => {
              setIsTransitioning(false);
              setIsReady(true);
            });
            break;
        }
      });
    };

    // Оптимізована затримка з очищенням
    const timeoutId = setTimeout(runTransition, 50);
    return () => {
      clearTimeout(timeoutId);
      setIsTransitioning(false);
      setIsReady(false);
    };
  }, [pathname, segments, enableTransitions, customTransition, transitionDuration, enableParallax, animatedValues, getSmartTransitionType]);

  // Мемоізований стиль для кращої продуктивності
  const getAnimatedStyle = useMemo(() => {
    const transitionType = getSmartTransitionType();
    const isTablet = screenData.width >= 768;
    
    const baseStyle = {
      opacity: animatedValues.fadeAnim,
    };

    switch (transitionType) {
      case 'slide':
        return {
          ...baseStyle,
          transform: [
            { translateY: animatedValues.slideAnim },
            ...(enableParallax ? [{ translateX: animatedValues.parallaxAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [isTablet ? -20 : -10, 0]
            })}] : [])
          ]
        };
      
      case 'scale':
        return {
          ...baseStyle,
          transform: [
            { scale: animatedValues.scaleAnim },
            ...(enableParallax ? [{ translateY: animatedValues.parallaxAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 0]
            })}] : [])
          ]
        };
      
      case 'bounce':
        return {
          ...baseStyle,
          transform: [
            { scale: animatedValues.bounceAnim },
            { rotate: animatedValues.bounceAnim.interpolate({
              inputRange: [0.8, 1],
              outputRange: ['2deg', '0deg']
            })}
          ]
        };
      
      case 'flip':
        return {
          ...baseStyle,
          transform: [{
            rotateY: animatedValues.rotateAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: ['0deg', '90deg', '0deg']
            })
          }]
        };
      
      case 'elastic':
        return {
          ...baseStyle,
          transform: [
            { scale: animatedValues.elasticAnim },
            { translateY: animatedValues.elasticAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0]
            })},
            ...(enableParallax ? [{ skewX: animatedValues.parallaxAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['2deg', '0deg']
            })}] : [])
          ]
        };
      
      case 'zoom':
        return {
          ...baseStyle,
          transform: [
            { scale: animatedValues.zoomAnim },
            { translateZ: animatedValues.zoomAnim.interpolate({
              inputRange: [0.5, 1.1, 1],
              outputRange: [0, 50, 0]
            })}
          ]
        };
      
      case 'rotate3d':
        return {
          ...baseStyle,
          transform: [
            {
              rotateX: animatedValues.rotate3dAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: ['0deg', '45deg', '0deg']
              })
            },
            {
              rotateY: animatedValues.rotate3dAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: ['0deg', '15deg', '0deg']
              })
            },
            { perspective: 1000 }
          ]
        };
      
      default:
        return baseStyle;
    }
  }, [getSmartTransitionType, screenData.width, enableParallax, animatedValues]);

  if (!enableTransitions) {
    return <View style={styles.container}>{children}</View>;
  }

  // Показуємо контент тільки коли готовий
  if (!isReady && enableTransitions) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, getAnimatedStyle]}>
      {isTransitioning && enableParallax && (
        <Animated.View 
          style={[
            styles.parallaxBackground,
            {
              opacity: animatedValues.parallaxAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.1, 0]
              })
            }
          ]} 
        />
      )}
      {children}
    </Animated.View>
  );
}

// Хук для програмної навігації з розумними переходами
export function useSmartNavigation() {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);

  const navigateWithSmartTransition = (
    route: string, 
    options?: {
      transition?: 'slide' | 'fade' | 'scale' | 'bounce' | 'flip' | 'elastic' | 'zoom' | 'rotate3d';
      replace?: boolean;
      params?: Record<string, string>;
      preload?: boolean;
      analytics?: boolean;
    }
  ) => {
    // Валідація
    if (!route || typeof route !== 'string' || route.trim().length === 0) {
      console.warn('SmartNavigation: Invalid route provided');
      return;
    }
    
    if (route.length > 300) {
      console.warn('SmartNavigation: Route too long');
      return;
    }

    if (isNavigating) {
      console.warn('SmartNavigation: Navigation already in progress');
      return;
    }

    const sanitizedRoute = route.trim();
    
    // Додаємо параметри до маршруту якщо потрібно
    let finalRoute = sanitizedRoute;
    if (options?.params) {
      const params = new URLSearchParams(options.params);
      finalRoute += `?${params.toString()}`;
    }

    // Аналітика навігації
    if (options?.analytics !== false) {
      console.log('📱 Navigation:', {
        from: pathname,
        to: finalRoute,
        transition: options?.transition,
        timestamp: new Date().toISOString()
      });
    }

    setIsNavigating(true);
    
    // Оновлюємо історію навігації
    setNavigationHistory(prev => {
      const newHistory = [...prev, pathname];
      return newHistory.slice(-10); // Зберігаємо останні 10 маршрутів
    });

    try {
      if (options?.replace) {
        router.replace(finalRoute as any);
      } else {
        router.push(finalRoute as any);
      }
    } catch (error) {
      console.error('SmartNavigation: Navigation failed', error);
    } finally {
      // Скидаємо флаг навігації через невелику затримку
      setTimeout(() => setIsNavigating(false), 500);
    }
  };

  const goBackWithTransition = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        // Fallback до головного екрану
        router.replace('/' as any);
      }
    } catch (error) {
      console.error('SmartNavigation: Go back failed', error);
      router.replace('/' as any);
    }
  };

  const getCurrentTransitionType = (): 'slide' | 'fade' | 'scale' | 'bounce' | 'flip' | 'elastic' | 'zoom' | 'rotate3d' => {
    const screenData = Dimensions.get('window');
    const isTablet = screenData.width >= 768;
    const isLargeScreen = screenData.width >= 1024;
    
    if (pathname.includes('add-') || pathname.includes('edit-')) {
      return isLargeScreen ? 'zoom' : 'scale';
    }
    
    if (pathname.includes('reports') || pathname.includes('gantt')) {
      return isTablet ? 'elastic' : 'slide';
    }
    
    if (pathname.includes('archive') || pathname.includes('sync-data')) {
      return 'bounce';
    }
    
    if (pathname.includes('settings')) {
      return isLargeScreen ? 'rotate3d' : 'flip';
    }
    
    if (pathname.includes('contract-') || pathname.includes('maintenance-')) {
      return 'elastic';
    }
    
    if (segments.some(segment => segment === '(tabs)')) {
      return 'fade';
    }
    
    return 'slide';
  };

  const getNavigationMetrics = () => {
    return {
      currentPath: pathname,
      currentSegments: segments,
      navigationHistory,
      isNavigating,
      canGoBack: router.canGoBack(),
      historyLength: navigationHistory.length
    };
  };

  const preloadRoute = (route: string) => {
    // Валідація вхідних даних
    if (!route || typeof route !== 'string' || route.trim().length === 0) {
      console.warn('SmartNavigation: Invalid route for preload');
      return;
    }
    
    if (route.length > 300) {
      console.warn('SmartNavigation: Route too long for preload');
      return;
    }
    
    const sanitizedRoute = route.trim();
    
    // Попереднє завантаження маршруту для швидшої навігації
    try {
      // В реальному додатку тут можна було б завантажити дані
      console.log('🚀 Preloading route:', sanitizedRoute);
    } catch (error) {
      console.warn('SmartNavigation: Preload failed', error);
    }
  };

  return {
    navigateWithSmartTransition,
    goBackWithTransition,
    getCurrentTransitionType,
    getNavigationMetrics,
    preloadRoute,
    currentPath: pathname,
    currentSegments: segments,
    isNavigating
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  parallaxBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    zIndex: -1,
  },
});