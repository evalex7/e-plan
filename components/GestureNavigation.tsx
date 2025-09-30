import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  PanResponder, 
  Animated, 
  Dimensions, 
  StyleSheet, 
  Platform,
  Text,
  InteractionManager
} from 'react-native';
import { useSmartNavigation } from '@/components/SmartPageTransition';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface GestureNavigationProps {
  children: React.ReactNode;
  enableSwipeBack?: boolean;
  enableSwipeForward?: boolean;
  swipeThreshold?: number;
  enableHapticFeedback?: boolean;
  enableEdgeSwipe?: boolean;
  edgeWidth?: number;
  enableVisualFeedback?: boolean;
  gestureVelocityThreshold?: number;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
}

export default function GestureNavigation({
  children,
  enableSwipeBack = true,
  enableSwipeForward = false,
  swipeThreshold = 100,
  enableHapticFeedback = true,
  enableEdgeSwipe = true,
  edgeWidth = 20,
  enableVisualFeedback = true,
  gestureVelocityThreshold = 0.5,
  onGestureStart,
  onGestureEnd
}: GestureNavigationProps) {
  const { goBackWithTransition, getNavigationMetrics } = useSmartNavigation();
  const [screenData] = useState(Dimensions.get('window'));
  const insets = useSafeAreaInsets();
  
  // Мемоізовані анімаційні значення
  const animatedValues = useMemo(() => ({
    translateX: new Animated.Value(0),
    opacity: new Animated.Value(1),
    scale: new Animated.Value(1),
    backgroundOpacity: new Animated.Value(0),
    indicatorScale: new Animated.Value(0)
  }), []);
  
  const [isGesturing, setIsGesturing] = useState(false);
  const [gestureDirection, setGestureDirection] = useState<'left' | 'right' | null>(null);
  const [currentTranslateX, setCurrentTranslateX] = useState(0);
  const [gestureProgress, setGestureProgress] = useState(0);
  const gestureStartTime = useRef<number>(0);
  
  // Оптимізоване відстеження поточного значення translateX
  useEffect(() => {
    const listener = animatedValues.translateX.addListener(({ value }) => {
      setCurrentTranslateX(value);
      setGestureProgress(Math.abs(value) / screenData.width);
    });
    
    return () => {
      animatedValues.translateX.removeListener(listener);
    };
  }, [animatedValues.translateX, screenData.width]);

  // Оптимізована функція тактильного відгуку
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHapticFeedback) return;
    
    // Дебаунс для уникнення частих викликів
    const now = Date.now();
    if (now - gestureStartTime.current < 50) return;
    
    if (Platform.OS === 'web') {
      if ('vibrate' in navigator) {
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [30]
        };
        navigator.vibrate(patterns[type]);
      }
    } else {
      console.log(`Haptic feedback: ${type}`);
    }
  }, [enableHapticFeedback]);

  // Функція для перевірки чи жест починається з краю екрану
  const isEdgeGesture = useCallback((locationX: number, direction: 'left' | 'right') => {
    if (!enableEdgeSwipe) return true;
    
    if (direction === 'right') {
      return locationX <= edgeWidth + insets.left;
    } else {
      return locationX >= screenData.width - edgeWidth - insets.right;
    }
  }, [enableEdgeSwipe, edgeWidth, insets.left, insets.right, screenData.width]);

  // Функція для скидання анімацій
  const resetAnimations = useCallback(() => {
    Object.values(animatedValues).forEach(anim => {
      if (anim === animatedValues.opacity || anim === animatedValues.scale) {
        anim.setValue(1);
      } else {
        anim.setValue(0);
      }
    });
    setCurrentTranslateX(0);
    setGestureProgress(0);
  }, [animatedValues]);

  const panResponder = useMemo(() => 
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        const { locationX } = evt.nativeEvent;
        const metrics = getNavigationMetrics();
        
        // Перевіряємо чи можемо активувати жест
        if (enableSwipeBack && metrics.canGoBack && isEdgeGesture(locationX, 'right')) {
          return true;
        }
        if (enableSwipeForward && isEdgeGesture(locationX, 'left')) {
          return true;
        }
        return false;
      },
      
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { dx, dy, numberActiveTouches } = gestureState;
        const { locationX } = evt.nativeEvent;
        
        // Тільки один дотик
        if (numberActiveTouches !== 1) return false;
        
        // Активуємо жест тільки для горизонтальних рухів
        const isHorizontal = Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
        if (!isHorizontal) return false;
        
        const metrics = getNavigationMetrics();
        const direction = dx > 0 ? 'right' : 'left';
        
        // Перевіряємо можливість навігації та край екрану
        if (direction === 'right' && enableSwipeBack && metrics.canGoBack) {
          return isEdgeGesture(locationX, 'right');
        }
        if (direction === 'left' && enableSwipeForward) {
          return isEdgeGesture(locationX, 'left');
        }
        
        return false;
      },
      
      onPanResponderGrant: (evt, gestureState) => {
        gestureStartTime.current = Date.now();
        setIsGesturing(true);
        onGestureStart?.();
        
        // Анімація початку жесту
        if (enableVisualFeedback) {
          Animated.parallel([
            Animated.timing(animatedValues.backgroundOpacity, {
              toValue: 0.1,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.spring(animatedValues.indicatorScale, {
              toValue: 1,
              tension: 100,
              friction: 8,
              useNativeDriver: true,
            })
          ]).start();
        }
        
        triggerHapticFeedback('light');
      },
      
      onPanResponderMove: (evt, gestureState) => {
        const { dx, vx } = gestureState;
        const metrics = getNavigationMetrics();
        
        // Визначаємо напрямок жесту
        if (dx > 0 && enableSwipeBack && metrics.canGoBack) {
          setGestureDirection('right');
          
          // Обмежуємо переміщення з еластичним ефектом
          const maxDistance = screenData.width * 0.8;
          const clampedDx = dx > maxDistance ? 
            maxDistance + (dx - maxDistance) * 0.3 : dx;
          const progress = Math.min(clampedDx / screenData.width, 0.8);
          
          // Оновлюємо анімації
          animatedValues.translateX.setValue(clampedDx);
          animatedValues.opacity.setValue(1 - progress * 0.3);
          animatedValues.scale.setValue(1 - progress * 0.05);
          
          if (enableVisualFeedback) {
            animatedValues.backgroundOpacity.setValue(progress * 0.2);
          }
          
          // Тактильний відгук при досягненні порогу
          if (clampedDx > swipeThreshold && clampedDx - 10 <= swipeThreshold) {
            triggerHapticFeedback('medium');
          }
        } else if (dx < 0 && enableSwipeForward) {
          setGestureDirection('left');
          
          const maxDistance = screenData.width * 0.8;
          const absDx = Math.abs(dx);
          const clampedDx = absDx > maxDistance ? 
            -(maxDistance + (absDx - maxDistance) * 0.3) : dx;
          const progress = Math.min(Math.abs(clampedDx) / screenData.width, 0.8);
          
          animatedValues.translateX.setValue(clampedDx);
          animatedValues.opacity.setValue(1 - progress * 0.3);
          animatedValues.scale.setValue(1 - progress * 0.05);
          
          if (enableVisualFeedback) {
            animatedValues.backgroundOpacity.setValue(progress * 0.2);
          }
          
          if (Math.abs(clampedDx) > swipeThreshold && Math.abs(clampedDx) - 10 <= swipeThreshold) {
            triggerHapticFeedback('medium');
          }
        }
      },
      
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, vx } = gestureState;
        const metrics = getNavigationMetrics();
        const gestureTime = Date.now() - gestureStartTime.current;
        
        setIsGesturing(false);
        setGestureDirection(null);
        onGestureEnd?.();
        
        // Розширена логіка визначення успішності жесту
        const distance = Math.abs(dx);
        const velocity = Math.abs(vx);
        const isQuickGesture = velocity > gestureVelocityThreshold && gestureTime < 300;
        const isLongGesture = distance > swipeThreshold;
        const shouldNavigate = isQuickGesture || isLongGesture;
        
        if (shouldNavigate) {
          if (dx > 0 && enableSwipeBack && metrics.canGoBack) {
            // Свайп вправо - повернутися назад
            triggerHapticFeedback('heavy');
            
            const duration = Math.max(150, Math.min(300, 300 - velocity * 100));
            
            Animated.parallel([
              Animated.timing(animatedValues.translateX, {
                toValue: screenData.width,
                duration,
                useNativeDriver: true,
              }),
              Animated.timing(animatedValues.opacity, {
                toValue: 0,
                duration,
                useNativeDriver: true,
              }),
              Animated.timing(animatedValues.backgroundOpacity, {
                toValue: 0.3,
                duration: duration * 0.7,
                useNativeDriver: true,
              })
            ]).start(() => {
              // Використовуємо InteractionManager для плавної навігації
              InteractionManager.runAfterInteractions(() => {
                goBackWithTransition();
                resetAnimations();
              });
            });
            return;
          } else if (dx < 0 && enableSwipeForward) {
            // Свайп вліво - вперед
            triggerHapticFeedback('heavy');
            
            const duration = Math.max(150, Math.min(300, 300 - velocity * 100));
            
            Animated.parallel([
              Animated.timing(animatedValues.translateX, {
                toValue: -screenData.width,
                duration,
                useNativeDriver: true,
              }),
              Animated.timing(animatedValues.opacity, {
                toValue: 0,
                duration,
                useNativeDriver: true,
              })
            ]).start(() => {
              resetAnimations();
            });
            return;
          }
        }
        
        // Повертаємо до початкового стану з пружною анімацією
        Animated.parallel([
          Animated.spring(animatedValues.translateX, {
            toValue: 0,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.spring(animatedValues.opacity, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.spring(animatedValues.scale, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValues.backgroundOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValues.indicatorScale, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          })
        ]).start();
      },
      onPanResponderTerminate: () => {
        setIsGesturing(false);
        setGestureDirection(null);
        onGestureEnd?.();
        
        // Швидко повертаємо до початкового стану
        Animated.parallel([
          Animated.timing(animatedValues.translateX, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValues.opacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValues.scale, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValues.backgroundOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValues.indicatorScale, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          })
        ]).start();
      },
    }), [enableSwipeBack, enableSwipeForward, swipeThreshold, enableHapticFeedback, enableEdgeSwipe, gestureVelocityThreshold, getNavigationMetrics, isEdgeGesture, triggerHapticFeedback, onGestureStart, onGestureEnd, animatedValues, screenData.width, goBackWithTransition, resetAnimations, enableVisualFeedback]);



  // Скидаємо анімації при зміні маршруту
  useEffect(() => {
    resetAnimations();
  }, [resetAnimations]);

  // Мемоізований стиль індикатора жесту
  const getGestureIndicatorStyle = useMemo(() => {
    if (!isGesturing || !gestureDirection || !enableVisualFeedback) {
      return { opacity: 0, transform: [{ scale: 0 }] };
    }
    
    const progress = Math.abs(currentTranslateX) / screenData.width;
    const indicatorOpacity = Math.min(progress * 2, 1);
    const indicatorScale = Math.min(progress * 1.5 + 0.5, 1);
    
    return {
      opacity: indicatorOpacity,
      transform: [
        {
          translateX: gestureDirection === 'right' 
            ? Math.max(currentTranslateX * 0.8 - 50, 20)
            : Math.min(currentTranslateX * 0.8 + 50, screenData.width - 70)
        },
        { scale: indicatorScale }
      ]
    };
  }, [isGesturing, gestureDirection, currentTranslateX, screenData.width, enableVisualFeedback]);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: animatedValues.opacity,
            transform: [
              { translateX: animatedValues.translateX },
              { scale: animatedValues.scale }
            ]
          }
        ]}
      >
        {children}
      </Animated.View>
      
      {/* Покращений індикатор жесту */}
      {isGesturing && enableVisualFeedback && (
        <Animated.View 
          style={[
            styles.gestureIndicator,
            gestureDirection === 'right' ? styles.gestureIndicatorBack : styles.gestureIndicatorForward,
            getGestureIndicatorStyle,
            {
              transform: [
                ...getGestureIndicatorStyle.transform,
                { scale: animatedValues.indicatorScale }
              ]
            }
          ]}
        >
          <Text style={styles.gestureIndicatorText}>
            {gestureDirection === 'right' ? '← Back' : 'Forward →'}
          </Text>
          <View style={[
            styles.progressBar,
            {
              width: `${Math.min(gestureProgress * 100, 100)}%`,
              backgroundColor: gestureProgress > 0.3 ? colors.success : colors.primary
            }
          ]} />
        </Animated.View>
      )}
      
      {/* Покращений фоновий ефект при жесті */}
      {isGesturing && enableVisualFeedback && (
        <Animated.View 
          style={[
            styles.gestureBackground,
            {
              opacity: animatedValues.backgroundOpacity,
              backgroundColor: gestureDirection === 'right' ? colors.success + '20' : colors.primary + '20'
            }
          ]}
        />
      )}
      
      {/* Невидимі зони для edge swipe */}
      {enableEdgeSwipe && (
        <>
          <View 
            style={[
              styles.edgeZone,
              styles.leftEdge,
              { width: edgeWidth, left: insets.left }
            ]}
          />
          <View 
            style={[
              styles.edgeZone,
              styles.rightEdge,
              { width: edgeWidth, right: insets.right }
            ]}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  gestureIndicator: {
    position: 'absolute',
    top: '50%',
    backgroundColor: colors.black + 'CC',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    zIndex: 1000,
  },
  gestureIndicatorBack: {
    left: spacing.lg,
  },
  gestureIndicatorForward: {
    right: spacing.lg,
  },
  gestureIndicatorText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  gestureBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  edgeZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  leftEdge: {
    left: 0,
  },
  rightEdge: {
    right: 0,
  },
});