import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Platform,
  TextInput,
} from 'react-native';
import { CalendarDays, X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';

// Налаштування української локалізації
LocaleConfig.locales['uk'] = {
  monthNames: [
    'Січень',
    'Лютий', 
    'Березень',
    'Квітень',
    'Травень',
    'Червень',
    'Липень',
    'Серпень',
    'Вересень',
    'Жовтень',
    'Листопад',
    'Грудень'
  ],
  monthNamesShort: [
    'Січ',
    'Лют',
    'Бер',
    'Кві',
    'Тра',
    'Чер',
    'Лип',
    'Сер',
    'Вер',
    'Жов',
    'Лис',
    'Гру'
  ],
  dayNames: [
    'Неділя',
    'Понеділок',
    'Вівторок',
    'Середа',
    'Четвер',
    'П\'ятниця',
    'Субота'
  ],
  dayNamesShort: [
    'Нд',
    'Пн',
    'Вт',
    'Ср',
    'Чт',
    'Пт',
    'Сб'
  ],
  today: 'Сьогодні'
};

LocaleConfig.defaultLocale = 'uk';

// Функція для форматування дати в формат dd.mm.yyyy
function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  
  const date = parseDate(dateStr);
  if (!date) return dateStr;
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}.${month}.${year}`;
}

// Функція для парсингу дати з різних форматів
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Спробуємо різні формати
  const formats = [
    // DD.MM.YY або DD.MM.YYYY
    /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) { // DD.MM.YY формат
        let [, day, month, year] = match;
        if (year.length === 2) {
          year = '20' + year;
        }
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) return date;
      } else if (format === formats[1]) { // YYYY-MM-DD формат
        const [, year, month, day] = match;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) return date;
      }
    }
  }
  
  // Спробуємо стандартний парсинг
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

interface DatePickerProps {
  label: string;
  value: string;
  onDateChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: string; // Мінімальна дата у форматі dd.mm.yyyy
  maxDate?: string; // Максимальна дата у форматі dd.mm.yyyy
  allowManualInput?: boolean; // Дозволити ручний ввід
  showQuickActions?: boolean; // Показати швидкі дії (сьогодні, завтра, тощо)
}

export default function DatePicker({ 
  label, 
  value, 
  onDateChange, 
  placeholder = "Оберіть дату", 
  disabled = false, 
  minDate, 
  maxDate,
  allowManualInput = true,
  showQuickActions = false
}: DatePickerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [isManualInput, setIsManualInput] = useState(false);

  // Конвертуємо дату в формат YYYY-MM-DD для календаря
  const convertToCalendarFormat = (dateStr: string): string => {
    if (!dateStr) return '';
    
    const date = parseDate(dateStr);
    if (!date) return '';
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  // Конвертуємо дату з формату YYYY-MM-DD в короткий формат
  const convertFromCalendarFormat = (dateStr: string): string => {
    if (!dateStr) return '';
    return formatShortDate(dateStr);
  };

  const handleDateSelect = (day: any) => {
    const selectedDate = convertFromCalendarFormat(day.dateString);
    setInputValue(selectedDate);
    onDateChange(selectedDate);
    setIsVisible(false);
    setIsManualInput(false);
  };

  const handleManualInputChange = (text: string) => {
    if (!text || text.length > 10) return;
    const sanitized = text.trim();
    
    setInputValue(sanitized);
    
    // Автоматичне форматування під час вводу
    let formatted = sanitized.replace(/[^0-9]/g, '');
    if (formatted.length >= 2) {
      formatted = formatted.substring(0, 2) + '.' + formatted.substring(2);
    }
    if (formatted.length >= 5) {
      formatted = formatted.substring(0, 5) + '.' + formatted.substring(5, 9);
    }
    
    if (formatted !== sanitized) {
      setInputValue(formatted);
    }
    
    // Валідація та збереження при повному введенні
    if (formatted.length === 10) {
      const parsedDate = parseDate(formatted);
      if (parsedDate) {
        onDateChange(formatted);
      }
    }
  };

  const handleManualInputBlur = () => {
    if (inputValue && inputValue !== value) {
      const parsedDate = parseDate(inputValue);
      if (parsedDate) {
        const formattedDate = formatShortDate(parsedDate.toISOString());
        setInputValue(formattedDate);
        onDateChange(formattedDate);
      } else {
        // Якщо дата невалідна, повертаємо попереднє значення
        setInputValue(value);
      }
    }
    setIsManualInput(false);
  };



  const calendarDate = convertToCalendarFormat(inputValue || value);
  // Показуємо дату в короткому форматі або placeholder
  const displayValue = inputValue || (value ? formatShortDate(value) : placeholder);
  
  // Синхронізуємо inputValue з value при зміні ззовні
  React.useEffect(() => {
    if (value !== inputValue && !isManualInput) {
      setInputValue(value);
    }
  }, [value, inputValue, isManualInput]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {allowManualInput && !disabled ? (
        <View style={[styles.dateButton, styles.inputContainer]}>
          <CalendarDays size={16} color="#6B7280" />
          <TextInput
            style={[styles.dateInput, !inputValue && !value && styles.placeholderText]}
            value={displayValue === placeholder ? '' : displayValue}
            onChangeText={handleManualInputChange}
            onFocus={() => setIsManualInput(true)}
            onBlur={handleManualInputBlur}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            maxLength={10}
          />
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => setIsVisible(true)}
          >
            <CalendarDays size={16} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.dateButton, disabled && styles.dateButtonDisabled]}
          onPress={() => !disabled && setIsVisible(true)}
          disabled={disabled}
        >
          <CalendarDays size={16} color={disabled ? "#9CA3AF" : "#6B7280"} />
          <Text style={[styles.dateText, !value && styles.placeholderText, disabled && styles.disabledText]}>
            {displayValue}
          </Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Оберіть дату</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsVisible(false)}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            

            
            <Calendar
              onDayPress={handleDateSelect}
              current={calendarDate || undefined}
              markedDates={calendarDate ? {
                [calendarDate]: {
                  selected: true,
                  selectedColor: '#3B82F6',
                }
              } : {}}
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#6B7280',
                selectedDayBackgroundColor: '#3B82F6',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#3B82F6',
                dayTextColor: '#111827',
                textDisabledColor: '#D1D5DB',
                dotColor: '#3B82F6',
                selectedDotColor: '#ffffff',
                arrowColor: '#3B82F6',
                disabledArrowColor: '#D1D5DB',
                monthTextColor: '#111827',
                indicatorColor: '#3B82F6',
                textDayFontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
                textMonthFontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
                textDayHeaderFontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
                textDayFontWeight: '400',
                textMonthFontWeight: '600',
                textDayHeaderFontWeight: '500',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14,
              }}
              firstDay={1}
              enableSwipeMonths={true}
              hideExtraDays={false}
              showWeekNumbers={false}
              disableMonthChange={false}
              hideDayNames={false}
              showSixWeeks={false}
              disableArrowLeft={false}
              disableArrowRight={false}
              renderArrow={(direction) => (
                direction === 'left' ? 
                  <ChevronLeft size={20} color="#3B82F6" /> : 
                  <ChevronRight size={20} color="#3B82F6" />
              )}
              monthFormat={'MMMM yyyy'}
              onMonthChange={(month) => {
                console.log('Month changed:', month);
              }}
              minDate={minDate ? convertToCalendarFormat(minDate) : '1900-01-01'}
              maxDate={maxDate ? convertToCalendarFormat(maxDate) : '2100-12-31'}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
    marginBottom: 8,
  },
  dateButton: {
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
  dateButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  dateText: {
    fontSize: 15,
    color: '#111827',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  disabledText: {
    color: '#9CA3AF',
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  dateInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 0,
    marginLeft: 8,
  },
  calendarButton: {
    padding: 4,
    marginLeft: 8,
  },

});