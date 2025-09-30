import React, { useRef, useState } from 'react';
import { 
  Animated, 
  Platform, 
  RefreshControl, 
  ScrollView, 
  StyleSheet, 
  View
} from 'react-native';
import { colors } from '@/constants/colors';
import LoadingSpinner from './LoadingSpinner';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  refreshing?: boolean;
  style?: any;
  onScroll?: (event: any) => void;
  scrollEventThrottle?: number;
}

export default function PullToRefresh({ 
  children, 
  onRefresh, 
  refreshing = false,
  style,
  onScroll,
  scrollEventThrottle = 16
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (Platform.OS === 'web') {
    // Для веб-версії використовуємо стандартний RefreshControl
    return (
      <ScrollView
        style={[styles.container, style]}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {children}
      </ScrollView>
    );
  }



  return (
    <View style={[styles.container, style]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
});