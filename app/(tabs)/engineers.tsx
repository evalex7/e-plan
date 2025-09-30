import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Edit3, Trash2, Phone, Mail, User, LogOut, Shield, Database, RefreshCw } from 'lucide-react-native';
import { useBusinessData } from '@/hooks/use-business-data';
import { useFilteredBusinessData } from '@/hooks/use-filtered-business-data';
import { useAuth } from '@/hooks/use-auth';
import UndoRedoControls from '@/components/UndoRedoControls';

import type { ServiceEngineer } from '@/types/business';

import { colors, spacing, fontSize, fontWeight } from '@/constants/colors';

export default function EngineersScreen() {
  const router = useRouter();
  const { deleteEngineer, refreshData } = useBusinessData();
  const { engineers } = useFilteredBusinessData(); // Використовуємо фільтровані дані
  const { user, permissions, logout } = useAuth();




  const openAddScreen = () => {
    router.push('/add-edit-engineer');
  };

  const openEditScreen = (engineer: ServiceEngineer) => {
    router.push(`/add-edit-engineer?engineerId=${engineer.id}`);
  };

  const handleDelete = (engineer: ServiceEngineer) => {
    Alert.alert(
      'Підтвердження',
      `Ви впевнені, що хочете видалити виконавця "${engineer.name}"?`,
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Видалити',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEngineer(engineer.id);
              Alert.alert('Успіх', 'Виконавець видалений успішно');
            } catch (error: any) {
              console.error('Error deleting engineer:', error);
              Alert.alert('Помилка', error.message || 'Не вдалося видалити виконавця');
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Підтвердження',
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

  const openSyncData = () => {
    router.push('/sync-data');
  };

  const handleRefreshData = async () => {
    try {
      await refreshData();
      Alert.alert('Успіх', 'Дані оновлено');
    } catch (error) {
      console.error('Error refreshing data:', error);
      Alert.alert('Помилка', 'Не вдалося оновити дані');
    }
  };

  const handleResetToDefaults = () => {
    Alert.alert(
      'Підтвердження',
      'Це створить дефолтних інженерів. Поточні дані будуть втрачені. Продовжити?',
      [
        { text: 'Скасувати', style: 'cancel' },

      ]
    );
  };



  const renderEngineerCard = (engineer: ServiceEngineer) => (
    <View key={engineer.id} style={styles.engineerCard}>
      <View style={styles.cardHeader}>
        <View style={styles.engineerInfo}>
          <View style={[styles.colorIndicator, { backgroundColor: engineer.color }]} />
          <View style={styles.engineerDetails}>
            <Text style={styles.engineerName}>{engineer.name}</Text>
            <Text style={styles.engineerSpecialization}>{engineer.specialization.join(', ')}</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          {permissions.canEditEngineers && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openEditScreen(engineer)}
              testID={`edit-engineer-${engineer.id}`}
            >
              <Edit3 size={20} color="#3B82F6" />
            </TouchableOpacity>
          )}
          {permissions.canDeleteEngineers && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(engineer)}
              testID={`delete-engineer-${engineer.id}`}
            >
              <Trash2 size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <View style={styles.contactInfo}>
        <View style={styles.contactItem}>
          <Phone size={16} color="#6B7280" />
          <Text style={styles.contactText}>{engineer.phone}</Text>
        </View>
        {engineer.email && (
          <View style={styles.contactItem}>
            <Mail size={16} color="#6B7280" />
            <Text style={styles.contactText}>{engineer.email}</Text>
          </View>
        )}
      </View>
    </View>
  );



  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Виконавці ({engineers.length})</Text>
          <Text style={styles.userInfo}>Увійшов як: {user?.name} ({user?.role})</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleRefreshData}
            testID="refresh-button"
          >
            <RefreshCw size={16} color="#3B82F6" />
          </TouchableOpacity>
          {engineers.length === 0 && (
            <TouchableOpacity
              style={styles.recoveryButton}
              onPress={openSyncData}
              testID="recovery-button"
            >
              <Database size={16} color="#10B981" />
              <Text style={styles.recoveryButtonText}>Відновити</Text>
            </TouchableOpacity>
          )}
          {permissions.canManageUsers && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={openUserManagement}
              testID="user-management-button"
            >
              <Shield size={20} color="#3B82F6" />
            </TouchableOpacity>
          )}
          {permissions.canEditEngineers && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={openAddScreen}
              testID="add-engineer-button"
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Додати</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            testID="logout-button"
          >
            <LogOut size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {engineers.length === 0 ? (
          <View style={styles.emptyState}>
            <User size={64} color="#9CA3AF" />
            <Text style={styles.emptyStateText}>Немає виконавців</Text>
            <Text style={styles.emptyStateSubtext}>
              {Platform.OS === 'web' 
                ? 'У веб-версії дані зберігаються в localStorage браузера'
                : 'Можливо, дані були втрачені?'
              }
            </Text>
            <View style={styles.emptyStateActions}>
              <TouchableOpacity
                style={styles.recoveryFullButton}
                onPress={openSyncData}
                testID="recovery-full-button"
              >
                <Database size={20} color="#FFFFFF" />
                <Text style={styles.recoveryFullButtonText}>Відновити з файлу</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.defaultButton}
                onPress={handleResetToDefaults}
                testID="reset-defaults-button"
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.defaultButtonText}>Створити дефолтних</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          engineers.map(renderEngineerCard)
        )}
      </ScrollView>

      <UndoRedoControls />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  userInfo: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  iconButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6'
  },
  logoutButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FEF2F2'
  },
  recoveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4
  },
  recoveryButtonText: {
    color: '#10B981',
    fontWeight: '600' as const,
    fontSize: 12
  },
  recoveryFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8
  },
  recoveryFullButtonText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
    fontSize: 16
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray900,
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
    fontSize: 16
  },
  content: {
    flex: 1,
    padding: 16
  },
  engineerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  engineerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12
  },
  engineerDetails: {
    flex: 1
  },
  engineerName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 4
  },
  engineerSpecialization: {
    fontSize: 14,
    color: '#6B7280'
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6'
  },
  contactInfo: {
    gap: 8
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  contactText: {
    fontSize: 14,
    color: '#374151'
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#9CA3AF',
    marginTop: 16
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20
  },
  emptyStateActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16
  },
  defaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8
  },
  defaultButtonText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
    fontSize: 16
  },


});