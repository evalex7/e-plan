import React from 'react';
import { RefreshControl, Platform, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

interface SmartRefreshControlProps {
  refreshing: boolean;
  onRefresh: () => void;
  tintColor?: string;
  title?: string;
}

export default function SmartRefreshControl({
  refreshing,
  onRefresh,
  tintColor = colors.primary,
  title = 'Оновлення...',
}: SmartRefreshControlProps) {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={tintColor}
      colors={[tintColor, colors.success]}
      progressBackgroundColor={colors.white}
      title={Platform.OS === 'ios' ? title : undefined}
      titleColor={colors.gray600}
      style={styles.refreshControl}
    />
  );
}

const styles = StyleSheet.create({
  refreshControl: {
    backgroundColor: 'transparent',
  },
});