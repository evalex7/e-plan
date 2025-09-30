import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
  View,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight, gradients } from '@/constants/colors';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'success' | 'warning' | 'purple' | 'ocean' | 'sunset' | 'forest';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export default function GradientButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}: GradientButtonProps) {
  const getGradientColors = () => {
    switch (variant) {
      case 'primary':
        return gradients.primary;
      case 'success':
        return gradients.success;
      case 'warning':
        return gradients.warning;
      case 'purple':
        return gradients.purple;
      case 'ocean':
        return gradients.ocean;
      case 'sunset':
        return gradients.sunset;
      case 'forest':
        return gradients.forest;
      default:
        return gradients.primary;
    }
  };

  const getShadowColor = () => {
    switch (variant) {
      case 'primary':
        return colors.shadowPrimary;
      case 'success':
        return colors.shadowSuccess;
      case 'warning':
        return colors.shadowWarning;
      case 'purple':
        return colors.shadowPrimary;
      case 'ocean':
        return colors.primary;
      case 'sunset':
        return colors.shadowWarning;
      case 'forest':
        return colors.shadowSuccess;
      default:
        return colors.shadowPrimary;
    }
  };

  const getButtonStyle = () => {
    const baseStyle: ViewStyle[] = [styles.button];
    
    if (size === 'small') {
      baseStyle.push(styles.buttonSmall);
    } else if (size === 'large') {
      baseStyle.push(styles.buttonLarge);
    } else {
      baseStyle.push(styles.buttonMedium);
    }

    if (fullWidth) {
      baseStyle.push(styles.fullWidth);
    }

    if (disabled) {
      baseStyle.push(styles.disabled);
    } else {
      // Додаємо тінь тільки для активних кнопок
      baseStyle.push({
        shadowColor: getShadowColor(),
        shadowOffset: { width: 0, height: size === 'large' ? 8 : 6 },
        shadowOpacity: 0.25,
        shadowRadius: size === 'large' ? 16 : 12,
        elevation: size === 'large' ? 12 : 8,
      });
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle: TextStyle[] = [styles.text];
    
    if (size === 'small') {
      baseStyle.push(styles.textSmall);
    } else if (size === 'large') {
      baseStyle.push(styles.textLarge);
    } else {
      baseStyle.push(styles.textMedium);
    }

    if (disabled) {
      baseStyle.push(styles.textDisabled);
    }

    return baseStyle;
  };

  // Для веб-версії використовуємо CSS градієнт
  const gradientStyle = Platform.OS === 'web' ? {
    background: `linear-gradient(135deg, ${getGradientColors()[0]} 0%, ${getGradientColors()[1]} 100%)`,
  } : {
    backgroundColor: getGradientColors()[0], // Fallback для мобільних
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), gradientStyle, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  buttonSmall: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
  },
  buttonMedium: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    minHeight: 48,
  },
  buttonLarge: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xl,
    minHeight: 56,
  },
  fullWidth: {
    flex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  text: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  textSmall: {
    fontSize: fontSize.sm,
  },
  textMedium: {
    fontSize: fontSize.base,
  },
  textLarge: {
    fontSize: fontSize.lg,
  },
  textDisabled: {
    opacity: 0.7,
  },
});