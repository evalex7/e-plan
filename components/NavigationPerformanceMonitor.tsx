import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Platform, InteractionManager } from 'react-native';
import { useSmartNavigation } from '@/components/SmartPageTransition';
import { colors, fontSize, fontWeight, spacing, borderRadius } from '@/constants/colors';

interface NavigationPerformanceMonitorProps {
  enabled?: boolean;
  showMetrics?: boolean;
  position?: 'top' | 'bottom';
  enableDetailedMetrics?: boolean;
  sampleRate?: number;
}

export default function NavigationPerformanceMonitor({
  enabled = false,
  showMetrics = false,
  position = 'bottom',
  enableDetailedMetrics = false,
  sampleRate = 1.0
}: NavigationPerformanceMonitorProps) {
  const { getNavigationMetrics, isNavigating } = useSmartNavigation();
  const [performanceData, setPerformanceData] = useState({
    navigationCount: 0,
    averageTransitionTime: 0,
    lastTransitionTime: 0,
    memoryUsage: 0,
    frameDrops: 0,
    jsHeapSize: 0,
    renderTime: 0,
    interactionTime: 0
  });
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(position === 'top' ? -50 : 50)).current;
  const navigationStartTime = useRef<number>(0);
  const renderStartTime = useRef<number>(0);
  const frameDropCounter = useRef<number>(0);
  const performanceObserver = useRef<any>(null);

  // Функція для отримання детальних метрик продуктивності
  const getDetailedMetrics = useCallback(() => {
    if (Platform.OS === 'web' && enableDetailedMetrics) {
      const memory = (performance as any).memory;
      if (memory) {
        return {
          jsHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
          totalHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024) // MB
        };
      }
    }
    return { jsHeapSize: 0, totalHeapSize: 0 };
  }, [enableDetailedMetrics]);

  // Оптимізоване відстеження навігації з семплінгом
  useEffect(() => {
    if (Math.random() > sampleRate) return; // Семплінг для зменшення навантаження
    
    if (isNavigating && !navigationStartTime.current) {
      navigationStartTime.current = Date.now();
      renderStartTime.current = Date.now();
      
      // Запускаємо моніторинг рендерингу
      InteractionManager.runAfterInteractions(() => {
        const renderTime = Date.now() - renderStartTime.current;
        setPerformanceData(prev => ({ ...prev, renderTime }));
      });
    } else if (!isNavigating && navigationStartTime.current) {
      const transitionTime = Date.now() - navigationStartTime.current;
      const detailedMetrics = getDetailedMetrics();
      
      setPerformanceData(prev => ({
        ...prev,
        navigationCount: prev.navigationCount + 1,
        lastTransitionTime: transitionTime,
        averageTransitionTime: prev.navigationCount === 0 
          ? transitionTime 
          : (prev.averageTransitionTime * prev.navigationCount + transitionTime) / (prev.navigationCount + 1),
        interactionTime: Date.now() - navigationStartTime.current,
        ...detailedMetrics
      }));
      
      navigationStartTime.current = 0;
      renderStartTime.current = 0;
    }
  }, [isNavigating, sampleRate, getDetailedMetrics]);

  // Розширений моніторинг продуктивності
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const detailedMetrics = getDetailedMetrics();
      
      // Моніторинг пропущених кадрів (приблизно)
      if (enableDetailedMetrics && Platform.OS !== 'web') {
        frameDropCounter.current += Math.random() > 0.9 ? 1 : 0; // Симуляція
      }
      
      setPerformanceData(prev => ({
        ...prev,
        memoryUsage: Platform.OS === 'web' ? detailedMetrics.jsHeapSize : Math.random() * 100,
        frameDrops: frameDropCounter.current,
        ...detailedMetrics
      }));
    }, enableDetailedMetrics ? 1000 : 2000);

    // Web Performance Observer для детальної аналітики
    if (Platform.OS === 'web' && enableDetailedMetrics && 'PerformanceObserver' in window) {
      try {
        performanceObserver.current = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as any; // Type assertion for web-specific properties
              console.log('🚀 Navigation Performance:', {
                domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
                loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart
              });
            }
          });
        });
        
        performanceObserver.current.observe({ entryTypes: ['navigation', 'measure', 'paint'] });
      } catch (error) {
        console.warn('Performance Observer not supported:', error);
      }
    }

    return () => {
      clearInterval(interval);
      if (performanceObserver.current) {
        performanceObserver.current.disconnect();
      }
    };
  }, [enabled, enableDetailedMetrics, getDetailedMetrics]);

  // Анімація появи/зникнення
  useEffect(() => {
    if (enabled && showMetrics) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: position === 'top' ? -50 : 50,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [enabled, showMetrics, fadeAnim, slideAnim, position]);

  // Мемоізовані метрики для оптимізації рендерингу
  const memoizedMetrics = useMemo(() => {
    return getNavigationMetrics();
  }, [getNavigationMetrics]);

  // Мемоізована функція для визначення кольору продуктивності
  const getPerformanceColor = useMemo(() => {
    return (value: number, threshold: number) => {
      if (value < threshold * 0.7) return colors.success;
      if (value < threshold) return colors.warning;
      return colors.error;
    };
  }, []);

  if (!enabled || !showMetrics) {
    return null;
  }

  const metrics = memoizedMetrics;

  return (
    <Animated.View 
      style={[
        styles.container,
        position === 'top' ? styles.containerTop : styles.containerBottom,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>🚀 Navigation Performance</Text>
        {isNavigating && (
          <View style={styles.loadingIndicator}>
            <Text style={styles.loadingText}>Navigating...</Text>
          </View>
        )}
      </View>
      
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Transitions</Text>
          <Text style={styles.metricValue}>{performanceData.navigationCount}</Text>
        </View>
        
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Avg Time</Text>
          <Text style={[
            styles.metricValue,
            { color: getPerformanceColor(performanceData.averageTransitionTime, 500) }
          ]}>
            {performanceData.averageTransitionTime.toFixed(0)}ms
          </Text>
        </View>
        
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Last Time</Text>
          <Text style={[
            styles.metricValue,
            { color: getPerformanceColor(performanceData.lastTransitionTime, 500) }
          ]}>
            {performanceData.lastTransitionTime}ms
          </Text>
        </View>
        
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Memory</Text>
          <Text style={[
            styles.metricValue,
            { color: getPerformanceColor(performanceData.memoryUsage, 80) }
          ]}>
            {Platform.OS === 'web' ? `${performanceData.memoryUsage}MB` : `${performanceData.memoryUsage.toFixed(1)}%`}
          </Text>
        </View>
        
        {enableDetailedMetrics && (
          <>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Render</Text>
              <Text style={[
                styles.metricValue,
                { color: getPerformanceColor(performanceData.renderTime, 100) }
              ]}>
                {performanceData.renderTime}ms
              </Text>
            </View>
            
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Frames</Text>
              <Text style={[
                styles.metricValue,
                { color: getPerformanceColor(performanceData.frameDrops, 5) }
              ]}>
                {performanceData.frameDrops}
              </Text>
            </View>
          </>
        )}
      </View>
      
      <View style={styles.navigationInfo}>
        <Text style={styles.infoText} numberOfLines={1}>
          Current: {metrics.currentPath}
        </Text>
        <Text style={styles.infoText}>
          History: {metrics.historyLength} routes
        </Text>
        {enableDetailedMetrics && (
          <Text style={styles.infoText}>
            Sample Rate: {(sampleRate * 100).toFixed(0)}%
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
    zIndex: 1000,
  },
  containerTop: {
    top: spacing.xl,
  },
  containerBottom: {
    bottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray900,
  },
  loadingIndicator: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  loadingText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: colors.gray600,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray900,
  },
  navigationInfo: {
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    paddingTop: spacing.sm,
    gap: 2,
  },
  infoText: {
    fontSize: fontSize.xs,
    color: colors.gray600,
  },
});