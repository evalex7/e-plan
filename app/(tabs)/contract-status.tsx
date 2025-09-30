import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { CheckCircle, AlertTriangle, RotateCcw, Edit3, X, Save, Navigation } from 'lucide-react-native';
import { useBusinessData, formatDateDisplay, parseShortDate, getNextMaintenanceDate } from '@/hooks/use-business-data';
import { useFilteredBusinessData } from '@/hooks/use-filtered-business-data';
import { useDebugSettings } from '@/hooks/use-debug-settings';
import { router } from 'expo-router';
import type { Contract } from '@/types/business';

// Використовуємо функцію форматування дат з хука
const formatDate = formatDateDisplay;

const statusColumns = [
  {
    id: 'active',
    title: 'Активні',
    color: '#10B981',
    icon: CheckCircle,
    description: 'Договори в активному стані'
  },
  {
    id: 'final_works',
    title: 'Крайні роботи',
    color: '#F59E0B',
    icon: AlertTriangle,
    description: 'Договори на завершальній стадії'
  },
  {
    id: 'extension',
    title: 'Пролонгація',
    color: '#3B82F6',
    icon: RotateCcw,
    description: 'Договори на пролонгації'
  },
  {
    id: 'completed',
    title: 'Завершені',
    color: '#6B7280',
    icon: CheckCircle,
    description: 'Завершені договори'
  }
];

