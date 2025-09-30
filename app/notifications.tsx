import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Bell, Settings, Trash2, CheckCircle, Filter } from 'lucide-react-native';
import { NotificationList, NotificationBadge } from '@/components/NotificationList';
import { useNotifications } from '@/hooks/use-notifications';
import type { Notification, NotificationType } from '@/types/business';

type FilterType = 'all' | 'unread' | 'maintenance' | 'contracts' | 'tasks' | 'reports';

const NotificationsScreen: React.FC = () => {
  const router = useRouter();
  const { 
    notifications, 
    markAsRead, 
    removeNotification, 
    clearAllNotifications, 
    clearReadNotifications,
    refreshNotifications,
    isLoading 
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Позначаємо як прочитану
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Навігація залежно від типу нотифікації
    if (notification.contractId) {
      router.push(`/contract-status?contractId=${notification.contractId}`);
    } else if (notification.taskId) {
      // Можна додати навігацію до конкретної задачі
      router.push('/(tabs)/kanban');
    }
  };

  const handleNotificationDismiss = async (notificationId: string) => {
    await removeNotification(notificationId);
  };

  const getFilteredNotifications = (): Notification[] => {
    switch (activeFilter) {
      case 'unread':
        return notifications.filter(n => !n.isRead);
      case 'maintenance':
        return notifications.filter(n => 
          n.type === 'maintenance_due' || n.type === 'maintenance_overdue'
        );
      case 'contracts':
        return notifications.filter(n => n.type === 'contract_expiring');
      case 'tasks':
        return notifications.filter(n => n.type === 'task_assigned');
      case 'reports':
        return notifications.filter(n => n.type === 'report_required');
      default:
        return notifications;
    }
  };

  const getFilterCount = (filter: FilterType): number => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.isRead).length;
      case 'maintenance':
        return notifications.filter(n => 
          n.type === 'maintenance_due' || n.type === 'maintenance_overdue'
        ).length;
      case 'contracts':
        return notifications.filter(n => n.type === 'contract_expiring').length;
      case 'tasks':
        return notifications.filter(n => n.type === 'task_assigned').length;
      case 'reports':
        return notifications.filter(n => n.type === 'report_required').length;
      default:
        return notifications.length;
    }
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Нотифікації',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.push('/notification-settings')}
              >
                <Settings size={24} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          )
        }} 
      />
      
      <View style={styles.container}>
        {/* Фільтри */}
        <View style={styles.filtersContainer}>
          <View style={styles.filtersRow}>
            <FilterButton
              title="Всі"
              count={getFilterCount('all')}
              active={activeFilter === 'all'}
              onPress={() => setActiveFilter('all')}
            />
            <FilterButton
              title="Непрочитані"
              count={getFilterCount('unread')}
              active={activeFilter === 'unread'}
              onPress={() => setActiveFilter('unread')}
              priority
            />
          </View>
          <View style={styles.filtersRow}>
            <FilterButton
              title="ТО"
              count={getFilterCount('maintenance')}
              active={activeFilter === 'maintenance'}
              onPress={() => setActiveFilter('maintenance')}
            />
            <FilterButton
              title="Договори"
              count={getFilterCount('contracts')}
              active={activeFilter === 'contracts'}
              onPress={() => setActiveFilter('contracts')}
            />
            <FilterButton
              title="Задачі"
              count={getFilterCount('tasks')}
              active={activeFilter === 'tasks'}
              onPress={() => setActiveFilter('tasks')}
            />
            <FilterButton
              title="Звіти"
              count={getFilterCount('reports')}
              active={activeFilter === 'reports'}
              onPress={() => setActiveFilter('reports')}
            />
          </View>
        </View>

        {/* Дії */}
        {notifications.length > 0 && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={clearReadNotifications}
              disabled={notifications.filter(n => n.isRead).length === 0}
            >
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.actionButtonText}>
                Очистити прочитані
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={clearAllNotifications}
            >
              <Trash2 size={16} color="#EF4444" />
              <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
                Очистити всі
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Список нотифікацій */}
        <NotificationList
          notifications={filteredNotifications}
          onNotificationPress={handleNotificationPress}
          onNotificationDismiss={handleNotificationDismiss}
          showEmpty={true}
        />
      </View>
    </>
  );
};

interface FilterButtonProps {
  title: string;
  count: number;
  active: boolean;
  onPress: () => void;
  priority?: boolean;
}

const FilterButton: React.FC<FilterButtonProps> = ({ 
  title, 
  count, 
  active, 
  onPress, 
  priority = false 
}) => (
  <TouchableOpacity
    style={[
      styles.filterButton,
      active && styles.activeFilterButton,
      priority && count > 0 && !active && styles.priorityFilterButton
    ]}
    onPress={onPress}
  >
    <Text style={[
      styles.filterButtonText,
      active && styles.activeFilterButtonText,
      priority && count > 0 && !active && styles.priorityFilterButtonText
    ]}>
      {title}
    </Text>
    {count > 0 && (
      <View style={[
        styles.filterBadge,
        active && styles.activeFilterBadge,
        priority && count > 0 && !active && styles.priorityFilterBadge
      ]}>
        <Text style={[
          styles.filterBadgeText,
          active && styles.activeFilterBadgeText,
          priority && count > 0 && !active && styles.priorityFilterBadgeText
        ]}>
          {count > 99 ? '99+' : count}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 4,
    flex: 1,
    minHeight: 36,
  },
  activeFilterButton: {
    backgroundColor: '#3B82F6',
  },
  priorityFilterButton: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  priorityFilterButtonText: {
    color: '#92400E',
  },
  filterBadge: {
    backgroundColor: '#D1D5DB',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  activeFilterBadge: {
    backgroundColor: '#1E40AF',
  },
  priorityFilterBadge: {
    backgroundColor: '#F59E0B',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeFilterBadgeText: {
    color: '#FFFFFF',
  },
  priorityFilterBadgeText: {
    color: '#FFFFFF',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  dangerButton: {
    backgroundColor: '#FEF2F2',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
  },
  dangerButtonText: {
    color: '#EF4444',
  },
});

export default NotificationsScreen;