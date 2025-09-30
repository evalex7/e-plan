import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AnimatedHeaderProps {
  title: string;
  isVisible: boolean;
  backgroundColor?: string;
  textColor?: string;
  rightComponent?: React.ReactElement;
}

export function AnimatedHeader({
  title,
  isVisible,
  backgroundColor = '#007AFF',
  textColor = '#FFFFFF',
  rightComponent,
}: AnimatedHeaderProps) {
  const insets = useSafeAreaInsets();
  const translateY = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(translateY, {
      toValue: isVisible ? 0 : -(44 + insets.top),
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible, insets.top, translateY]);

  return (
    <Animated.View
      style={[
        styles.header,
        {
          backgroundColor,
          paddingTop: insets.top,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.headerContent}>
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        {rightComponent && (
          <View style={styles.rightComponent}>
            {/* eslint-disable-next-line @rork/linters/general-no-raw-text */}
            {rightComponent}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  rightComponent: {
    position: 'absolute',
    right: 16,
  },
});