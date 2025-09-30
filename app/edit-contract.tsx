import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { CheckCircle, AlertTriangle, RotateCcw, Save, ArrowLeft, X, Plus, Navigation } from 'lucide-react-native';
import { useBusinessData, parseShortDate, formatDateDisplay } from '@/hooks/use-business-data';
import DatePicker from '@/components/DatePicker';
import type { Contract, MaintenancePeriod } from '@/types/business';

const statusColumns = [
  {
    id: 'active',
    title: 'Активні',
    color: '#10B981',
    icon: CheckCircle,
  },
  {
    id: 'final_works',
    title: 'Крайні роботи',
    color: '#F59E0B',
    icon: AlertTriangle,
  },
  {
    id: 'extension',
    title: 'Пролонгація',
    color: '#3B82F6',
    icon: RotateCcw,
  },
  {
    id: 'completed',
    title: 'Завершені',
    color: '#6B7280',
    icon: CheckCircle,
  }
];

// Функції для розбору контактної особи
const extractContactPersonName = (contactPerson: string): string => {
  if (!contactPerson) return '';
  // Видаляємо частину в дужках (телефон) і повертаємо ім'я
  const nameMatch = contactPerson.match(/^([^(]+)/);
  return nameMatch ? nameMatch[1].trim() : contactPerson;
};

const extractContactPersonPhone = (contactPerson: string): string => {
  if (!contactPerson) return '';
  // Шукаємо телефон в дужках
  const phoneMatch = contactPerson.match(/\(([^)]+)\)/);
  return phoneMatch ? phoneMatch[1].trim() : '';
};

