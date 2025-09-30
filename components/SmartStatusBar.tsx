import React, { useState, useEffect } from 'react';
import { StatusBar, Platform, View, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { colors, fontSize, fontWeight } from '@/constants/colors';

interface SmartStatusBarProps {
  backgroundColor?: string;
  barStyle?: 'default' | 'light-content' | 'dark-content';
  translucent?: boolean;
}

export default function SmartStatusBar({
  backgroundColor = colors.white,
  barStyle = 'dark-content',
  translucent = false,
}: SmartStatusBarProps) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showOfflineBanner, setShowOfflineBanner] = useState<boolean>(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleOnline = () => {
        setIsOnline(true);
        setShowOfflineBanner(false);
      };
      
      const handleOffline = () => {
        setIsOnline(false);
        setShowOfflineBanner(true);
        // Приховуємо банер через 5 секунд
        setTimeout(() => setShowOfflineBanner(false), 5000);
      };

      // Перевіряємо початковий стан
      setIsOnline(navigator.onLine);
      if (!navigator.onLine) {
        setShowOfflineBanner(true);
        setTimeout(() => setShowOfflineBanner(false), 5000);
      }

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  return (
    <>
      {Platform.OS !== 'web' && (
        <StatusBar
          backgroundColor={backgroundColor}
          barStyle={barStyle}
          translucent={translucent}
          animated={true}
        />
      )}
      
      {/* Банер про відсутність інтернету */}
      {showOfflineBanner && Platform.OS === 'web' && (
        <View style={styles.offlineBanner}>
          <WifiOff size={16} color={colors.white} style={styles.offlineIcon} />
          <Text style={styles.offlineText}>
            Немає підключення до інтернету. Працюємо в офлайн режимі.
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    backgroundColor: colors.warning,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  offlineIcon: {
    marginRight: 8,
  },
  offlineText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
});