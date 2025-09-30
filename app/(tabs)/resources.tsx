import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Phone, 
  Mail, 
  User
} from 'lucide-react-native';
import { useBusinessData } from '@/hooks/use-business-data';
import type { ServiceEngineer } from '@/types/business';
import { colors, spacing } from '@/constants/colors';
import { useDebugSettings } from '@/hooks/use-debug-settings';
import { DebugDataDisplay } from '@/components/DebugDataDisplay';
import { Platform } from 'react-native';
import UndoRedoControls from '@/components/UndoRedoControls';

export default function ResourcesScreen() {
  const router = useRouter();
  const { engineers, deleteEngineer, isLoading } = useBusinessData();
  const { isDebugEnabled } = useDebugSettings();

  const openAddScreen = () => {
    router.push('/add-edit-engineer');
  };

  const openEditScreen = (engineer: ServiceEngineer) => {
    router.push(`/add-edit-engineer?engineerId=${engineer.id}`);
  };



  const handleDelete = (engineer: ServiceEngineer) => {
    Alert.alert(
      'Підтвердження',
      `Ви впевнені, що хочете видалити інженера "${engineer.name}"?`,
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Видалити',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEngineer(engineer.id);
              Alert.alert('Успіх', 'Інженер видалений успішно');
            } catch (error: any) {
              console.error('Error deleting engineer:', error);
              Alert.alert('Помилка', error.message || 'Не вдалося видалити інженера');
            }
          }
        }
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
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditScreen(engineer)}
            testID={`edit-engineer-${engineer.id}`}
          >
            <Edit3 size={20} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(engineer)}
            testID={`delete-engineer-${engineer.id}`}
          >
            <Trash2 size={20} color="#EF4444" />
          </TouchableOpacity>
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
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
        <Text style={styles.title}>Сервісні інженери ({engineers.length})</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddScreen}
          testID="add-engineer-button"
        >
          <Plus size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Додати</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {engineers.length === 0 ? (
          <View style={styles.emptyState}>
            <User size={64} color="#9CA3AF" />
            <Text style={styles.emptyStateText}>Немає інженерів</Text>
            <Text style={styles.emptyStateSubtext}>Додайте першого інженера</Text>
          </View>
        ) : (
          engineers.map(renderEngineerCard)
        )}
      </ScrollView>
      
      <UndoRedoControls />
      
      {isDebugEnabled('resources') && (
        <DebugDataDisplay
          title="Ресурси"
          data={{
            engineers: engineers.length,
            isLoading,
            platform: Platform.OS,
            storageType: 'AsyncStorage'
          }}
        />
      )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  safeArea: {
    flex: 1,
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
  title: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#111827'
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8
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
    marginTop: 4
  },

});