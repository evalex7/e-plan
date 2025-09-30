import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { 
  Contract, 
  MaintenanceTask, 
  ServiceEngineer, 
  ServiceObject,
  KanbanTask,
  ContractKanbanTask,
  MaintenanceReport
} from '@/types/business';

interface AppState {
  contracts: Contract[];
  objects: ServiceObject[];
  engineers: ServiceEngineer[];
  tasks: MaintenanceTask[];
  kanbanTasks: KanbanTask[];
  contractKanbanTasks: ContractKanbanTask[];
  reports: MaintenanceReport[];
}

interface HistoryEntry {
  id: string;
  timestamp: number;
  description: string;
  state: AppState;
}

const STORAGE_KEY = 'app_history';
const MAX_HISTORY_SIZE = 20; // Максимальна кількість записів в історії

export const [UndoRedoProvider, useUndoRedo] = createContextHook(() => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Loading history from storage...');
      const historyData = await AsyncStorage.getItem(STORAGE_KEY);
      console.log('📦 Raw history data:', historyData ? 'Found data' : 'No data');
      
      if (historyData) {
        const parsedHistory = JSON.parse(historyData);
        console.log('📋 Parsed history:', {
          historyCount: parsedHistory.history?.length || 0,
          currentIndex: parsedHistory.currentIndex || -1,
          firstEntry: parsedHistory.history?.[0]?.description || 'None'
        });
        setHistory(parsedHistory.history || []);
        setCurrentIndex(parsedHistory.currentIndex || -1);
      } else {
        console.log('📋 No history found in storage');
        setHistory([]);
        setCurrentIndex(-1);
      }
    } catch (error) {
      console.error('❌ Error loading history:', error);
      setHistory([]);
      setCurrentIndex(-1);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveHistory = useCallback(async (newHistory: HistoryEntry[], newIndex: number) => {
    try {
      const dataToSave = {
        history: newHistory,
        currentIndex: newIndex
      };
      console.log('💾 Saving history to storage:', {
        historyCount: newHistory.length,
        currentIndex: newIndex,
        lastEntry: newHistory[newHistory.length - 1]?.description || 'None'
      });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      console.log('✅ History saved successfully');
    } catch (error) {
      console.error('❌ Error saving history:', error);
    }
  }, []);

  // Завантаження історії при старті
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Функція для порівняння станів
  const statesEqual = useCallback((state1: AppState, state2: AppState): boolean => {
    if (!state1 || !state2) return false;
    
    // Порівнюємо кількість елементів у кожному масиві
    const arrays1 = [
      state1.contracts?.length || 0,
      state1.objects?.length || 0,
      state1.engineers?.length || 0,
      state1.tasks?.length || 0,
      state1.kanbanTasks?.length || 0,
      state1.contractKanbanTasks?.length || 0,
      state1.reports?.length || 0
    ];
    
    const arrays2 = [
      state2.contracts?.length || 0,
      state2.objects?.length || 0,
      state2.engineers?.length || 0,
      state2.tasks?.length || 0,
      state2.kanbanTasks?.length || 0,
      state2.contractKanbanTasks?.length || 0,
      state2.reports?.length || 0
    ];
    
    // Якщо кількості не співпадають, стани різні
    for (let i = 0; i < arrays1.length; i++) {
      if (arrays1[i] !== arrays2[i]) return false;
    }
    
    // Додаткова перевірка через JSON (може бути повільніше, але точніше)
    try {
      return JSON.stringify(state1) === JSON.stringify(state2);
    } catch {
      return false;
    }
  }, []);

  // Додавання нового стану в історію
  const saveState = useCallback(async (state: AppState, description: string) => {
    // Валідація параметрів
    if (!description || !description.trim()) {
      console.warn('Description is required for saving state');
      return;
    }
    if (description.length > 200) {
      console.warn('Description too long, truncating');
      description = description.substring(0, 200);
    }
    if (!state || typeof state !== 'object') {
      console.warn('Invalid state provided');
      return;
    }
    
    // Перевіряємо, чи не дублюється останній запис
    const lastEntry = history[history.length - 1];
    if (lastEntry && statesEqual(lastEntry.state, state)) {
      console.log('💾 State unchanged, skipping save:', description.trim());
      return;
    }
    
    const sanitizedDescription = description.trim();
    console.log('💾 Saving new state to history:', sanitizedDescription);
    
    // Створюємо унікальний ID з мікросекундами для уникнення дублювання
    const now = Date.now();
    const uniqueId = `${now}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newEntry: HistoryEntry = {
      id: uniqueId,
      timestamp: now,
      description: sanitizedDescription,
      state: JSON.parse(JSON.stringify(state)) // Глибоке копіювання
    };

    // Видаляємо всі записи після поточного індексу (якщо робили undo)
    const newHistory = history.slice(0, currentIndex + 1);
    
    // Додаємо новий запис
    newHistory.push(newEntry);
    
    // Обмежуємо розмір історії
    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory.shift();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
    
    setHistory(newHistory);
    await saveHistory(newHistory, newHistory.length - 1);
  }, [history, currentIndex, saveHistory, statesEqual]);

  // Відкат назад (undo)
  const undo = useCallback((): HistoryEntry | null => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      const entry = history[newIndex];
      console.log('↶ Undo to:', entry.description);
      saveHistory(history, newIndex);
      return entry;
    }
    return null;
  }, [currentIndex, history, saveHistory]);

  // Повернення вперед (redo)
  const redo = useCallback((): HistoryEntry | null => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      const entry = history[newIndex];
      console.log('↷ Redo to:', entry.description);
      saveHistory(history, newIndex);
      return entry;
    }
    return null;
  }, [currentIndex, history, saveHistory]);

  // Очищення історії
  const clearHistory = useCallback(async () => {
    setHistory([]);
    setCurrentIndex(-1);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  // Отримання поточного стану
  const getCurrentState = useCallback((): HistoryEntry | null => {
    if (currentIndex >= 0 && currentIndex < history.length) {
      return history[currentIndex];
    }
    return null;
  }, [currentIndex, history]);

  // Отримання списку останніх дій для відображення
  const getRecentActions = useCallback((count: number = 5): HistoryEntry[] => {
    console.log('📋 getRecentActions called:', {
      totalHistory: history.length,
      requestedCount: count,
      currentIndex
    });
    
    // Сортуємо за часом (новіші спочатку) і беремо останні
    const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);
    const recent = sortedHistory.slice(0, count);
    
    console.log('📋 Recent actions result:', recent.map(a => ({ 
      id: a.id, 
      desc: a.description.substring(0, 50),
      time: new Date(a.timestamp).toLocaleString()
    })));
    
    return recent;
  }, [history, currentIndex]);

  // Перевірка можливості undo/redo
  const canUndo = useMemo(() => currentIndex > 0, [currentIndex]);
  const canRedo = useMemo(() => currentIndex < history.length - 1, [currentIndex, history.length]);

  return useMemo(() => ({
    history,
    currentIndex,
    isLoading,
    saveState,
    undo,
    redo,
    clearHistory,
    getCurrentState,
    canUndo,
    canRedo,
    getRecentActions
  }), [history, currentIndex, isLoading, saveState, undo, redo, clearHistory, getCurrentState, canUndo, canRedo, getRecentActions]);
});

// Хук для автоматичного збереження стану після змін
export const useAutoSave = (state: AppState, description: string, enabled: boolean = true) => {
  const { saveState } = useUndoRedo();
  
  useEffect(() => {
    if (enabled && state && state.contracts && state.contracts.length > 0) {
      // Затримка для уникнення занадто частого збереження
      const timer = setTimeout(() => {
        saveState(state, description);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [state, description, enabled, saveState]);
};