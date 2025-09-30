import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet, Platform, View, Text, ActivityIndicator } from "react-native";
import { BusinessDataProvider } from "@/hooks/use-business-data";
import { UndoRedoProvider } from "@/hooks/use-undo-redo";
import { NotificationProvider } from "@/hooks/use-notifications";
import { TabBarVisibilityProvider } from "@/hooks/use-tab-bar-visibility";
import ErrorBoundary from "@/components/ErrorBoundary";
import SmartStatusBar from "@/components/SmartStatusBar";
import { colors } from "@/constants/colors";

import { AuthProvider } from "@/hooks/use-auth";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst', // Працюємо офлайн якщо немає мережі
    },
    mutations: {
      retry: 2,
      networkMode: 'offlineFirst',
    },
  },
});

function RootLayoutNav() {
  // Анімації переходів для різних платформ
  const getScreenOptions = () => {
    if (Platform.OS === 'web') {
      return {
        headerBackTitle: "Назад",
        headerTitle: "",
        animation: 'fade' as const,
      };
    }
    
    return {
      headerBackTitle: "Назад",
      headerTitle: "",
      animation: 'slide_from_right' as const,
      animationDuration: 300,
    };
  };

  // Завжди показуємо основний інтерфейс (без перевірки аутентифікації)
  return (
    <Stack screenOptions={getScreenOptions()}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "" }} />
      <Stack.Screen 
        name="add-contract" 
        options={{ 
          title: "Новий договір",
          presentation: "modal",
          animation: Platform.OS === 'web' ? 'fade' : 'slide_from_bottom',
          animationDuration: 400,
        }} 
      />
      <Stack.Screen 
        name="add-task" 
        options={{ 
          title: "Нове обслуговування",
          presentation: "modal",
          animation: Platform.OS === 'web' ? 'fade' : 'slide_from_bottom',
          animationDuration: 400,
        }} 
      />
      <Stack.Screen 
        name="user-management" 
        options={{ 
          title: "Управління користувачами",
          presentation: "modal",
          animation: Platform.OS === 'web' ? 'fade' : 'slide_from_bottom',
          animationDuration: 400,
        }} 
      />
      <Stack.Screen 
        name="edit-contract" 
        options={{ 
          title: "Редагувати договір",
          animation: Platform.OS === 'web' ? 'fade' : 'slide_from_right',
          animationDuration: 300,
        }} 
      />
      <Stack.Screen 
        name="add-edit-engineer" 
        options={{ 
          title: "Інженер",
          presentation: "modal",
          animation: Platform.OS === 'web' ? 'fade' : 'slide_from_bottom',
          animationDuration: 400,
        }} 
      />
      <Stack.Screen 
        name="contract-status" 
        options={{ 
          title: "Статус договору",
          animation: Platform.OS === 'web' ? 'fade' : 'slide_from_right',
          animationDuration: 300,
        }} 
      />
      <Stack.Screen 
        name="archive" 
        options={{ 
          title: "Архів",
          animation: Platform.OS === 'web' ? 'fade' : 'slide_from_right',
          animationDuration: 300,
        }} 
      />
      <Stack.Screen 
        name="adjust-maintenance-period" 
        options={{ 
          title: "Коригування періоду ТО",
          presentation: "modal",
          animation: Platform.OS === 'web' ? 'fade' : 'slide_from_bottom',
          animationDuration: 400,
        }} 
      />
      <Stack.Screen 
        name="create-maintenance-report" 
        options={{ 
          title: "Звіт про ТО",
          presentation: "modal",
          animation: Platform.OS === 'web' ? 'fade' : 'slide_from_bottom',
          animationDuration: 400,
        }} 
      />
      <Stack.Screen 
        name="contract-reports" 
        options={{ 
          title: "Звіти по договору",
          animation: Platform.OS === 'web' ? 'fade' : 'slide_from_right',
          animationDuration: 300,
        }} 
      />
      <Stack.Screen 
        name="maintenance-reports" 
        options={{ 
          title: "Звіти ТО",
          animation: Platform.OS === 'web' ? 'fade' : 'slide_from_right',
          animationDuration: 300,
        }} 
      />
      <Stack.Screen 
        name="maintenance-period-report" 
        options={{ 
          title: "Звіт періоду ТО",
          animation: Platform.OS === 'web' ? 'fade' : 'slide_from_right',
          animationDuration: 300,
        }} 
      />
      <Stack.Screen 
        name="sync-data" 
        options={{ 
          title: "Синхронізація даних",
          presentation: "modal",
          animation: Platform.OS === 'web' ? 'fade' : 'slide_from_bottom',
          animationDuration: 400,
        }} 
      />
      <Stack.Screen 
        name="notifications" 
        options={{ 
          title: "Нотифікації",
          animation: Platform.OS === 'web' ? 'fade' : 'slide_from_right',
          animationDuration: 300,
        }} 
      />
      <Stack.Screen 
        name="notification-settings" 
        options={{ 
          title: "Налаштування нотифікацій",
          animation: Platform.OS === 'web' ? 'fade' : 'slide_from_right',
          animationDuration: 300,
        }} 
      />
      {/* Тимчасово приховуємо екран входу - просто не включаємо його */}
    </Stack>
  );
}


