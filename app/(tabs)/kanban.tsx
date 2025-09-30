import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, Clock, RotateCcw, CheckCircle } from 'lucide-react-native';
import { useBusinessData, formatDateDisplay, getNextMaintenanceDate } from '@/hooks/use-business-data';
import { useFilteredBusinessData } from '@/hooks/use-filtered-business-data';
import type { ContractKanbanColumn } from '@/types/business';
import PageTransitionContainer from '@/components/PageTransitionContainer';

import { useDebugSettings } from '@/hooks/use-debug-settings';

// Використовуємо функцію форматування дат з хука
const formatDate = formatDateDisplay;

const { width: screenWidth } = Dimensions.get('window');
const COLUMN_WIDTH = screenWidth * 0.85;

const columns: { id: ContractKanbanColumn; title: string; color: string; icon: any }[] = [
  { id: 'active', title: 'Активні', color: '#10B981', icon: FileText },
  { id: 'final_works', title: 'Крайні роботи', color: '#F59E0B', icon: Clock },
  { id: 'extension', title: 'Пролонгація', color: '#3B82F6', icon: RotateCcw },
  { id: 'completed', title: 'Завершені', color: '#6B7280', icon: CheckCircle }
];

export default function ContractStatusScreen() {
  const { moveContractKanbanTask } = useBusinessData();
  const { contracts, contractKanbanTasks, objects, engineers, isLoading } = useFilteredBusinessData(); // Використовуємо фільтровані дані без архівних договорів
  const [draggedContract, setDraggedContract] = useState<string | null>(null);
  const [targetColumn, setTargetColumn] = useState<ContractKanbanColumn | null>(null);
  const { isDebugEnabled } = useDebugSettings();
  const insets = useSafeAreaInsets();

  const getContractsForColumn = useCallback((columnId: ContractKanbanColumn) => {
    return contractKanbanTasks
      .filter(k => k.column === columnId)
      .map(k => contracts.find(c => c.id === k.contractId))
      .filter(Boolean)
      .sort((a, b) => {
        const ka = contractKanbanTasks.find(k => k.contractId === a?.id);
        const kb = contractKanbanTasks.find(k => k.contractId === b?.id);
        return (ka?.order || 0) - (kb?.order || 0);
      });
  }, [contractKanbanTasks, contracts]);

  const getObject = (objectId: string) => objects.find(o => o.id === objectId);
  const getEngineer = (engineerId: string) => engineers.find(e => e.id === engineerId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'final_works': return '#F59E0B';
      case 'extension': return '#3B82F6';
      case 'completed': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const handleDrop = async (contractId: string, columnId: ContractKanbanColumn) => {
    await moveContractKanbanTask(contractId, columnId);
    setDraggedContract(null);
    setTargetColumn(null);
  };



  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <PageTransitionContainer animationType="scale" duration={350}>
      <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Канбан</Text>
            <Text style={styles.headerSubtitle}>
              {contracts.length} договорів • {contractKanbanTasks.length} завдань
            </Text>
          </View>

        </View>
      </View>
      
      <ScrollView 
        horizontal 
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.columnsContainer}
      >
        {columns.map(column => {
          const columnContracts = getContractsForColumn(column.id);
          const Icon = column.icon;
          
          return (
            <View key={column.id} style={styles.column}>
              <View style={styles.columnHeader}>
                <Icon size={18} color={column.color} />
                <Text style={styles.columnTitle}>{column.title}</Text>
                <View style={[styles.contractCount, { backgroundColor: column.color + '20' }]}>
                  <Text style={[styles.contractCountText, { color: column.color }]}>
                    {columnContracts.length}
                  </Text>
                </View>
              </View>

              <ScrollView 
                style={styles.contractsList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contractsContent}
              >
                {columnContracts.map(contract => {
                  if (!contract) return null;
                  const object = getObject(contract.objectId);
                  const assignedEngineers = contract.assignedEngineerIds?.map(id => getEngineer(id)).filter(Boolean) || [];
                  const nextMaintenance = getNextMaintenanceDate(contract);
                  
                  return (
                    <TouchableOpacity
                      key={contract.id}
                      style={[
                        styles.contractCard,
                        draggedContract === contract.id && styles.contractCardDragging,
                        targetColumn === column.id && draggedContract === contract.id && styles.contractCardTarget
                      ]}
                      onLongPress={() => setDraggedContract(contract.id)}
                      onPressOut={() => {
                        if (draggedContract === contract.id && targetColumn) {
                          handleDrop(contract.id, targetColumn);
                        }
                      }}
                      activeOpacity={0.9}
                    >
                      <View style={styles.contractHeader}>
                        <Text style={styles.contractObject} numberOfLines={1}>
                          {object?.name || 'Невідомий об\'єкт'}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(contract.status) + '20' }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(contract.status) }]}>
                            {column.title}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.contractNumber} numberOfLines={1}>
                        {contract.contractNumber}
                      </Text>
                      
                      <Text style={styles.contractClient} numberOfLines={1}>
                        {contract.clientName}
                      </Text>
                      
                      <View style={styles.contractDetails}>
                        <Text style={styles.contractDate}>
                          {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                        </Text>
                      </View>

                      <View style={styles.maintenanceInfo}>
                        <Text style={styles.maintenanceLabel}>Наступне ТО:</Text>
                        <Text style={[
                          styles.maintenanceDate,
                          nextMaintenance.status === 'overdue' && styles.overdue,
                          nextMaintenance.status === 'due' && styles.due
                        ]}>
                          {nextMaintenance.date}
                        </Text>
                      </View>

                      {assignedEngineers.length > 0 && (
                        <View style={styles.engineersContainer}>
                          {assignedEngineers.slice(0, 2).map((engineer, index) => {
                            if (!engineer) return null;
                            return (
                              <View key={engineer.id} style={[styles.engineerChip, { backgroundColor: engineer.color + '20' }]}>
                                <View style={[styles.engineerDot, { backgroundColor: engineer.color }]} />
                                <Text style={styles.engineerName} numberOfLines={1}>
                                  {engineer.name}
                                </Text>
                              </View>
                            );
                          })}
                          {assignedEngineers.length > 2 && (
                            <Text style={styles.moreEngineers}>+{assignedEngineers.length - 2}</Text>
                          )}
                        </View>
                      )}

                      {contract.workTypes && contract.workTypes.length > 0 && (
                        <View style={styles.workTypesContainer}>
                          {contract.workTypes.map((type) => (
                            <View key={type} style={styles.workTypeBadge}>
                              <Text style={styles.workTypeText}>{type}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>
      
      {isDebugEnabled('kanban') && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Kanban Debug</Text>
          <ScrollView style={styles.debugContent} horizontal>
            <Text style={styles.debugText}>
              {JSON.stringify({
                contracts: contracts.length,
                contractKanbanTasks: contractKanbanTasks.length,
                objects: objects.length,
                engineers: engineers.length,
                isLoading,
                draggedContract,
                targetColumn,
                columnData: columns.map(col => ({
                  id: col.id,
                  title: col.title,
                  contractsCount: getContractsForColumn(col.id).length
                }))
              }, null, 2)}
            </Text>
          </ScrollView>
        </View>
      )}
      </View>
    </PageTransitionContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500' as const,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  columnsContainer: {
    flex: 1,
  },
  column: {
    width: COLUMN_WIDTH,
    marginHorizontal: screenWidth * 0.075,
    paddingTop: 16,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    flex: 1,
  },
  contractCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  contractCountText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  contractsList: {
    flex: 1,
  },
  contractsContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  contractCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  contractCardDragging: {
    opacity: 0.5,
  },
  contractCardTarget: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  contractNumber: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#6B7280',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  contractClient: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  contractObject: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    flex: 1,
  },
  contractDetails: {
    marginBottom: 8,
  },
  contractDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  maintenanceInfo: {
    marginBottom: 8,
  },
  maintenanceLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  maintenanceDate: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500' as const,
  },
  overdue: {
    color: '#DC2626',
    fontWeight: '600' as const,
  },
  due: {
    color: '#F59E0B',
    fontWeight: '600' as const,
  },
  engineersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  engineerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    gap: 4,
  },
  engineerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  engineerName: {
    fontSize: 10,
    color: '#374151',
    maxWidth: 60,
  },
  moreEngineers: {
    fontSize: 10,
    color: '#9CA3AF',
    alignSelf: 'center',
  },
  workTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  workTypeBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  workTypeText: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  debugContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    maxHeight: 200,
    borderTopWidth: 1,
    borderTopColor: '#374151'
  },
  debugTitle: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600' as const,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151'
  },
  debugContent: {
    flex: 1,
    padding: 12
  },
  debugText: {
    color: '#D1D5DB',
    fontSize: 12,
    fontFamily: 'monospace'
  },
});