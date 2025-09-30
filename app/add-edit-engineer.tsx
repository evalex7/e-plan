import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Save } from 'lucide-react-native';
import { useBusinessData } from '@/hooks/use-business-data';
import type { ServiceEngineer } from '@/types/business';

const AVAILABLE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

export default function AddEditEngineerScreen() {
  const router = useRouter();
  const { engineerId } = useLocalSearchParams();
  const { engineers, addEngineer, updateEngineer } = useBusinessData();
  
  const existingEngineer = engineerId ? engineers.find(e => e.id === engineerId) : null;
  
  const [formData, setFormData] = useState({
    name: existingEngineer?.name || '',
    phone: existingEngineer?.phone || '',
    email: existingEngineer?.email || '',
    specialization: existingEngineer?.specialization || [],
    color: existingEngineer?.color || AVAILABLE_COLORS[0]
  });

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.phone.trim() || formData.specialization.length === 0) {
      Alert.alert('Помилка', 'Заповніть обов\'язкові поля: ім\'я, телефон та спеціалізація');
      return;
    }

    try {
      if (existingEngineer) {
        await updateEngineer(existingEngineer.id, formData);
      } else {
        await addEngineer(formData);
      }
      router.back();
    } catch (error) {
      console.error('Error saving engineer:', error);
      Alert.alert('Помилка', 'Не вдалося зберегти інженера');
    }
  };

  const renderColorPicker = () => (
    <View style={styles.colorPickerContainer}>
      <Text style={styles.fieldLabel}>Колір для візуалізації</Text>
      <View style={styles.colorPicker}>
        {AVAILABLE_COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              formData.color === color && styles.selectedColor
            ]}
            onPress={() => setFormData({ ...formData, color })}
          />
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: existingEngineer ? 'Редагувати інженера' : 'Новий інженер',
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Save size={24} color="#3B82F6" />
            </TouchableOpacity>
          )
        }} 
      />

      <ScrollView style={styles.content}>
        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Ім&apos;я та прізвище *</Text>
          <TextInput
            style={styles.textInput}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Введіть ім'я та прізвище"
            testID="engineer-name-input"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Телефон *</Text>
          <TextInput
            style={styles.textInput}
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            placeholder="+380XXXXXXXXX"
            keyboardType="phone-pad"
            testID="engineer-phone-input"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.textInput}
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="engineer@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            testID="engineer-email-input"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Спеціалізація * (можна вибрати кілька)</Text>
          <View style={styles.specializationContainer}>
            {['КОНД', 'ДБЖ', 'ДГУ'].map(spec => {
              const isSelected = formData.specialization.includes(spec);
              return (
                <TouchableOpacity
                  key={spec}
                  style={[
                    styles.specializationOption,
                    isSelected && styles.specializationOptionSelected
                  ]}
                  onPress={() => {
                    const newSpecializations = isSelected 
                      ? formData.specialization.filter(s => s !== spec)
                      : [...formData.specialization, spec];
                    setFormData({ ...formData, specialization: newSpecializations });
                  }}
                  testID={`specialization-${spec}`}
                >
                  <Text style={[
                    styles.specializationText,
                    isSelected && styles.specializationTextSelected
                  ]}>
                    {spec}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {formData.specialization.length > 0 && (
            <Text style={styles.selectedSpecializations}>
              Вибрано: {formData.specialization.join(', ')}
            </Text>
          )}
        </View>

        {renderColorPicker()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  saveButton: {
    padding: 8
  },
  content: {
    flex: 1,
    padding: 16
  },
  formGroup: {
    marginBottom: 20
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 8
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF'
  },
  colorPickerContainer: {
    marginBottom: 20
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  selectedColor: {
    borderColor: '#374151',
    borderWidth: 3
  },
  specializationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  specializationOption: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 80,
    alignItems: 'center'
  },
  specializationOptionSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981'
  },
  specializationText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151'
  },
  specializationTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600' as const
  },
  selectedSpecializations: {
    marginTop: 8,
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500' as const
  }
});