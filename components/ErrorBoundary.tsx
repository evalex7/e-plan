import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react-native';
import { colors, fontSize, fontWeight } from '@/constants/colors';
// import { ERROR_MESSAGES, getErrorMessage, logError } from '@/constants/error-messages';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    if (__DEV__) {
      console.error('[ErrorBoundary]:', error);
    }
    
    // Фільтруємо відомі помилки, які не критичні
    const errorMessage = error.toString();
    if (errorMessage.includes('source.uri should not be an empty string') ||
        errorMessage.includes('Image source prop is empty') ||
        errorMessage.includes('Failed to load image') ||
        errorMessage.includes('ngrok') ||
        errorMessage.includes('ERR_NGROK')) {
      console.warn('Ignored non-critical error:', errorMessage);
      // Не показуємо ErrorBoundary для цієї помилки
      this.setState({ hasError: false });
      return;
    }
    
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private isNetworkError(error: Error): boolean {
    const errorMessage = error.toString().toLowerCase();
    return errorMessage.includes('network') ||
           errorMessage.includes('fetch') ||
           errorMessage.includes('connection') ||
           errorMessage.includes('ngrok') ||
           errorMessage.includes('offline') ||
           errorMessage.includes('timeout');
  }

  private getErrorType(): 'network' | 'general' {
    if (this.state.error && this.isNetworkError(this.state.error)) {
      return 'network';
    }
    return 'general';
  }

  private getSimpleErrorMessage(error?: Error): string {
    if (!error) {
      return 'Виникла неочікувана помилка. Спробуйте ще раз.';
    }
    
    const errorString = error.message || error.toString();
    const lowerError = errorString.toLowerCase();
    
    // Простий маппінг помилок на українську
    if (lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('connection')) {
      return 'Проблеми з мережею. Перевірте інтернет-з\'єднання.';
    }
    
    if (lowerError.includes('timeout')) {
      return 'Час очікування вичерпано. Спробуйте пізніше.';
    }
    
    if (lowerError.includes('unauthorized') || lowerError.includes('invalid credentials')) {
      return 'Невірний email або пароль.';
    }
    
    if (lowerError.includes('permission denied') || lowerError.includes('access denied')) {
      return 'Доступ заборонено.';
    }
    
    // За замовчуванням повертаємо загальну помилку
    return 'Виникла неочікувана помилка. Спробуйте ще раз.';
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorType = this.getErrorType();
      const isNetworkError = errorType === 'network';

      return (
        <View style={styles.container}>
          <View style={styles.errorCard}>
            {isNetworkError ? (
              <WifiOff size={48} color={colors.warning} style={styles.icon} />
            ) : (
              <AlertTriangle size={48} color={colors.error} style={styles.icon} />
            )}
            
            <Text style={styles.title}>
              {isNetworkError ? 'Проблеми з мережею' : 'Щось пішло не так'}
            </Text>
            
            <Text style={styles.message}>
              {isNetworkError 
                ? 'Проблеми з мережею. Перевірте інтернет-з\'єднання.'
                : this.getSimpleErrorMessage(this.state.error)
              }
            </Text>
            
            {isNetworkError && Platform.OS === 'web' && (
              <View style={styles.networkTips}>
                <Text style={styles.tipsTitle}>Що можна спробувати:</Text>
                <Text style={styles.tipText}>• Перевірте інтернет-з’єднання</Text>
                <Text style={styles.tipText}>• Оновіть сторінку</Text>
                <Text style={styles.tipText}>• Спробуйте пізніше</Text>
              </View>
            )}
            
            {__DEV__ && this.state.error && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugTitle}>Деталі помилки (тільки в режимі розробки):</Text>
                <Text style={styles.debugText}>{this.state.error.toString()}</Text>
                {this.state.errorInfo && (
                  <Text style={styles.debugText}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}
            
            <TouchableOpacity 
              style={[styles.retryButton, isNetworkError && styles.networkRetryButton]} 
              onPress={this.handleRetry}
            >
              {isNetworkError ? (
                <Wifi size={20} color={colors.white} style={styles.buttonIcon} />
              ) : (
                <RefreshCw size={20} color={colors.white} style={styles.buttonIcon} />
              )}
              <Text style={styles.retryButtonText}>
                {isNetworkError ? 'Перевірити з’єднання' : 'Спробувати знову'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    padding: 20,
  },
  errorCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: 400,
    width: '100%',
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray900,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.base,
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  debugInfo: {
    backgroundColor: colors.gray100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  debugTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray700,
    marginBottom: 8,
  },
  debugText: {
    fontSize: fontSize.xs,
    color: colors.gray600,
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  networkTips: {
    backgroundColor: colors.infoBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    width: '100%',
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  tipsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.infoText,
    marginBottom: 8,
  },
  tipText: {
    fontSize: fontSize.sm,
    color: colors.infoText,
    marginBottom: 4,
  },
  networkRetryButton: {
    backgroundColor: colors.info,
  },
});