import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  componentName: string;
  timestamp: number;
}

// Хук для моніторингу продуктивності компонентів
export function usePerformanceMonitor(componentName: string, enabled: boolean = __DEV__) {
  const startTimeRef = useRef<number>(0);
  const metricsRef = useRef<PerformanceMetrics[]>([]);

  useEffect(() => {
    if (!enabled) return;

    startTimeRef.current = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTimeRef.current;

      const metrics: PerformanceMetrics = {
        renderTime,
        componentName,
        timestamp: Date.now(),
      };

      metricsRef.current.push(metrics);

      // Логуємо тільки повільні рендери (більше 16ms)
      if (renderTime > 16) {
        console.warn(
          `🐌 Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`
        );
      }

      // Зберігаємо тільки останні 100 метрик
      if (metricsRef.current.length > 100) {
        metricsRef.current = metricsRef.current.slice(-100);
      }
    };
  });

  const getAverageRenderTime = () => {
    if (metricsRef.current.length === 0) return 0;
    const total = metricsRef.current.reduce((sum, metric) => sum + metric.renderTime, 0);
    return total / metricsRef.current.length;
  };

  const getSlowRenders = (threshold: number = 16) => {
    return metricsRef.current.filter(metric => metric.renderTime > threshold);
  };

  return {
    getAverageRenderTime,
    getSlowRenders,
    metrics: metricsRef.current,
  };
}

// Хук для моніторингу використання пам'яті
export function useMemoryMonitor(intervalMs: number = 5000) {
  const memoryUsageRef = useRef<number[]>([]);

  useEffect(() => {
    if (!__DEV__ || typeof performance === 'undefined' || !(performance as any).memory) {
      return;
    }

    const interval = setInterval(() => {
      const memoryInfo = (performance as any).memory;
      if (!memoryInfo) return;
      const usedMB = memoryInfo.usedJSHeapSize / 1024 / 1024;
      
      memoryUsageRef.current.push(usedMB);
      
      // Зберігаємо тільки останні 50 вимірювань
      if (memoryUsageRef.current.length > 50) {
        memoryUsageRef.current = memoryUsageRef.current.slice(-50);
      }

      // Попереджуємо про високе використання пам'яті
      if (usedMB > 100) {
        console.warn(`🧠 High memory usage detected: ${usedMB.toFixed(2)}MB`);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  const getAverageMemoryUsage = () => {
    if (memoryUsageRef.current.length === 0) return 0;
    const total = memoryUsageRef.current.reduce((sum, usage) => sum + usage, 0);
    return total / memoryUsageRef.current.length;
  };

  const getCurrentMemoryUsage = () => {
    return memoryUsageRef.current[memoryUsageRef.current.length - 1] || 0;
  };

  return {
    getAverageMemoryUsage,
    getCurrentMemoryUsage,
    memoryHistory: memoryUsageRef.current,
  };
}