import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Wrench, Zap, Snowflake, Search, FileText } from 'lucide-react-native';
import { formatDateDisplay } from '@/hooks/use-business-data';
import { useFilteredBusinessData } from '@/hooks/use-filtered-business-data';
import { useDebugSettings } from '@/hooks/use-debug-settings';
import { DebugConsole } from '@/components/DebugConsole';
import { colors, spacing } from '@/constants/colors';

const formatDate = formatDateDisplay;

const workTypeColumns = [
  {
    id: 'КОНД',
    title: 'КОНД',
    color: '#3B82F6',
    icon: Snowflake,
    description: 'Кондиціонери та системи охолодження'
  },
  {
    id: 'ДБЖ',
    title: 'ДБЖ',
    color: '#10B981',
    icon: Zap,
    description: 'Джерела безперебійного живлення'
  },
  {
    id: 'ДГУ',
    title: 'ДГУ',
    color: '#F59E0B',
    icon: Wrench,
    description: 'Дизель-генераторні установки'
  },
  {
    id: 'ІНШЕ',
    title: 'Інше',
    color: '#6B7280',
    icon: Search,
    description: 'Інші види технічного обслуговування'
  }
];

export default function WorkTypesScreen() {
  const { contracts, objects, tasks, isLoading } = useFilteredBusinessData(); // Використовуємо фільтровані дані без архівних договорів
  const [debugConsoleVisible, setDebugConsoleVisible] = useState(false);
  
  // Налагодження
  const { isDebugEnabled } = useDebugSettings();
  const isDebugActive = isDebugEnabled('work-types');

  const getContractsForWorkType = (workType: string) => {
    if (!workType?.trim()) return [];
    if (workType.length > 100) return [];
    const sanitizedWorkType = workType.trim();
    
    const result = contracts.filter(contract => 
      contract.workTypes?.includes(sanitizedWorkType) || 
      (sanitizedWorkType === 'ІНШЕ' && (!contract.workTypes || contract.workTypes.length === 0))
    );
    
    if (isDebugActive) {
      console.log(`📊 Work Types: Contracts for ${sanitizedWorkType}`, {
        workType: sanitizedWorkType,
        totalContracts: contracts.length,
        matchedContracts: result.length,
        contractIds: result.map(c => ({ id: c.id, number: c.contractNumber, workTypes: c.workTypes }))
      });
    }
    
    return result;
  };

  const getTasksForWorkType = (workType: string) => {
    if (!workType?.trim()) return [];
    if (workType.length > 100) return [];
    const sanitizedWorkType = workType.trim();
    
    const contractsWithWorkType = getContractsForWorkType(sanitizedWorkType);
    const contractIds = contractsWithWorkType.map(c => c.id);
    const result = tasks.filter(task => contractIds.includes(task.contractId));
    
    if (isDebugActive) {
      console.log(`📊 Work Types: Tasks for ${sanitizedWorkType}`, {
        workType: sanitizedWorkType,
        contractsCount: contractsWithWorkType.length,
        totalTasks: tasks.length,
        matchedTasks: result.length,
        taskIds: result.map(t => ({ id: t.id, contractId: t.contractId, scheduledDate: t.scheduledDate }))
      });
    }
    
    return result;
  };

  const getObject = (objectId: string) => objects.find(o => o.id === objectId);

  if (isLoading) {
    if (isDebugActive) {
      console.log('📊 Work Types: Loading data...', {
        isLoading,
        timestamp: new Date().toISOString()
      });
    }
    
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }
  
  if (isDebugActive) {
    console.log('📊 Work Types: Data summary', {
      contracts: contracts.length,
      objects: objects.length,
      tasks: tasks.length,
      workTypeColumns: workTypeColumns.length,
      columnStats: workTypeColumns.map(col => ({
        id: col.id,
        contracts: getContractsForWorkType(col.id).length,
        tasks: getTasksForWorkType(col.id).length
      }))
    });
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
        <View style={styles.headerTexts}>
          <Text style={styles.title}>Види робіт</Text>
          <Text style={styles.subtitle}>Канбан дошка для управління видами робіт</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.reportsButton}
            onPress={() => router.push('/work-types/reports')}
          >
            <FileText size={20} color="#3B82F6" />
            <Text style={styles.reportsButtonText}>Звіти</Text>
          </TouchableOpacity>
          
          {isDebugActive && (
            <TouchableOpacity 
              style={styles.debugButton}
              onPress={() => setDebugConsoleVisible(true)}
            >
              <Text style={styles.debugButtonText}>🐛 Debug</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kanbanContainer}>
        <View style={styles.columnsContainer}>
        {workTypeColumns.map(column => {
          const columnContracts = getContractsForWorkType(column.id);
          const columnTasks = getTasksForWorkType(column.id);
          const Icon = column.icon;
          
          return (
            <View key={column.id} style={styles.column}>
              <View style={[styles.columnHeader, { backgroundColor: column.color + '10' }]}>
                <View style={styles.columnTitleRow}>
                  <Icon size={20} color={column.color} />
                  <Text style={[styles.columnTitle, { color: column.color }]}>
                    {column.title}
                  </Text>
                  <View style={styles.countsContainer}>
                    <View style={[styles.countBadge, { backgroundColor: column.color }]}>
                      <Text style={styles.countText}>{columnContracts.length}</Text>
                    </View>
                    <View style={[styles.taskCountBadge, { backgroundColor: column.color + '80' }]}>
                      <Text style={styles.countText}>{columnTasks.length}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.columnDescription}>{column.description}</Text>
                <View style={styles.statsRow}>
                  <Text style={styles.statsText}>Договорів: {columnContracts.length}</Text>
                  <Text style={styles.statsText}>Завдань: {columnTasks.length}</Text>
                </View>
              </View>

              <View style={styles.itemsList}>
                <Text style={styles.sectionTitle}>Договори</Text>
                {columnContracts.slice(0, 3).map(contract => {
                  const object = getObject(contract.objectId);
                  
                  return (
                    <View key={contract.id} style={styles.contractCard}>
                      <View style={styles.contractHeader}>
                        <Text style={styles.contractNumber} numberOfLines={1}>
                          {contract.contractNumber}
                        </Text>
                        <View style={[styles.statusDot, { backgroundColor: column.color }]} />
                      </View>
                      
                      <Text style={styles.objectName} numberOfLines={1}>
                        {object?.name || 'Невідомий об\'єкт'}
                      </Text>
                    </View>
                  );
                })}
                
                {columnContracts.length > 3 && (
                  <View style={styles.moreIndicator}>
                    <Text style={styles.moreText}>
                      +{columnContracts.length - 3} ще
                    </Text>
                  </View>
                )}
                
                {columnContracts.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Немає договорів</Text>
                  </View>
                )}

                <Text style={styles.sectionTitle}>Останні завдання</Text>
                {columnTasks.slice(0, 2).map(task => {
                  const object = getObject(task.objectId);
                  const isOverdue = task.status !== 'completed' && 
                    new Date(task.scheduledDate) < new Date();
                  
                  return (
                    <View key={task.id} style={styles.taskCard}>
                      <View style={styles.taskHeader}>
                        <Text style={styles.taskObject} numberOfLines={1}>
                          {object?.name || 'Невідомий об\'єкт'}
                        </Text>
                        {isOverdue && (
                          <View style={styles.overdueBadge}>
                            <Text style={styles.overdueText}>!</Text>
                          </View>
                        )}
                      </View>
                      
                      <Text style={styles.taskDate}>
                        {formatDate(task.scheduledDate)}
                      </Text>
                    </View>
                  );
                })}
                
                {columnTasks.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Немає завдань</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
        </View>
      </ScrollView>
      
      <DebugConsole 
        visible={debugConsoleVisible} 
        onClose={() => setDebugConsoleVisible(false)} 
      />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTexts: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  reportsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  reportsButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#3B82F6',
  },
  kanbanContainer: {
    flex: 1,
  },
  columnsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  column: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  columnHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  columnTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  columnTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    flex: 1,
  },
  countsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  taskCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  columnDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statsText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500' as const,
  },
  itemsList: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 8,
    marginTop: 8,
  },
  contractCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contractNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#111827',
    flex: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  objectName: {
    fontSize: 11,
    color: '#374151',
    marginBottom: 4,
  },
  taskCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskObject: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#111827',
    flex: 1,
  },
  overdueBadge: {
    backgroundColor: '#FEE2E2',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueText: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '700' as const,
  },
  taskDate: {
    fontSize: 10,
    color: '#6B7280',
  },
  moreIndicator: {
    padding: 8,
    alignItems: 'center',
  },
  moreText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  emptyState: {
    padding: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  debugButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  debugButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});