export default function ContractStatusScreen() {
  const { updateContract } = useBusinessData();
  const { contracts, objects, isLoading } = useFilteredBusinessData(); // Використовуємо фільтровані дані без архівних договорів
  const { isDebugEnabled } = useDebugSettings();
  const debugEnabled = isDebugEnabled('contracts');
  const logDebug = (...args: any[]) => {
    if (debugEnabled) {
      console.log('[Contract Status Debug]', ...args);
    }
  };
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [editForm, setEditForm] = useState<Partial<Contract>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Отримуємо розміри екрану для адаптивного дизайну
  const screenWidth = Dimensions.get('window').width;
  const isTablet = screenWidth >= 768;
  const isDesktop = screenWidth >= 1024;
  
  // Визначаємо кількість колонок залежно від розміру екрану
  const getColumnsPerRow = () => {
    if (isDesktop) return 4; // 4 колонки на великих екранах
    if (isTablet) return 2;  // 2 колонки на планшетах
    return 1; // 1 колонка на мобільних
  };
  
  const columnsPerRow = getColumnsPerRow();
  const columnWidth = columnsPerRow === 1 ? '100%' : 
                     columnsPerRow === 2 ? '48%' : '23%';

  const getContractsForStatus = (status: string) => {
    return contracts.filter(contract => contract.status === status);
  };

  const getObject = (objectId: string) => objects.find(o => o.id === objectId);

  const handleEditContract = (contract: Contract) => {
    logDebug('Opening edit modal for contract:', contract.id, contract.contractNumber);
    logDebug('Current editingContract state:', editingContract?.id);
    setEditingContract(contract);
    setEditForm({
      contractNumber: contract.contractNumber,
      clientName: contract.clientName,
      address: contract.address || '',
      startDate: contract.startDate,
      endDate: contract.endDate,
      serviceFrequency: contract.serviceFrequency,

      status: contract.status,
      notes: contract.notes || '',
    });
    logDebug('Modal should be visible now. EditingContract set to:', contract.id);
    logDebug('EditForm set to:', {
      contractNumber: contract.contractNumber,
      clientName: contract.clientName,
      address: contract.address || ''
    });
  };

  const handleEditContractNavigation = (contract: Contract) => {
    logDebug('Navigating to edit contract:', contract.id, contract.contractNumber);
    router.push({
      pathname: '/edit-contract',
      params: { id: contract.id }
    });
  };

  const handleSaveContract = async () => {
    if (!editingContract || isSaving) return;
    
    // Валідація обов'язкових полів
    if (!editForm.contractNumber?.trim()) {
      Alert.alert('Помилка', 'Номер договору є обов\'язковим');
      return;
    }
    if (!editForm.clientName?.trim()) {
      Alert.alert('Помилка', 'Назва клієнта є обов\'язковою');
      return;
    }
    
    setIsSaving(true);
    try {
      logDebug('Saving contract:', editingContract.id, editForm);
      // Конвертуємо дати з відображуваного формату в ISO формат для збереження
      const updateData = {
        ...editForm,
        startDate: parseShortDate(editForm.startDate || ''),
        endDate: parseShortDate(editForm.endDate || '')
      };
      logDebug('Contract status - converted dates for saving:', updateData.startDate, updateData.endDate);
      await updateContract(editingContract.id, updateData);
      
      // Закриваємо модальне вікно
      setEditingContract(null);
      setEditForm({});
      
      Alert.alert('Успіх', 'Договір успішно оновлено');
    } catch (error) {
      logDebug('Error updating contract:', error);
      console.error('Error updating contract:', error);
      Alert.alert('Помилка', 'Не вдалося оновити договір');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingContract(null);
    setEditForm({});
  };

  const openNavigation = async (address: string) => {
    if (!address?.trim()) {
      Alert.alert('Помилка', 'Адреса не вказана для цього договору');
      return;
    }

    const encodedAddress = encodeURIComponent(address.trim());
    
    // Показуємо вибір навігаційного додатку
    Alert.alert(
      'Навігація',
      'Оберіть навігаційний додаток:',
      [
        {
          text: 'Google Maps',
          onPress: () => openGoogleMaps(encodedAddress)
        },
        {
          text: 'Waze',
          onPress: () => openWaze(encodedAddress)
        },
        {
          text: 'Скасувати',
          style: 'cancel'
        }
      ]
    );
  };

  const openGoogleMaps = async (encodedAddress: string) => {
    try {
      const googleMapsUrl = Platform.select({
        ios: `maps://app?daddr=${encodedAddress}`,
        android: `google.navigation:q=${encodedAddress}`,
        web: `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`
      });

      const canOpen = await Linking.canOpenURL(googleMapsUrl!);
      if (canOpen) {
        await Linking.openURL(googleMapsUrl!);
      } else {
        // Fallback до веб-версії
        const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      logDebug('Error opening Google Maps:', error);
      console.error('Error opening Google Maps:', error);
      Alert.alert('Помилка', 'Не вдалося відкрити Google Maps');
    }
  };

  const openWaze = async (encodedAddress: string) => {
    try {
      const wazeUrl = `waze://?q=${encodedAddress}&navigate=yes`;
      logDebug('Opening Waze with URL:', wazeUrl);
      
      // Намагаємося відкрити Waze напряму
      try {
        await Linking.openURL(wazeUrl);
      } catch (linkingError) {
        logDebug('Failed to open Waze app, trying web fallback');
        
        // Якщо не вдалося відкрити додаток, пробуємо веб-версію
        const webUrl = `https://www.waze.com/ul?q=${encodedAddress}&navigate=yes`;
        
        try {
          await Linking.openURL(webUrl);
        } catch (webError) {
          // Якщо і веб-версія не працює, показуємо опції
          Alert.alert(
            'Waze недоступний',
            'Не вдалося відкрити Waze. Спробувати Google Maps?',
            [
              {
                text: 'Google Maps',
                onPress: () => openGoogleMaps(encodedAddress)
              },
              {
                text: 'Скасувати',
                style: 'cancel'
              }
            ]
          );
        }
      }
    } catch (error) {
      logDebug('Error opening Waze:', error);
      console.error('Error opening Waze:', error);
      Alert.alert(
        'Помилка',
        'Не вдалося відкрити Waze. Спробувати Google Maps?',
        [
          {
            text: 'Google Maps',
            onPress: () => openGoogleMaps(encodedAddress)
          },
          {
            text: 'Скасувати',
            style: 'cancel'
          }
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Статус договорів</Text>
        <Text style={styles.subtitle}>Розподіл договорів за статусами</Text>
      </View>

      <View style={[styles.columnsContainer, isTablet && styles.columnsContainerTablet]}>
        {statusColumns.map(column => {
          const columnContracts = getContractsForStatus(column.id);
          const Icon = column.icon;
          
          return (
            <View key={column.id} style={[styles.column, 
              columnsPerRow > 1 && { width: columnWidth, marginBottom: 16 }
            ]}>
              <View style={[styles.columnHeader, { backgroundColor: column.color + '10' }]}>
                <View style={styles.columnTitleRow}>
                  <Icon size={20} color={column.color} />
                  <Text style={[styles.columnTitle, { color: column.color }]}>
                    {column.title}
                  </Text>
                  <View style={[styles.countBadge, { backgroundColor: column.color }]}>
                    <Text style={styles.countText}>{columnContracts.length}</Text>
                  </View>
                </View>
                <Text style={styles.columnDescription}>{column.description}</Text>
              </View>

              <View style={styles.contractsList}>
                {columnContracts.map(contract => {
                  const object = getObject(contract.objectId);
                  
                  return (
                    <TouchableOpacity 
                      key={contract.id} 
                      style={styles.contractCard}
                      onPress={() => {
                        logDebug('Contract card pressed:', contract.id, contract.contractNumber);
                        handleEditContractNavigation(contract);
                      }}
                      activeOpacity={0.7}
                      testID={`contract-card-${contract.id}`}
                    >
                      <View style={styles.contractHeader}>
                        <Text style={styles.contractNumber} numberOfLines={1}>
                          {contract.contractNumber}
                        </Text>
                        <View style={styles.contractActions}>
                          {contract.address && (
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                openNavigation(contract.address!);
                              }}
                              style={styles.navigationButton}
                            >
                              <Navigation size={14} color="#10B981" />
                            </TouchableOpacity>
                          )}
                          <Edit3 size={16} color="#6B7280" />
                          <View style={[styles.statusDot, { backgroundColor: column.color }]} />
                        </View>
                      </View>
                      
                      <Text style={styles.objectName} numberOfLines={2}>
                        {object?.name || 'Невідомий об\'єкт'}
                      </Text>
                      
                      {contract.address && (
                        <Text style={styles.contractAddress} numberOfLines={2}>
                          {contract.address}
                        </Text>
                      )}
                      
                      {object?.contactPersonName && (
                        <View style={styles.contactInfo}>
                          <Text style={styles.contactText}>
                            Контактна особа: {object.contactPersonName}
                            {object.contactPersonPhone && ` (${object.contactPersonPhone})`}
                          </Text>
                        </View>
                      )}
                      

                      
                      <View style={styles.contractDetails}>
                        <Text style={styles.detailText}>
                          Початок: {formatDate(contract.startDate)}
                        </Text>
                        <Text style={styles.detailText}>
                          Закінчення: {formatDate(contract.endDate)}
                        </Text>
                      </View>
                      
                      <View style={styles.serviceInfo}>
                        <Text style={styles.serviceType}>
                          {typeof contract.serviceFrequency === 'string' && contract.serviceFrequency === 'quarterly' ? 'Щоквартально' :
                           typeof contract.serviceFrequency === 'string' && contract.serviceFrequency === 'biannual' ? 'Двічі на рік' :
                           typeof contract.serviceFrequency === 'string' && contract.serviceFrequency === 'triannual' ? 'Тричі на рік' :
                           typeof contract.serviceFrequency === 'string' && contract.serviceFrequency === 'annual' ? 'Щорічно' :
                           typeof contract.serviceFrequency === 'number' ? `Кожні ${contract.serviceFrequency} міс.` :
                           'Не вказано'}
                        </Text>
                      </View>
                      
                      {/* Додаємо інформацію про наступне ТО */}
                      {contract.maintenancePeriods && contract.maintenancePeriods.length > 0 && (
                        <View style={styles.maintenanceInfo}>
                          {(() => {
                            const nextMaintenance = getNextMaintenanceDate(contract);
                            const statusColor = nextMaintenance.status === 'overdue' ? '#EF4444' : 
                                              nextMaintenance.status === 'due' ? '#F59E0B' : '#10B981';
                            return (
                              <View style={[styles.maintenanceStatus, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
                                <Text style={[styles.maintenanceStatusText, { color: statusColor }]}>
                                  Наступне ТО: {nextMaintenance.date}
                                </Text>
                              </View>
                            );
                          })()}
                        </View>
                      )}
                      
                      {contract.notes && (
                        <Text style={styles.notes} numberOfLines={2}>
                          {contract.notes}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
                
                {columnContracts.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Немає договорів</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {editingContract && (
        <Modal
          visible={!!editingContract}
          animationType="slide"
          transparent={false}
          onRequestClose={handleCancelEdit}
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCancelEdit}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Редагувати договір</Text>
            <TouchableOpacity 
              onPress={handleSaveContract}
              disabled={isSaving}
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            >
              {isSaving ? (
                <ActivityIndicator size={24} color="#3B82F6" />
              ) : (
                <Save size={24} color="#3B82F6" />
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Номер договору</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.contractNumber || ''}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, contractNumber: text }))}
                placeholder="Введіть номер договору"
                editable={!isSaving}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Клієнт</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.clientName || ''}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, clientName: text }))}
                placeholder="Введіть назву клієнта"
                editable={!isSaving}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Назва об&apos;єкта</Text>
              <TextInput
                style={[styles.formInput, styles.readOnlyInput]}
                value={getObject(editingContract?.objectId || '')?.name || ''}
                placeholder="Назва об'єкта (тільки для перегляду)"
                editable={false}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Адреса об&apos;єкта</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={editForm.address || ''}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, address: text }))}
                placeholder="Введіть адресу об&apos;єкта"
                multiline
                numberOfLines={2}
                editable={!isSaving}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Дата початку</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.startDate || ''}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, startDate: text }))}
                  placeholder="YYYY-MM-DD"
                  editable={!isSaving}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.formLabel}>Дата закінчення</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.endDate || ''}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, endDate: text }))}
                  placeholder="YYYY-MM-DD"
                  editable={!isSaving}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Частота обслуговування</Text>
              <View style={styles.frequencyButtons}>
                {[
                  { key: 'quarterly', label: 'Щоквартально' },
                  { key: 'biannual', label: 'Двічі на рік' },
                  { key: 'triannual', label: 'Тричі на рік' },
                  { key: 'annual', label: 'Щорічно' }
                ].map(freq => (
                  <TouchableOpacity
                    key={freq.key}
                    style={[
                      styles.frequencyButton,
                      (typeof editForm.serviceFrequency === 'string' && editForm.serviceFrequency === freq.key) && styles.frequencyButtonActive
                    ]}
                    onPress={() => !isSaving && setEditForm(prev => ({ ...prev, serviceFrequency: freq.key as any }))}
                    disabled={isSaving}
                  >
                    <Text style={[
                      styles.frequencyButtonText,
                      (typeof editForm.serviceFrequency === 'string' && editForm.serviceFrequency === freq.key) && styles.frequencyButtonTextActive
                    ]}>
                      {freq.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Статус</Text>
              <View style={styles.statusButtons}>
                {statusColumns.map(status => (
                  <TouchableOpacity
                    key={status.id}
                    style={[
                      styles.statusButton,
                      editForm.status === status.id && { backgroundColor: status.color + '20', borderColor: status.color }
                    ]}
                    onPress={() => !isSaving && setEditForm(prev => ({ ...prev, status: status.id as any }))}
                    disabled={isSaving}
                  >
                    <status.icon size={16} color={editForm.status === status.id ? status.color : '#6B7280'} />
                    <Text style={[
                      styles.statusButtonText,
                      editForm.status === status.id && { color: status.color }
                    ]}>
                      {status.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>



            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Примітки</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={editForm.notes || ''}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, notes: text }))}
                placeholder="Додаткові примітки"
                multiline
                numberOfLines={4}
                editable={!isSaving}
              />
            </View>
          </ScrollView>
          </View>
        </Modal>
      )}
    </ScrollView>
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
  columnsContainer: {
    padding: 16,
    gap: 16,
  },
  columnsContainerTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  column: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  columnTablet: {
    width: '48%',
    marginBottom: 16,
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
  countBadge: {
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
  },
  contractsList: {
    padding: 16,
    gap: 12,
  },
  contractCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  contractActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  serviceInfo: {
    marginBottom: 8,
  },
  serviceType: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#3B82F6',
  },

  notes: {
    fontSize: 10,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  contractAddress: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
  },
  contactInfo: {
    marginBottom: 8,
  },
  contactText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500' as const,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  formTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  frequencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  frequencyButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  frequencyButtonText: {
    fontSize: 12,
    color: '#6B7280',
  },
  frequencyButtonTextActive: {
    color: '#FFFFFF',
  },
  statusButtons: {
    gap: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  statusButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  saveButton: {
    opacity: 1,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  readOnlyInput: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  maintenanceInfo: {
    marginTop: 8,
  },
  maintenanceStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  maintenanceStatusText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  navigationButton: {
    padding: 2,
    borderRadius: 4,
    backgroundColor: '#ECFDF5',
  },

});