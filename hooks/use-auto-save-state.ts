import { useEffect, useRef } from 'react';
import { useUndoRedo } from './use-undo-redo';
import { useBusinessData } from './use-business-data';

// Функція для порівняння об'єктів
const deepEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (let key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
};

export const useAutoSaveState = () => {
  const { saveState } = useUndoRedo();
  const businessData = useBusinessData();
  const lastSavedStateRef = useRef<any>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Автоматично зберігаємо стан при зміні даних
  useEffect(() => {
    if (!businessData.isLoading && businessData.contracts.length > 0) {
      const currentState = {
        contracts: businessData.contracts,
        objects: businessData.objects,
        engineers: businessData.engineers,
        tasks: businessData.tasks,
        kanbanTasks: businessData.kanbanTasks,
        contractKanbanTasks: businessData.contractKanbanTasks,
        reports: businessData.reports
      };

      // Перевіряємо, чи дійсно змінилися дані
      if (lastSavedStateRef.current && deepEqual(currentState, lastSavedStateRef.current)) {
        console.log('🔄 No changes detected, skipping auto-save');
        return;
      }

      // Очищуємо попередній таймер, якщо він існує
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      console.log('🔄 Changes detected, scheduling auto-save...');

      // Затримка для уникнення занадто частого збереження
      saveTimeoutRef.current = setTimeout(() => {
        const now = Date.now();
        
        // Перевіряємо, чи минуло достатньо часу з останнього збереження
        if (now - lastSaveTimeRef.current < 3000) {
          console.log('🔄 Too soon since last save, skipping');
          return;
        }

        // Створюємо більш інформативний опис з точним часом
        const timeString = new Date(now).toLocaleString('uk-UA', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        
        const description = `Автозбереження ${timeString} (${businessData.contracts.length} договорів, ${businessData.engineers.length} виконавців)`;
        
        console.log('🔄 Executing auto-save:', description);

        // Зберігаємо поточний стан як останній збережений
        lastSavedStateRef.current = JSON.parse(JSON.stringify(currentState));
        lastSaveTimeRef.current = now;
        
        saveState(currentState, description);
        saveTimeoutRef.current = null;
      }, 2000);

      return () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
      };
    }
  }, [
    businessData.contracts,
    businessData.objects,
    businessData.engineers,
    businessData.tasks,
    businessData.kanbanTasks,
    businessData.contractKanbanTasks,
    businessData.reports,
    businessData.isLoading,
    saveState
  ]);
};