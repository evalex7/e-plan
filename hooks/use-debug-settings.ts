import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

export interface DebugSettings {
  contracts: boolean;
  gantt: boolean;
  kanban: boolean;
  'work-types': boolean;
  resources: boolean;
  reports: boolean;
  engineers: boolean;
}

const DEBUG_SETTINGS_KEY = 'debug_settings';

const defaultSettings: DebugSettings = {
  contracts: false,
  gantt: false,
  kanban: false,
  'work-types': false,
  resources: false,
  reports: false,
  engineers: false,
};

export function useDebugSettings() {
  const [debugSettings, setDebugSettings] = useState<DebugSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    
    const initSettings = async () => {
      if (!isMounted) return;
      await loadSettings();
    };
    
    initSettings();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const loadSettings = async () => {
    try {
      let stored: string | null = null;
      
      if (Platform.OS === 'web') {
        stored = localStorage.getItem(DEBUG_SETTINGS_KEY);
      } else {
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        stored = await AsyncStorage.default.getItem(DEBUG_SETTINGS_KEY);
      }
      
      if (stored && stored.trim() !== '' && stored !== 'undefined' && stored !== 'null') {
        try {
          // Додаткова перевірка на валідність JSON
          if (stored.startsWith('{') && stored.endsWith('}')) {
            const parsedSettings = JSON.parse(stored);
            if (parsedSettings && typeof parsedSettings === 'object') {
              setDebugSettings({ ...defaultSettings, ...parsedSettings });
            } else {
              throw new Error('Invalid settings object');
            }
          } else {
            throw new Error('Invalid JSON format');
          }
        } catch (parseError) {
          console.warn('Некоректні налаштування дебагу, використовуємо стандартні:', parseError);
          // Очищуємо некоректні дані
          if (Platform.OS === 'web') {
            localStorage.removeItem(DEBUG_SETTINGS_KEY);
          } else {
            const AsyncStorage = await import('@react-native-async-storage/async-storage');
            await AsyncStorage.default.removeItem(DEBUG_SETTINGS_KEY);
          }
          // Встановлюємо стандартні налаштування
          setDebugSettings(defaultSettings);
        }
      } else {
        // Якщо немає збережених налаштувань, використовуємо стандартні
        setDebugSettings(defaultSettings);
      }
    } catch (error) {
      console.warn('Помилка завантаження налаштувань дебагу:', error);
      // У випадку будь-якої помилки використовуємо стандартні налаштування
      setDebugSettings(defaultSettings);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveSettings = async (newSettings: DebugSettings) => {
    if (!newSettings || typeof newSettings !== 'object') {
      console.error('Некоректні налаштування');
      return;
    }
    
    try {
      // Перевіряємо, що всі ключі є валідними
      const validSettings = { ...defaultSettings };
      Object.keys(newSettings).forEach(key => {
        if (key in defaultSettings) {
          validSettings[key as keyof DebugSettings] = Boolean(newSettings[key as keyof DebugSettings]);
        }
      });
      
      const settingsString = JSON.stringify(validSettings);
      
      // Додаткова перевірка валідності JSON
      JSON.parse(settingsString); // Тест парсингу
      
      if (Platform.OS === 'web') {
        localStorage.setItem(DEBUG_SETTINGS_KEY, settingsString);
      } else {
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        await AsyncStorage.default.setItem(DEBUG_SETTINGS_KEY, settingsString);
      }
    } catch (error) {
      console.error('Помилка збереження налаштувань дебагу:', error);
    }
  };

  const toggleDebugForTab = (tabKey: keyof DebugSettings) => {
    const newSettings = {
      ...debugSettings,
      [tabKey]: !debugSettings[tabKey],
    };
    setDebugSettings(newSettings);
    saveSettings(newSettings);
  };

  const isDebugEnabled = (tabKey: keyof DebugSettings): boolean => {
    return debugSettings[tabKey] || false;
  };

  return {
    debugSettings,
    isLoaded,
    toggleDebugForTab,
    isDebugEnabled,
  };
}