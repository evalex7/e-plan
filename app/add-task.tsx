import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { X, Save } from 'lucide-react-native';
import { useBusinessData, formatDateInput, parseShortDate } from '@/hooks/use-business-data';
import type { MaintenanceTask } from '@/types/business';

export default function AddTaskScreen() {
  const { contracts, objects, engineers, addTask } = useBusinessData();
  
  const [selectedContract, setSelectedContract] = useState('');
  const [selectedEngineer, setSelectedEngineer] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [taskType, setTaskType] = useState<MaintenanceTask['type']>('routine');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');

  const taskTypes: { value: MaintenanceTask['type']; label: string }[] = [
    { value: 'routine', label: 'Планове' },
    { value: 'emergency', label: 'Аварійне' },
    { value: 'seasonal', label: 'Сезонне' },
    { value: 'diagnostic', label: 'Діагностика' }
  ];

  const handleSave = async () => {
    if (!selectedContract || !selectedEngineer || !scheduledDate || !duration) {
      Alert.alert('Помилка', 'Будь ласка, заповніть всі обов\'язкові поля');
      return;
    }

    const contract = contracts.find(c => c.id === selectedContract);
    if (!contract) return;

    const newTask: Omit<MaintenanceTask, 'id'> = {
      contractId: selectedContract,
      objectId: contract.objectId,
      engineerId: selectedEngineer,
      scheduledDate: parseShortDate(scheduledDate),
      type: taskType,
      status: 'planned',
      duration: parseFloat(duration),
      notes: notes || undefined
    };

    await addTask(newTask);
    router.back();
  };

  const getObject = (objectId: string) => objects.find(o => o.id === objectId);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Нове обслуговування</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Save size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Зберегти</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Договір *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contractsList}>
            {contracts.filter(c => c.status === 'active').map(contract => {
              const object = getObject(contract.objectId);
              return (
                <TouchableOpacity
                  key={contract.id}
                  style={[
                    styles.contractCard,
                    selectedContract === contract.id && styles.contractCardSelected
                  ]}
                  onPress={() => setSelectedContract(contract.id)}
                >
                  <Text style={[
                    styles.contractNumber,
                    selectedContract === contract.id && styles.contractNumberSelected
                  ]}>
                    {contract.contractNumber}
                  </Text>
                  <Text style={[
                    styles.contractObject,
                    selectedContract === contract.id && styles.contractObjectSelected
                  ]}>
                    {object?.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Інженер *</Text>
          <View style={styles.engineersList}>
            {engineers.map(engineer => (
              <TouchableOpacity
                key={engineer.id}
                style={[
                  styles.engineerCard,
                  selectedEngineer === engineer.id && styles.engineerCardSelected
                ]}
                onPress={() => setSelectedEngineer(engineer.id)}
              >
                <View style={[styles.engineerDot, { backgroundColor: engineer.color }]} />
                <View style={styles.engineerInfo}>
                  <Text style={[
                    styles.engineerName,
                    selectedEngineer === engineer.id && styles.engineerNameSelected
                  ]}>
                    {engineer.name}
                  </Text>
                  <Text style={[
                    styles.engineerSpec,
                    selectedEngineer === engineer.id && styles.engineerSpecSelected
                  ]}>
                    {engineer.specialization}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Дата проведення *</Text>
          <TextInput
            style={styles.input}
            value={scheduledDate}
            onChangeText={(text) => {
              const formatted = formatDateInput(text);
              setScheduledDate(formatted);
            }}
            placeholder="01.01.25"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            maxLength={8}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Тип обслуговування *</Text>
          <View style={styles.typeOptions}>
            {taskTypes.map(type => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeOption,
                  taskType === type.value && styles.typeOptionSelected
                ]}
                onPress={() => setTaskType(type.value)}
              >
                <Text style={[
                  styles.typeText,
                  taskType === type.value && styles.typeTextSelected
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Тривалість (годин) *</Text>
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={setDuration}
            placeholder="0"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Примітки</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Додаткова інформація..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  textArea: {
    minHeight: 100,
    paddingTop: 10,
  },
  contractsList: {
    flexDirection: 'row',
  },
  contractCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    minWidth: 150,
  },
  contractCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  contractNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#111827',
  },
  contractNumberSelected: {
    color: '#1E40AF',
  },
  contractObject: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  contractObjectSelected: {
    color: '#3B82F6',
  },
  engineersList: {
    gap: 10,
  },
  engineerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  engineerCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  engineerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  engineerInfo: {
    flex: 1,
  },
  engineerName: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#111827',
  },
  engineerNameSelected: {
    color: '#1E40AF',
  },
  engineerSpec: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  engineerSpecSelected: {
    color: '#3B82F6',
  },
  typeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typeOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  typeText: {
    fontSize: 14,
    color: '#374151',
  },
  typeTextSelected: {
    color: '#1E40AF',
    fontWeight: '500' as const,
  },
});