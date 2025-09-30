import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  Linking,
  Platform,
  Alert,
  Dimensions,
  Animated,
  LayoutAnimation
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OptimizedFlatList from '@/components/OptimizedFlatList';
import EnhancedLoadingSpinner from '@/components/EnhancedLoadingSpinner';
import SmartRefreshControl from '@/components/SmartRefreshControl';
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor';
import { useOptimizedState } from '@/hooks/use-optimized-state';
import { ScrollablePage } from '@/components/ScrollablePage';
import { Plus, Search, Calendar, User, Building2, FileCheck, CheckCircle2, ChevronDown, X, MapPin, Link2, FileText, Wrench, ChevronUp, Eye, EyeOff, Archive, AlertTriangle, Navigation, Database, Trash2, WifiOff, Wifi } from 'lucide-react-native';
import GradientButton from '@/components/GradientButton';
import EnhancedPageTransition from '@/components/EnhancedPageTransition';
import FadeInView from '@/components/FadeInView';
import SmartPageTransition, { useSmartNavigation } from '@/components/SmartPageTransition';
import GestureNavigation from '@/components/GestureNavigation';
import NavigationPerformanceMonitor from '@/components/NavigationPerformanceMonitor';
import { useBusinessData, formatDateDisplay } from '@/hooks/use-business-data';
import { router } from 'expo-router';

import { colors, spacing, borderRadius, fontSize, fontWeight, animations } from '@/constants/colors';

import { useAutoSaveState } from '@/hooks/use-auto-save-state';
import { useDebugSettings } from '@/hooks/use-debug-settings';


// Використовуємо функцію форматування дат з хука
const formatDate = formatDateDisplay;