export default function EditContractScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { contracts, objects, engineers, updateContract, addObject } = useBusinessData();
  const [editForm, setEditForm] = useState<Partial<Contract> & { objectName?: string, maintenancePeriods?: MaintenancePeriod[], assignedEngineerIds?: string[], contactPersonName?: string, contactPersonPhone?: string, contactPerson?: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const contract = contracts.find(c => c.id === id);
  const getObject = (objectId: string) => objects.find(o => o.id === objectId);

  useEffect(() => {
    if (contract) {
      console.log('🔥 Loading contract for editing:', contract.id, contract.contractNumber);
      console.log('🔥 Contract maintenance periods:', contract.maintenancePeriods);
      const objectData = getObject(contract.objectId);
      // Конвертуємо дати з ISO формату в відображуваний формат
      const displayStartDate = formatDateDisplay(contract.startDate);
      const displayEndDate = formatDateDisplay(contract.endDate);
      const displayMaintenancePeriods = (contract.maintenancePeriods || []).map(p => {
        console.log('🔥 Converting period for display:', p.id, 'startDate:', p.startDate, 'endDate:', p.endDate);
        const converted = {
          ...p,
          startDate: formatDateDisplay(p.startDate),
          endDate: formatDateDisplay(p.endDate)
        };
        console.log('🔥 Converted period for display:', p.id, 'startDate:', converted.startDate, 'endDate:', converted.endDate);
        return converted;
      });
      
      console.log('🔥 All display maintenance periods:', displayMaintenancePeriods);
      
      setEditForm({
        contractNumber: contract.contractNumber,
        clientName: contract.clientName,
        objectName: objectData?.name || contract.objectId,
        address: contract.address || '',

        startDate: displayStartDate,
        endDate: displayEndDate,
        serviceFrequency: contract.serviceFrequency,
        status: contract.status,
        notes: contract.notes || '',
        workTypes: contract.workTypes || [],
        assignedEngineerIds: contract.assignedEngineerIds || (contract.assignedEngineerId ? [contract.assignedEngineerId] : []),
        maintenancePeriods: displayMaintenancePeriods,
        contactPersonName: objectData?.contactPersonName || extractContactPersonName(contract.contactPerson || ''),
        contactPersonPhone: objectData?.contactPersonPhone || extractContactPersonPhone(contract.contactPerson || ''),
        contactPerson: contract.contactPerson || '',
      });
      setIsLoading(false);
    } else {
      console.log('🔥 Contract not found:', id);
      setIsLoading(false);
    }
  }, [contract, id]);



  const openNavigation = async (address: string) => {
    if (!address?.trim()) {
      Alert.alert('Помилка', 'Адреса не вказана для цього договору');
      return;
    }

    const encodedAddress = encodeURIComponent(address.trim());
    
    // На веб-версії відкриваємо Google Maps напряму
    if (Platform.OS === 'web') {
      openGoogleMaps(encodedAddress);
      return;
    }
    
    // Показуємо вибір навігаційного додатку для мобільних пристроїв
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
      console.error('Error opening Google Maps:', error);
      Alert.alert('Помилка', 'Не вдалося відкрити Google Maps');
    }
  };

  const openWaze = async (encodedAddress: string) => {
    try {
      const wazeUrl = `waze://?q=${encodedAddress}&navigate=yes`;
      console.log('Opening Waze with URL:', wazeUrl);
      
      // Намагаємося відкрити Waze напряму
      try {
        await Linking.openURL(wazeUrl);
      } catch (linkingError) {
        console.log('Failed to open Waze app, trying web fallback');
        
        // Якщо не вдалося відкрити додаток, пробуємо веб-версію
        const webUrl = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;
        
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

  const handleSaveContract = async () => {
    if (!contract || isSaving) return;
    
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
      console.log('🔥 Saving contract:', contract.id, editForm);
      console.log('🔥 Original maintenance periods:', editForm.maintenancePeriods);
      // Конвертуємо дати з відображуваного формату в ISO формат для збереження
      const convertedStartDate = parseShortDate(editForm.startDate || '');
      const convertedEndDate = parseShortDate(editForm.endDate || '');
      const convertedMaintenancePeriods = (editForm.maintenancePeriods || []).map(p => {
        console.log('🔥 Converting period:', p.id, 'startDate:', p.startDate, 'endDate:', p.endDate);
        const convertedPeriod = {
          ...p,
          startDate: parseShortDate(p.startDate),
          endDate: parseShortDate(p.endDate)
        };
        console.log('🔥 Converted period:', p.id, 'startDate:', convertedPeriod.startDate, 'endDate:', convertedPeriod.endDate);
        return convertedPeriod;
      });
      console.log('🔥 All converted maintenance periods:', convertedMaintenancePeriods);
      
      const updateData = { 
        ...editForm,
        startDate: convertedStartDate,
        endDate: convertedEndDate,
        maintenancePeriods: convertedMaintenancePeriods
      };
      console.log('🔥 Final update data:', updateData);
      
      // Формуємо контактну особу з імені та телефону
      if (editForm.contactPersonName || editForm.contactPersonPhone) {
        const contactParts = [];
        if (editForm.contactPersonName?.trim()) {
          contactParts.push(editForm.contactPersonName.trim());
        }
        if (editForm.contactPersonPhone?.trim()) {
          contactParts.push(`(${editForm.contactPersonPhone.trim()})`);
        }
        updateData.contactPerson = contactParts.join(' ');
      } else {
        updateData.contactPerson = '';
      }
      
      // Обробляємо назву об'єкта - створюємо або оновлюємо об'єкт
      if (editForm.objectName) {
        // Знаходимо існуючий об'єкт або створюємо новий
        let targetObject = objects.find(obj => obj.name === editForm.objectName);
        
        if (!targetObject) {
          // Створюємо новий об'єкт
          const newObject = {
            name: editForm.objectName,
            address: editForm.address || '',
            clientName: editForm.clientName || '',
            clientContact: '',
            equipmentCount: 0,
            notes: '',
            contactPersonName: editForm.contactPersonName || undefined,
            contactPersonPhone: editForm.contactPersonPhone || undefined
          };
          
          console.log('🔥 Creating new object:', newObject);
          const createdObject = await addObject(newObject);
          updateData.objectId = createdObject.id;
        } else {
          updateData.objectId = targetObject.id;
        }
        
        delete updateData.objectName;
        delete updateData.contactPersonName;
        delete updateData.contactPersonPhone;
      }
      

      
      await updateContract(contract.id, updateData);
      console.log('🔥 Contract saved successfully, navigating back');
      
      // Повертаємося без алерту для кращого UX
      router.back();
    } catch (error) {
      console.error('Error updating contract:', error);
      Alert.alert('Помилка', 'Не вдалося оновити договір');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!contract) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Договір не знайдено</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#3B82F6" />
          <Text style={styles.backButtonText}>Повернутися</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Редагувати договір'
        }} 
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.content}>
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
            <Text style={styles.formLabel}>Назва об&apos;єкта</Text>
            <TextInput
              style={styles.formInput}
              value={editForm.objectName || ''}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, objectName: text }))}
              placeholder="Введіть назву об'єкта"
              editable={!isSaving}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Контрагент</Text>
            <TextInput
              style={styles.formInput}
              value={editForm.clientName || ''}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, clientName: text }))}
              placeholder="Введіть назву контрагента"
              editable={!isSaving}
            />
          </View>

          <View style={styles.formGroup}>
            <View style={styles.addressHeader}>
              <Text style={styles.formLabel}>Адреса об&apos;єкта</Text>
              {editForm.address && (
                <TouchableOpacity
                  onPress={() => openNavigation(editForm.address!)}
                  style={styles.navigationButton}
                >
                  <Navigation size={16} color="#10B981" />
                  <Text style={styles.navigationButtonText}>Навігація</Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              value={editForm.address || ''}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, address: text }))}
              placeholder="Введіть адресу об'єкта"
              multiline
              numberOfLines={2}
              editable={!isSaving}
            />
          </View>



          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Контактна особа на об&apos;єкті</Text>
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginBottom: 0 }]}>
                <Text style={styles.periodLabel}>Ім&apos;я та прізвище</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.contactPersonName || ''}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, contactPersonName: text }))}
                  placeholder="Введіть ім'я та прізвище"
                  editable={!isSaving}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 12, marginBottom: 0 }]}>
                <Text style={styles.periodLabel}>Номер телефону</Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.contactPersonPhone || ''}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, contactPersonPhone: text }))}
                  placeholder="+380XXXXXXXXX"
                  keyboardType="phone-pad"
                  editable={!isSaving}
                />
              </View>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <DatePicker
                label="Дата початку"
                value={editForm.startDate || ''}
                onDateChange={(date) => {
                  console.log('🔥 Start date changed:', date);
                  setEditForm(prev => ({ ...prev, startDate: date }));
                }}
                placeholder="01.01.25"
                disabled={isSaving}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
              <DatePicker
                label="Дата закінчення"
                value={editForm.endDate || ''}
                onDateChange={(date) => {
                  console.log('🔥 End date changed:', date);
                  setEditForm(prev => ({ ...prev, endDate: date }));
                }}
                placeholder="31.12.25"
                disabled={isSaving}
                minDate={editForm.startDate || undefined}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Періоди технічного обслуговування</Text>
            {(editForm.maintenancePeriods || []).map((period, index) => (
              <View key={period.id} style={styles.maintenancePeriod}>
                <View style={styles.periodHeader}>
                  <Text style={styles.periodTitle}>Період ТО #{index + 1}</Text>
                  {(editForm.maintenancePeriods || []).length > 1 && (
                    <TouchableOpacity
                      onPress={() => {
                        if (isSaving) return;
                        setEditForm(prev => ({
                          ...prev,
                          maintenancePeriods: (prev.maintenancePeriods || []).filter(p => p.id !== period.id)
                        }));
                      }}
                      style={styles.removePeriodButton}
                      disabled={isSaving}
                    >
                      <X size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.periodLabel}>Підрозділи, які виконують ТО</Text>
                  <Text style={styles.helperText}>Можна вибрати один або декілька підрозділів</Text>
                  <View style={styles.departmentSelector}>
                    {(['КОНД', 'ДБЖ', 'ДГУ'] as const).map(dept => {
                      // Міграція старих даних: якщо є department, перетворюємо на departments
                      const currentDepts = period.departments || (period.department ? [period.department] : ['КОНД']);
                      const isSelected = currentDepts.includes(dept);
                      
                      return (
                        <TouchableOpacity
                          key={dept}
                          style={[
                            styles.departmentOption,
                            isSelected && styles.selectedDepartmentOption
                          ]}
                          onPress={() => {
                            if (isSaving) return;
                            setEditForm(prev => ({
                              ...prev,
                              maintenancePeriods: (prev.maintenancePeriods || []).map(p => {
                                if (p.id === period.id) {
                                  const currentDepts = p.departments || (p.department ? [p.department] : ['КОНД']);
                                  const newDepts = isSelected 
                                    ? currentDepts.filter(d => d !== dept)
                                    : [...currentDepts, dept];
                                  return { ...p, departments: newDepts.length > 0 ? newDepts : ['КОНД'], department: undefined };
                                }
                                return p;
                              })
                            }));
                          }}
                          disabled={isSaving}
                        >
                          <View style={[
                            styles.departmentCheckbox,
                            isSelected && styles.selectedDepartmentCheckbox
                          ]}>
                            {isSelected && (
                              <Text style={styles.checkboxText}>✓</Text>
                            )}
                          </View>
                          <Text style={[
                            styles.departmentOptionText,
                            isSelected && styles.selectedDepartmentOptionText
                          ]}>
                            {dept}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                
                <View style={styles.periodDates}>
                  <View style={[styles.formGroup, { flex: 1, marginBottom: 0 }]}>
                    <DatePicker
                      label="Дата початку"
                      value={period.startDate}
                      onDateChange={(date) => {
                        if (isSaving) return;
                        setEditForm(prev => ({
                          ...prev,
                          maintenancePeriods: (prev.maintenancePeriods || []).map(p => 
                            p.id === period.id ? { ...p, startDate: date } : p
                          )
                        }));
                      }}
                      placeholder="01.01.25"
                      disabled={isSaving}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 12, marginBottom: 0 }]}>
                    <DatePicker
                      label="Дата закінчення"
                      value={period.endDate}
                      onDateChange={(date) => {
                        if (isSaving) return;
                        setEditForm(prev => ({
                          ...prev,
                          maintenancePeriods: (prev.maintenancePeriods || []).map(p => 
                            p.id === period.id ? { ...p, endDate: date } : p
                          )
                        }));
                      }}
                      placeholder="31.12.25"
                      disabled={isSaving}
                      minDate={period.startDate || undefined}
                    />
                  </View>
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={styles.addPeriodButton}
              onPress={() => {
                if (isSaving) return;
                const currentPeriods = editForm.maintenancePeriods || [];
                const newId = currentPeriods.length > 0 
                  ? (Math.max(...currentPeriods.map(p => parseInt(p.id))) + 1).toString()
                  : '1';
                setEditForm(prev => ({
                  ...prev,
                  maintenancePeriods: [...currentPeriods, { id: newId, startDate: '', endDate: '', status: 'planned' as const, departments: ['КОНД'] }]
                }));
              }}
              disabled={isSaving}
            >
              <Plus size={16} color="#3B82F6" />
              <Text style={styles.addPeriodText}>Додати період ТО</Text>
            </TouchableOpacity>
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
            <Text style={styles.formLabel}>Типи робіт</Text>
            <View style={styles.workTypeButtons}>
              {['КОНД', 'ДБЖ', 'ДГУ'].map(workType => {
                const isSelected = editForm.workTypes?.includes(workType) || false;
                return (
                  <TouchableOpacity
                    key={workType}
                    style={[
                      styles.workTypeButton,
                      isSelected && styles.workTypeButtonActive
                    ]}
                    onPress={() => {
                      if (isSaving) return;
                      const currentTypes = editForm.workTypes || [];
                      const updatedTypes = isSelected
                        ? currentTypes.filter(t => t !== workType)
                        : [...currentTypes, workType];
                      setEditForm(prev => ({ ...prev, workTypes: updatedTypes }));
                    }}
                    disabled={isSaving}
                  >
                    <Text style={[
                      styles.workTypeButtonText,
                      isSelected && styles.workTypeButtonTextActive
                    ]}>
                      {workType}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Відповідальні інженери</Text>
            <Text style={styles.helperText}>Можна вибрати декількох інженерів{(editForm.workTypes && editForm.workTypes.length > 0) ? ` (фільтр за типами робіт: ${editForm.workTypes.join(', ')})` : ''}</Text>
            <View style={styles.engineerButtons}>
              {engineers
                .filter(engineer => {
                  // Якщо не вибрано типи робіт, показуємо всіх інженерів
                  if (!editForm.workTypes || editForm.workTypes.length === 0) return true;
                  // Показуємо інженерів, у яких є хоча б одна спеціалізація, що збігається з вибраними типами робіт
                  return engineer.specialization.some(spec => editForm.workTypes!.includes(spec));
                })
                .map(engineer => {
                  const isSelected = editForm.assignedEngineerIds?.includes(engineer.id) || false;
                  return (
                    <TouchableOpacity
                      key={engineer.id}
                      style={[
                        styles.engineerButton,
                        isSelected && styles.engineerButtonActive,
                        isSelected && { borderColor: engineer.color }
                      ]}
                      onPress={() => {
                        if (isSaving) return;
                        const currentIds = editForm.assignedEngineerIds || [];
                        const updatedIds = isSelected
                          ? currentIds.filter(id => id !== engineer.id)
                          : [...currentIds, engineer.id];
                        setEditForm(prev => ({ ...prev, assignedEngineerIds: updatedIds }));
                      }}
                      disabled={isSaving}
                    >
                      <View style={[
                        styles.engineerColorDot,
                        { backgroundColor: engineer.color }
                      ]} />
                      <View style={styles.engineerInfo}>
                        <Text style={[
                          styles.engineerButtonText,
                          isSelected && styles.engineerButtonTextActive
                        ]}>
                          {engineer.name}
                        </Text>
                        <Text style={[
                          styles.engineerSpecialization,
                          isSelected && styles.engineerSpecializationSelected
                        ]}>
                          {engineer.specialization.join(', ')}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={styles.selectedIndicator}>
                          <Text style={styles.selectedIndicatorText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              }
              {engineers.filter(engineer => !editForm.workTypes || editForm.workTypes.length === 0 || engineer.specialization.some(spec => editForm.workTypes!.includes(spec))).length === 0 && (
                <View style={styles.noEngineersContainer}>
                  <Text style={styles.noEngineersText}>
                    {(editForm.workTypes && editForm.workTypes.length > 0)
                      ? `Немає інженерів з спеціалізацією: ${editForm.workTypes.join(', ')}`
                      : 'Немає доступних інженерів'
                    }
                  </Text>
                </View>
              )}
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

          <TouchableOpacity 
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSaveContract}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size={20} color="#FFFFFF" />
            ) : (
              <Save size={20} color="#FFFFFF" />
            )}
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Збереження...' : 'Зберегти зміни'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3B82F6',
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
  readOnlyInput: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  maintenancePeriod: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#374151',
  },
  removePeriodButton: {
    padding: 4,
  },
  periodDates: {
    flexDirection: 'row',
  },
  periodLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
    marginBottom: 8,
  },
  addPeriodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 8,
  },
  addPeriodText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#3B82F6',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  workTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  workTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    minWidth: 60,
    alignItems: 'center',
  },
  workTypeButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  workTypeButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  workTypeButtonTextActive: {
    color: '#FFFFFF',
  },
  engineerButtons: {
    gap: 8,
  },
  engineerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  engineerButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  engineerButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  engineerButtonTextActive: {
    color: '#FFFFFF',
  },
  engineerColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  selectedIndicator: {
    marginLeft: 'auto',
    backgroundColor: '#10B981',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  engineerInfo: {
    flex: 1,
  },
  engineerSpecialization: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  engineerSpecializationSelected: {
    color: '#60A5FA',
  },
  noEngineersContainer: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  noEngineersText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  navigationButtonText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500' as const,
  },
  departmentSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  departmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    gap: 8,
    minWidth: 80
  },
  selectedDepartmentOption: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5'
  },
  departmentCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center'
  },
  selectedDepartmentCheckbox: {
    borderColor: '#10B981',
    backgroundColor: '#10B981'
  },
  checkboxText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const
  },
  departmentOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500' as const
  },
  selectedDepartmentOptionText: {
    color: '#059669',
    fontWeight: '600' as const
  }
});