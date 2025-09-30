import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Save, Clock, FileText, AlertTriangle, Lightbulb, Package, Settings } from 'lucide-react-native';
import { useBusinessData, formatDateDisplay } from '@/hooks/use-business-data';
import DatePicker from '@/components/DatePicker';

export default function CreateMaintenanceReportScreen() {
  const { contractId } = useLocalSearchParams<{
    contractId: string;
  }>();
  
  const { contracts, engineers, createMaintenanceReport } = useBusinessData();
  
  const contract = contracts.find(c => c.id === contractId);
  const assignedEngineers = contract?.assignedEngineerIds?.map(id => engineers.find(e => e.id === id)).filter(Boolean) || [];
  const primaryEngineer = assignedEngineers[0];
  
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().split('T')[0]);
  const [actualStartTime, setActualStartTime] = useState('09:00');
  const [actualEndTime, setActualEndTime] = useState('17:00');
  const [selectedEngineerId, setSelectedEngineerId] = useState(primaryEngineer?.id || '');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<'КОНД' | 'ДБЖ' | 'ДГУ' | 'КОМПЛЕКСНЕ'>(contract?.equipmentType || 'КОНД');
  const [workDescription, setWorkDescription] = useState('');
  const [issues, setIssues] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState('');
  const [nextMaintenanceNotes, setNextMaintenanceNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  if (!contract) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Помилка' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Договір не знайдено</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  const handleSave = async () => {
    if (!workDescription.trim()) {
      Alert.alert('Помилка', 'Будь ласка, опишіть виконані роботи');
      return;
    }
    
    if (!issues.trim()) {
      Alert.alert('Помилка', 'Будь ласка, вкажіть виявлені проблеми або нюанси');
      return;
    }
    
    if (!selectedEngineerId) {
      Alert.alert('Помилка', 'Будь ласка, оберіть інженера');
      return;
    }
    
    try {
      setIsLoading(true);
      await createMaintenanceReport({
        contractId: contract.id,
        engineerId: selectedEngineerId,
        completedDate,
        actualStartTime,
        actualEndTime,
        workDescription: workDescription.trim(),
        issues: issues.trim(),
        recommendations: recommendations.trim(),
        materialsUsed: materialsUsed.trim(),
        nextMaintenanceNotes: nextMaintenanceNotes.trim(),
        equipmentType: selectedEquipmentType,
        maintenancePeriodId: selectedPeriodId || undefined
      });
      
      Alert.alert(
        'Успіх',
        'Звіт про виконання ТО успішно створено',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error creating maintenance report:', error);
      Alert.alert('Помилка', 'Не вдалося зберегти звіт');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Звіт про виконання ТО',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <ArrowLeft size={24} color="#007AFF" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity 
              onPress={handleSave}
              style={[styles.headerButton, { opacity: isLoading ? 0.5 : 1 }]}
              disabled={isLoading}
            >
              <Save size={24} color="#007AFF" />
            </TouchableOpacity>
          )
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Інформація про договір */}
          <View style={styles.contractInfo}>
            <Text style={styles.contractTitle}>Звіт про виконання ТО</Text>
            <Text style={styles.contractNumber}>{contract.contractNumber}</Text>
            <Text style={styles.contractClient}>{contract.clientName}</Text>
            <Text style={styles.contractPeriod}>
              Період договору: {formatDateDisplay(contract.startDate)} - {formatDateDisplay(contract.endDate)}
            </Text>
            {contract.workTypes && contract.workTypes.length > 0 && (
              <Text style={styles.workTypes}>
                Види робіт: {contract.workTypes.join(', ')}
              </Text>
            )}
          </View>
          
          {/* Тип обладнання/підрозділ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Тип обладнання/підрозділ</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Оберіть тип обладнання, яке обслуговувалось</Text>
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
                        selectedEquipmentType === type && styles.selectedEquipmentTypeOption
                      ]}
                      onPress={() => setSelectedEquipmentType(type)}
                    >
                      <View style={[
                        styles.equipmentTypeRadio,
                        selectedEquipmentType === type && styles.selectedEquipmentTypeRadio
                      ]} />
                      <View style={styles.equipmentTypeInfo}>
                        <Text style={[
                          styles.equipmentTypeOptionText,
                          selectedEquipmentType === type && styles.selectedEquipmentTypeOptionText
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
          </View>
          
          {/* Дата та час виконання */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Дата та час виконання</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Дата виконання робіт ТО</Text>
              <View style={styles.dateInput}>
                <DatePicker
                  label="Дата виконання ТО"
                  value={completedDate}
                  onDateChange={setCompletedDate}
                  placeholder="Оберіть дату виконання ТО"
                />
              </View>
            </View>
            
            {/* Вибір періоду ТО */}
            {contract.maintenancePeriods && contract.maintenancePeriods.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Період ТО (опціонально)</Text>
                <Text style={styles.inputHint}>
                  Оберіть період, якщо ТО виконувалось в межах запланованого періоду
                </Text>
                <View style={styles.periodSelector}>
                  <TouchableOpacity
                    style={[
                      styles.periodOption,
                      !selectedPeriodId && styles.selectedPeriodOption
                    ]}
                    onPress={() => setSelectedPeriodId('')}
                  >
                    <View style={[
                      styles.periodRadio,
                      !selectedPeriodId && styles.selectedPeriodRadio
                    ]} />
                    <Text style={[
                      styles.periodOptionText,
                      !selectedPeriodId && styles.selectedPeriodOptionText
                    ]}>
                      Позапланове ТО (не прив&apos;язане до періоду)
                    </Text>
                  </TouchableOpacity>
                  
                  {contract.maintenancePeriods.map((period, index) => {
                    const today = new Date();
                    const periodStart = new Date(period.startDate);
                    const periodEnd = new Date(period.endDate);
                    const isCurrentPeriod = today >= periodStart && today <= periodEnd;
                    const isPastPeriod = periodEnd < today;
                    
                    return (
                      <TouchableOpacity
                        key={period.id}
                        style={[
                          styles.periodOption,
                          selectedPeriodId === period.id && styles.selectedPeriodOption,
                          isCurrentPeriod && styles.currentPeriodOption,
                          isPastPeriod && styles.pastPeriodOption
                        ]}
                        onPress={() => setSelectedPeriodId(period.id)}
                      >
                        <View style={[
                          styles.periodRadio,
                          selectedPeriodId === period.id && styles.selectedPeriodRadio
                        ]} />
                        <View style={styles.periodInfo}>
                          <Text style={[
                            styles.periodOptionText,
                            selectedPeriodId === period.id && styles.selectedPeriodOptionText
                          ]}>
                            Період {index + 1}: {formatDateDisplay(period.startDate)} - {formatDateDisplay(period.endDate)}
                          </Text>
                          {isCurrentPeriod && (
                            <Text style={styles.periodStatusText}>Поточний період</Text>
                          )}
                          {isPastPeriod && (
                            <Text style={styles.periodStatusTextPast}>Минулий період</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
            
            {/* Вибір інженера */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Інженер, який виконував роботи</Text>
              <View style={styles.engineerSelector}>
                {assignedEngineers.map(engineer => (
                  <TouchableOpacity
                    key={engineer?.id}
                    style={[
                      styles.engineerOption,
                      selectedEngineerId === engineer?.id && styles.selectedEngineerOption
                    ]}
                    onPress={() => setSelectedEngineerId(engineer?.id || '')}
                  >
                    <View style={[
                      styles.engineerRadio,
                      selectedEngineerId === engineer?.id && styles.selectedEngineerRadio
                    ]} />
                    <Text style={[
                      styles.engineerOptionText,
                      selectedEngineerId === engineer?.id && styles.selectedEngineerOptionText
                    ]}>
                      {engineer?.name || 'Невідомий інженер'}
                    </Text>
                  </TouchableOpacity>
                ))}
                {assignedEngineers.length === 0 && (
                  <Text style={styles.noEngineersText}>
                    До договору не призначено інженерів
                  </Text>
                )}
              </View>
            </View>
            
            <View style={styles.timeRow}>
              <View style={styles.timeItem}>
                <Text style={styles.inputLabel}>Час початку</Text>
                <View style={styles.inputContainer}>
                  <Clock size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={actualStartTime}
                    onChangeText={setActualStartTime}
                    placeholder="09:00"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
              
              <View style={styles.timeItem}>
                <Text style={styles.inputLabel}>Час закінчення</Text>
                <View style={styles.inputContainer}>
                  <Clock size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={actualEndTime}
                    onChangeText={setActualEndTime}
                    placeholder="17:00"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
            </View>
          </View>
          
          {/* Опис виконаних робіт */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Опис виконаних робіт</Text>
            <View style={styles.textAreaContainer}>
              <FileText size={20} color="#666" style={styles.textAreaIcon} />
              <TextInput
                style={styles.textArea}
                value={workDescription}
                onChangeText={setWorkDescription}
                placeholder="Детально опишіть виконані роботи..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
          
          {/* Виявлені проблеми та нюанси */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Виявлені проблеми та нюанси</Text>
            <View style={styles.textAreaContainer}>
              <AlertTriangle size={20} color="#F59E0B" style={styles.textAreaIcon} />
              <TextInput
                style={styles.textArea}
                value={issues}
                onChangeText={setIssues}
                placeholder="Опишіть виявлені проблеми, несправності або особливості..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
          
          {/* Рекомендації для наступного ТО */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Рекомендації для наступного ТО</Text>
            <View style={styles.textAreaContainer}>
              <Lightbulb size={20} color="#10B981" style={styles.textAreaIcon} />
              <TextInput
                style={styles.textArea}
                value={recommendations}
                onChangeText={setRecommendations}
                placeholder="Рекомендації та поради для наступного технічного обслуговування..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
          
          {/* Використані матеріали */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Використані матеріали (опціонально)</Text>
            <View style={styles.textAreaContainer}>
              <Package size={20} color="#6366F1" style={styles.textAreaIcon} />
              <TextInput
                style={styles.textArea}
                value={materialsUsed}
                onChangeText={setMaterialsUsed}
                placeholder="Перелік використаних матеріалів, запчастин, витратних матеріалів..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
          
          {/* Особливі примітки */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Особливі примітки для наступного ТО (опціонально)</Text>
            <View style={styles.textAreaContainer}>
              <FileText size={20} color="#8B5CF6" style={styles.textAreaIcon} />
              <TextInput
                style={styles.textArea}
                value={nextMaintenanceNotes}
                onChangeText={setNextMaintenanceNotes}
                placeholder="Особливі примітки, які будуть корисні при наступному ТО..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
          
          {/* Кнопка збереження */}
          <TouchableOpacity 
            style={[styles.saveButton, { opacity: isLoading ? 0.5 : 1 }]}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Save size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Збереження...' : 'Зберегти звіт'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  headerButton: {
    padding: 8
  },
  scrollView: {
    flex: 1
  },
  content: {
    padding: 20,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  contractInfo: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  contractTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10
  },
  contractNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6
  },
  contractClient: {
    fontSize: 18,
    color: '#374151',
    marginBottom: 6
  },
  contractPeriod: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 6
  },
  workTypes: {
    fontSize: 16,
    color: '#6B7280'
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16
  },
  inputGroup: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 10
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  timeItem: {
    flex: 1,
    marginHorizontal: 4
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF'
  },
  inputIcon: {
    marginLeft: 12
  },
  textInput: {
    flex: 1,
    padding: 16,
    fontSize: 18,
    color: '#1F2937'
  },
  textAreaContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'flex-start'
  },
  textAreaIcon: {
    marginLeft: 12,
    marginTop: 12
  },
  textArea: {
    flex: 1,
    padding: 16,
    fontSize: 18,
    color: '#1F2937',
    minHeight: 120,
    lineHeight: 24
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 20,
    borderRadius: 12,
    marginTop: 16
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8
  },
  engineerSelector: {
    gap: 12
  },
  engineerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    gap: 16
  },
  selectedEngineerOption: {
    borderColor: '#3B82F6',
    backgroundColor: '#EBF4FF'
  },
  engineerRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB'
  },
  selectedEngineerRadio: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6'
  },
  engineerOptionText: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '500'
  },
  selectedEngineerOptionText: {
    color: '#3B82F6',
    fontWeight: '600'
  },
  noEngineersText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16
  },
  inputHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
    lineHeight: 16
  },
  periodSelector: {
    gap: 8
  },
  periodOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    gap: 16
  },
  selectedPeriodOption: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4'
  },
  currentPeriodOption: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB'
  },
  pastPeriodOption: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2'
  },
  periodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginTop: 2
  },
  selectedPeriodRadio: {
    borderColor: '#10B981',
    backgroundColor: '#10B981'
  },
  periodInfo: {
    flex: 1
  },
  periodOptionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500' as const,
    marginBottom: 4
  },
  selectedPeriodOptionText: {
    color: '#10B981',
    fontWeight: '600' as const
  },
  periodStatusText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500' as const
  },
  periodStatusTextPast: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500' as const
  },
  equipmentTypeSelector: {
    gap: 12
  },
  equipmentTypeOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
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
    borderColor: '#D1D5DB',
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
    fontSize: 18,
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
  }
});