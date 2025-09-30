import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import { colors, fontSize, fontWeight } from '@/constants/colors';
import { getErrorMessage } from '@/constants/error-messages';

interface ErrorMessageProps {
  error: any;
  onDismiss?: () => void;
  style?: any;
  showIcon?: boolean;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  error, 
  onDismiss, 
  style,
  showIcon = true 
}) => {
  const message = getErrorMessage(error);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        {showIcon && (
          <AlertTriangle size={20} color={colors.error} style={styles.icon} />
        )}
        <Text style={styles.message}>{message}</Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <X size={16} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

interface ErrorBannerProps {
  error: any;
  onDismiss?: () => void;
  visible?: boolean;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ 
  error, 
  onDismiss, 
  visible = true 
}) => {
  if (!visible || !error) return null;

  const message = getErrorMessage(error);

  return (
    <View style={styles.banner}>
      <View style={styles.bannerContent}>
        <AlertTriangle size={18} color={colors.white} style={styles.bannerIcon} />
        <Text style={styles.bannerMessage}>{message}</Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.bannerDismiss}>
            <X size={16} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.errorBg,
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  message: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.errorText,
    lineHeight: 20,
  },
  dismissButton: {
    marginLeft: 8,
    padding: 4,
  },
  banner: {
    backgroundColor: colors.error,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerIcon: {
    marginRight: 8,
  },
  bannerMessage: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.white,
    fontWeight: fontWeight.medium,
    lineHeight: 20,
  },
  bannerDismiss: {
    marginLeft: 8,
    padding: 4,
  },
});