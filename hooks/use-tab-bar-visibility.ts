import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';

export const [TabBarVisibilityProvider, useTabBarVisibility] = createContextHook(() => {
  const [isTabBarVisible, setIsTabBarVisible] = useState<boolean>(true);

  const showTabBar = useCallback(() => setIsTabBarVisible(true), []);
  const hideTabBar = useCallback(() => setIsTabBarVisible(false), []);

  return useMemo(() => ({
    isTabBarVisible,
    showTabBar,
    hideTabBar,
    setIsTabBarVisible,
  }), [isTabBarVisible, showTabBar, hideTabBar]);
});