export default function ContractsScreen() {
  const { contracts, objects, engineers, tasks, isLoading, refreshData, updateContract, archiveContract } = useBusinessData();
  const { navigateWithSmartTransition, getCurrentTransitionType } = useSmartNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [searchValue, setSearchValue, debouncedSearchValue] = useOptimizedState('', 300);
  const performanceMonitor = usePerformanceMonitor('ContractsScreen');
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [archiveModalVisible, setArchiveModalVisible] = useState(false);
  const [contractToArchive, setContractToArchive] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [compactMode, setCompactMode] = useState(true);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-50));
  const [scaleAnim] = useState(new Animated.Value(0.95));
  const [headerAnim] = useState(new Animated.Value(0));
  const [cardAnimations] = useState(new Map<string, Animated.Value>());
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showNetworkBanner, setShowNetworkBanner] = useState<boolean>(false);


  // Автоматичне збереження стану для можливості відкату
  useAutoSaveState();
  
  // Налагодження
  const { isDebugEnabled } = useDebugSettings();
  const isDebugActive = isDebugEnabled('contracts');

  // Відстеження змін розміру екрану з кросплатформною сумісністю
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => {
      if (Platform.OS !== 'web' && subscription?.remove) {
        subscription.remove();
      }
    };
  }, []);

  // Відстеження стану мережі
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleOnline = () => {
        setIsOnline(true);
        setShowNetworkBanner(false);
      };
      
      const handleOffline = () => {
        setIsOnline(false);
        setShowNetworkBanner(true);
        // Приховуємо банер через 10 секунд
        setTimeout(() => setShowNetworkBanner(false), 10000);
      };

      // Перевіряємо початковий стан
      setIsOnline(navigator.onLine);
      if (!navigator.onLine) {
        setShowNetworkBanner(true);
        setTimeout(() => setShowNetworkBanner(false), 10000);
      }

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Використовуємо дебаунсований пошук
  React.useEffect(() => {
    setSearchQuery(debouncedSearchValue);
  }, [debouncedSearchValue]);

  // Автоматично скидати фільтри при очищенні пошукового поля
  useEffect(() => {
    if (searchQuery === '') {
      // Можна додати додаткову логіку скидання, якщо потрібно
    }
  }, [searchQuery]);

  // Визначаємо тип пристрою на основі розміру екрану з урахуванням платформи
  const isTablet = screenData.width >= 768;
  const isLargeScreen = screenData.width >= 1024;
  const isSmallScreen = screenData.width < 480;
  const isWeb = Platform.OS === 'web';
  const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';
  
  // Адаптивні розміри для різних платформ
  const adaptiveSpacing = {
    xs: isSmallScreen ? 4 : 8,
    sm: isSmallScreen ? 6 : 12,
    md: isSmallScreen ? 8 : 16,
    lg: isSmallScreen ? 12 : 20,
    xl: isSmallScreen ? 16 : 24
  };
  
  const adaptiveFontSize = {
    xs: isSmallScreen ? 10 : 12,
    sm: isSmallScreen ? 12 : 14,
    base: isSmallScreen ? 14 : 16,
    lg: isSmallScreen ? 16 : 18,
    xl: isSmallScreen ? 18 : 20
  };

  const filteredContracts = useMemo(() => {
    // Якщо дані ще завантажуються, повертаємо порожній масив
    if (isLoading || contracts.length === 0) {
      if (isDebugActive) {
        console.log('📊 Contracts: Loading or no contracts available', {
          isLoading,
          contractsCount: contracts.length
        });
      }
      return [];
    }
    
    // Спочатку фільтруємо тільки активні договори (не архівні)
    const activeContracts = contracts.filter(contract => contract.status !== 'completed' && contract.status !== 'archived');
    
    if (isDebugActive) {
      console.log('📊 Contracts: Data summary', {
        totalContracts: contracts.length,
        activeContracts: activeContracts.length,
        objects: objects.length,
        engineers: engineers.length,
        tasks: tasks.length,
        searchQuery: searchQuery || 'none'
      });
    }
    
    if (!searchQuery) return activeContracts;
    const query = searchQuery.toLowerCase();
    const filtered = activeContracts.filter(contract => 
      contract.contractNumber.toLowerCase().includes(query) ||
      contract.clientName.toLowerCase().includes(query) ||
      objects.find(o => o.id === contract.objectId)?.name.toLowerCase().includes(query)
    );
    
    if (isDebugActive) {
      console.log('📊 Contracts: Search results', {
        query,
        totalActive: activeContracts.length,
        filtered: filtered.length,
        matchedContracts: filtered.map(c => ({ id: c.id, number: c.contractNumber, client: c.clientName }))
      });
    }
    
    return filtered;
  }, [contracts, objects, searchQuery, isLoading, engineers, tasks, isDebugActive]);

  const getObject = (objectId: string) => objects.find(o => o.id === objectId);
  
  const getTasksForContract = (contractId: string) => tasks.filter(t => t.contractId === contractId);
  
  const getEngineer = (engineerId: string) => engineers.find(e => e.id === engineerId);

  // Функція для перевірки, чи можна архівувати договір
  const canArchiveContract = (contract: any): { allowed: boolean; reason: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Перевіряємо можливість архівації
    
    // Перевіряємо дату закінчення договору
    const contractEndDate = new Date(contract.endDate);
    contractEndDate.setHours(0, 0, 0, 0);
    
    // Перевіряємо дату закінчення
    
    if (contractEndDate > today) {
      const daysLeft = Math.ceil((contractEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      // Договір ще не закінчився
      return {
        allowed: false,
        reason: `Договір ще не закінчився. До завершення залишилось ${daysLeft} днів (до ${formatDateDisplay(contract.endDate)}).`
      };
    }
    
    // Перевіряємо періоди ТО
    if (contract.maintenancePeriods && contract.maintenancePeriods.length > 0) {
      // Перевіряємо періоди ТО
      
      for (const period of contract.maintenancePeriods) {
        const periodEndDate = new Date(period.endDate);
        periodEndDate.setHours(0, 0, 0, 0);
        
        // Перевіряємо період
        
        if (periodEndDate > today) {
          const daysLeft = Math.ceil((periodEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          // Період ще не завершений
          return {
            allowed: false,
            reason: `Є незавершені періоди ТО. Період ${period.id} закінчується ${formatDateDisplay(period.endDate)} (через ${daysLeft} днів).`
          };
        }
      }
    }
    
    // Договір можна архівувати
    return { allowed: true, reason: '' };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#22C55E';
      case 'completed': return '#64748B';
      case 'final_works': return '#F59E0B';
      case 'extension': return '#A855F7';
      default: return '#64748B';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Активний';
      case 'completed': return 'Завершено';
      case 'final_works': return 'Крайні роботи';
      case 'extension': return 'Пролонгація';
      default: return status;
    }
  };

  const statusOptions = [
    { value: 'active', label: 'Активний', color: '#22C55E' },
    { value: 'completed', label: 'Завершено', color: '#64748B' },
    { value: 'final_works', label: 'Крайні роботи', color: '#F59E0B' },
    { value: 'extension', label: 'Пролонгація', color: '#A855F7' },
  ];

  const handleStatusChange = (contractId: string, newStatus: string) => {
    if (isDebugActive) {
      console.log('📊 Contracts: Status change requested', {
        contractId,
        newStatus,
        timestamp: new Date().toISOString()
      });
    }
    
    // Перевіряємо, чи можна архівувати договір
    if (newStatus === 'completed') {
      const contract = contracts.find(c => c.id === contractId);
      if (contract) {
        const canArchive = canArchiveContract(contract);
        if (isDebugActive) {
          console.log('📊 Contracts: Archive validation', {
            contractId,
            contractNumber: contract.contractNumber,
            canArchive: canArchive.allowed,
            reason: canArchive.reason
          });
        }
        
        if (!canArchive.allowed) {
          Alert.alert(
            'Неможливо архівувати',
            canArchive.reason,
            [{ text: 'Зрозуміло', style: 'default' }]
          );
          setStatusModalVisible(false);
          setSelectedContract(null);
          return;
        }
      }
    }
    
    updateContract(contractId, { status: newStatus as any });
    setStatusModalVisible(false);
    setSelectedContract(null);
    
    if (isDebugActive) {
      console.log('📊 Contracts: Status changed successfully', {
        contractId,
        newStatus
      });
    }
  };

  const openStatusModal = (contractId: string) => {
    setSelectedContract(contractId);
    setStatusModalVisible(true);
  };

  const handleArchiveContract = async (contractId: string) => {
    if (isDebugActive) {
      console.log('📊 Contracts: Archive operation started', {
        contractId,
        timestamp: new Date().toISOString()
      });
    }
    
    try {
      await archiveContract(contractId);
      setArchiveModalVisible(false);
      setContractToArchive(null);
      Alert.alert('Успіх', 'Договір переміщено до архіву');
      
      if (isDebugActive) {
        console.log('📊 Contracts: Archive operation completed successfully', {
          contractId
        });
      }
    } catch (error) {
      console.error('Error archiving contract:', error);
      Alert.alert('Помилка', 'Не вдалося архівувати договір');
      
      if (isDebugActive) {
        console.log('📊 Contracts: Archive operation failed', {
          contractId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  };

  const openArchiveModal = (contractId: string) => {
    setContractToArchive(contractId);
    setArchiveModalVisible(true);
  };

  const toggleCardExpansion = (contractId: string) => {
    // Анімація розгортання карток
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext({
        duration: 250,
        create: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
        update: {
          type: LayoutAnimation.Types.spring,
          springDamping: 0.8,
        },
      });
    }
    
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(contractId)) {
      newExpanded.delete(contractId);
    } else {
      newExpanded.add(contractId);
    }
    setExpandedCards(newExpanded);
  };

  const toggleCompactMode = () => {
    // Анімація переходу
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext({
        duration: 300,
        create: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
        },
      });
    }
    
    setCompactMode(!compactMode);
    if (!compactMode) {
      setExpandedCards(new Set()); // Згорнути всі картки при переході в компактний режим
    }
  };

  const getMaintenancePeriodsText = (contract: any) => {
    if (contract.maintenancePeriods && contract.maintenancePeriods.length > 0) {
      return `${contract.maintenancePeriods.length} періодів ТО`;
    }
    // Підтримка старих даних
    if (contract.serviceFrequency) {
      if (typeof contract.serviceFrequency === 'number') {
        return `Кожні ${contract.serviceFrequency} міс.`;
      }
      switch (contract.serviceFrequency) {
        case 'quarterly': return 'Кожні 3 міс.';
        case 'biannual': return 'Кожні 6 міс.';
        case 'triannual': return 'Кожні 4 міс.';
        case 'annual': return 'Кожні 12 міс.';
        default: return String(contract.serviceFrequency);
      }
    }
    return 'Не вказано';
  };

  const getMaintenanceColorAndStyle = (maintenanceDate: Date) => {
    const now = new Date();
    const diffTime = maintenanceDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      // Дата вже минула - червоний колір
      return {
        backgroundColor: '#FEF2F2',
        borderLeftColor: '#EF4444',
        textColor: '#DC2626'
      };
    } else if (diffDays <= 7) {
      // В межах тижня - оранжевий колір
      return {
        backgroundColor: '#FEF3C7',
        borderLeftColor: '#F59E0B',
        textColor: '#D97706'
      };
    } else {
      // Більше тижня - зелений колір
      return {
        backgroundColor: '#F0FDF4',
        borderLeftColor: '#22C55E',
        textColor: '#16A34A'
      };
    }
  };

  const getNextMaintenanceInfo = (contract: any) => {
    console.log('🔥 getNextMaintenanceInfo called for contract:', contract.contractNumber);
    console.log('🔥 Contract maintenance periods:', contract.maintenancePeriods);
    console.log('🔥 Full contract object:', JSON.stringify(contract, null, 2));
    
    // Якщо є нові періоди ТО
    if (contract.maintenancePeriods && contract.maintenancePeriods.length > 0) {
      const now = new Date();
      console.log('🔥 Current date:', now.toISOString());
      
      // Функція для конвертації дати в Date об'єкт
      const parseDate = (dateStr: string): Date => {
        console.log('🔥 parseDate input:', dateStr);
        
        if (!dateStr) {
          console.log('🔥 parseDate: empty input, returning current date');
          return new Date();
        }
        
        if (dateStr.includes('-')) {
          // ISO формат YYYY-MM-DD
          console.log('🔥 parseDate: ISO format detected');
          const date = new Date(dateStr + 'T00:00:00.000Z');
          console.log('🔥 parseDate: ISO result:', date.toISOString());
          return date;
        } else if (dateStr.includes('.')) {
          // Display формат DD.MM.YYYY - конвертуємо в ISO
          const parts = dateStr.split('.');
          console.log('🔥 parseDate: display format parts:', parts);
          
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            let year = parts[2];
            
            console.log('🔥 parseDate: original year:', year);
            
            // Перевіряємо, чи рік повний (4 цифри) чи короткий (2 цифри)
            if (year.length === 2) {
              const shortYear = parseInt(year);
              year = shortYear <= 50 ? `20${year}` : `19${year}`;
              console.log('🔥 parseDate: converted short year to:', year);
            } else if (year.length === 4) {
              console.log('🔥 parseDate: full year, keeping as is:', year);
            }
            
            const isoString = `${year}-${month}-${day}`;
            console.log('🔥 parseDate: constructed ISO string:', isoString);
            
            const date = new Date(isoString + 'T00:00:00.000Z');
            console.log('🔥 parseDate: final date result:', date.toISOString());
            return date;
          }
        }
        
        console.log('🔥 parseDate: fallback to direct Date constructor');
        const date = new Date(dateStr);
        console.log('🔥 parseDate: fallback result:', date.toISOString());
        return date;
      };
      
      // Знаходимо поточний період ТО
      const currentPeriod = contract.maintenancePeriods.find((period: any) => {
        const startDate = parseDate(period.startDate);
        const endDate = parseDate(period.endDate);
        
        console.log('🔥 Checking period:', period.id, 'start:', startDate.toISOString(), 'end:', endDate.toISOString());
        return now >= startDate && now <= endDate;
      });
      
      if (currentPeriod) {
        console.log('🔥 Found current period:', currentPeriod.id);
        const endDate = parseDate(currentPeriod.endDate);
        return {
          date: endDate,
          text: 'Поточний період ТО',
          isActive: true,
          colorStyle: getMaintenanceColorAndStyle(endDate)
        };
      }
      
      // Знаходимо найближчий майбутній період
      const futurePeriods = contract.maintenancePeriods
        .map((period: any) => {
          const startDate = parseDate(period.startDate);
          return { ...period, parsedStartDate: startDate };
        })
        .filter((period: any) => period.parsedStartDate > now)
        .sort((a: any, b: any) => a.parsedStartDate.getTime() - b.parsedStartDate.getTime());
      
      if (futurePeriods.length > 0) {
        console.log('🔥 Found future period:', futurePeriods[0].id, futurePeriods[0].parsedStartDate.toISOString());
        return {
          date: futurePeriods[0].parsedStartDate,
          text: 'Наступний період ТО',
          isActive: false,
          colorStyle: getMaintenanceColorAndStyle(futurePeriods[0].parsedStartDate)
        };
      }
      
      // Якщо всі періоди минули, показуємо дату наступного ТО на основі останнього періоду
      const lastPeriod = contract.maintenancePeriods
        .map((period: any) => {
          const endDate = parseDate(period.endDate);
          return { ...period, parsedEndDate: endDate };
        })
        .sort((a: any, b: any) => b.parsedEndDate.getTime() - a.parsedEndDate.getTime())[0];
      
      // Розраховуємо наступне ТО на основі частоти (припускаємо 3 місяці)
      const frequency = typeof contract.serviceFrequency === 'number' 
        ? contract.serviceFrequency 
        : 3; // За замовчуванням 3 місяці
      
      const nextMaintenanceDate = new Date(lastPeriod.parsedEndDate);
      nextMaintenanceDate.setMonth(nextMaintenanceDate.getMonth() + frequency);
      
      console.log('🔥 All periods passed, calculated next maintenance date:', nextMaintenanceDate.toISOString());
      return {
        date: nextMaintenanceDate,
        text: 'Наступне ТО (розраховано)',
        isActive: false,
        colorStyle: getMaintenanceColorAndStyle(nextMaintenanceDate)
      };
    }
    
    console.log('🔥 No maintenance periods found, using legacy calculation');
    // Підтримка старих даних
    const frequency = typeof contract.serviceFrequency === 'number' 
      ? contract.serviceFrequency 
      : contract.serviceFrequency === 'quarterly' ? 3
      : contract.serviceFrequency === 'biannual' ? 6
      : contract.serviceFrequency === 'triannual' ? 4
      : contract.serviceFrequency === 'annual' ? 12
      : 1;
    
    let baseDate: Date;
    if (contract.maintenanceStartDate) {
      baseDate = new Date(contract.maintenanceStartDate);
    } else {
      baseDate = new Date(contract.startDate);
      baseDate.setMonth(baseDate.getMonth() + frequency);
    }
    
    const now = new Date();
    let nextDate = new Date(baseDate);
    
    while (nextDate <= now) {
      nextDate.setMonth(nextDate.getMonth() + frequency);
    }
    
    return {
      date: nextDate,
      text: 'Наступне ТО (розраховано)',
      isActive: false,
      colorStyle: getMaintenanceColorAndStyle(nextDate)
    };
  };

  const onRefresh = async () => {
    if (isDebugActive) {
      console.log('📊 Contracts: Refresh started', {
        timestamp: new Date().toISOString()
      });
    }
    
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
    
    if (isDebugActive) {
      console.log('📊 Contracts: Refresh completed', {
        contractsCount: contracts.length,
        objectsCount: objects.length,
        engineersCount: engineers.length,
        tasksCount: tasks.length
      });
    }
  };

  const openMapLink = async (mapLink: string) => {
    try {
      const supported = await Linking.canOpenURL(mapLink);
      if (supported) {
        await Linking.openURL(mapLink);
      } else {
        console.log('Cannot open URL:', mapLink);
      }
    } catch (error) {
      console.error('Error opening map link:', error);
    }
  };

  const openNavigation = async (contract: any) => {
    try {
      const object = getObject(contract.objectId);
      const address = contract.address || object?.address;
      
      if (!address && !contract.mapLink && !object?.mapLink) {
        Alert.alert('Помилка', 'Адреса об\'єкта не вказана');
        return;
      }
      
      // На веб-версії відкриваємо Google Maps напряму
      if (Platform.OS === 'web') {
        openGoogleMaps(address, contract.mapLink || object?.mapLink);
        return;
      }
      
      // Показуємо вибір навігаційної системи для мобільних пристроїв
      const buttons = [
        {
          text: 'Waze',
          onPress: () => openWaze(address, contract.mapLink || object?.mapLink)
        },
        {
          text: 'Google Maps',
          onPress: () => openGoogleMaps(address, contract.mapLink || object?.mapLink)
        },
        {
          text: 'Скасувати',
          style: 'cancel' as const
        }
      ];
      
      if (Platform.OS === 'ios') {
        buttons.splice(2, 0, {
          text: 'Apple Maps',
          onPress: () => openAppleMaps(address, contract.mapLink || object?.mapLink)
        });
      }
      
      Alert.alert(
        'Вибрати навігацію',
        'Оберіть навігаційну систему:',
        buttons
      );
    } catch (error) {
      console.error('Error opening navigation:', error);
      Alert.alert('Помилка', 'Не вдалося відкрити навігацію');
    }
  };

  const openWaze = async (address: string, mapLink?: string) => {
    try {
      if (!address?.trim()) {
        Alert.alert('Помилка', 'Адреса не вказана');
        return;
      }
      
      const encodedAddress = encodeURIComponent(address.trim());
      const wazeUrl = `waze://?q=${encodedAddress}&navigate=yes`;
      console.log('Opening Waze with URL:', wazeUrl);
      
      // Намагаємося відкрити Waze напряму
      try {
        await Linking.openURL(wazeUrl);
      } catch (linkingError) {
        console.log('Failed to open Waze app, trying web fallback');
        
        // Якщо не вдалося відкрити додаток, пробуємо веб-версію
        const webUrl = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;
        
        try {
          await Linking.openURL(webUrl);
        } catch (webError) {
          // Якщо і веб-версія не працює, показуємо опції
          Alert.alert(
            'Waze недоступний',
            'Не вдалося відкрити Waze. Спробувати Google Maps?',
            [
              {
                text: 'Google Maps',
                onPress: () => openGoogleMaps(address, mapLink)
              },
              {
                text: 'Скасувати',
                style: 'cancel'
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error opening Waze:', error);
      Alert.alert(
        'Помилка',
        'Не вдалося відкрити Waze. Спробувати Google Maps?',
        [
          {
            text: 'Google Maps',
            onPress: () => openGoogleMaps(address, mapLink)
          },
          {
            text: 'Скасувати',
            style: 'cancel'
          }
        ]
      );
    }
  };

  const openGoogleMaps = async (address: string, mapLink?: string) => {
    try {
      if (!address?.trim()) {
        Alert.alert('Помилка', 'Адреса не вказана');
        return;
      }
      
      const encodedAddress = encodeURIComponent(address.trim());
      const googleMapsUrl = Platform.select({
        ios: `maps://app?daddr=${encodedAddress}`,
        android: `google.navigation:q=${encodedAddress}`,
        web: `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`
      });

      const canOpen = await Linking.canOpenURL(googleMapsUrl!);
      if (canOpen) {
        await Linking.openURL(googleMapsUrl!);
      } else {
        // Fallback до веб-версії
        const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error('Error opening Google Maps:', error);
      Alert.alert('Помилка', 'Не вдалося відкрити Google Maps');
    }
  };

  const openAppleMaps = async (address: string, mapLink?: string) => {
    try {
      let appleUrl = '';
      
      if (address) {
        const encodedAddress = encodeURIComponent(address);
        appleUrl = `http://maps.apple.com/?daddr=${encodedAddress}`;
      }
      
      if (!appleUrl) {
        Alert.alert('Помилка', 'Не вдалося створити посилання для Apple Maps');
        return;
      }
      
      console.log('Opening Apple Maps URL:', appleUrl);
      const supported = await Linking.canOpenURL(appleUrl);
      if (supported) {
        await Linking.openURL(appleUrl);
      } else {
        Alert.alert('Помилка', 'Apple Maps недоступні на цьому пристрої');
      }
    } catch (error) {
      console.error('Error opening Apple Maps:', error);
      Alert.alert('Помилка', 'Не вдалося відкрити Apple Maps');
    }
  };

  // Покращена анімація появи при завантаженні
  useEffect(() => {
    if (!isLoading && Platform.OS !== 'web') {
      // Послідовна анімація з покращеними параметрами
      Animated.sequence([
        // Спочатку анімуємо заголовок з підскакуванням
        Animated.spring(headerAnim, {
          toValue: 1,
          tension: animations.spring.bouncyTension,
          friction: animations.spring.bouncyFriction,
          useNativeDriver: true,
        }),
        // Потім основний контент з плавними переходами
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: animations.duration.slow,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: animations.spring.tension,
            friction: animations.spring.friction,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: animations.spring.bouncyTension,
            friction: animations.spring.friction,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else if (!isLoading && Platform.OS === 'web') {
      // Для веб-версії просто встановлюємо значення
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      scaleAnim.setValue(1);
      headerAnim.setValue(1);
    }
  }, [isLoading, fadeAnim, slideAnim, scaleAnim, headerAnim]);

  // Анімація карток при появі
  const animateCard = (contractId: string) => {
    if (!cardAnimations.has(contractId)) {
      const cardAnim = new Animated.Value(0);
      cardAnimations.set(contractId, cardAnim);
      
      Animated.spring(cardAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Animated.View style={styles.loadingIconContainer}>
            <EnhancedLoadingSpinner size="large" />
          </Animated.View>
          <Animated.Text style={styles.loadingText}>
            Завантаження даних...
          </Animated.Text>
        </View>
      </View>
    );
  }

  return (
    <SmartPageTransition 
      enableTransitions={true} 
      customTransition={getCurrentTransitionType()}
      transitionDuration={450}
      enableParallax={true}
    >
      <GestureNavigation 
        enableSwipeBack={true}
        enableSwipeForward={false}
        swipeThreshold={120}
        enableHapticFeedback={true}
      >
        <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
        
        {/* Банер про стан мережі */}
        {showNetworkBanner && Platform.OS === 'web' && (
          <View style={styles.networkBanner}>
            <WifiOff size={16} color={colors.white} style={styles.networkIcon} />
            <Text style={styles.networkBannerText}>
              Немає підключення до інтернету. Працюємо в офлайн режимі.
            </Text>
            <TouchableOpacity 
              style={styles.networkBannerClose}
              onPress={() => setShowNetworkBanner(false)}
            >
              <X size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        )}
        <Animated.View style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [{
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0]
              })
            }]
          }
        ]}>
        {/* Перший рядок - основні дії */}
        <View style={[
          styles.primaryActionsRow, 
          isTablet && styles.primaryActionsRowTablet,
          isWeb && styles.primaryActionsRowWeb,
          isSmallScreen && styles.primaryActionsRowSmall
        ]}>
          <GradientButton
            title="Додати договір"
            onPress={() => navigateWithSmartTransition('/add-contract', { transition: 'scale' })}
            variant="primary"
            size="small"
            icon={<Plus size={16} color="#FFFFFF" />}
            fullWidth
          />
          
          <GradientButton
            title="Архів"
            onPress={() => navigateWithSmartTransition('/archive', { transition: 'bounce' })}
            variant="purple"
            size="small"
            icon={<Archive size={16} color="#FFFFFF" />}
            fullWidth
          />
          
          <GradientButton
            title="Експорт/Імпорт"
            onPress={() => navigateWithSmartTransition('/sync-data', { transition: 'bounce' })}
            variant="ocean"
            size="small"
            icon={<Database size={16} color="#FFFFFF" />}
            fullWidth
          />
          
          <GradientButton
            title={compactMode ? 'Повний вигляд' : 'Компактний вигляд'}
            onPress={toggleCompactMode}
            variant={compactMode ? 'success' : 'warning'}
            size="small"
            icon={compactMode ? <Eye size={16} color="#FFFFFF" /> : <EyeOff size={16} color="#FFFFFF" />}
            fullWidth
          />
        </View>
        


        {/* Другий рядок - пошук */}
        <View style={[
          styles.searchContainer, 
          isTablet && styles.searchContainerTablet,
          isWeb && styles.searchContainerWeb,
          isSmallScreen && styles.searchContainerSmall
        ]}>
          <Search size={isSmallScreen ? 16 : 20} color="#9CA3AF" />
          <TextInput
            style={[styles.searchInput, isSmallScreen && styles.searchInputSmall]}
            placeholder={isSmallScreen ? "Пошук договорів..." : "Пошук договорів за номером, клієнтом або об'єктом..."}
            value={searchValue}
            onChangeText={setSearchValue}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Третій рядок - додаткові функції */}
        {engineers.length === 0 && (
          <View style={styles.secondaryActionsRow}>
            <GradientButton
              title="Управління даними"
              onPress={() => navigateWithSmartTransition('/sync-data', { transition: 'bounce' })}
              variant="forest"
              size="small"
              icon={<Database size={16} color="#FFFFFF" />}
            />
          </View>
        )}
      </Animated.View>

      <Animated.ScrollView 
        style={[styles.scrollView, {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <SmartRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            title="Оновлення договорів..."
          />
        }
      >
        {filteredContracts.map((contract, index) => {
          // Анімуємо картку при появі
          animateCard(contract.id);
          const cardAnim = cardAnimations.get(contract.id) || new Animated.Value(1);
          const object = getObject(contract.objectId);
          const contractTasks = getTasksForContract(contract.id);
          const upcomingTask = contractTasks
            .filter(t => t.status !== 'completed')
            .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0];
          const isExpanded = expandedCards.has(contract.id);
          const showCompact = compactMode && !isExpanded;
          
          return (
            <Animated.View 
              key={contract.id} 
              style={[
                styles.contractCard, 
                showCompact && styles.compactCard,
                isTablet && styles.contractCardTablet,
                isLargeScreen && styles.contractCardLarge,
                isSmallScreen && styles.contractCardSmall,
                isWeb && styles.contractCardWeb,
                isMobile && styles.contractCardMobile,
                {
                  opacity: cardAnim,
                  transform: [
                    {
                      translateY: cardAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0]
                      })
                    },
                    {
                      scale: cardAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.95, 1]
                      })
                    }
                  ]
                }
              ]}
            >
              <TouchableOpacity 
                style={styles.contractHeader}
                onPress={() => navigateWithSmartTransition(`/edit-contract?id=${contract.id}`, { transition: 'scale' })}
                activeOpacity={0.8}
              >
                <View style={styles.contractTitleSection}>
                  <View style={styles.objectNameContainer}>
                    <Building2 size={isSmallScreen ? 14 : 16} color="#6B7280" />
                    <Text style={[styles.objectName, isSmallScreen && styles.objectNameSmall]} numberOfLines={isSmallScreen ? 1 : 2}>{object?.name || 'Невідомий'}</Text>
                    {showCompact && (
                      <Text style={[styles.compactContractNumber, isSmallScreen && styles.compactContractNumberSmall]}>• {contract.contractNumber}</Text>
                    )}
                  </View>
                  
                  {!showCompact && (
                    <View style={styles.contractNumberContainer}>
                      <FileCheck size={isSmallScreen ? 12 : 14} color="#6B7280" />
                      <Text style={[styles.contractNumber, isSmallScreen && styles.contractNumberSmall]}>{contract.contractNumber}</Text>
                    </View>
                  )}
                  
                  <View style={styles.contractDatesContainer}>
                    <Calendar size={isSmallScreen ? 10 : 12} color="#6B7280" />
                    <Text style={[styles.contractDates, isSmallScreen && styles.contractDatesSmall]}>
                      {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                    </Text>
                  </View>
                  

                  
                  {showCompact && contract.contactPerson && (
                    <View style={styles.compactContactContainer}>
                      <User size={12} color="#6B7280" />
                      <Text style={styles.compactContactText}>{contract.contactPerson}</Text>
                    </View>
                  )}
                  
                  {showCompact && !contract.contactPerson && (
                    <View style={styles.compactContactContainer}>
                      <User size={12} color="#6B7280" />
                      <Text style={[styles.compactContactText, { fontStyle: 'italic', color: '#9CA3AF' }]}>Контактна особа не вказана</Text>
                    </View>
                  )}
                  
                  {!showCompact && contract.contactPerson && (
                    <View style={styles.contactPersonContainer}>
                      <User size={14} color="#6B7280" />
                      <Text style={styles.contactPersonText}>{contract.contactPerson}</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.headerActions}>
                  <TouchableOpacity 
                    style={[styles.statusBadge, { backgroundColor: getStatusColor(contract.status) + '20' }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      openStatusModal(contract.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.statusText, { color: getStatusColor(contract.status) }]}>
                      {getStatusText(contract.status)}
                    </Text>
                    <ChevronDown size={12} color={getStatusColor(contract.status)} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.archiveButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      openArchiveModal(contract.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={14} color="#F59E0B" />
                  </TouchableOpacity>
                  
                  {compactMode && (
                    <>
                      {(contract.address || getObject(contract.objectId)?.address) && (
                        <TouchableOpacity 
                          style={styles.compactNavigationButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            openNavigation(contract);
                          }}
                          activeOpacity={0.8}
                        >
                          <Navigation size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity 
                        style={styles.expandButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleCardExpansion(contract.id);
                        }}
                        activeOpacity={0.7}
                      >
                        {isExpanded ? 
                          <ChevronUp size={16} color="#6B7280" /> : 
                          <ChevronDown size={16} color="#6B7280" />
                        }
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </TouchableOpacity>

              {!showCompact && (
                <View style={styles.contractInfo}>
                <View style={styles.infoRow}>
                  <User size={14} color="#6B7280" />
                  <Text style={styles.infoLabel}>Контрагент:</Text>
                  <Text style={styles.infoValue}>{contract.clientName}</Text>
                </View>

                {contract.address && (
                  <View style={styles.infoRow}>
                    <MapPin size={14} color="#6B7280" />
                    <Text style={styles.infoLabel}>Адреса:</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>{contract.address}</Text>
                  </View>
                )}

                {contract.workTypes && contract.workTypes.length > 0 && (
                  <View style={styles.infoRow}>
                    <Wrench size={14} color="#6B7280" />
                    <Text style={styles.infoLabel}>Види робіт:</Text>
                    <Text style={styles.infoValue}>{contract.workTypes.join(', ')}</Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Calendar size={14} color="#6B7280" />
                  <Text style={styles.infoLabel}>ТО:</Text>
                  <Text style={styles.infoValue}>{getMaintenancePeriodsText(contract)}</Text>
                </View>

                {contract.maintenancePeriods && contract.maintenancePeriods.length > 0 && (
                  <View style={styles.maintenancePeriodsInfo}>
                    {contract.maintenancePeriods.slice(0, 2).map((period: any, index: number) => {
                      // Використовуємо функцію formatDateDisplay для правильного форматування
                      const startDateFormatted = formatDateDisplay(period.startDate);
                      const endDateFormatted = formatDateDisplay(period.endDate);
                      
                      return (
                        <View key={period.id} style={styles.periodInfo}>
                          <Calendar size={12} color="#10B981" />
                          <Text style={styles.periodText}>
                            Період {index + 1}: {startDateFormatted} - {endDateFormatted}
                          </Text>
                        </View>
                      );
                    })}
                    {contract.maintenancePeriods.length > 2 && (
                      <Text style={styles.morePeriods}>+{contract.maintenancePeriods.length - 2} ще</Text>
                    )}
                  </View>
                )}
              </View>
              )}

              {(() => {
                const maintenanceInfo = getNextMaintenanceInfo(contract);
                return (
                  <View style={[
                    styles.upcomingTask,
                    {
                      backgroundColor: maintenanceInfo.colorStyle.backgroundColor,
                      borderLeftColor: maintenanceInfo.colorStyle.borderLeftColor
                    },
                    showCompact && styles.compactUpcomingTask
                  ]}>
                    <View style={styles.upcomingTaskHeader}>
                      <Text style={[
                        styles.upcomingLabel, 
                        showCompact && styles.compactUpcomingLabel,
                        { color: maintenanceInfo.colorStyle.textColor }
                      ]}>
                        {showCompact ? 'Наступне ТО:' : maintenanceInfo.text + ':'}
                      </Text>
                      <Text style={[
                        styles.upcomingDate, 
                        showCompact && styles.compactUpcomingDate,
                        { color: maintenanceInfo.colorStyle.textColor }
                      ]}>
                        {formatDate(maintenanceInfo.date.toISOString().split('T')[0])}
                      </Text>
                    </View>
                    {!showCompact && (() => {
                      const engineerIds = contract.assignedEngineerIds || (contract.assignedEngineerId ? [contract.assignedEngineerId] : []);
                      if (engineerIds.length > 0) {
                        const engineerNames = engineerIds
                          .map(id => getEngineer(id)?.name)
                          .filter(Boolean)
                          .join(', ');
                        return (
                          <Text style={[
                            styles.upcomingEngineer,
                            { color: maintenanceInfo.colorStyle.textColor }
                          ]}>
                            Відповідальні: {engineerNames || 'Не знайдено'}
                          </Text>
                        );
                      }
                      return null;
                    })()}
                  </View>
                );
              })()}

              {!showCompact && (contract.notes || contract.mapLink) && (
                <View style={styles.additionalInfo}>
                  {contract.notes && (
                    <View style={styles.noteRow}>
                      <FileText size={12} color="#6B7280" />
                      <Text style={styles.noteText} numberOfLines={2}>{contract.notes}</Text>
                    </View>
                  )}
                  
                  {contract.mapLink && (
                    <View style={styles.mapActionsRow}>
                      <TouchableOpacity 
                        style={styles.mapActionButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          openMapLink(contract.mapLink!);
                        }}
                        activeOpacity={0.7}
                      >
                        <Link2 size={12} color="#3B82F6" />
                        <Text style={styles.mapActionText}>Переглянути на карті</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}


            </Animated.View>
          );
        })}
      </Animated.ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={statusModalVisible}
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setStatusModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Змінити статус договору</Text>
              <TouchableOpacity 
                onPress={() => setStatusModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.statusOptions}>
              {statusOptions.map((option) => {
                const currentContract = contracts.find(c => c.id === selectedContract);
                const isSelected = currentContract?.status === option.value;
                
                // Перевіряємо, чи можна архівувати договір
                const canArchive = option.value === 'completed' && currentContract 
                  ? canArchiveContract(currentContract) 
                  : { allowed: true, reason: '' };
                
                const isDisabled = option.value === 'completed' && !canArchive.allowed;
                
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.statusOption,
                      isSelected && { backgroundColor: option.color + '10', borderColor: option.color },
                      isDisabled && styles.disabledStatusOption
                    ]}
                    onPress={() => {
                      if (!isDisabled && selectedContract) {
                        handleStatusChange(selectedContract, option.value);
                      }
                    }}
                    disabled={isDisabled}
                  >
                    <View style={[styles.statusIndicator, { backgroundColor: isDisabled ? '#D1D5DB' : option.color }]} />
                    <View style={styles.statusOptionContent}>
                      <Text style={[
                        styles.statusOptionText,
                        isSelected && { color: option.color, fontWeight: '600' },
                        isDisabled && { color: '#9CA3AF' }
                      ]}>
                        {option.label}
                      </Text>
                      {isDisabled && (
                        <Text style={styles.statusOptionWarning}>
                          {canArchive.reason}
                        </Text>
                      )}
                    </View>
                    {isSelected && <CheckCircle2 size={16} color={option.color} />}
                    {isDisabled && <AlertTriangle size={16} color="#F59E0B" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={archiveModalVisible}
        onRequestClose={() => setArchiveModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setArchiveModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Архівувати договір</Text>
              <TouchableOpacity 
                onPress={() => setArchiveModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalText}>
              Ви впевнені, що хочете перемістити цей договір до архіву? Договір не буде видалено повністю, а лише переміщено до архіву, звідки його можна буде відновити.
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setArchiveModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Скасувати</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.archiveConfirmButton}
                onPress={() => contractToArchive && handleArchiveContract(contractToArchive)}
              >
                <Archive size={16} color="#FFFFFF" />
                <Text style={styles.archiveConfirmButtonText}>Архівувати</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
      

        </SafeAreaView>
        </View>
        
        {/* Монітор продуктивності навігації (тільки для розробки) */}
        <NavigationPerformanceMonitor 
          enabled={isDebugActive}
          showMetrics={isDebugActive}
          position="bottom"
        />
      </GestureNavigation>
    </SmartPageTransition>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.gray50,
  },
  loadingText: {
    fontSize: fontSize.lg,
    color: colors.gray600,
    fontWeight: fontWeight.medium,
  },
  loadingIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  primaryActionsRowTablet: {
    gap: spacing.md,
  },
  primaryActionsRowWeb: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  primaryActionsRowSmall: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    height: 32,
    borderWidth: 2,
    borderColor: colors.gray200,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchContainerTablet: {
    height: 40,
    paddingHorizontal: spacing.xl,
  },
  searchContainerWeb: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
  },
  searchContainerSmall: {
    height: 36,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.lg,
    color: colors.gray900,
    fontWeight: fontWeight.medium,
  },
  searchInputSmall: {
    fontSize: fontSize.base,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    flex: 1,
    justifyContent: 'center',
  },
  addButtonSmall: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  addButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  addButtonTextSmall: {
    fontSize: fontSize.sm,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: 6,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  secondaryButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  scrollView: {
    flex: 1,
    padding: spacing.lg,
  },
  contractCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  contractCardTablet: {
    padding: spacing.xl * 1.5,
    marginBottom: spacing.xl,
  },
  contractCardLarge: {
    padding: spacing.xl * 2,
    marginBottom: spacing.xl * 1.5,
  },
  contractCardSmall: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  compactCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  contractCardWeb: {
    maxWidth: '100%',
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  contractCardMobile: {
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  contractTitleSection: {
    flex: 1,
    gap: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  expandButton: {
    padding: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray100,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  contractNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contractNumber: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray600,
  },
  contractNumberSmall: {
    fontSize: fontSize.sm,
  },
  objectNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  objectName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.gray900,
  },
  objectNameSmall: {
    fontSize: fontSize.lg,
  },
  compactContractNumber: {
    fontSize: fontSize.base,
    color: colors.gray600,
    fontWeight: fontWeight.medium,
    marginLeft: spacing.sm,
  },
  compactContractNumberSmall: {
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  contractInfo: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.gray600,
    fontWeight: fontWeight.medium,
  },
  infoValue: {
    fontSize: fontSize.sm,
    color: colors.gray900,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  upcomingTask: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  compactUpcomingTask: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderLeftWidth: 3,
    borderRadius: borderRadius.sm,
  },
  upcomingTaskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  maintenancePeriodsInfo: {
    marginTop: spacing.sm,
    paddingLeft: spacing.xl,
    gap: spacing.xs,
  },
  periodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  periodText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  morePeriods: {
    fontSize: fontSize.sm,
    color: colors.gray600,
    fontStyle: 'italic',
    marginLeft: spacing.xl,
  },
  upcomingLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
    fontWeight: fontWeight.medium,
  },
  compactUpcomingLabel: {
    marginBottom: 0,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  upcomingDate: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  compactUpcomingDate: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  upcomingEngineer: {
    fontSize: fontSize.sm,
    marginTop: 2,
    fontWeight: fontWeight.medium,
  },

  contractDatesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contractDates: {
    fontSize: fontSize.sm,
    color: colors.gray600,
    fontWeight: fontWeight.medium,
  },
  contractDatesSmall: {
    fontSize: fontSize.xs,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalOverlayPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
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
  statusOptions: {
    gap: 12,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 14,
  },
  disabledStatusOption: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    opacity: 0.7,
  },
  statusOptionContent: {
    flex: 1,
  },
  statusOptionWarning: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 4,
    lineHeight: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  additionalInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    gap: 8,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  mapActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  mapActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  mapActionText: {
    fontSize: 12,
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  navigationText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  compactNavigationButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  compactContactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  compactContactText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  contactPersonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  contactPersonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  archiveButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FEF3C7',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  archiveConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
    gap: 6,
  },
  archiveConfirmButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  modalText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  networkBanner: {
    backgroundColor: colors.warning,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  networkIcon: {
    marginRight: 4,
  },
  networkBannerText: {
    flex: 1,
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  networkBannerClose: {
    padding: 4,
  },
});