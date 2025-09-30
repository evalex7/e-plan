import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Bug, Palette, Info, Database, Shield, RefreshCw, Settings } from 'lucide-react-native';
import { colors, fontSize, fontWeight } from '@/constants/colors';
import { useDebugSettings, type DebugSettings } from '@/hooks/use-debug-settings';
// import { useAuth } from '@/hooks/use-auth';
import { useBusinessData } from '@/hooks/use-business-data';
import { useFilteredBusinessData } from '@/hooks/use-filtered-business-data';

import { ScrollablePage } from '@/components/ScrollablePage';


export default function SettingsScreen() {
  const router = useRouter();
  const { debugSettings, toggleDebugForTab, isLoaded: debugLoaded } = useDebugSettings();
  // Тимчасова заглушка для аутентифікації
  const user = { name: 'Користувач', role: 'admin' };
  const permissions = { canManageUsers: true };
  const logout = () => console.log('Logout');
  const { exportData, refreshData } = useBusinessData();
  const { contracts, engineers, objects } = useFilteredBusinessData();

  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  
  // Show loading state while debug settings are being loaded
  if (!debugLoaded) {
    return (
      <ScrollablePage title="Налаштування">
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.userName}>Завантаження налаштувань...</Text>
        </View>
      </ScrollablePage>
    );
  }

  const tabs: { key: keyof DebugSettings; title: string; icon: string }[] = [
    { key: 'contracts', title: 'Договори', icon: 'FileText' },
    { key: 'gantt', title: 'Лінія часу', icon: 'BarChart3' },
    { key: 'work-types', title: 'Види робіт', icon: 'Wrench' },
    { key: 'resources', title: 'Виконавці', icon: 'Users' },
    { key: 'reports', title: 'Звіти', icon: 'ClipboardList' },
  ];

  type SwitchItem = {
    title: string;
    subtitle: string;
    type: 'switch';
    value: boolean;
    onToggle: () => void;
  };

  type ButtonItem = {
    title: string;
    subtitle: string;
    type: 'button';
    onPress: () => void;
  };

  type SettingItem = SwitchItem | ButtonItem;

  const handleExportData = async () => {
    Alert.alert(
      'Експорт даних',
      'Експортувати всі дані системи?',
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Експортувати',
          onPress: async () => {
            setIsExporting(true);
            try {
              const data = await exportData();
              const filename = `maintenance_backup_${new Date().toISOString().split('T')[0]}.json`;
              
              if (Platform.OS === 'web') {
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.click();
                URL.revokeObjectURL(url);
              }
              
              Alert.alert('Успіх', 'Дані експортовано успішно');
            } catch (error) {
              console.error('Export error:', error);
              Alert.alert('Помилка', 'Не вдалося експортувати дані');
            } finally {
              setIsExporting(false);
            }
          }
        }
      ]
    );
  };

  const handleImportData = () => {
    router.push('/sync-data');
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      Alert.alert('Успіх', 'Дані оновлено');
    } catch (error) {
      console.error('Refresh error:', error);
      Alert.alert('Помилка', 'Не вдалося оновити дані');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Очистити всі дані',
      'Це видалить ВСІ дані системи. Дія незворотна!',
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Очистити',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear localStorage on web or AsyncStorage on mobile
              if (Platform.OS === 'web') {
                localStorage.clear();
              }
              await refreshData(); // This will reload empty data
              Alert.alert('Успіх', 'Всі дані очищено');
            } catch (error) {
              console.error('Clear data error:', error);
              Alert.alert('Помилка', 'Не вдалося очистити дані');
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Вихід',
      'Ви впевнені, що хочете вийти з системи?',
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Вийти',
          style: 'destructive',
          onPress: logout
        }
      ]
    );
  };

  const openUserManagement = () => {
    router.push('/user-management');
  };

  const settingSections: {
    title: string;
    icon: React.ReactNode;
    items: SettingItem[];
  }[] = [

    {
      title: 'Відладка',
      icon: <Bug size={24} color={colors.primary} />,
      items: tabs.map(tab => ({
        title: `Відладка: ${tab.title}`,
        subtitle: 'Показувати консоль відладки',
        type: 'switch' as const,
        value: debugSettings[tab.key] || false,
        onToggle: () => toggleDebugForTab(tab.key),
      }))
    },
    {
      title: 'Дані та синхронізація',
      icon: <Database size={24} color={colors.primary} />,
      items: [
        {
          title: 'Експорт даних',
          subtitle: `${contracts.length} договорів, ${engineers.length} інженерів`,
          type: 'button' as const,
          onPress: handleExportData,
        },
        {
          title: 'Імпорт даних',
          subtitle: 'Завантажити дані з файлу',
          type: 'button' as const,
          onPress: handleImportData,
        },
        {
          title: 'Оновити дані',
          subtitle: 'Перезавантажити з сховища',
          type: 'button' as const,
          onPress: handleRefreshData,
        },
        {
          title: 'Очистити всі дані',
          subtitle: 'Видалити всі дані (незворотно)',
          type: 'button' as const,
          onPress: handleClearAllData,
        }
      ]
    },
    {
      title: 'Користувач та безпека',
      icon: <Shield size={24} color={colors.primary} />,
      items: [
        ...(permissions.canManageUsers ? [{
          title: 'Управління користувачами',
          subtitle: 'Додати, редагувати користувачів',
          type: 'button' as const,
          onPress: openUserManagement,
        }] : []),
        {
          title: 'Поточний користувач',
          subtitle: `${user?.name} (${user?.role})`,
          type: 'button' as const,
          onPress: () => console.log('User profile'),
        },
        {
          title: 'Вийти з системи',
          subtitle: 'Завершити сеанс роботи',
          type: 'button' as const,
          onPress: handleLogout,
        }
      ]
    },
    {
      title: 'Зовнішній вигляд',
      icon: <Palette size={24} color={colors.primary} />,
      items: [
        {
          title: 'Тема',
          subtitle: 'Світла тема',
          type: 'button' as const,
          onPress: () => Alert.alert('Інформація', 'Темна тема буде додана в наступних версіях'),
        },
        {
          title: 'Мова',
          subtitle: 'Українська',
          type: 'button' as const,
          onPress: () => Alert.alert('Інформація', 'Додаткові мови будуть додані в наступних версіях'),
        }
      ]
    },
    {
      title: 'Про застосунок',
      icon: <Info size={24} color={colors.primary} />,
      items: [
        {
          title: 'Версія',
          subtitle: '1.0.0 (Build 2024.12)',
          type: 'button' as const,
          onPress: () => Alert.alert('Версія', 'Система управління технічним обслуговуванням\nВерсія 1.0.0\nПобудова: 2024.12\n\nРозроблено для управління договорами ТО'),
        },
        {
          title: 'Статистика системи',
          subtitle: `${contracts.length + engineers.length + objects.length} записів`,
          type: 'button' as const,
          onPress: () => Alert.alert('Статистика', `Договори: ${contracts.length}\nІнженери: ${engineers.length}\nОбєкти: ${objects.length}\n\nПлатформа: ${Platform.OS}\nВерсія React Native: ${Platform.Version}`),
        }
      ]
    }
  ];



  return (
    <ScrollablePage 
      title="Налаштування"
      headerBackgroundColor={colors.white}
      headerTextColor={colors.gray900}
    >
      <Stack.Screen options={{ 
        headerShown: false
      }} />
      
      {/* User Info Header */}
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Settings size={24} color={colors.white} />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user?.name || 'Користувач'}</Text>
            <Text style={styles.userRole}>{user?.role || 'Роль не визначена'}</Text>
          </View>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{contracts.length}</Text>
            <Text style={styles.statLabel}>Договори</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{engineers.length}</Text>
            <Text style={styles.statLabel}>Інженери</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{objects.length}</Text>
            <Text style={styles.statLabel}>Обєкти</Text>
          </View>
        </View>
      </View>
      
      {settingSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <View style={styles.sectionHeader}>
            {section.icon}
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          
          <View style={styles.sectionContent}>
            {section.items.map((item) => (
              <View key={item.title} style={[
                styles.settingItem,
                section.items.indexOf(item) === section.items.length - 1 && styles.lastItem
              ]}>
                <TouchableOpacity
                  style={[
                    styles.settingItemContent,
                    (item.title.includes('Очистити') || item.title.includes('Вийти')) && styles.dangerItem
                  ]}
                  onPress={item.type === 'button' ? (item as ButtonItem).onPress : undefined}
                  disabled={item.type === 'switch' || isExporting || isRefreshing}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingItemText}>
                    <Text style={[
                      styles.settingItemTitle,
                      (item.title.includes('Очистити') || item.title.includes('Вийти')) && styles.dangerText
                    ]}>{item.title}</Text>
                    <Text style={styles.settingItemSubtitle}>{item.subtitle}</Text>
                  </View>
                  
                  {/* Loading indicators */}
                  {(item.title.includes('Експорт') && isExporting) && <RefreshCw size={20} color={colors.primary} />}
                  {(item.title.includes('Оновити') && isRefreshing) && <RefreshCw size={20} color={colors.primary} />}
                  
                  {item.type === 'switch' && (
                    <Switch
                      value={(item as SwitchItem).value}
                      onValueChange={(item as SwitchItem).onToggle}
                      trackColor={{ false: colors.gray200, true: colors.primary + '40' }}
                      thumbColor={(item as SwitchItem).value ? colors.primary : colors.gray400}
                    />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollablePage>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  userHeader: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray900,
    marginBottom: 4,
  },
  userRole: {
    fontSize: fontSize.base,
    color: colors.gray600,
    fontWeight: fontWeight.medium,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.gray600,
    fontWeight: fontWeight.medium,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray900,
  },
  sectionContent: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dangerItem: {
    backgroundColor: '#FEF2F2',
  },
  settingItemText: {
    flex: 1,
  },
  settingItemTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray900,
    marginBottom: 2,
  },
  dangerText: {
    color: '#DC2626',
  },
  settingItemSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray500,
  },

});