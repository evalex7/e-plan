import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { X, Save, MapPin, Link, FileText, Plus, Navigation, Building, User, Phone } from 'lucide-react-native';
import { useBusinessData, parseShortDate } from '@/hooks/use-business-data';
import DatePicker from '@/components/DatePicker';
import SmartTextInput from '@/components/SmartTextInput';
import type { Contract, MaintenancePeriod } from '@/types/business';

export default function AddContractScreen() {
  const { objects, engineers, addContract, addObject, contracts } = useBusinessData();
  
  // Пропозиції для автозаповнення
  const contractNumberSuggestions = contracts.map(c => c.contractNumber).filter(Boolean);
  const clientNameSuggestions = [...new Set(contracts.map(c => c.clientName).filter(Boolean))];
  const objectNameSuggestions = objects.map(o => o.name).filter(Boolean);
  const addressSuggestions = [...new Set(objects.map(o => o.address).filter(Boolean))];
  
  const [contractNumber, setContractNumber] = useState('');
  const [objectName, setObjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [address, setAddress] = useState('');

  const [mapLink, setMapLink] = useState('');
  const [notes, setNotes] = useState('');
  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [maintenancePeriods, setMaintenancePeriods] = useState<MaintenancePeriod[]>([{ id: '1', startDate: '', endDate: '', status: 'planned', departments: ['КОНД'] }]);
  const [assignedEngineerIds, setAssignedEngineerIds] = useState<string[]>([]);
  const [contactPersonName, setContactPersonName] = useState('');
  const [contactPersonPhone, setContactPersonPhone] = useState('');
  const [equipmentType, setEquipmentType] = useState<'КОНД' | 'ДБЖ' | 'ДГУ' | 'КОМПЛЕКСНЕ'>('КОНД');

  const workTypeOptions = ['КОНД', 'ДБЖ', 'ДГУ'];

  const toggleWorkType = (type: string) => {
    if (!type || type.length > 10) return;
    const sanitized = type.trim();
    
    setWorkTypes(prev => 
      prev.includes(sanitized) 
        ? prev.filter(t => t !== sanitized)
        : [...prev, sanitized]
    );
  };

  const openNavigation = async (address: string) => {
    if (!address?.trim()) {
      Alert.alert('Помилка', 'Адреса не вказана');
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

  const handleSave = async () => {
    console.log('🔥 handleSave called with:', {
      contractNumber,
      objectName,
      clientName,
      startDate,
      endDate
    });
    
    if (!contractNumber || !objectName || !clientName || !startDate || !endDate) {
      Alert.alert('Помилка', 'Будь ласка, заповніть всі обов\'язкові поля');
      return;
    }

    try {
      console.log('🔥 Starting contract creation process...');
      // Спочатку створюємо об'єкт, якщо він не існує
      let targetObjectId = objectName;
      const existingObject = objects.find(obj => obj.name === objectName);
      
      if (!existingObject) {
        // Створюємо новий об'єкт
        const newObject = {
          name: objectName,
          address: address || '',
          clientName: clientName,
          clientContact: '',
          equipmentCount: 0,
          notes: notes || '',
          contactPersonName: contactPersonName || undefined,
          contactPersonPhone: contactPersonPhone || undefined
        };
        
        const createdObject = await addObject(newObject);
        targetObjectId = createdObject.id;
      } else {
        targetObjectId = existingObject.id;
      }

      // Формуємо контактну особу з імені та телефону
      let contactPerson = '';
      if (contactPersonName || contactPersonPhone) {
        const contactParts = [];
        if (contactPersonName?.trim()) {
          contactParts.push(contactPersonName.trim());
        }
        if (contactPersonPhone?.trim()) {
          contactParts.push(`(${contactPersonPhone.trim()})`);
        }
        contactPerson = contactParts.join(' ');
      }

      // Конвертуємо дати з відображуваного формату в ISO формат для збереження
      const convertedStartDate = parseShortDate(startDate);
      const convertedEndDate = parseShortDate(endDate);
      
      const convertedMaintenancePeriods = maintenancePeriods
        .filter(p => p.startDate && p.endDate)
        .map(p => ({
          ...p,
          startDate: parseShortDate(p.startDate),
          endDate: parseShortDate(p.endDate)
        }));

      const newContract: Omit<Contract, 'id'> = {
        contractNumber,
        objectId: targetObjectId,
        clientName,
        startDate: convertedStartDate,
        endDate: convertedEndDate,
        maintenancePeriods: convertedMaintenancePeriods,
        status: 'active',
        address: address || undefined,
        mapLink: mapLink || undefined,
        notes: notes || undefined,
        workTypes: workTypes.length > 0 ? workTypes : undefined,
        contactPerson: contactPerson || undefined,
        assignedEngineerIds: assignedEngineerIds.length > 0 ? assignedEngineerIds : undefined,
        equipmentType
      };

      console.log('🔥 Calling addContract with data:', newContract);
      const result = await addContract(newContract);
      console.log('🔥 Contract created successfully:', result.contractNumber);
      
      Alert.alert(
        'Успіх', 
        `Договір "${result.contractNumber}" успішно створено!`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('🔥 Error creating contract:', error);
      const errorMessage = error instanceof Error ? error.message : 'Не вдалося створити договір';
      Alert.alert('Помилка', errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Новий договір</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Save size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Зберегти</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <SmartTextInput
          label="Номер договору"
          value={contractNumber}
          onChangeText={setContractNumber}
          placeholder="Введіть номер договору"
          suggestions={contractNumberSuggestions}
          required
          icon={<FileText size={16} color="#6B7280" />}
          maxLength={100}
          showCharacterCount
          validationRules={{
            customValidator: (value) => {
              if (value && value.trim() && contracts.some(c => c.contractNumber === value.trim())) {
                return 'Договір з таким номером вже існує';
              }
              return null;
            }
          }}
        />

        <SmartTextInput
          label="Назва об'єкта"
          value={objectName}
          onChangeText={setObjectName}
          placeholder="БЦ Парус, ТРЦ Гулівер..."
          suggestions={objectNameSuggestions}
          required
          icon={<Building size={16} color="#6B7280" />}
          maxLength={100}
          showCharacterCount
          validationRules={{
            minLength: 3
          }}
        />

        <SmartTextInput
          label="Контрагент"
          value={clientName}
          onChangeText={setClientName}
          placeholder="ТОВ Парус, ООО Гулівер..."
          suggestions={clientNameSuggestions}
          required
          icon={<User size={16} color="#6B7280" />}
          maxLength={100}
          showCharacterCount
          validationRules={{
            minLength: 3
          }}
        />

        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <DatePicker
              label="Дата початку *"
              value={startDate}
              onDateChange={setStartDate}
              placeholder="01.01.25"
            />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
            <DatePicker
              label="Дата закінчення *"
              value={endDate}
              onDateChange={setEndDate}
              placeholder="31.12.25"
              minDate={startDate || undefined}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Періоди технічного обслуговування</Text>
          {maintenancePeriods.map((period, index) => (
            <View key={period.id} style={styles.maintenancePeriod}>
              <View style={styles.periodHeader}>
                <Text style={styles.periodTitle}>Період ТО #{index + 1}</Text>
                {maintenancePeriods.length > 1 && (
                  <TouchableOpacity
                    onPress={() => {
                      setMaintenancePeriods(prev => prev.filter(p => p.id !== period.id));
                    }}
                    style={styles.removePeriodButton}
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
                    const isSelected = period.departments?.includes(dept) || false;
                    return (
                      <TouchableOpacity
                        key={dept}
                        style={[
                          styles.departmentOption,
                          isSelected && styles.selectedDepartmentOption
                        ]}
                        onPress={() => {
                          setMaintenancePeriods(prev => 
                            prev.map(p => {
                              if (p.id === period.id) {
                                const currentDepts = p.departments || [];
                                const newDepts = isSelected 
                                  ? currentDepts.filter(d => d !== dept)
                                  : [...currentDepts, dept];
                                return { ...p, departments: newDepts.length > 0 ? newDepts : ['КОНД'] };
                              }
                              return p;
                            })
                          );
                        }}
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
                      setMaintenancePeriods(prev => 
                        prev.map(p => p.id === period.id ? { ...p, startDate: date } : p)
                      );
                    }}
                    placeholder="01.01.25"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 12, marginBottom: 0 }]}>
                  <DatePicker
                    label="Дата закінчення"
                    value={period.endDate}
                    onDateChange={(date) => {
                      setMaintenancePeriods(prev => 
                        prev.map(p => p.id === period.id ? { ...p, endDate: date } : p)
                      );
                    }}
                    placeholder="31.12.25"
                    minDate={period.startDate || undefined}
                  />
                </View>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addPeriodButton}
            onPress={() => {
              const newId = (Math.max(...maintenancePeriods.map(p => parseInt(p.id))) + 1).toString();
              setMaintenancePeriods(prev => [...prev, { id: newId, startDate: '', endDate: '', status: 'planned', departments: ['КОНД'] }]);
            }}
          >
            <Plus size={16} color="#3B82F6" />
            <Text style={styles.addPeriodText}>Додати період ТО</Text>
          </TouchableOpacity>
        </View>



        <View style={styles.formGroup}>
          <View style={styles.addressHeader}>
            <Text style={styles.label}>Поштова адреса об'єкта</Text>
            {address && (
              <TouchableOpacity
                onPress={() => openNavigation(address)}
                style={styles.navigationButton}
              >
                <Navigation size={16} color="#10B981" />
                <Text style={styles.navigationButtonText}>Навігація</Text>
              </TouchableOpacity>
            )}
          </View>
          <SmartTextInput
            label=""
            value={address}
            onChangeText={setAddress}
            placeholder="вул. Мечникова, 2, Київ, 01601"
            suggestions={addressSuggestions}
            icon={<MapPin size={16} color="#6B7280" />}
            multiline
            numberOfLines={2}
            maxLength={200}
            showCharacterCount
          />
        </View>



        <SmartTextInput
          label="Посилання на карту"
          value={mapLink}
          onChangeText={setMapLink}
          placeholder="https://maps.google.com/..."
          icon={<Link size={16} color="#6B7280" />}
          keyboardType="url"
          maxLength={500}
          autoCapitalize="none"
          validationRules={{
            pattern: /^https?:\/\/.+/,
            customValidator: (value) => {
              if (value && !value.includes('maps')) {
                return 'Посилання повинно вести на карту';
              }
              return null;
            }
          }}
        />

        <View style={styles.formGroup}>
          <Text style={styles.label}>Контактна особа на об’єкті</Text>
          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginBottom: 0 }]}>
              <SmartTextInput
                label="Ім'я та прізвище"
                value={contactPersonName}
                onChangeText={setContactPersonName}
                placeholder="Петро Іванов"
                icon={<User size={16} color="#6B7280" />}
                maxLength={50}
                autoCapitalize="words"
              />
            </View>
            <View style={[styles.formGroup, { flex: 1, marginLeft: 12, marginBottom: 0 }]}>
              <SmartTextInput
                label="Номер телефону"
                value={contactPersonPhone}
                onChangeText={setContactPersonPhone}
                placeholder="+380501234567"
                icon={<Phone size={16} color="#6B7280" />}
                keyboardType="phone-pad"
                maxLength={15}
                validationRules={{
                  pattern: /^\+?[0-9\s\-\(\)]+$/,
                  customValidator: (value) => {
                    if (value && value.length < 10) {
                      return 'Номер телефону занадто короткий';
                    }
                    return null;
                  }
                }}
              />
            </View>
          </View>
        </View>



        <View style={styles.formGroup}>
          <Text style={styles.label}>Відповідальні інженери</Text>
          <Text style={styles.helperText}>Можна вибрати декількох інженерів{workTypes.length > 0 ? ` (фільтр за типами робіт: ${workTypes.join(', ')})` : ''}</Text>
          <View style={styles.engineerOptions}>
            {engineers
              .filter(engineer => {
                // Якщо не вибрано типи робіт, показуємо всіх інженерів
                if (workTypes.length === 0) return true;
                // Показуємо інженерів, у яких є хоча б одна спеціалізація, що збігається з вибраними типами робіт
                return engineer.specialization.some(spec => {
                  if (!spec || spec.length > 10) return false;
                  return workTypes.includes(spec.trim());
                });
              })
              .map(engineer => {
                const isSelected = assignedEngineerIds.includes(engineer.id);
                return (
                  <TouchableOpacity
                    key={engineer.id}
                    style={[
                      styles.engineerOption,
                      isSelected && styles.engineerOptionSelected,
                      isSelected && { borderColor: engineer.color }
                    ]}
                    onPress={() => {
                      setAssignedEngineerIds(prev => 
                        isSelected 
                          ? prev.filter(id => id !== engineer.id)
                          : [...prev, engineer.id]
                      );
                    }}
                  >
                    <View style={[
                      styles.engineerColorDot,
                      { backgroundColor: engineer.color }
                    ]} />
                    <View style={styles.engineerInfo}>
                      <Text style={[
                        styles.engineerText,
                        isSelected && styles.engineerTextSelected
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
            {engineers.filter(engineer => workTypes.length === 0 || engineer.specialization.some(spec => {
              if (!spec || spec.length > 10) return false;
              return workTypes.includes(spec.trim());
            })).length === 0 && (
              <View style={styles.noEngineersContainer}>
                <Text style={styles.noEngineersText}>
                  {workTypes.length > 0 
                    ? `Немає інженерів з спеціалізацією: ${workTypes.join(', ')}`
                    : 'Немає доступних інженерів'
                  }
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Тип обладнання/підрозділ</Text>
          <Text style={styles.helperText}>Оберіть основний тип обладнання для договору</Text>
          <View style={styles.equipmentTypeSelector}>
            {(['КОНД', 'ДБЖ', 'ДГУ', 'КОМПЛЕКСНЕ'] as const).map(type => {
              const typeLabels = {
                'КОНД': 'Кондиціонери',
                'ДБЖ': 'Джерела безперебійного живлення',
                'ДГУ': 'Дизель-генераторні установки',
                'КОМПЛЕКСНЕ': 'Комплексне обслуговування'
              };
              
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.equipmentTypeOption,
                    equipmentType === type && styles.selectedEquipmentTypeOption
                  ]}
                  onPress={() => setEquipmentType(type)}
                >
                  <View style={[
                    styles.equipmentTypeRadio,
                    equipmentType === type && styles.selectedEquipmentTypeRadio
                  ]} />
                  <View style={styles.equipmentTypeInfo}>
                    <Text style={[
                      styles.equipmentTypeOptionText,
                      equipmentType === type && styles.selectedEquipmentTypeOptionText
                    ]}>
                      {type}
                    </Text>
                    <Text style={styles.equipmentTypeDescription}>
                      {typeLabels[type]}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Види робіт</Text>
          <View style={styles.workTypesContainer}>
            {workTypeOptions.map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.workTypeOption,
                  workTypes.includes(type) && styles.workTypeOptionSelected
                ]}
                onPress={() => {
                  if (!type || type.length > 10) return;
                  toggleWorkType(type.trim());
                }}
              >
                <Text style={[
                  styles.workTypeText,
                  workTypes.includes(type) && styles.workTypeTextSelected
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <SmartTextInput
          label="Примітки"
          value={notes}
          onChangeText={setNotes}
          placeholder="Додаткова інформація про об'єкт або договір"
          icon={<FileText size={16} color="#6B7280" />}
          multiline
          numberOfLines={3}
          maxLength={500}
          showCharacterCount
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600' as const,
    textAlign: 'center',
    color: '#111827',
    marginHorizontal: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  form: {
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
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    minHeight: 20,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  objectsList: {
    flexDirection: 'row',
  },
  objectCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    minWidth: 160,
  },
  objectCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  objectName: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#111827',
  },
  objectNameSelected: {
    color: '#1E40AF',
  },
  objectAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  objectAddressSelected: {
    color: '#3B82F6',
  },
  objectNotes: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
    fontStyle: 'italic',
  },
  objectNotesSelected: {
    color: '#60A5FA',
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
  workTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  workTypeOption: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  workTypeOptionSelected: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  workTypeText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500' as const,
  },
  workTypeTextSelected: {
    color: '#059669',
    fontWeight: '600' as const,
  },
  engineerOptions: {
    gap: 8,
  },
  engineerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  engineerOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  engineerText: {
    fontSize: 14,
    color: '#374151',
  },
  engineerTextSelected: {
    color: '#1E40AF',
    fontWeight: '500' as const,
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
  equipmentTypeSelector: {
    gap: 12
  },
  equipmentTypeOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    gap: 16
  },
  selectedEquipmentTypeOption: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F3F4F6'
  },
  equipmentTypeRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginTop: 2
  },
  selectedEquipmentTypeRadio: {
    borderColor: '#8B5CF6',
    backgroundColor: '#8B5CF6'
  },
  equipmentTypeInfo: {
    flex: 1
  },
  equipmentTypeOptionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600' as const,
    marginBottom: 4
  },
  selectedEquipmentTypeOptionText: {
    color: '#8B5CF6',
    fontWeight: '700' as const
  },
  equipmentTypeDescription: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400' as const
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