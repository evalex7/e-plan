import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Pressable
} from 'react-native';
import { Search, Calendar, User, Building2, FileCheck, ChevronLeft, RotateCcw, X, MapPin, FileText, Wrench } from 'lucide-react-native';
import { useBusinessData, formatDateDisplay } from '@/hooks/use-business-data';
import { router } from 'expo-router';
import { Stack } from 'expo-router';

export default function ArchiveScreen() {
  const { contracts, objects, engineers, isLoading, refreshData, updateContract } = useBusinessData();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);

  // Фільтруємо тільки архівовані договори
  const archivedContracts = useMemo(() => {
    if (isLoading || contracts.length === 0) {
      return [];
    }
    
    const archivedContracts = contracts.filter(contract => contract.status === 'archived');
    
    if (!searchQuery) return archivedContracts;
    const query = searchQuery.toLowerCase();
    return archivedContracts.filter(contract => 
      contract.contractNumber.toLowerCase().includes(query) ||
      contract.clientName.toLowerCase().includes(query) ||
      objects.find(o => o.id === contract.objectId)?.name.toLowerCase().includes(query)
    );
  }, [contracts, objects, searchQuery, isLoading]);

  const getObject = (objectId: string) => objects.find(o => o.id === objectId);
  const getEngineer = (engineerId: string) => engineers.find(e => e.id === engineerId);

  const handleRestoreContract = async (contractId: string) => {
    try {
      await updateContract(contractId, { status: 'active' });
      setRestoreModalVisible(false);
      setSelectedContract(null);
      Alert.alert('Успіх', 'Договір відновлено з архіву');
    } catch (error) {
      console.error('Error restoring contract:', error);
      Alert.alert('Помилка', 'Не вдалося відновити договір');
    }
  };

  const openRestoreModal = (contractId: string) => {
    setSelectedContract(contractId);
    setRestoreModalVisible(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Архів договорів',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { color: '#111827', fontWeight: '600' },
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ChevronLeft size={24} color="#6B7280" />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Пошук в архіві..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            Знайдено: {archivedContracts.length} договорів
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {archivedContracts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FileCheck size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Архів порожній</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Не знайдено договорів за вашим запитом' : 'Архівовані договори з\'являться тут'}
            </Text>
          </View>
        ) : (
          archivedContracts.map(contract => {
            const object = getObject(contract.objectId);
            
            return (
              <View key={contract.id} style={styles.contractCard}>
                <View style={styles.contractHeader}>
                  <View style={styles.contractTitleSection}>
                    <View style={styles.objectNameContainer}>
                      <Building2 size={16} color="#6B7280" />
                      <Text style={styles.objectName}>{object?.name || 'Невідомий'}</Text>
                    </View>
                    
                    <View style={styles.contractNumberContainer}>
                      <FileCheck size={14} color="#6B7280" />
                      <Text style={styles.contractNumber}>{contract.contractNumber}</Text>
                    </View>
                    
                    <View style={styles.contractDatesContainer}>
                      <Calendar size={12} color="#6B7280" />
                      <Text style={styles.contractDates}>
                        {formatDateDisplay(contract.startDate)} - {formatDateDisplay(contract.endDate)}
                      </Text>
                    </View>
                    
                    {contract.contactPerson && (
                      <View style={styles.contactPersonContainer}>
                        <User size={14} color="#6B7280" />
                        <Text style={styles.contactPersonText}>{contract.contactPerson}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.headerActions}>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>Архівовано</Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.restoreButton}
                      onPress={() => openRestoreModal(contract.id)}
                    >
                      <RotateCcw size={16} color="#10B981" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.contractInfo}>
                  <View style={styles.infoRow}>
                    <User size={14} color="#6B7280" />
                    <Text style={styles.infoLabel}>Контрагент:</Text>
                    <Text style={styles.infoValue}>{contract.clientName}</Text>
                  </View>

                  {contract.address && (
                    <View style={styles.infoRow}>
                      <MapPin size={14} color="#6B7280" />
                      <Text style={styles.infoLabel}>Адреса:</Text>
                      <Text style={styles.infoValue} numberOfLines={1}>{contract.address}</Text>
                    </View>
                  )}

                  {contract.workTypes && contract.workTypes.length > 0 && (
                    <View style={styles.infoRow}>
                      <Wrench size={14} color="#6B7280" />
                      <Text style={styles.infoLabel}>Види робіт:</Text>
                      <Text style={styles.infoValue}>{contract.workTypes.join(', ')}</Text>
                    </View>
                  )}

                  {(() => {
                    const engineerIds = contract.assignedEngineerIds || (contract.assignedEngineerId ? [contract.assignedEngineerId] : []);
                    if (engineerIds.length > 0) {
                      const engineerNames = engineerIds
                        .map(id => getEngineer(id)?.name)
                        .filter(Boolean)
                        .join(', ');
                      if (engineerNames) {
                        return (
                          <View style={styles.infoRow}>
                            <User size={14} color="#6B7280" />
                            <Text style={styles.infoLabel}>Відповідальні:</Text>
                            <Text style={styles.infoValue}>{engineerNames}</Text>
                          </View>
                        );
                      }
                    }
                    return null;
                  })()}
                </View>

                {contract.notes && (
                  <View style={styles.additionalInfo}>
                    <View style={styles.noteRow}>
                      <FileText size={12} color="#6B7280" />
                      <Text style={styles.noteText} numberOfLines={3}>{contract.notes}</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={restoreModalVisible}
        onRequestClose={() => setRestoreModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setRestoreModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Відновити договір</Text>
              <TouchableOpacity 
                onPress={() => setRestoreModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalText}>
              Ви впевнені, що хочете відновити цей договір з архіву? Він знову стане активним.
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setRestoreModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Скасувати</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={() => selectedContract && handleRestoreContract(selectedContract)}
              >
                <RotateCcw size={16} color="#FFFFFF" />
                <Text style={styles.confirmButtonText}>Відновити</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
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
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: '#111827',
  },
  statsContainer: {
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  contractCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    opacity: 0.8,
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  contractTitleSection: {
    flex: 1,
    gap: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contractNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contractNumber: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  contractDatesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contractDates: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  objectNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  objectName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
  },
  contactPersonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  contactPersonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#6B728020',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  restoreButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#10B98120',
  },
  contractInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500' as const,
    flex: 1,
  },
  additionalInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  modalText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    gap: 6,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});