export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState<boolean>(false);

  useEffect(() => {
    // Перехоплюємо консольні помилки для фільтрації
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = (...args) => {
      const message = args.join(' ');
      // Фільтруємо відомі некритичні помилки
      if (message.includes('source.uri should not be an empty string') ||
          message.includes('Image source prop is empty') ||
          message.includes('Failed to load image')) {
        // Просто ігноруємо ці помилки - вони некритичні
        return;
      }
      originalError(...args);
    };
    
    console.warn = (...args) => {
      const message = args.join(' ');
      // Фільтруємо некритичні попередження
      if (message.includes('source.uri should not be an empty string') ||
          message.includes('Image source prop is empty')) {
        return;
      }
      originalWarn(...args);
    };
    
    const initializeApp = async () => {
      try {
        console.log('Ініціалізація додатку...');
        
        // Простіша перевірка мережі без запитів до сервера
        const checkNetworkConnectivity = () => {
          try {
            if (Platform.OS === 'web') {
              // Просто перевіряємо navigator.onLine без додаткових запитів
              const isOnline = navigator.onLine;
              if (!isOnline) {
                console.log('Працюємо в офлайн режимі');
              }
              return isOnline;
            }
            return true; // Для мобільних пристроїв припускаємо наявність мережі
          } catch (error) {
            console.warn('Помилка перевірки мережі:', error);
            return true; // За замовчуванням вважаємо що мережа доступна
          }
        };
        
        const isOnline = checkNetworkConnectivity();
        
        if (!isOnline && Platform.OS === 'web') {
          console.log('Запускаємо додаток в офлайн режимі');
        }
        
        // Очищуємо некоректні налаштування дебагу
        try {
          if (Platform.OS === 'web') {
            const stored = localStorage.getItem('debug_settings');
            if (stored && stored.trim() !== '') {
              JSON.parse(stored); // Перевіряємо валідність
            }
          }
        } catch (error) {
          console.warn('Очищуємо некоректні налаштування дебагу:', error);
          if (Platform.OS === 'web') {
            localStorage.removeItem('debug_settings');
          }
        }
        
        // Мінімальна затримка для плавного запуску
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('Додаток готовий до використання');
        setIsAppReady(true);
        
        // Приховуємо splash screen
        await SplashScreen.hideAsync();
      } catch (error) {
        console.error('Помилка ініціалізації додатку:', error);
        
        // Логуємо помилку але не показуємо користувачу - додаток все одно працюватиме
        console.log('Додаток запускається незважаючи на помилку ініціалізації');
        
        // Навіть якщо є помилка, показуємо додаток
        setIsAppReady(true);
        try {
          await SplashScreen.hideAsync();
        } catch (secondError) {
          console.error('Не вдалося приховати splash screen:', secondError);
        }
      }
    };
    
    initializeApp();
    
    // Cleanup функція для відновлення оригінальних console методів
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // Показуємо екран завантаження поки додаток не готовий
  if (!isAppReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Завантаження додатку...</Text>
        <Text style={styles.loadingSubText}>Підготовка інтерфейсу</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SmartStatusBar />
        <AuthProvider>
          <TabBarVisibilityProvider>
          <UndoRedoProvider>
            <BusinessDataProvider>
              <NotificationProvider>
                <GestureHandlerRootView style={styles.gestureHandler}>
                  <RootLayoutNav />
                </GestureHandlerRootView>
              </NotificationProvider>
            </BusinessDataProvider>
          </UndoRedoProvider>
          </TabBarVisibilityProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  gestureHandler: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray600,
    textAlign: 'center',
    fontWeight: '600',
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.gray500,
    textAlign: 'center',
  },
});