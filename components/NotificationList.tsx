import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Bell, X, AlertTriangle, Clock, CheckCircle, AlertCircle } from 'lucide-react-native';
import type { Notification } from '@/types/business';
import { useNotifications } from '@/hooks/use-notifications';

interface NotificationItemProps {
  notification: Notification;
  onPress?: () => void;
  onDismiss?: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onPress, 
  onDismiss 
}) => {
  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F97316';
      case 'medium': return '#3B82F6';
      case 'low': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getPriorityIcon = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent': return AlertTriangle;
      case 'high': return AlertCircle;
      case 'medium': return Clock;
      case 'low': return CheckCircle;
      default: return Bell;
    }
  };

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'maintenance_due':
      case 'maintenance_overdue':
        return Clock;
      case 'contract_expiring':
        return AlertTriangle;
      case 'task_assigned':
        return CheckCircle;
      case 'report_required':
        return AlertCircle;
      default:
        return Bell;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'щойно';
    if (diffInMinutes < 60) return `${diffInMinutes} хв тому`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} год тому`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} дн тому`;
    
    return date.toLocaleDateString('uk-UA');
  };

  const priorityColor = getPriorityColor(notification.priority);
  const PriorityIcon = getPriorityIcon(notification.priority);
  const TypeIcon = getTypeIcon(notification.type);

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.isRead && styles.unreadNotification,
        { borderLeftColor: priorityColor }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <View style={styles.iconContainer}>
            <TypeIcon 
              size={20} 
              color={priorityColor}
              style={styles.typeIcon}
            />
            {notification.priority === 'urgent' && (
              <PriorityIcon 
                size={16} 
                color={priorityColor}
                style={styles.priorityIcon}
              />
            )}
          </View>
          
          <View style={styles.notificationText}>
            <Text style={[
              styles.notificationTitle,
              !notification.isRead && styles.unreadTitle
            ]}>
              {notification.title}
            </Text>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {notification.message}
            </Text>
            <Text style={styles.notificationTime}>
              {formatTimeAgo(notification.createdAt)}
            </Text>
          </View>

          {onDismiss && (
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        {notification.actionRequired && (
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>Потрібна дія</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

interface NotificationListProps {
  notifications?: Notification[];
  onNotificationPress?: (notification: Notification) => void;
  onNotificationDismiss?: (notificationId: string) => void;
  showEmpty?: boolean;
  maxHeight?: number;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onNotificationPress,
  onNotificationDismiss,
  showEmpty = true,
  maxHeight = 400
}) => {
  const { notifications: allNotifications } = useNotifications();
  const displayNotifications = notifications || allNotifications;

  if (displayNotifications.length === 0 && showEmpty) {
    return (
      <View style={styles.emptyContainer}>
        <Bell size={48} color="#D1D5DB" />
        <Text style={styles.emptyText}>Немає нотифікацій</Text>
        <Text style={styles.emptySubtext}>
          Ви будете отримувати сповіщення про наближення термінів ТО
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { maxHeight }]}
      showsVerticalScrollIndicator={false}
    >
      {displayNotifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onPress={() => onNotificationPress?.(notification)}
          onDismiss={() => onNotificationDismiss?.(notification.id)}
        />
      ))}
    </ScrollView>
  );
};

interface NotificationBadgeProps {
  count?: number;
  showZero?: boolean;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  showZero = false,
  size = 'medium',
  color = '#EF4444'
}) => {
  const { getUnreadCount } = useNotifications();
  const displayCount = count !== undefined ? count : getUnreadCount();

  if (displayCount === 0 && !showZero) {
    return null;
  }

  const sizeStyles = {
    small: { width: 16, height: 16, fontSize: 10 },
    medium: { width: 20, height: 20, fontSize: 12 },
    large: { width: 24, height: 24, fontSize: 14 }
  };

  const currentSize = sizeStyles[size];

  return (
    <View style={[
      styles.badge,
      {
        backgroundColor: color,
        width: currentSize.width,
        height: currentSize.height,
        borderRadius: currentSize.width / 2
      }
    ]}>
      <Text style={[
        styles.badgeText,
        { fontSize: currentSize.fontSize }
      ]}>
        {displayCount > 99 ? '99+' : displayCount.toString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  unreadNotification: {
    backgroundColor: '#F8FAFC',
  },
  notificationContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    position: 'relative',
    marginRight: 12,
    marginTop: 2,
  },
  typeIcon: {
    // Основна іконка
  },
  priorityIcon: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  notificationText: {
    flex: 1,
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  dismissButton: {
    padding: 4,
  },
  actionBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  actionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 20,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default NotificationList;