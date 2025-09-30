import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollVisibility } from '@/hooks/use-scroll-visibility';
import { AnimatedHeader } from './AnimatedHeader';
import PullToRefresh from './PullToRefresh';

interface ScrollablePageProps {
  children: React.ReactNode;
  title: string;
  headerBackgroundColor?: string;
  headerTextColor?: string;
  rightComponent?: React.ReactElement;
  refreshing?: boolean;
  onRefresh?: () => Promise<void>;
  contentContainerStyle?: any;
  showsVerticalScrollIndicator?: boolean;
}

export function ScrollablePage({
  children,
  title,
  headerBackgroundColor = '#007AFF',
  headerTextColor = '#FFFFFF',
  rightComponent,
  refreshing = false,
  onRefresh,
  contentContainerStyle,
  showsVerticalScrollIndicator = true,
}: ScrollablePageProps) {
  const insets = useSafeAreaInsets();
  const { isHeaderVisible, handleScroll } = useScrollVisibility(30);

  return (
    <View style={styles.container}>
      <AnimatedHeader
        title={title}
        isVisible={isHeaderVisible}
        backgroundColor={headerBackgroundColor}
        textColor={headerTextColor}
        rightComponent={rightComponent}
      />
      
      {onRefresh ? (
        <PullToRefresh
          onRefresh={onRefresh}
          refreshing={refreshing}
          style={styles.scrollView}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View
            style={[
              {
                paddingTop: 44 + insets.top + 16,
                paddingBottom: insets.bottom + 16,
              },
              contentContainerStyle,
            ]}
          >
            {children}
          </View>
        </PullToRefresh>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            {
              paddingTop: 44 + insets.top + 16,
              paddingBottom: insets.bottom + 16,
            },
            contentContainerStyle,
          ]}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        >
          {children}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
});