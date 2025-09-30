import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { CheckCircle, Clock, AlertTriangle, XCircle, FileText } from 'lucide-react-native';
import { useBusinessData, formatDateDisplay } from '@/hooks/use-business-data';

const formatDate = formatDateDisplay;

const statusConfig = {
  'active': {
    title: 'Активні',
    color: '#10B981',
    icon: Clock,
    description: 'Договори в процесі виконання'
  },
  'completed': {
    title: 'Завершені',
    color: '#3B82F6',
    icon: CheckCircle,
    description: 'Успішно завершені договори'
  },
  'overdue': {
    title: 'Прострочені',
    color: '#EF4444',
    icon: AlertTriangle,
    description: 'Договори з порушенням термінів'
  },
  'cancelled': {
    title: 'Скасовані',
    color: '#6B7280',
    icon: XCircle,
    description: 'Скасовані або припинені договори'
  }
};

export default function ContractStatusScreen() {
  const { contracts, objects, tasks, isLoading } = useBusinessData();

  const getContractsByStatus = (status: string) => {
    return contracts.filter(contract => contract.status === status);
  };

  const getTasksForContract = (contractId: string) => {
    return tasks.filter(task => task.contractId === contractId);
  };

  const getObject = (objectId: string) => objects.find(o => o.id === objectId);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Статус договорів' }} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Статус договорів</Text>
        <Text style={styles.subtitle}>Розподіл договорів за статусами виконання</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statusGrid}>
          {Object.entries(statusConfig).map(([status, config]) => {
            const statusContracts = getContractsByStatus(status);
            const Icon = config.icon;
            
            return (
              <View key={status} style={styles.statusCard}>
                <View style={[styles.statusHeader, { backgroundColor: config.color + '10' }]}>
                  <View style={styles.statusTitleRow}>
                    <Icon size={24} color={config.color} />
                    <Text style={[styles.statusTitle, { color: config.color }]}>
                      {config.title}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: config.color }]}>
                      <Text style={styles.statusCount}>{statusContracts.length}</Text>
                    </View>
                  </View>
                  <Text style={styles.statusDescription}>{config.description}</Text>
                </View>

                <View style={styles.contractsList}>
                  {statusContracts.length === 0 ? (
                    <View style={styles.emptyState}>
                      <FileText size={32} color="#9CA3AF" />
                      <Text style={styles.emptyText}>Немає договорів</Text>
                    </View>
                  ) : (
                    statusContracts.slice(0, 5).map(contract => {
                      const object = getObject(contract.objectId);
                      const contractTasks = getTasksForContract(contract.id);
                      const completedTasks = contractTasks.filter(t => t.status === 'completed').length;
                      
                      return (
                        <View key={contract.id} style={styles.contractItem}>
                          <View style={styles.contractHeader}>
                            <Text style={styles.contractNumber} numberOfLines={1}>
                              {contract.contractNumber}
                            </Text>
                            <View style={[styles.statusDot, { backgroundColor: config.color }]} />
                          </View>
                          
                          <Text style={styles.objectName} numberOfLines={1}>
                            {object?.name || 'Невідомий об\'єкт'}
                          </Text>
                          
                          <View style={styles.contractDetails}>
                            <Text style={styles.detailText}>
                              Завдань: {completedTasks}/{contractTasks.length}
                            </Text>
                            {contract.maintenanceStartDate && (
                              <Text style={styles.detailText}>
                                Початок: {formatDate(contract.maintenanceStartDate)}
                              </Text>
                            )}
                            {contract.maintenanceEndDate && (
                              <Text style={styles.detailText}>
                                Кінець: {formatDate(contract.maintenanceEndDate)}
                              </Text>
                            )}
                          </View>
                          
                          {contractTasks.length > 0 && (
                            <View style={styles.progressContainer}>
                              <View style={styles.progressBar}>
                                <View 
                                  style={[
                                    styles.progressFill, 
                                    { 
                                      width: `${(completedTasks / contractTasks.length) * 100}%`,
                                      backgroundColor: config.color
                                    }
                                  ]} 
                                />
                              </View>
                              <Text style={styles.progressText}>
                                {Math.round((completedTasks / contractTasks.length) * 100)}%
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                  
                  {statusContracts.length > 5 && (
                    <View style={styles.moreIndicator}>
                      <Text style={styles.moreText}>
                        +{statusContracts.length - 5} ще
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  content: {
    flex: 1,
    padding: 16,
  },
  statusGrid: {
    gap: 16,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statusHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusCount: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  statusDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  contractsList: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    fontStyle: 'italic',
  },
  contractItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  contractNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#111827',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  objectName: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 8,
  },
  contractDetails: {
    gap: 2,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 11,
    color: '#6B7280',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: '#6B7280',
    minWidth: 30,
    textAlign: 'right',
  },
  moreIndicator: {
    padding: 8,
    alignItems: 'center',
  },
  moreText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});