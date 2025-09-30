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
import { ArrowLeft, Save, User } from 'lucide-react-native';
import { useBusinessData, formatDateDisplay, parseDate } from '@/hooks/use-business-data';
import DatePicker from '@/components/DatePicker';

export default function AdjustMaintenancePeriodScreen() {
  const { contractId, periodId } = useLocalSearchParams<{
    contractId: string;
    periodId: string;
  }>();
  
  const { contracts, adjustMaintenancePeriod } = useBusinessData();
  
  const contract = contracts.find(c => c.id === contractId);
  const period = contract?.maintenancePeriods?.find(p => p.id === periodId);
  
  const [adjustedStartDate, setAdjustedStartDate] = useState(
    period?.adjustedStartDate || period?.startDate || ''
  );
  const [adjustedEndDate, setAdjustedEndDate] = useState(
    period?.adjustedEndDate || period?.endDate || ''
  );
  const [adjustedBy, setAdjustedBy] = useState('Начальник');
  const [isLoading, setIsLoading] = useState(false);
  
  if (!contract || !period) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Помилка' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Договір або період ТО не знайдено</Text>
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
    if (!adjustedStartDate || !adjustedEndDate) {
      Alert.alert('Помилка', 'Будь ласка, заповніть всі дати');
      return;
    }
    
    const startDateObj = new Date(parseDate(adjustedStartDate));
    const endDateObj = new Date(parseDate(adjustedEndDate));
    
    if (startDateObj >= endDateObj) {
      Alert.alert('Помилка', 'Дата початку повинна бути раніше дати закінчення');
      return;
    }
    
    try {
      setIsLoading(true);
      await adjustMaintenancePeriod(
        contractId!,
        periodId!,
        parseDate(adjustedStartDate),
        parseDate(adjustedEndDate),
        adjustedBy
      );
      
      Alert.alert(
        'Успіх',
        'Дати періоду ТО успішно скориговано',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error adjusting maintenance period:', error);
      Alert.alert('Помилка', 'Не вдалося зберегти зміни');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Коригування дат ТО',
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
            <Text style={styles.contractTitle}>{contract.contractNumber}</Text>
            <Text style={styles.contractClient}>{contract.clientName}</Text>
            <Text style={styles.contractAddress}>{contract.address}</Text>
          </View>
          
          {/* Поточні дати */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Поточні дати (з договору)</Text>
            <View style={styles.dateRow}>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Початок:</Text>
                <Text style={styles.dateValue}>{formatDateDisplay(period.startDate)}</Text>
              </View>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Закінчення:</Text>
                <Text style={styles.dateValue}>{formatDateDisplay(period.endDate)}</Text>
              </View>
            </View>
          </View>
          
          {/* Скориговані дати */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Скориговані дати</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Дата початку робіт</Text>
              <View style={styles.dateInput}>
                <DatePicker
                  label="Дата початку робіт"
                  value={adjustedStartDate}
                  onDateChange={setAdjustedStartDate}
                  placeholder="Оберіть дату початку"
                />
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Дата закінчення робіт</Text>
              <View style={styles.dateInput}>
                <DatePicker
                  label="Дата закінчення робіт"
                  value={adjustedEndDate}
                  onDateChange={setAdjustedEndDate}
                  placeholder="Оберіть дату закінчення"
                />
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Хто вніс корективи</Text>
              <View style={styles.inputContainer}>
                <User size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={adjustedBy}
                  onChangeText={setAdjustedBy}
                  placeholder="Введіть ім'я"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>
          
          {/* Статус */}
          {period.status !== 'planned' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Статус періоду</Text>
              <View style={[styles.statusBadge, styles[`status_${period.status}`]]}>
                <Text style={styles.statusText}>
                  {period.status === 'adjusted' && 'Скориговано'}
                  {period.status === 'in_progress' && 'Виконується'}
                  {period.status === 'completed' && 'Завершено'}
                </Text>
              </View>
              
              {period.adjustedDate && (
                <Text style={styles.adjustedInfo}>
                  Скориговано {formatDateDisplay(period.adjustedDate)}
                  {period.adjustedBy && ` користувачем ${period.adjustedBy}`}
                </Text>
              )}
            </View>
          )}
          
          {/* Кнопка збереження */}
          <TouchableOpacity 
            style={[styles.saveButton, { opacity: isLoading ? 0.5 : 1 }]}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Save size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Збереження...' : 'Зберегти корективи'}
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
    padding: 16
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  contractTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4
  },
  contractClient: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4
  },
  contractAddress: {
    fontSize: 14,
    color: '#6B7280'
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  dateItem: {
    flex: 1,
    marginHorizontal: 4
  },
  dateLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    textAlign: 'center'
  },
  inputGroup: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8
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
    padding: 12,
    fontSize: 16,
    color: '#1F2937'
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8
  },
  status_planned: {
    backgroundColor: '#E5E7EB'
  },
  status_adjusted: {
    backgroundColor: '#FEF3C7'
  },
  status_in_progress: {
    backgroundColor: '#DBEAFE'
  },
  status_completed: {
    backgroundColor: '#D1FAE5'
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937'
  },
  adjustedInfo: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic'
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  }
});