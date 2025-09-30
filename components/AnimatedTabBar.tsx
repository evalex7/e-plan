import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AnimatedTabBarProps {
  children: React.ReactNode;
  isVisible: boolean;
  backgroundColor?: string;
}

export function AnimatedTabBar({
  children,
  isVisible,
  backgroundColor = '#FFFFFF',
}: AnimatedTabBarProps) {
  const insets = useSafeAreaInsets();
  const translateY = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(translateY, {
      toValue: isVisible ? 0 : 83 + insets.bottom,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible, insets.bottom, translateY]);

  return (
    <Animated.View
      style={[
        styles.tabBar,
        {
          backgroundColor,
          paddingBottom: insets.bottom,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.tabBarContent}>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  tabBarContent: {
    height: 83,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
});