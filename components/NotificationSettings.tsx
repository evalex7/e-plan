import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Settings, Bell, Clock, AlertTriangle, FileText, Moon, Volume2, Vibrate } from 'lucide-react-native';
import type { NotificationSettings } from '@/types/business';
import { useNotifications } from '@/hooks/use-notifications';

interface SettingsSectionProps {
  title: string;
  icon: React.ComponentType<any>;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, icon: Icon, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Icon size={20} color="#3B82F6" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionContent}>
      {children}
    </View>
  </View>
);

interface SettingRowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({ 
  title, 
  subtitle, 
  value, 
  onValueChange, 
  disabled = false 
}) => (
  <View style={[styles.settingRow, disabled && styles.disabledRow]}>
    <View style={styles.settingText}>
      <Text style={[styles.settingTitle, disabled && styles.disabledText]}>
        {title}
      </Text>
      {subtitle && (
        <Text style={[styles.settingSubtitle, disabled && styles.disabledText]}>
          {subtitle}
        </Text>
      )}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
      thumbColor={value ? '#3B82F6' : '#F3F4F6'}
    />
  </View>
);

interface DaysPickerProps {
  title: string;
  selectedDays: number[];
  onDaysChange: (days: number[]) => void;
  disabled?: boolean;
}

const DaysPicker: React.FC<DaysPickerProps> = ({ 
  title, 
  selectedDays, 
  onDaysChange, 
  disabled = false 
}) => {
  const availableDays = [1, 2, 3, 5, 7, 14, 30];

  const toggleDay = (day: number) => {
    if (disabled) return;
    
    if (selectedDays.includes(day)) {
      onDaysChange(selectedDays.filter(d => d !== day));
    } else {
      onDaysChange([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  return (
    <View style={styles.daysPickerContainer}>
      <Text style={[styles.daysPickerTitle, disabled && styles.disabledText]}>
        {title}
      </Text>
      <View style={styles.daysContainer}>
        {availableDays.map(day => (
          <TouchableOpacity
            key={day}
            style={[
              styles.dayButton,
              selectedDays.includes(day) && styles.selectedDayButton,
              disabled && styles.disabledDayButton
            ]}
            onPress={() => toggleDay(day)}
            disabled={disabled}
          >
            <Text style={[
              styles.dayButtonText,
              selectedDays.includes(day) && styles.selectedDayButtonText,
              disabled && styles.disabledText
            ]}>
              {day}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.daysPickerSubtitle, disabled && styles.disabledText]}>
        Нагадування за {selectedDays.join(', ')} {selectedDays.length === 1 ? 'день' : 'днів'} до терміну
      </Text>
    </View>
  );
};

interface TimePickerProps {
  title: string;
  startTime: string;
  endTime: string;
  onTimeChange: (startTime: string, endTime: string) => void;
  disabled?: boolean;
}

const TimePicker: React.FC<TimePickerProps> = ({ 
  title, 
  startTime, 
  endTime, 
  onTimeChange, 
  disabled = false 
}) => {
  const showTimePicker = (isStartTime: boolean) => {
    if (disabled) return;
    
    Alert.alert(
      isStartTime ? 'Початок тихих годин' : 'Кінець тихих годин',
      'Функція вибору часу буде додана в наступних версіях',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.timePickerContainer}>
      <Text style={[styles.timePickerTitle, disabled && styles.disabledText]}>
        {title}
      </Text>
      <View style={styles.timeContainer}>
        <TouchableOpacity
          style={[styles.timeButton, disabled && styles.disabledTimeButton]}
          onPress={() => showTimePicker(true)}
          disabled={disabled}
        >
          <Text style={[styles.timeButtonText, disabled && styles.disabledText]}>
            {startTime}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.timeSeparator, disabled && styles.disabledText]}>—</Text>
        <TouchableOpacity
          style={[styles.timeButton, disabled && styles.disabledTimeButton]}
          onPress={() => showTimePicker(false)}
          disabled={disabled}
        >
          <Text style={[styles.timeButtonText, disabled && styles.disabledText]}>
            {endTime}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const NotificationSettingsScreen: React.FC = () => {
  const { settings, updateSettings, isLoading } = useNotifications();
  const [localSettings, setLocalSettings] = useState<NotificationSettings>(settings);

  const handleSettingChange = async (updates: Partial<NotificationSettings>) => {
    const newSettings = { ...localSettings, ...updates };
    setLocalSettings(newSettings);
    await updateSettings(updates);
  };

  const handleMaintenanceReminderChange = async (updates: Partial<NotificationSettings['maintenanceReminders']>) => {
    const newMaintenanceReminders = { ...localSettings.maintenanceReminders, ...updates };
    const newSettings = { ...localSettings, maintenanceReminders: newMaintenanceReminders };
    setLocalSettings(newSettings);
    await updateSettings({ maintenanceReminders: newMaintenanceReminders });
  };

  const handleContractReminderChange = async (updates: Partial<NotificationSettings['contractReminders']>) => {
    const newContractReminders = { ...localSettings.contractReminders, ...updates };
    const newSettings = { ...localSettings, contractReminders: newContractReminders };
    setLocalSettings(newSettings);
    await updateSettings({ contractReminders: newContractReminders });
  };

  const handleTaskAssignmentChange = async (updates: Partial<NotificationSettings['taskAssignments']>) => {
    const newTaskAssignments = { ...localSettings.taskAssignments, ...updates };
    const newSettings = { ...localSettings, taskAssignments: newTaskAssignments };
    setLocalSettings(newSettings);
    await updateSettings({ taskAssignments: newTaskAssignments });
  };

  const handleReportReminderChange = async (updates: Partial<NotificationSettings['reportReminders']>) => {
    const newReportReminders = { ...localSettings.reportReminders, ...updates };
    const newSettings = { ...localSettings, reportReminders: newReportReminders };
    setLocalSettings(newSettings);
    await updateSettings({ reportReminders: newReportReminders });
  };

  const handleQuietHoursChange = async (updates: Partial<NotificationSettings['quietHours']>) => {
    const newQuietHours = { ...localSettings.quietHours, ...updates };
    const newSettings = { ...localSettings, quietHours: newQuietHours };
    setLocalSettings(newSettings);
    await updateSettings({ quietHours: newQuietHours });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Завантаження налаштувань...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Загальні налаштування */}
      <SettingsSection title="Загальні налаштування" icon={Settings}>
        <SettingRow
          title="Увімкнути нотифікації"
          subtitle="Отримувати всі типи сповіщень"
          value={localSettings.enabled}
          onValueChange={(value) => handleSettingChange({ enabled: value })}
        />
      </SettingsSection>

      {/* Нагадування про ТО */}
      <SettingsSection title="Нагадування про ТО" icon={Clock}>
        <SettingRow
          title="Увімкнути нагадування"
          subtitle="Сповіщення про наближення термінів технічного обслуговування"
          value={localSettings.maintenanceReminders.enabled}
          onValueChange={(value) => handleMaintenanceReminderChange({ enabled: value })}
          disabled={!localSettings.enabled}
        />
        
        {localSettings.maintenanceReminders.enabled && localSettings.enabled && (
          <>
            <DaysPicker
              title="Дні для нагадувань"
              selectedDays={localSettings.maintenanceReminders.daysBeforeDue}
              onDaysChange={(days) => handleMaintenanceReminderChange({ daysBeforeDue: days })}
            />
            
            <SettingRow
              title="Нагадування про прострочені ТО"
              subtitle="Сповіщення про прострочені терміни обслуговування"
              value={localSettings.maintenanceReminders.overdueReminders}
              onValueChange={(value) => handleMaintenanceReminderChange({ overdueReminders: value })}
            />
          </>
        )}
      </SettingsSection>

      {/* Нагадування про договори */}
      <SettingsSection title="Нагадування про договори" icon={FileText}>
        <SettingRow
          title="Увімкнути нагадування"
          subtitle="Сповіщення про закінчення термінів дії договорів"
          value={localSettings.contractReminders.enabled}
          onValueChange={(value) => handleContractReminderChange({ enabled: value })}
          disabled={!localSettings.enabled}
        />
        
        {localSettings.contractReminders.enabled && localSettings.enabled && (
          <DaysPicker
            title="Дні для нагадувань про договори"
            selectedDays={localSettings.contractReminders.daysBeforeExpiry}
            onDaysChange={(days) => handleContractReminderChange({ daysBeforeExpiry: days })}
          />
        )}
      </SettingsSection>

      {/* Призначення задач */}
      <SettingsSection title="Призначення задач" icon={Bell}>
        <SettingRow
          title="Увімкнути сповіщення"
          subtitle="Повідомлення про нові призначені задачі"
          value={localSettings.taskAssignments.enabled}
          onValueChange={(value) => handleTaskAssignmentChange({ enabled: value })}
          disabled={!localSettings.enabled}
        />
        
        {localSettings.taskAssignments.enabled && localSettings.enabled && (
          <SettingRow
            title="Миттєві сповіщення"
            subtitle="Отримувати сповіщення одразу після призначення"
            value={localSettings.taskAssignments.immediateNotification}
            onValueChange={(value) => handleTaskAssignmentChange({ immediateNotification: value })}
          />
        )}
      </SettingsSection>

      {/* Нагадування про звіти */}
      <SettingsSection title="Нагадування про звіти" icon={AlertTriangle}>
        <SettingRow
          title="Увімкнути нагадування"
          subtitle="Сповіщення про необхідність створення звітів"
          value={localSettings.reportReminders.enabled}
          onValueChange={(value) => handleReportReminderChange({ enabled: value })}
          disabled={!localSettings.enabled}
        />
      </SettingsSection>

      {/* Тихі години */}
      <SettingsSection title="Тихі години" icon={Moon}>
        <SettingRow
          title="Увімкнути тихі години"
          subtitle="Не показувати сповіщення в певний час"
          value={localSettings.quietHours.enabled}
          onValueChange={(value) => handleQuietHoursChange({ enabled: value })}
          disabled={!localSettings.enabled}
        />
        
        {localSettings.quietHours.enabled && localSettings.enabled && (
          <TimePicker
            title="Період тихих годин"
            startTime={localSettings.quietHours.startTime}
            endTime={localSettings.quietHours.endTime}
            onTimeChange={(startTime, endTime) => 
              handleQuietHoursChange({ startTime, endTime })
            }
          />
        )}
      </SettingsSection>

      {/* Звук та вібрація */}
      <SettingsSection title="Звук та вібрація" icon={Volume2}>
        <SettingRow
          title="Звукові сповіщення"
          subtitle="Відтворювати звук при отриманні нотифікацій"
          value={localSettings.soundEnabled}
          onValueChange={(value) => handleSettingChange({ soundEnabled: value })}
          disabled={!localSettings.enabled}
        />
        
        <SettingRow
          title="Вібрація"
          subtitle="Вібрувати при отриманні нотифікацій"
          value={localSettings.vibrationEnabled}
          onValueChange={(value) => handleSettingChange({ vibrationEnabled: value })}
          disabled={!localSettings.enabled}
        />
      </SettingsSection>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  sectionContent: {
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  disabledRow: {
    opacity: 0.5,
  },
  settingText: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  disabledText: {
    color: '#9CA3AF',
  },
  daysPickerContainer: {
    marginTop: 16,
  },
  daysPickerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 12,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  dayButton: {
    flex: 1,
    minWidth: 40,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  selectedDayButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  disabledDayButton: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  selectedDayButtonText: {
    color: '#FFFFFF',
  },
  daysPickerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  timePickerContainer: {
    marginTop: 16,
  },
  timePickerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeButton: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  disabledTimeButton: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  timeSeparator: {
    fontSize: 16,
    color: '#6B7280',
  },
});

export default NotificationSettingsScreen;