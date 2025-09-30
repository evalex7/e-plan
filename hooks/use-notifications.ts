import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { 
  Notification, 
  NotificationSettings, 
  NotificationType
} from '@/types/business';
import { useBusinessData } from './use-business-data';

const STORAGE_KEYS = {
  NOTIFICATIONS: 'notifications',
  NOTIFICATION_SETTINGS: 'notification_settings'
};

// Дефолтні налаштування нотифікацій
const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  maintenanceReminders: {
    enabled: true,
    daysBeforeDue: [7, 3, 1],
    overdueReminders: true
  },
  contractReminders: {
    enabled: true,
    daysBeforeExpiry: [30, 14, 7]
  },
  taskAssignments: {
    enabled: true,
    immediateNotification: true
  },
  reportReminders: {
    enabled: true,
    daysAfterCompletion: 1
  },
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00'
  },
  soundEnabled: true,
  vibrationEnabled: true
};

export const [NotificationProvider, useNotifications] = createContextHook(() => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  
  const { contracts, objects, engineers } = useBusinessData();

  // Завантаження даних при старті
  useEffect(() => {
    loadNotificationData();
  }, []);

  const loadNotificationData = async () => {
    try {
      setIsLoading(true);
      const [notificationsData, settingsData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS)
      ]);

      if (notificationsData) {
        try {
          const parsedNotifications = JSON.parse(notificationsData);
          // Фільтруємо застарілі нотифікації
          const activeNotifications = parsedNotifications.filter((n: Notification) => {
            if (n.expiresAt) {
              return new Date(n.expiresAt) > new Date();
            }
            return true;
          });
          setNotifications(activeNotifications);
        } catch (error) {
          console.error('Error parsing notifications:', error);
          setNotifications([]);
        }
      }

      if (settingsData) {
        try {
          const parsedSettings = JSON.parse(settingsData);
          setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
        } catch (error) {
          console.error('Error parsing notification settings:', error);
          setSettings(DEFAULT_SETTINGS);
        }
      }
    } catch (error) {
      console.error('Error loading notification data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNotifications = async (newNotifications: Notification[]) => {
    try {
      if (!Array.isArray(newNotifications)) {
        console.error('Invalid notifications data');
        return;
      }
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(newNotifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      if (!newSettings || typeof newSettings !== 'object') {
        console.error('Invalid settings data');
        return;
      }
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  // Функція для створення нотифікації
  const createNotification = useCallback((
    type: NotificationType,
    title: string,
    message: string,
    options: Partial<Notification> = {}
  ): Notification => {
    return {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
      type,
      title,
      message,
      priority: 'medium',
      isRead: false,
      createdAt: new Date().toISOString(),
      actionRequired: false,
      ...options
    };
  }, []);

  // Функція для форматування дати
  const formatDate = useCallback((date: Date): string => {
    return date.toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, []);



  // Функція для додавання нотифікації
  const addNotification = useCallback(async (notification: Notification) => {
    console.log('🔔 Adding notification:', notification.title);
    
    // Перевіряємо чи не існує вже така нотифікація
    const existingNotification = notifications.find(n => 
      n.type === notification.type &&
      n.contractId === notification.contractId &&
      n.taskId === notification.taskId &&
      n.metadata?.maintenancePeriodId === notification.metadata?.maintenancePeriodId
    );

    if (existingNotification) {
      console.log('🔔 Notification already exists, skipping');
      return;
    }

    const updatedNotifications = [notification, ...notifications];
    setNotifications(updatedNotifications);
    await saveNotifications(updatedNotifications);

    // Показуємо системну нотифікацію (якщо підтримується)
    if (Platform.OS !== 'web' && settings.enabled) {
      showSystemNotification(notification);
    }
  }, [notifications, settings]);

  // Функція для показу системної нотифікації
  const showSystemNotification = async (notification: Notification) => {
    try {
      // Тут можна додати логіку для показу системних нотифікацій
      // Наприклад, використовуючи expo-notifications
      console.log('🔔 System notification:', notification.title, notification.message);
    } catch (error) {
      console.error('Error showing system notification:', error);
    }
  };

  // Функція для генерації нотифікацій про ТО
  const generateMaintenanceNotifications = useCallback(async () => {
    if (!settings.maintenanceReminders.enabled || contracts.length === 0) {
      return;
    }

    console.log('🔔 Generating maintenance notifications for', contracts.length, 'contracts');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newNotifications: Notification[] = [];

    for (const contract of contracts) {
      if (contract.status !== 'active' || !contract.maintenancePeriods) {
        continue;
      }

      const contractObject = objects.find(obj => obj.id === contract.objectId);
      const assignedEngineers = engineers.filter(eng => 
        contract.assignedEngineerIds?.includes(eng.id) || contract.assignedEngineerId === eng.id
      );

      for (const period of contract.maintenancePeriods) {
        if (period.status === 'completed') {
          continue;
        }

        const startDate = new Date(period.adjustedStartDate || period.startDate);
        const endDate = new Date(period.adjustedEndDate || period.endDate);
        const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Нотифікації про наближення ТО
        for (const daysBefore of settings.maintenanceReminders.daysBeforeDue) {
          if (daysUntilStart === daysBefore) {
            const notification = createNotification(
              'maintenance_due',
              `ТО через ${daysBefore} ${daysBefore === 1 ? 'день' : daysBefore < 5 ? 'дні' : 'днів'}`,
              `Договір ${contract.contractNumber} - ${contractObject?.name || 'Об\'єкт'}. Період ТО: ${formatDate(startDate)} - ${formatDate(endDate)}`,
              {
                contractId: contract.id,
                priority: daysBefore <= 1 ? 'high' : daysBefore <= 3 ? 'medium' : 'low',
                actionRequired: daysBefore <= 3,
                expiresAt: new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Через тиждень після закінчення
                metadata: {
                  daysUntilDue: daysUntilStart,
                  maintenancePeriodId: period.id,
                  contractNumber: contract.contractNumber,
                  objectName: contractObject?.name,
                  engineerName: assignedEngineers.map(e => e.name).join(', ')
                }
              }
            );
            newNotifications.push(notification);
          }
        }

        // Нотифікації про прострочене ТО
        if (settings.maintenanceReminders.overdueReminders && daysUntilEnd < 0) {
          const daysOverdue = Math.abs(daysUntilEnd);
          const notification = createNotification(
            'maintenance_overdue',
            `ТО прострочено на ${daysOverdue} ${daysOverdue === 1 ? 'день' : daysOverdue < 5 ? 'дні' : 'днів'}`,
            `Договір ${contract.contractNumber} - ${contractObject?.name || 'Об\'єкт'}. Термін ТО минув ${formatDate(endDate)}`,
            {
              contractId: contract.id,
              priority: 'urgent',
              actionRequired: true,
              metadata: {
                daysUntilDue: daysUntilEnd,
                maintenancePeriodId: period.id,
                contractNumber: contract.contractNumber,
                objectName: contractObject?.name,
                engineerName: assignedEngineers.map(e => e.name).join(', ')
              }
            }
          );
          newNotifications.push(notification);
        }
      }
    }

    // Додаємо нові нотифікації
    for (const notification of newNotifications) {
      await addNotification(notification);
    }

    console.log('🔔 Generated', newNotifications.length, 'maintenance notifications');
  }, [contracts, objects, engineers, settings, addNotification, createNotification, formatDate]);

  // Автоматична генерація нотифікацій при зміні даних
  useEffect(() => {
    if (!isLoading && settings.enabled) {
      generateMaintenanceNotifications();
    }
  }, [contracts, settings, isLoading, generateMaintenanceNotifications]);



  // Функція для позначення нотифікації як прочитаної
  const markAsRead = useCallback(async (notificationId: string) => {
    const updatedNotifications = notifications.map(n => 
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    setNotifications(updatedNotifications);
    await saveNotifications(updatedNotifications);
  }, [notifications]);

  // Функція для видалення нотифікації
  const removeNotification = useCallback(async (notificationId: string) => {
    const updatedNotifications = notifications.filter(n => n.id !== notificationId);
    setNotifications(updatedNotifications);
    await saveNotifications(updatedNotifications);
  }, [notifications]);

  // Функція для очищення всіх нотифікацій
  const clearAllNotifications = useCallback(async () => {
    setNotifications([]);
    await saveNotifications([]);
  }, []);

  // Функція для очищення прочитаних нотифікацій
  const clearReadNotifications = useCallback(async () => {
    const unreadNotifications = notifications.filter(n => !n.isRead);
    setNotifications(unreadNotifications);
    await saveNotifications(unreadNotifications);
  }, [notifications]);

  // Функція для оновлення налаштувань
  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  }, [settings]);

  // Функція для отримання кількості непрочитаних нотифікацій
  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  // Функція для отримання нотифікацій за пріоритетом
  const getNotificationsByPriority = useCallback((priority: Notification['priority']) => {
    return notifications.filter(n => n.priority === priority && !n.isRead);
  }, [notifications]);

  // Функція для отримання нотифікацій за типом
  const getNotificationsByType = useCallback((type: NotificationType) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  // Функція для перевірки чи є критичні нотифікації
  const hasCriticalNotifications = useCallback(() => {
    return notifications.some(n => 
      !n.isRead && (n.priority === 'urgent' || n.priority === 'high')
    );
  }, [notifications]);

  const refreshNotifications = useCallback(() => {
    return loadNotificationData();
  }, []);

  return useMemo(() => ({
    notifications,
    settings,
    isLoading,
    addNotification,
    markAsRead,
    removeNotification,
    clearAllNotifications,
    clearReadNotifications,
    updateSettings,
    getUnreadCount,
    getNotificationsByPriority,
    getNotificationsByType,
    hasCriticalNotifications,
    generateMaintenanceNotifications,
    refreshNotifications
  }), [
    notifications,
    settings,
    isLoading,
    addNotification,
    markAsRead,
    removeNotification,
    clearAllNotifications,
    clearReadNotifications,
    updateSettings,
    getUnreadCount,
    getNotificationsByPriority,
    getNotificationsByType,
    hasCriticalNotifications,
    generateMaintenanceNotifications,
    refreshNotifications
  ]);
});