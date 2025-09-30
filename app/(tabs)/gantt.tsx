import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import { Plus, Calendar, Filter, Edit3, Trash2, Clock, AlertTriangle, CheckCircle, User } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDateDisplay } from '@/hooks/use-business-data';
import { useFilteredBusinessData } from '@/hooks/use-filtered-business-data';
import { router } from 'expo-router';
import { colors, spacing } from '@/constants/colors';
import { useDebugSettings } from '@/hooks/use-debug-settings';
import EnhancedPageTransition from '@/components/EnhancedPageTransition';

// Використовуємо функцію форматування дат з хука
const formatDate = formatDateDisplay;

const ROW_HEIGHT = 80;
const TASK_HEIGHT = 36;


type ViewMode = 'days' | 'weeks' | 'months' | 'years' | 'all_contracts';

interface TaskProgress {
  completed: number;
  total: number;
  percentage: number;
}

const VIEW_CONFIGS = {
  days: { width: 40, label: 'Дні', periods: 21 },
  weeks: { width: 60, label: 'Тижні', periods: 12 },
  months: { width: 80, label: 'Місяці', periods: 12 },
  years: { width: 100, label: 'Роки', periods: 10 },
  all_contracts: { width: 50, label: 'Всі договори', periods: 48 }
};

export default function GanttScreen() {
  const { objects, tasks, engineers, contracts, isLoading } = useFilteredBusinessData(); // Використовуємо фільтровані дані без архівних договорів
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('months');
  const [showViewModeSelector, setShowViewModeSelector] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const headerScrollRef = useRef<ScrollView>(null);
  const mainScrollRef = useRef<ScrollView>(null);
  const objectsScrollRef = useRef<ScrollView>(null);
  const timelineScrollRef = useRef<ScrollView>(null);
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isVerticalScrolling, setIsVerticalScrolling] = useState(false);
  const { isDebugEnabled } = useDebugSettings();
  const isDebugMode = isDebugEnabled('gantt');
  
  const timePeriods = useMemo(() => {
    const config = VIEW_CONFIGS[viewMode];
    const result = [];
    // Розширюємо діапазон для кращого покриття завдань
    const baseDate = new Date(currentDate);
    
    if (viewMode === 'days') {
      // Починаємо з 10 днів назад від поточної дати
      const start = new Date(baseDate);
      start.setDate(start.getDate() - 10);
      for (let i = 0; i < config.periods + 20; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        result.push(date);
      }
    } else if (viewMode === 'weeks') {
      // Починаємо з 4 тижнів назад
      const start = new Date(baseDate);
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek - (4 * 7)); // 4 тижні назад
      for (let i = 0; i < config.periods + 8; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + (i * 7));
        result.push(date);
      }
    } else if (viewMode === 'months') {
      // ВИПРАВЛЕНО: Завжди включаємо поточний місяць у діапазон
      const today = new Date();
      let startMonth = baseDate.getMonth() - 6;
      let startYear = baseDate.getFullYear();
      
      // Якщо є завдання, знаходимо найранішу дату
      if (tasks && tasks.length > 0) {
        const taskDates = tasks.map(task => new Date(task.scheduledDate));
        const earliestTask = new Date(Math.min(...taskDates.map(d => d.getTime())));
        const latestTask = new Date(Math.max(...taskDates.map(d => d.getTime())));
        
        console.log('🔥 Task date range:', earliestTask.toISOString().split('T')[0], 'to', latestTask.toISOString().split('T')[0]);
        
        // Визначаємо початковий місяць: найранішій з завдань або поточний мінус 6
        const earliestMonth = earliestTask.getMonth();
        const earliestYear = earliestTask.getFullYear();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        // Вибираємо найранішу дату між завданнями та поточною датою мінус 6 місяців
        const baseStartDate = new Date(currentYear, currentMonth - 6, 1);
        const taskStartDate = new Date(earliestYear, earliestMonth - 1, 1);
        
        if (taskStartDate < baseStartDate) {
          startMonth = earliestMonth - 1;
          startYear = earliestYear;
        } else {
          startMonth = currentMonth - 6;
          startYear = currentYear;
        }
        
        // Якщо startMonth < 0, переходимо до попереднього року
        if (startMonth < 0) {
          startMonth = 12 + startMonth;
          startYear -= 1;
        }
        
        // Визначаємо кінцевий місяць: найпізніший з завдань або поточний плюс 6
        const latestMonth = latestTask.getMonth();
        const latestYear = latestTask.getFullYear();
        const baseEndDate = new Date(currentYear, currentMonth + 6, 1);
        const taskEndDate = new Date(latestYear, latestMonth + 1, 1);
        
        const endDate = taskEndDate > baseEndDate ? taskEndDate : baseEndDate;
        
        // Розраховуємо кількість місяців від початку до кінця
        const monthsDiff = (endDate.getFullYear() - startYear) * 12 + (endDate.getMonth() - startMonth) + 2; // +2 місяці буфера
        config.periods = Math.max(config.periods, monthsDiff);
        
        console.log('🔥 Generating', config.periods, 'months starting from', startYear, '-', startMonth + 1);
      }
      
      const start = new Date(startYear, startMonth, 1);
      for (let i = 0; i < config.periods + 6; i++) { // Додаємо ще 6 місяців буфера
        const date = new Date(start.getFullYear(), start.getMonth() + i, 1);
        result.push(date);
        console.log('🔥 Added month period:', date.toISOString().split('T')[0]);
      }
    } else if (viewMode === 'years') {
      // Показуємо всі роки, які використовуються в завданнях
      if (tasks && tasks.length > 0) {
        const taskYears = tasks.map(task => new Date(task.scheduledDate).getFullYear());
        const uniqueYears = [...new Set(taskYears)].sort((a, b) => a - b);
        
        console.log('🔥 All task years found:', uniqueYears);
        console.log('🔥 Current selected year:', baseDate.getFullYear());
        
        // Показуємо всі роки з завданнями, не фільтруємо по поточній даті
        for (const year of uniqueYears) {
          result.push(new Date(year, 0, 1));
        }
        
        // Якщо поточний рік не входить в список років з завданнями, додаємо його
        const currentYear = baseDate.getFullYear();
        if (!uniqueYears.includes(currentYear)) {
          result.push(new Date(currentYear, 0, 1));
          result.sort((a, b) => a.getFullYear() - b.getFullYear());
        }
        
        console.log('🔥 Years to display:', result.map(d => d.getFullYear()));
      } else {
        // Якщо немає завдань, показуємо поточний рік
        result.push(new Date(baseDate.getFullYear(), 0, 1));
      }
    } else { // all_contracts
      // Показуємо всі договори за увесь час - автоматичне масштабування
      // Знаходимо найранішу та найпізнішу дати завдань
      let earliestDate = new Date();
      let latestDate = new Date();
      
      if (tasks && tasks.length > 0) {
        const taskDates = tasks.map(task => new Date(task.scheduledDate));
        earliestDate = new Date(Math.min(...taskDates.map(d => d.getTime())));
        latestDate = new Date(Math.max(...taskDates.map(d => d.getTime())));
        
        // Не додаємо додатковий буфер - показуємо тільки період з завданнями
      } else {
        // Якщо немає завдань, показуємо поточний рік
        earliestDate = new Date(baseDate.getFullYear(), 0, 1);
        latestDate = new Date(baseDate.getFullYear(), 11, 31);
      }
      
      // Генеруємо місяці від найранішої до найпізнішої дати
      const start = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
      const end = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
      
      let current = new Date(start);
      while (current <= end) {
        result.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
      }
    }
    
    return result;
  }, [currentDate, viewMode, tasks]);

  const getPeriodLabel = (date: Date) => {
    if (viewMode === 'days') {
      const day = date.getDate().toString().padStart(2, '0');
      const monthNames = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];
      const weekDays = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      return `${weekDays[date.getDay()]}\n${day} ${monthNames[date.getMonth()]}`;
    } else if (viewMode === 'weeks') {
      const endDate = new Date(date);
      endDate.setDate(date.getDate() + 6);
      const monthNames = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];
      return `${date.getDate()}-${endDate.getDate()}\n${monthNames[date.getMonth()]}`;
    } else if (viewMode === 'months') {
      const monthNames = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'];
      return `${monthNames[date.getMonth()]}\n${date.getFullYear()}`;
    } else if (viewMode === 'years') {
      return `${date.getFullYear()}`;
    } else {
      const monthNames = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'];
      return `${monthNames[date.getMonth()]}\n${date.getFullYear()}`;
    }
  };

  const isCurrentPeriod = (date: Date) => {
    const today = new Date();
    
    if (viewMode === 'days') {
      return date.toDateString() === today.toDateString();
    } else if (viewMode === 'weeks') {
      const weekStart = new Date(date);
      const weekEnd = new Date(date);
      weekEnd.setDate(weekStart.getDate() + 6);
      return today >= weekStart && today <= weekEnd;
    } else if (viewMode === 'months') {
      return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    } else if (viewMode === 'years') {
      return date.getFullYear() === today.getFullYear();
    } else { // all_contracts
      return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    }
  };

  const getPeriodDuration = (date: Date) => {
    if (viewMode === 'days') {
      return 1;
    } else if (viewMode === 'weeks') {
      return 7;
    } else if (viewMode === 'months') {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    } else if (viewMode === 'years') {
      return 365; // Приблизна кількість днів у році
    } else {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    }
  };

  const getTaskProgress = (task: any): TaskProgress => {
    // Симулюємо прогрес на основі статусу
    switch (task.status) {
      case 'completed':
        return { completed: task.duration, total: task.duration, percentage: 100 };
      case 'in_progress':
        const progress = Math.floor(Math.random() * 70) + 20; // 20-90%
        return { completed: Math.floor(task.duration * progress / 100), total: task.duration, percentage: progress };
      case 'planned':
        return { completed: 0, total: task.duration, percentage: 0 };
      case 'overdue':
        const overdueProgress = Math.floor(Math.random() * 50) + 30; // 30-80%
        return { completed: Math.floor(task.duration * overdueProgress / 100), total: task.duration, percentage: overdueProgress };
      default:
        return { completed: 0, total: task.duration, percentage: 0 };
    }
  };



  const isTaskOverdue = (task: any) => {
    const today = new Date();
    const taskDate = new Date(task.scheduledDate);
    const endDate = new Date(taskDate);
    endDate.setDate(taskDate.getDate() + task.duration);
    return today > endDate && task.status !== 'completed';
  };

  const getDaysUntilDeadline = (task: any) => {
    const today = new Date();
    const taskDate = new Date(task.scheduledDate);
    const endDate = new Date(taskDate);
    endDate.setDate(taskDate.getDate() + task.duration);
    const diffTime = endDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getTimelinePosition = (task: any, periods: Date[]) => {
    const taskDate = new Date(task.scheduledDate);
    const config = VIEW_CONFIGS[viewMode];
    const scaledWidth = config.width * zoomLevel;
    
    // Пошук періоду, в якому потрапляє завдання
    let periodIndex = -1;
    let positionInPeriod = 0;
    
    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      
      if (viewMode === 'days') {
        if (taskDate.toDateString() === period.toDateString()) {
          periodIndex = i;
          positionInPeriod = scaledWidth / 2; // Центр дня
          break;
        }
      } else if (viewMode === 'weeks') {
        const weekStart = new Date(period);
        const weekEnd = new Date(period);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        if (taskDate >= weekStart && taskDate <= weekEnd) {
          periodIndex = i;
          const dayOfWeek = taskDate.getDay();
          positionInPeriod = (dayOfWeek / 7) * scaledWidth;
          break;
        }
      } else if (viewMode === 'years') {
        if (taskDate.getFullYear() === period.getFullYear()) {
          periodIndex = i;
          const dayOfYear = Math.floor((taskDate.getTime() - new Date(period.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24));
          const daysInYear = new Date(period.getFullYear(), 11, 31).getDate() === 31 ? 365 : 366;
          positionInPeriod = (dayOfYear / daysInYear) * scaledWidth;
          break;
        }
      } else {
        if (taskDate.getMonth() === period.getMonth() && 
            taskDate.getFullYear() === period.getFullYear()) {
          periodIndex = i;
          const dayOfMonth = taskDate.getDate();
          const daysInMonth = new Date(period.getFullYear(), period.getMonth() + 1, 0).getDate();
          positionInPeriod = ((dayOfMonth - 1) / daysInMonth) * scaledWidth;
          break;
        }
      }
    }
    
    // Якщо завдання не потрапляє в жоден період, спробуємо знайти найближчий
    if (periodIndex === -1) {
      // Знаходимо найближчий період
      let closestIndex = 0;
      let minDistance = Math.abs(taskDate.getTime() - periods[0].getTime());
      
      for (let i = 1; i < periods.length; i++) {
        const distance = Math.abs(taskDate.getTime() - periods[i].getTime());
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }
      
      periodIndex = closestIndex;
      positionInPeriod = scaledWidth / 2; // Центр періоду
    }
    
    // Обчислюємо загальну позицію
    const headerWidth = 200; // Ширина заголовка
    const totalPosition = headerWidth + (periodIndex * scaledWidth) + positionInPeriod;
    
    return totalPosition;
  };

  // Оптимізована функція розрахунку позиції завдання
  const getTimelinePositionRelative = useCallback((task: any, periods: Date[]) => {
    const taskDate = new Date(task.scheduledDate);
    const config = VIEW_CONFIGS[viewMode];
    const scaledWidth = config.width * zoomLevel;
    
    let periodIndex = -1;
    let positionInPeriod = 0;
    
    // Оптимізований пошук періоду
    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      
      if (viewMode === 'days') {
        if (taskDate.toDateString() === period.toDateString()) {
          periodIndex = i;
          positionInPeriod = scaledWidth / 2;
          break;
        }
      } else if (viewMode === 'weeks') {
        const weekStart = new Date(period);
        const weekEnd = new Date(period);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        if (taskDate >= weekStart && taskDate <= weekEnd) {
          periodIndex = i;
          const dayOfWeek = taskDate.getDay();
          positionInPeriod = (dayOfWeek / 7) * scaledWidth;
          break;
        }
      } else if (viewMode === 'years') {
        if (taskDate.getFullYear() === period.getFullYear()) {
          periodIndex = i;
          const dayOfYear = Math.floor((taskDate.getTime() - new Date(period.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24));
          positionInPeriod = (dayOfYear / 365) * scaledWidth;
          break;
        }
      } else {
        if (taskDate.getMonth() === period.getMonth() && 
            taskDate.getFullYear() === period.getFullYear()) {
          periodIndex = i;
          const dayOfMonth = taskDate.getDate();
          const daysInMonth = new Date(period.getFullYear(), period.getMonth() + 1, 0).getDate();
          positionInPeriod = ((dayOfMonth - 1) / daysInMonth) * scaledWidth;
          break;
        }
      }
    }
    
    // Якщо не знайшли точний період, шукаємо найближчий
    if (periodIndex === -1 && periods.length > 0) {
      let closestIndex = 0;
      let minDistance = Math.abs(taskDate.getTime() - periods[0].getTime());
      
      for (let i = 1; i < periods.length; i++) {
        const distance = Math.abs(taskDate.getTime() - periods[i].getTime());
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }
      
      periodIndex = closestIndex;
      positionInPeriod = scaledWidth / 2;
    }
    
    if (periodIndex === -1) return 0;
    
    return Math.max(0, (periodIndex * scaledWidth) + positionInPeriod);
  }, [viewMode, zoomLevel]);

  const navigatePeriod = (direction: number) => {
    const newDate = new Date(currentDate);
    
    if (viewMode === 'days') {
      newDate.setDate(currentDate.getDate() + (direction * 7));
    } else if (viewMode === 'weeks') {
      newDate.setDate(currentDate.getDate() + (direction * 7 * 4));
    } else if (viewMode === 'years') {
      newDate.setFullYear(currentDate.getFullYear() + direction);
    } else {
      newDate.setMonth(currentDate.getMonth() + direction);
    }
    
    setCurrentDate(newDate);
  };
  
  const goToToday = () => {
    const today = new Date();
    console.log('🔥 goToToday called, today:', today.toISOString().split('T')[0]);
    console.log('🔥 Current viewMode:', viewMode);
    
    // Оновлюємо поточну дату для перегенерації timePeriods
    setCurrentDate(today);
    
    // Скролимо до сьогодні з більшою затримкою для оновлення timePeriods
    setTimeout(() => {
      console.log('🔥 Attempting to scroll to today after date update');
      scrollToTodayImmediate();
    }, 100); // Зменшуємо затримку
  };
  
  // Функція для скролу до поточного періоду
  const scrollToTodayImmediate = React.useCallback(() => {
    if (timePeriods.length === 0) {
      console.log('🔥 No time periods available for scrolling');
      return;
    }
    
    const today = new Date();
    console.log('🔥 Scrolling to today:', today.toISOString().split('T')[0]);
    console.log('🔥 Available time periods:', timePeriods.length);
    console.log('🔥 Time periods:', timePeriods.map(p => p.toISOString().split('T')[0]));
    
    // Знаходимо індекс поточного періоду
    let todayPeriodIndex = -1;
    
    for (let i = 0; i < timePeriods.length; i++) {
      const period = timePeriods[i];
      let isMatch = false;
      
      if (viewMode === 'days') {
        isMatch = period.toDateString() === today.toDateString();
      } else if (viewMode === 'weeks') {
        const weekStart = new Date(period);
        const weekEnd = new Date(period);
        weekEnd.setDate(weekStart.getDate() + 6);
        isMatch = today >= weekStart && today <= weekEnd;
      } else if (viewMode === 'months') {
        isMatch = period.getMonth() === today.getMonth() && period.getFullYear() === today.getFullYear();
      } else if (viewMode === 'years') {
        isMatch = period.getFullYear() === today.getFullYear();
      } else { // all_contracts
        isMatch = period.getMonth() === today.getMonth() && period.getFullYear() === today.getFullYear();
      }
      
      console.log(`🔥 Period ${i}:`, period.toISOString().split('T')[0], 'matches today:', isMatch);
      
      if (isMatch) {
        todayPeriodIndex = i;
        break;
      }
    }
    
    let targetIndex = todayPeriodIndex;
    
    // Якщо поточний період не знайдено, знаходимо найближчий
    if (targetIndex === -1) {
      let closestIndex = 0;
      let minDistance = Math.abs(today.getTime() - timePeriods[0].getTime());
      
      for (let i = 1; i < timePeriods.length; i++) {
        const distance = Math.abs(today.getTime() - timePeriods[i].getTime());
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }
      
      targetIndex = closestIndex;
      console.log('🔥 Today period not found, using closest index:', targetIndex);
    } else {
      console.log('🔥 Found today period at index:', targetIndex);
    }
    
    if (targetIndex >= 0 && targetIndex < timePeriods.length) {
      const config = VIEW_CONFIGS[viewMode];
      const scaledWidth = config.width * zoomLevel;
      // Позиціонуємо поточний період як перший стовпчик після нерухомого
      const scrollPosition = Math.max(0, targetIndex * scaledWidth);
      
      console.log('🔥 Scrolling to position:', scrollPosition, 'target index:', targetIndex, 'scaled width:', scaledWidth);
      
      // Виконуємо скрол одночасно для обох ScrollView
      if (headerScrollRef.current && mainScrollRef.current) {
        console.log('🔥 Executing scroll to position:', scrollPosition);
        setIsScrolling(true);
        headerScrollRef.current.scrollTo({ x: scrollPosition, animated: true });
        mainScrollRef.current.scrollTo({ x: scrollPosition, animated: true });
        
        setTimeout(() => {
          setIsScrolling(false);
        }, 300);
      } else {
        console.log('🔥 ScrollView refs not available');
      }
    } else {
      console.log('🔥 Invalid target index:', targetIndex);
    }
  }, [timePeriods, viewMode, zoomLevel]);
  
  // Синхронізація горизонтального скролу
  const handleHorizontalScroll = useCallback((event: any, source: 'header' | 'main') => {
    if (isScrolling) return;
    
    const newScrollX = event.nativeEvent.contentOffset.x;
    setScrollX(newScrollX);
    
    if (isDebugMode) {
      console.log(`➡️ Horizontal scroll from ${source}: ${newScrollX}`);
    }
    
    setIsScrolling(true);
    
    // Синхронізуємо скрол між заголовком і основним контентом
    requestAnimationFrame(() => {
      if (source === 'header' && mainScrollRef.current) {
        mainScrollRef.current.scrollTo({ x: newScrollX, animated: false });
        if (isDebugMode) {
          console.log(`➡️ Synced main scroll to: ${newScrollX}`);
        }
      } else if (source === 'main' && headerScrollRef.current) {
        headerScrollRef.current.scrollTo({ x: newScrollX, animated: false });
        if (isDebugMode) {
          console.log(`➡️ Synced header scroll to: ${newScrollX}`);
        }
      }
      
      setTimeout(() => setIsScrolling(false), 16);
    });
  }, [isScrolling, isDebugMode]);

  // Обробка вертикального скролу
  const handleVerticalScroll = useCallback((event: any, source: 'objects' | 'timeline') => {
    if (isVerticalScrolling) return;
    
    const newScrollY = event.nativeEvent.contentOffset.y;
    setScrollY(newScrollY);
    
    if (isDebugMode) {
      console.log(`🔄 Vertical scroll from ${source}: ${newScrollY}`);
    }
    
    setIsVerticalScrolling(true);
    
    // Синхронізуємо вертикальний скрол між об'єктами і лінією часу
    requestAnimationFrame(() => {
      if (source === 'objects' && timelineScrollRef.current) {
        timelineScrollRef.current.scrollTo({ y: newScrollY, animated: false });
        if (isDebugMode) {
          console.log(`🔄 Synced timeline scroll to: ${newScrollY}`);
        }
      } else if (source === 'timeline' && objectsScrollRef.current) {
        objectsScrollRef.current.scrollTo({ y: newScrollY, animated: false });
        if (isDebugMode) {
          console.log(`🔄 Synced objects scroll to: ${newScrollY}`);
        }
      }
      
      setTimeout(() => setIsVerticalScrolling(false), 16);
    });
  }, [isVerticalScrolling, isDebugMode]);



  // Використовуємо useEffect для автоматичного скролу після натискання кнопки "Сьогодні"
  React.useEffect(() => {
    const today = new Date();
    const isToday = currentDate.toDateString() === today.toDateString();
    
    if (isToday && timePeriods.length > 0) {
      console.log('🔥 Auto-scrolling to today after timePeriods update');
      console.log('🔥 TimePeriods length:', timePeriods.length);
      // Використовуємо requestAnimationFrame для кращої синхронізації
      requestAnimationFrame(() => {
        scrollToTodayImmediate();
      });
    }
  }, [currentDate, timePeriods, scrollToTodayImmediate]);



  const getObject = (objectId: string) => objects.find(o => String(o.id) === String(objectId));
  const getEngineer = (engineerId: string) => engineers.find(e => String(e.id) === String(engineerId));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'in_progress': return '#3B82F6';
      case 'planned': return '#F59E0B';
      case 'overdue': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Виконано';
      case 'in_progress': return 'В роботі';
      case 'planned': return 'Заплановано';
      case 'overdue': return 'Прострочено';
      default: return 'Невідомо';
    }
  };

  const getTaskTypeText = (task: any) => {
    // ВИПРАВЛЕНО: Отримуємо договір з правильним порівнянням ID
    const contract = contracts.find((c: any) => String(c.id) === String(task.contractId));
    if (contract && contract.workTypes && contract.workTypes.length > 0) {
      // Використовуємо типи робіт з договору
      return contract.workTypes.join(', ');
    }
    
    // Fallback для старих завдань
    switch (task.type) {
      case 'routine': return 'Планове ТО';
      case 'emergency': return 'Аварійне';
      case 'seasonal': return 'Сезонне ТО';
      case 'diagnostic': return 'Діагностика';
      default: return task.type || 'ТО';
    }
  };

  // Оптимізований фільтр завдань з мемоізацією
  const filteredTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return [];
    }
    
    // Базова валідація завдань
    let filtered = tasks.filter(task => 
      task && 
      task.id && 
      task.scheduledDate && 
      task.contractId && 
      task.objectId
    );
    
    // Фільтрація за статусом
    if (filterStatus && filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }
    
    return filtered;
  }, [tasks, filterStatus]);

  const handleTaskPress = (task: any) => {
    setSelectedTask(task);
    setShowTaskDetails(true);
  };

  const handleEditTask = () => {
    setShowTaskDetails(false);
    router.push(`/add-task?id=${selectedTask.id}`);
  };

  const handleDeleteTask = () => {
    if (Platform.OS === 'web') {
      const confirmed = confirm('Ви впевнені, що хочете видалити це завдання?');
      if (confirmed) {
        // TODO: Implement delete task
        setShowTaskDetails(false);
      }
    } else {
      // Use a custom modal for mobile
      // TODO: Implement custom confirmation modal
      setShowTaskDetails(false);
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.5));
  };



  // Мінімальне логування для продуктивності - винесено в useEffect
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Gantt:', {
        contracts: contracts.length,
        objects: objects.length, 
        tasks: tasks.length,
        filtered: filteredTasks.length,
        periods: timePeriods.length
      });
    }
  }, [contracts.length, objects.length, tasks.length, filteredTasks.length, timePeriods.length]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <EnhancedPageTransition 
      isVisible={!isLoading} 
      animationType="slideInLeft" 
      duration={350}
      delay={50}
    >
      <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Лінія часу</Text>
            <Text style={styles.headerSubtitle}>{objects.length} об&apos;єктів • {filteredTasks.length} завдань • {contracts.length} договорів</Text>

            

          </View>
          <View style={styles.headerRight}>
            <View style={styles.zoomControls}>
              <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut}>
                <Text style={styles.zoomButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.zoomLevel}>{Math.round(zoomLevel * 100)}%</Text>
              <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn}>
                <Text style={styles.zoomButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} color={filterStatus !== 'all' ? '#6366F1' : '#6B7280'} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => router.push('/add-task')}
            >
              <Plus size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.headerBottom}>
          <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
            <Text style={styles.todayButtonText}>Сьогодні</Text>
          </TouchableOpacity>
          
          <View style={styles.swipeHint}>
            <Text style={styles.swipeHintText}>← Проведіть пальцем по лінії часу →</Text>
          </View>
          
          <View style={styles.viewModeContainer}>
            <TouchableOpacity 
              style={styles.viewModeButton}
              onPress={() => setShowViewModeSelector(!showViewModeSelector)}
            >
              <Calendar size={16} color="#6B7280" />
              <Text style={styles.viewModeText}>{VIEW_CONFIGS[viewMode].label}</Text>
            </TouchableOpacity>
            
            {showViewModeSelector && (
              <View style={styles.viewModeSelector}>
                {(Object.keys(VIEW_CONFIGS) as ViewMode[]).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.viewModeOption,
                      viewMode === mode && styles.viewModeOptionActive
                    ]}
                    onPress={() => {
                      setViewMode(mode);
                      setShowViewModeSelector(false);
                    }}
                  >
                    <Text style={[
                      styles.viewModeOptionText,
                      viewMode === mode && styles.viewModeOptionTextActive
                    ]}>
                      {VIEW_CONFIGS[mode].label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
        
        {showFilters && (
          <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
                onPress={() => setFilterStatus('all')}
              >
                <Text style={[styles.filterChipText, filterStatus === 'all' && styles.filterChipTextActive]}>Всі</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, filterStatus === 'planned' && styles.filterChipActive]}
                onPress={() => setFilterStatus('planned')}
              >
                <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={[styles.filterChipText, filterStatus === 'planned' && styles.filterChipTextActive]}>Заплановано</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, filterStatus === 'in_progress' && styles.filterChipActive]}
                onPress={() => setFilterStatus('in_progress')}
              >
                <View style={[styles.statusDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={[styles.filterChipText, filterStatus === 'in_progress' && styles.filterChipTextActive]}>В роботі</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, filterStatus === 'completed' && styles.filterChipActive]}
                onPress={() => setFilterStatus('completed')}
              >
                <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.filterChipText, filterStatus === 'completed' && styles.filterChipTextActive]}>Виконано</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, filterStatus === 'overdue' && styles.filterChipActive]}
                onPress={() => setFilterStatus('overdue')}
              >
                <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />
                <Text style={[styles.filterChipText, filterStatus === 'overdue' && styles.filterChipTextActive]}>Прострочено</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </View>

      <View style={styles.ganttContainer}>
        {/* Фіксований заголовок */}
        <View style={styles.ganttHeader}>
          <View style={styles.objectHeaderCell}>
            <Text style={styles.objectHeaderText}>Об&apos;єкти</Text>
          </View>
          
          <ScrollView 
            ref={headerScrollRef}
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.periodsHeaderScroll}
            onScroll={(event) => handleHorizontalScroll(event, 'header')}
            scrollEventThrottle={16}
            bounces={false}
          >
            <View style={styles.periodsHeaderContent}>
              {timePeriods.map((period, index) => {
                const isCurrent = isCurrentPeriod(period);
                const uniqueKey = `period-${viewMode}-${index}-${period.getTime()}`;
                return (
                  <View key={uniqueKey} style={[
                    styles.periodCell, 
                    { width: VIEW_CONFIGS[viewMode].width * zoomLevel },
                    isCurrent && styles.currentPeriodCell
                  ]}>
                    <Text style={[styles.periodText, isCurrent && styles.currentPeriodText]}>{getPeriodLabel(period)}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Основний контент з фіксованим стовпчиком об'єктів */}
        <View style={styles.ganttContent}>
          {/* Фіксований лівий стовпчик з об'єктами */}
          <View style={styles.objectsColumn}>
            <ScrollView 
              ref={objectsScrollRef}
              style={styles.objectsScroll} 
              showsVerticalScrollIndicator={false}
              onScroll={(event) => handleVerticalScroll(event, 'objects')}
              scrollEventThrottle={16}
              bounces={false}
            >
              {objects.map((object, index) => {
                const objectTasks = filteredTasks.filter(task => String(task.objectId) === String(object.id));
                const uniqueKey = `object-row-${object.id}-${index}`;
                return (
                  <View key={uniqueKey} style={styles.objectRowFixed}>
                    <View style={styles.objectInfo}>
                      <View style={styles.objectHeader}>
                        <View style={styles.objectIcon}>
                          <Text style={styles.objectIconText}>
                            {object.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.objectDetails}>
                          <Text style={styles.objectName} numberOfLines={1}>
                            {object.name}
                          </Text>
                          <Text style={styles.objectClient} numberOfLines={1}>
                            {object.clientName}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.objectStats}>
                        <Text style={styles.objectStatsText}>
                          {objectTasks.length} завдань
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
          
          {/* Права частина з лінією часу - горизонтально скролюється */}
          <ScrollView 
            ref={mainScrollRef}
            horizontal 
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => handleHorizontalScroll(event, 'main')}
            scrollEventThrottle={16}
            bounces={false}
            style={styles.timelineColumn}
          >
            <ScrollView 
              ref={timelineScrollRef}
              style={styles.timelineScroll} 
              showsVerticalScrollIndicator={false}
              onScroll={(event) => handleVerticalScroll(event, 'timeline')}
              scrollEventThrottle={16}
              bounces={false}
            >
              <View style={[
                styles.timelineContainer,
                {
                  width: Math.max(800, timePeriods.length * VIEW_CONFIGS[viewMode].width * zoomLevel),
                  height: Math.max(400, objects.length * 80)
                }
              ]}>
                {/* Фонові лінії для кожного об'єкта */}
                {objects.map((object, index) => {
                  const uniqueKey = `bg-line-${object.id}-${index}`;
                  return (
                    <View key={uniqueKey} style={[
                      styles.objectBackgroundLine,
                      { top: index * 80, left: 0, width: timePeriods.length * VIEW_CONFIGS[viewMode].width * zoomLevel }
                    ]} />
                  );
                })}
                
                {/* Завдання на лінії часу */}
                {filteredTasks.map((task, taskIndex) => {
                  if (!task?.id) return null;
                  
                  const objectIndex = objects.findIndex(obj => String(obj.id) === String(task.objectId));
                  if (objectIndex === -1) return null;
                  
                  const timelinePosition = getTimelinePositionRelative(task, timePeriods);
                  if (timelinePosition < 0 || !isFinite(timelinePosition)) return null;
                  
                  const engineer = engineers.find(e => String(e.id) === String(task.engineerId));
                  const progress = getTaskProgress(task);
                  const isOverdue = isTaskOverdue(task);
                  
                  return (
                    <View key={`task-${task.id}-${viewMode}`} style={[
                      styles.timelineTaskItem,
                      {
                        left: timelinePosition,
                        top: objectIndex * 80 + 24,
                        zIndex: 10 + taskIndex,
                        position: 'absolute'
                      }
                    ]}>
                      <TouchableOpacity
                        style={[
                          styles.timelineTaskCard,
                          { backgroundColor: getStatusColor(task.status) }
                        ]}
                        onPress={() => handleTaskPress(task)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.taskCardHeader}>
                          <Text style={styles.taskCardTitle} numberOfLines={1}>
                            {getTaskTypeText(task)}
                          </Text>
                          <View style={styles.taskCardIcons}>
                            {isOverdue && <AlertTriangle size={12} color="#FFFFFF" />}
                            {task.status === 'completed' && <CheckCircle size={12} color="#FFFFFF" />}
                          </View>
                        </View>
                        
                        <View style={styles.taskCardMeta}>
                          <View style={styles.taskCardMetaItem}>
                            <User size={10} color="rgba(255, 255, 255, 0.8)" />
                            <Text style={styles.taskCardMetaText}>
                              {engineer?.name.split(' ')[0] || 'Інженер'}
                            </Text>
                          </View>
                          <View style={styles.taskCardMetaItem}>
                            <Clock size={10} color="rgba(255, 255, 255, 0.8)" />
                            <Text style={styles.taskCardMetaText}>{task.duration}д</Text>
                          </View>
                        </View>
                        
                        <Text style={styles.taskCardDate}>
                          {formatDate(task.scheduledDate)}
                        </Text>
                        
                        {progress.percentage > 0 && (
                          <View style={styles.taskCardProgress}>
                            <View style={styles.taskCardProgressBar}>
                              <View style={[
                                styles.taskCardProgressFill,
                                { width: `${progress.percentage}%` }
                              ]} />
                            </View>
                            <Text style={styles.taskCardProgressText}>{progress.percentage}%</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
                
                {/* Повідомлення про відсутність завдань */}
                {filteredTasks.length === 0 && (
                  <View style={styles.noTasksMessage}>
                    <Text style={styles.noTasksText}>Немає завдань для відображення</Text>
                    <Text style={styles.noTasksSubtext}>Перевірте фільтри або додайте нові завдання</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </ScrollView>
        </View>
      </View>
      
      <Modal
        visible={showTaskDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTaskDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Деталі завдання</Text>
              <TouchableOpacity onPress={() => setShowTaskDetails(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {selectedTask && (
              <View style={styles.modalBody}>
                <View style={styles.taskDetailRow}>
                  <Text style={styles.taskDetailLabel}>Тип роботи:</Text>
                  <Text style={styles.taskDetailValue}>{getTaskTypeText(selectedTask)}</Text>
                </View>
                
                <View style={styles.taskDetailRow}>
                  <Text style={styles.taskDetailLabel}>Статус:</Text>
                  <View style={styles.statusContainer}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(selectedTask.status) }]} />
                    <Text style={styles.taskDetailValue}>{getStatusText(selectedTask.status)}</Text>
                  </View>
                </View>
                
                <View style={styles.taskDetailRow}>
                  <Text style={styles.taskDetailLabel}>Дата:</Text>
                  <Text style={styles.taskDetailValue}>{formatDate(selectedTask.scheduledDate)}</Text>
                </View>
                
                <View style={styles.taskDetailRow}>
                  <Text style={styles.taskDetailLabel}>Тривалість:</Text>
                  <Text style={styles.taskDetailValue}>{selectedTask.duration} днів</Text>
                </View>
                
                <View style={styles.taskDetailRow}>
                  <Text style={styles.taskDetailLabel}>Інженер:</Text>
                  <Text style={styles.taskDetailValue}>{getEngineer(selectedTask.engineerId)?.name || 'Не призначено'}</Text>
                </View>
                
                <View style={styles.taskDetailRow}>
                  <Text style={styles.taskDetailLabel}>Об&apos;єкт:</Text>
                  <Text style={styles.taskDetailValue}>{getObject(selectedTask.objectId)?.name || 'Невідомий'}</Text>
                </View>
                
                {selectedTask.notes && (
                  <View style={styles.taskDetailRow}>
                    <Text style={styles.taskDetailLabel}>Примітки:</Text>
                    <Text style={styles.taskDetailValue}>{selectedTask.notes}</Text>
                  </View>
                )}
                
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.actionButton} onPress={handleEditTask}>
                    <Edit3 size={16} color="#6366F1" />
                    <Text style={styles.actionButtonText}>Редагувати</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDeleteTask}>
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Видалити</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
      
      {isDebugMode && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            Gantt Debug: Договори: {contracts.length} | Об&apos;єкти: {objects.length} | Завдання: {tasks.length} | Відфільтровані: {filteredTasks.length} | Періоди: {timePeriods.length}
          </Text>
          <Text style={styles.debugText}>
            Scroll: X={Math.round(scrollX)}, Y={Math.round(scrollY)} | Syncing: H={isScrolling ? 'YES' : 'NO'}, V={isVerticalScrolling ? 'YES' : 'NO'}
          </Text>
        </View>
      )}
      </SafeAreaView>
      </View>
    </EnhancedPageTransition>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1000,
    position: 'relative',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 12,
    gap: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  todayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  todayButtonText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600' as const,
  },
  filterButton: {
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filtersContainer: {
    paddingBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  filterChipText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  filterChipTextActive: {
    color: '#6366F1',
    fontWeight: '600' as const,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  viewModeContainer: {
    position: 'relative',
    zIndex: 2000,
  },
  viewModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  viewModeText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600' as const,
  },
  viewModeSelector: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 9999,
    minWidth: 140,
    marginTop: 8,
  },
  viewModeOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 6,
    marginVertical: 3,
  },
  viewModeOptionActive: {
    backgroundColor: '#EEF2FF',
  },
  viewModeOptionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  viewModeOptionTextActive: {
    color: '#6366F1',
    fontWeight: '600' as const,
  },
  navButton: {
    padding: 8,
  },
  debugButton: {
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  debugButtonActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  debugInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,
    gap: 4,
  },
  debugText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ganttContainer: {
    flex: 1,
  },
  ganttHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
  },
  periodsHeaderScroll: {
    flex: 1,
  },
  periodsHeaderContent: {
    flexDirection: 'row',
  },
  objectHeaderCell: {
    width: 200,
    padding: 16,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
  },
  objectHeaderText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
  },
  periodCell: {
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentPeriodCell: {
    backgroundColor: '#EEF2FF',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderLeftColor: '#6366F1',
    borderRightColor: '#6366F1',
  },
  periodText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 14,
  },
  currentPeriodText: {
    color: '#6366F1',
    fontWeight: '600' as const,
  },

  mainScrollContainer: {
    flex: 1,
  },
  ganttContent: {
    flexDirection: 'row',
    flex: 1,
  },
  objectsColumn: {
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 2,
    borderRightColor: '#E5E7EB',
    zIndex: 10,
  },
  objectsScroll: {
    flex: 1,
  },
  objectRowFixed: {
    height: 80,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    justifyContent: 'center',
  },
  timelineColumn: {
    flex: 1,
  },
  timelineScroll: {
    flex: 1,
  },
  ganttRow: {
    flexDirection: 'row',
    height: ROW_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  objectCell: {
    width: 200,
    padding: 16,
    justifyContent: 'space-between',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: '#FAFBFF',
  },
  objectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  objectIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  objectIconText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  objectInfo: {
    flex: 1,
  },
  objectMenu: {
    padding: 4,
  },
  objectName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 2,
  },
  objectClient: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  objectStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  objectStatsText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500' as const,
  },
  timelineRow: {
    flexDirection: 'row',
    flex: 1,
    position: 'relative',
  },
  periodColumn: {
    height: ROW_HEIGHT,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    position: 'relative',
    backgroundColor: '#FAFBFC',
  },
  currentPeriodColumn: {
    backgroundColor: '#F8FAFF',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderLeftColor: '#6366F1',
    borderRightColor: '#6366F1',
  },
  taskContainer: {
    position: 'absolute',
    height: TASK_HEIGHT,
  },
  taskBar: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  taskContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  taskTitle: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600' as const,
    flex: 1,
    marginRight: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  taskMetaText: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500' as const,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 1.5,
  },
  progressText: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600' as const,
    minWidth: 20,
  },
  urgentIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  urgentText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
  overdueIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#111827',
  },
  modalClose: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: '300' as const,
  },
  modalBody: {
    padding: 20,
  },
  taskDetailRow: {
    marginBottom: 16,
  },
  taskDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  taskDetailValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600' as const,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6366F1',
  },
  deleteButton: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 4,
    marginRight: 8,
  },
  zoomButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  zoomButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  zoomLevel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500' as const,
    minWidth: 35,
    textAlign: 'center',
  },
  
  // Нові стилі для лінії часу
  timelineBody: {
    flex: 1,
    minHeight: 600,
  },
  timelineContainer: {
    position: 'relative',
    minHeight: 800,
    paddingVertical: 10,
    backgroundColor: '#FAFBFC',
  },
  
  // Стилі для списку об'єктів
  objectsList: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 200,
    zIndex: 2,
  },
  objectRow: {
    position: 'absolute',
    width: 200,
    height: 80,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    borderRightWidth: 2,
    borderRightColor: '#E5E7EB',
    justifyContent: 'center',
  },
  objectDetails: {
    flex: 1,
  },
  
  // Стилі для завдань на лінії часу
  timelineTaskItem: {
    position: 'absolute',
    width: 120,
    zIndex: 10,
  },
  objectBackgroundLine: {
    position: 'absolute',
    height: 80,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    zIndex: 1,
  },
  timelineTaskCard: {
    borderRadius: 6,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 32,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskCardTitle: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    flex: 1,
    marginRight: 2,
  },
  taskCardIcons: {
    flexDirection: 'row',
    gap: 2,
  },
  taskCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  taskCardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  taskCardMetaText: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500' as const,
  },
  taskCardDate: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  taskCardProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskCardProgressBar: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  taskCardProgressFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 1,
  },
  taskCardProgressText: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600' as const,
    minWidth: 22,
  },
  
  syncHint: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    marginTop: 4,
  },
  
  swipeHint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  
  swipeHintText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  
  noTasksMessage: {
    position: 'absolute',
    top: 100,
    left: 50,
    right: 50,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  
  noTasksText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 4,
    textAlign: 'center',
  },
  
  noTasksSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

});