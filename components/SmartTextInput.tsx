import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Search, X, Check } from 'lucide-react-native';

interface SmartTextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  suggestions?: string[];
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  disabled?: boolean;
  required?: boolean;
  icon?: React.ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
  showCharacterCount?: boolean;
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    customValidator?: (value: string) => string | null;
  };
}

export default function SmartTextInput({
  label,
  value,
  onChangeText,
  placeholder = '',
  suggestions = [],
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  maxLength,
  disabled = false,
  required = false,
  icon,
  onFocus,
  onBlur,
  showCharacterCount = false,
  validationRules,
}: SmartTextInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Фільтруємо пропозиції на основі введеного тексту
  useEffect(() => {
    if (value && suggestions.length > 0) {
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(value.toLowerCase()) &&
        suggestion.toLowerCase() !== value.toLowerCase()
      ).slice(0, 5); // Обмежуємо до 5 пропозицій
      
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0 && isFocused);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value, suggestions, isFocused]);

  // Валідація
  const validateInput = (text: string): string | null => {
    if (!validationRules) return null;

    if (validationRules.minLength && text.length < validationRules.minLength) {
      return `Мінімальна довжина: ${validationRules.minLength} символів`;
    }

    if (validationRules.maxLength && text.length > validationRules.maxLength) {
      return `Максимальна довжина: ${validationRules.maxLength} символів`;
    }

    if (validationRules.pattern && text.trim() && !validationRules.pattern.test(text.trim())) {
      return 'Невірний формат';
    }

    if (validationRules.customValidator && text.trim()) {
      return validationRules.customValidator(text.trim());
    }

    return null;
  };

  const handleChangeText = (text: string) => {
    if (text.length > (maxLength || 1000)) return;
    
    // Дозволяємо всі символи включно з пробілами
    onChangeText(text);
    
    // Валідація в реальному часі
    const error = validateInput(text);
    setValidationError(error);
  };

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    // Затримка для обробки вибору пропозиції
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
      onBlur?.();
    }, 150);
  };

  const handleSuggestionPress = (suggestion: string) => {
    if (!suggestion || suggestion.length > 100) return;
    // Не обрізаємо пробіли для пропозицій
    onChangeText(suggestion);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const clearInput = () => {
    onChangeText('');
    setValidationError(null);
    inputRef.current?.focus();
  };

  const hasError = validationError !== null;
  const characterCount = value.length;
  const isOverLimit = maxLength ? characterCount > maxLength : false;

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={[styles.label, hasError && styles.labelError]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        {showCharacterCount && maxLength && (
          <Text style={[styles.characterCount, isOverLimit && styles.characterCountError]}>
            {characterCount}/{maxLength}
          </Text>
        )}
      </View>

      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        hasError && styles.inputContainerError,
        disabled && styles.inputContainerDisabled,
      ]}>
        {icon && (
          <View style={styles.iconContainer}>
            <Text>{icon}</Text>
          </View>
        )}
        
        <TextInput
          ref={inputRef}
          style={[
            styles.textInput,
            multiline && styles.textInputMultiline,
            disabled && styles.textInputDisabled,
          ]}
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          editable={!disabled}
          textAlignVertical={multiline ? 'top' : 'center'}
        />

        {value.length > 0 && !disabled && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearInput}
          >
            <X size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {hasError && (
        <Text style={styles.errorText}>{validationError}</Text>
      )}

      {/* Пропозиції автозаповнення */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filteredSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={`${suggestion}-${index}`}
                style={styles.suggestionItem}
                onPress={() => {
                  if (!suggestion || suggestion.length > 100) return;
                  // Не обрізаємо пробіли для пропозицій
                  handleSuggestionPress(suggestion);
                }}
              >
                <Search size={14} color="#6B7280" />
                <Text style={styles.suggestionText}>{suggestion}</Text>
                <Check size={14} color="#10B981" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    position: 'relative',
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
  },
  labelError: {
    color: '#EF4444',
  },
  required: {
    color: '#EF4444',
  },
  characterCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  characterCountError: {
    color: '#EF4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  inputContainerFocused: {
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainerError: {
    borderColor: '#EF4444',
  },
  inputContainerDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  iconContainer: {
    marginRight: 8,
    marginTop: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 0,
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 4,
  },
  textInputDisabled: {
    color: '#9CA3AF',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: 200,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
});