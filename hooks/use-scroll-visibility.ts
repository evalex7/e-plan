import { useRef, useState, useCallback, useEffect } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useTabBarVisibility } from './use-tab-bar-visibility';

interface ScrollVisibilityState {
  isHeaderVisible: boolean;
  isTabBarVisible: boolean;
  lastScrollY: number;
}

export function useScrollVisibility(threshold: number = 50) {
  const [state, setState] = useState<ScrollVisibilityState>({
    isHeaderVisible: true,
    isTabBarVisible: true,
    lastScrollY: 0,
  });

  const { setIsTabBarVisible } = useTabBarVisibility();
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Синхронізуємо локальний стан з глобальним контекстом
  useEffect(() => {
    setIsTabBarVisible(state.isTabBarVisible);
  }, [state.isTabBarVisible, setIsTabBarVisible]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;
      const scrollDelta = currentScrollY - state.lastScrollY;

      // Очищуємо попередній таймаут
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Якщо скрол менше порогу, не змінюємо стан
      if (Math.abs(scrollDelta) < threshold) {
        return;
      }

      // Якщо скролимо вниз і елементи видимі
      if (scrollDelta > 0 && (state.isHeaderVisible || state.isTabBarVisible)) {
        setState(prev => ({
          ...prev,
          isHeaderVisible: false,
          isTabBarVisible: false,
          lastScrollY: currentScrollY,
        }));
      }
      // Якщо скролимо вгору і елементи приховані
      else if (scrollDelta < 0 && (!state.isHeaderVisible || !state.isTabBarVisible)) {
        setState(prev => ({
          ...prev,
          isHeaderVisible: true,
          isTabBarVisible: true,
          lastScrollY: currentScrollY,
        }));
      }
      // Оновлюємо позицію скролу
      else {
        setState(prev => ({
          ...prev,
          lastScrollY: currentScrollY,
        }));
      }

      // Показуємо елементи через деякий час після зупинки скролу
      scrollTimeoutRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          isHeaderVisible: true,
          isTabBarVisible: true,
        }));
      }, 2000) as ReturnType<typeof setTimeout>;
    },
    [state.lastScrollY, state.isHeaderVisible, state.isTabBarVisible, threshold]
  );

  const showElements = useCallback(() => {
    setState(prev => ({
      ...prev,
      isHeaderVisible: true,
      isTabBarVisible: true,
    }));
  }, []);

  const hideElements = useCallback(() => {
    setState(prev => ({
      ...prev,
      isHeaderVisible: false,
      isTabBarVisible: false,
    }));
  }, []);

  return {
    isHeaderVisible: state.isHeaderVisible,
    isTabBarVisible: state.isTabBarVisible,
    handleScroll,
    showElements,
    hideElements,
  };
}