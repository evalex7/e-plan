import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ErrorMessage, ErrorBanner } from '@/components/ErrorMessage';
import { ERROR_MESSAGES, getErrorMessage, showUserError } from '@/constants/error-messages';
import { colors, fontSize, fontWeight, spacing } from '@/constants/colors';

export default function ErrorExamplesScreen() {
  const [showBanner, setShowBanner] = useState(false);
  const [currentError, setCurrentError] = useState<any>(null);

  const testErrors = [
    { name: 'Мережева помилка', error: new Error('Network request failed') },
    { name: 'Помилка валідації', error: new Error('Required field missing') },
    { name: 'Помилка файлу', error: new Error('File not found') },
    { name: 'Помилка доступу', error: new Error('Permission denied') },
    { name: 'Українська помилка', error: new Error('Не вдалося зберегти дані') },
    { name: 'Невідома помилка', error: new Error('Something went wrong') },
  ];

  const handleTestError = (error: any) => {
    setCurrentError(error);
    setShowBanner(true);
    
    // Також показуємо в консолі
    showUserError(error, 'Test Error');
  };

  return (
    <View style={styles.container}>
      {showBanner && (
        <ErrorBanner
          error={currentError}
          onDismiss={() => setShowBanner(false)}
          visible={showBanner}
        />
      )}
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Приклади повідомлень про помилки</Text>
        <Text style={styles.subtitle}>
          Всі повідомлення автоматично перекладаються на українську мову
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Тестові помилки</Text>
          {testErrors.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.testButton}
              onPress={() => handleTestError(item.error)}
            >
              <Text style={styles.testButtonText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Приклади компонентів помилок</Text>
          
          <ErrorMessage 
            error={new Error('Network request failed')}
            style={styles.errorExample}
          />
          
          <ErrorMessage 
            error="Це приклад прямого тексту помилки"
            showIcon={false}
            style={styles.errorExample}
          />
          
          <ErrorMessage 
            error={ERROR_MESSAGES.INVALID_EMAIL}
            onDismiss={() => console.log('Error dismissed')}
            style={styles.errorExample}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Всі доступні повідомлення</Text>
          <View style={styles.messagesList}>
            {Object.entries(ERROR_MESSAGES).map(([key, message]) => (
              <View key={key} style={styles.messageItem}>
                <Text style={styles.messageKey}>{key}:</Text>
                <Text style={styles.messageValue}>{message}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.gray900,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.gray800,
    marginBottom: spacing.md,
  },
  testButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  testButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  errorExample: {
    marginBottom: spacing.md,
  },
  messagesList: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: spacing.md,
  },
  messageItem: {
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  messageKey: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray700,
    marginBottom: spacing.xs,
  },
  messageValue: {
    fontSize: fontSize.sm,
    color: colors.gray600,
    lineHeight: 20,
  },
});