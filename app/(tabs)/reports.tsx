import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import Svg, { Path, Text as SvgText, Circle } from 'react-native-svg';


import { ClipboardList, Calendar, Download, FileText, TrendingUp, PieChart, Users, ChevronDown, BarChart3, FileCheck, Activity, X, Bell } from 'lucide-react-native';
import { useBusinessData, formatDateDisplay } from '@/hooks/use-business-data';
import { useFilteredBusinessData } from '@/hooks/use-filtered-business-data';
import { useDebugSettings } from '@/hooks/use-debug-settings';
import { useNotifications } from '@/hooks/use-notifications';
import { router } from 'expo-router';
import type { Contract, MaintenancePeriod, ServiceEngineer } from '@/types/business';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/colors';
import { DebugDataDisplay } from '@/components/DebugDataDisplay';


const formatDate = formatDateDisplay;

type MonthlyReportData = {
  contract: Contract;
  object: any;
  periods: (MaintenancePeriod & { effectiveStartDate: Date; effectiveEndDate: Date })[];
};



type ReportType = 'maintenance' | 'engineers' | 'contracts' | 'trends';

export default function ReportsScreen() {
  const { exportData, importData, exportSelectedData, importSelectedData } = useBusinessData();
  const { contracts, objects, engineers, isLoading } = useFilteredBusinessData(); // Використовуємо фільтровані дані без архівних договорів
  const { isDebugEnabled } = useDebugSettings();
  const { getUnreadCount } = useNotifications();
  

  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(currentYear);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('maintenance');
  const [showAllContracts, setShowAllContracts] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<'КОНД' | 'ДБЖ' | 'ДГУ' | 'ALL'>('ALL');

  // Генеруємо список років на основі реальних даних ТО
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    
    contracts.forEach(contract => {
      if (contract.maintenancePeriods) {
        contract.maintenancePeriods.forEach(period => {
          const startDate = period.adjustedStartDate 
            ? new Date(period.adjustedStartDate) 
            : new Date(period.startDate);
          const endDate = period.adjustedEndDate 
            ? new Date(period.adjustedEndDate) 
            : new Date(period.endDate);
          
          yearsSet.add(startDate.getFullYear());
          yearsSet.add(endDate.getFullYear());
        });
      }
    });
    
    // Якщо немає даних, додаємо поточний рік
    if (yearsSet.size === 0) {
      yearsSet.add(currentYear);
    }
    
    return Array.from(yearsSet).sort((a, b) => b - a); // Сортуємо від найновішого до найстаршого
  }, [contracts, currentYear]);

  const months = [
    { value: 1, name: 'Січень' },
    { value: 2, name: 'Лютий' },
    { value: 3, name: 'Березень' },
    { value: 4, name: 'Квітень' },
    { value: 5, name: 'Травень' },
    { value: 6, name: 'Червень' },
    { value: 7, name: 'Липень' },
    { value: 8, name: 'Серпень' },
    { value: 9, name: 'Вересень' },
    { value: 10, name: 'Жовтень' },
    { value: 11, name: 'Листопад' },
    { value: 12, name: 'Грудень' }
  ];

  // Оптимізована функція для отримання об'єкта
  const getObject = useCallback((objectId: string) => {
    return objects.find(o => o.id === objectId);
  }, [objects]);

  // Дані для кругової діаграми інженерів (розподіл ТО)
  const engineersChartData = useMemo(() => {
    if (isDebugEnabled('reports')) {
      console.log('📊 [Reports] Engineers maintenance chart data calculation:');
      console.log('📊 [Reports] Engineers count:', engineers.length);
      console.log('📊 [Reports] Contracts count:', contracts.length);
      console.log('📊 [Reports] Engineers:', engineers.map(e => ({ id: e.id, name: e.name })));
    }
    
    const engineerStats = engineers.map(engineer => {
      let maintenancePeriodsCount = 0;
      const assignedContracts = contracts.filter(contract => {
        const hasAssignedIds = contract.assignedEngineerIds?.includes(engineer.id);
        const hasAssignedId = contract.assignedEngineerId === engineer.id;
        const isAssigned = hasAssignedIds || hasAssignedId;
        
        if (isAssigned && contract.maintenancePeriods) {
          maintenancePeriodsCount += contract.maintenancePeriods.length;
          if (isDebugEnabled('reports')) {
            console.log(`📊 [Reports] Engineer ${engineer.name} assigned to contract ${contract.contractNumber} with ${contract.maintenancePeriods.length} maintenance periods`);
          }
        }
        
        return isAssigned;
      });
      
      if (isDebugEnabled('reports')) {
        console.log(`📊 [Reports] Engineer ${engineer.name}: ${assignedContracts.length} contracts, ${maintenancePeriodsCount} maintenance periods`);
      }
      
      return {
        engineer,
        contractsCount: assignedContracts.length,
        maintenancePeriodsCount,
        contracts: assignedContracts
      };
    });
    
    // Включаємо всіх інженерів, навіть з 0 ТО, для діагностики
    const totalMaintenancePeriods = engineerStats.reduce((sum, stat) => sum + stat.maintenancePeriodsCount, 0);
    if (isDebugEnabled('reports')) {
      console.log('📊 [Reports] Total maintenance periods:', totalMaintenancePeriods);
    }
    
    const result = engineerStats.map(stat => ({
      ...stat,
      percentage: totalMaintenancePeriods > 0 ? (stat.maintenancePeriodsCount / totalMaintenancePeriods) * 100 : 0
    }));
    
    if (isDebugEnabled('reports')) {
      console.log('📊 [Reports] Final maintenance chart data:', result);
    }
    return result;
  }, [engineers, contracts, isDebugEnabled]);

  // Дані для звіту по статусах договорів
  const contractsStatusData = useMemo(() => {
    const statusCounts = {
      active: 0,
      completed: 0,
      paused: 0, // для final_works
      pending: 0 // для extension
    };

    contracts.forEach(contract => {
      switch (contract.status) {
        case 'active':
          statusCounts.active++;
          break;
        case 'completed':
          statusCounts.completed++;
          break;
        case 'final_works':
          statusCounts.paused++;
          break;
        case 'extension':
          statusCounts.pending++;
          break;
        default:
          statusCounts.pending++;
          break;
      }
    });

    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    
    return [
      {
        status: 'active',
        label: 'Активні',
        count: statusCounts.active,
        percentage: total > 0 ? (statusCounts.active / total) * 100 : 0,
        color: '#10B981'
      },
      {
        status: 'completed',
        label: 'Завершені',
        count: statusCounts.completed,
        percentage: total > 0 ? (statusCounts.completed / total) * 100 : 0,
        color: '#6B7280'
      },
      {
        status: 'final_works',
        label: 'Завершальні роботи',
        count: statusCounts.paused,
        percentage: total > 0 ? (statusCounts.paused / total) * 100 : 0,
        color: '#F59E0B'
      },
      {
        status: 'extension',
        label: 'Продовження',
        count: statusCounts.pending,
        percentage: total > 0 ? (statusCounts.pending / total) * 100 : 0,
        color: '#3B82F6'
      }
    ].filter(item => item.count > 0);
  }, [contracts]);

  // Дані для лінійної діаграми динаміки ТО
  const maintenanceTrendsData = useMemo(() => {
    if (!selectedYear) return [];
    
    const monthlyData = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      monthName: months[index].name,
      count: 0,
      cumulative: 0
    }));
    
    // Підраховуємо періоди ТО по місяцях для вибраного року
    contracts.forEach(contract => {
      if (contract.maintenancePeriods) {
        contract.maintenancePeriods.forEach(period => {
          const startDate = period.adjustedStartDate 
            ? new Date(period.adjustedStartDate) 
            : new Date(period.startDate);
          const endDate = period.adjustedEndDate 
            ? new Date(period.adjustedEndDate) 
            : new Date(period.endDate);
          
          // Перевіряємо чи період ТО припадає на вибраний рік
          if (startDate.getFullYear() === selectedYear || endDate.getFullYear() === selectedYear) {
            // Визначаємо місяць початку ТО
            const monthIndex = startDate.getFullYear() === selectedYear 
              ? startDate.getMonth() 
              : endDate.getMonth();
            
            if (monthIndex >= 0 && monthIndex < 12) {
              monthlyData[monthIndex].count++;
            }
          }
        });
      }
    });
    
    // Розраховуємо кумулятивні значення
    let cumulative = 0;
    monthlyData.forEach(data => {
      cumulative += data.count;
      data.cumulative = cumulative;
    });
    
    return monthlyData;
  }, [contracts, selectedYear, months]);



  // Мемоізована функція для підготовки даних звіту
  const prepareReportData = useMemo(() => {
    if (!selectedYear || !selectedMonth) return null;

    const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
    const monthEnd = new Date(selectedYear, selectedMonth, 0);

    const monthlyMaintenanceData: MonthlyReportData[] = [];

    // Оптимізована обробка договорів
    for (const contract of contracts) {
      if (!contract.maintenancePeriods || contract.maintenancePeriods.length === 0) {
        continue;
      }

      const contractPeriods = contract.maintenancePeriods
        .map(period => {
          const startDate = period.adjustedStartDate 
            ? new Date(period.adjustedStartDate) 
            : new Date(period.startDate);
          const endDate = period.adjustedEndDate 
            ? new Date(period.adjustedEndDate) 
            : new Date(period.endDate);

          return {
            ...period,
            effectiveStartDate: startDate,
            effectiveEndDate: endDate
          };
        })
        .filter(period => {
          // Фільтруємо по даті
          const dateMatch = period.effectiveStartDate <= monthEnd && period.effectiveEndDate >= monthStart;
          // Фільтруємо по підрозділу
          // Підтримка множинного вибору підрозділів
          const periodDepartments = period.departments || (period.department ? [period.department] : []);
          const departmentMatch = selectedDepartment === 'ALL' || periodDepartments.includes(selectedDepartment);
          return dateMatch && departmentMatch;
        });

      if (contractPeriods.length > 0) {
        const object = getObject(contract.objectId);
        monthlyMaintenanceData.push({
          contract,
          object,
          periods: contractPeriods
        });
      }
    }

    // Сортування за датою початку ТО
    monthlyMaintenanceData.sort((a, b) => {
      const aMinDate = Math.min(...a.periods.map(p => p.effectiveStartDate.getTime()));
      const bMinDate = Math.min(...b.periods.map(p => p.effectiveStartDate.getTime()));
      return aMinDate - bMinDate;
    });

    return { monthlyMaintenanceData, monthStart, monthEnd };
  }, [contracts, selectedYear, selectedMonth, selectedDepartment, getObject]);

  // Функція генерації звіту у форматі начальника
  const generateBossReport = useCallback(async () => {
    if (!prepareReportData) return;

    setIsGeneratingReport(true);

    try {
      await new Promise<void>(resolve => setTimeout(resolve, 10));

      const { monthlyMaintenanceData, monthStart } = prepareReportData;
      const monthName = monthStart.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });

      let reportText = '';

      // Додаємо місяць і рік звіту зверху посередині
      reportText += `${monthName.toUpperCase()}\n`;
      reportText += `${'='.repeat(monthName.length)}\n\n`;

      if (monthlyMaintenanceData.length === 0) {
        reportText += `На ${monthName} планових робіт з технічного обслуговування не заплановано.`;
      } else {
        // Генеруємо звіт у форматі начальника
        for (let i = 0; i < monthlyMaintenanceData.length; i++) {
          const item = monthlyMaintenanceData[i];
          
          if (i > 0) {
            reportText += '\n\n';
          }
          
          // Перша строчка: номер договору, строк дії договору
          const contractStartDate = formatDate(item.contract.startDate);
          const contractEndDate = formatDate(item.contract.endDate);
          reportText += `${item.contract.contractNumber}, ${contractStartDate} - ${contractEndDate}\n`;
          
          // Друга строчка: контрагент
          reportText += `${item.contract.clientName}\n`;
          
          // Третя строчка: адреса об'єкту
          const address = item.contract.address || item.object?.address || 'Адреса не вказана';
          reportText += `${address}\n`;
          
          // Четверта строчка: місяць і рік звіту — примітка
          const notes = item.contract.notes || 'Без особливих приміток';
          reportText += `${monthName} — ${notes}`;

          // Додаємо паузу кожні 10 елементів
          if (i % 10 === 9) {
            await new Promise<void>(resolve => setTimeout(resolve, 5));
          }
        }
      }

      // Експортуємо звіт
      await exportReport(reportText, `TO_Boss_Report_${selectedYear}_${selectedMonth!.toString().padStart(2, '0')}.txt`);

    } catch (error) {
      console.error('❌ [Reports] Error generating boss report:', error);
      Alert.alert('Помилка', 'Не вдалося згенерувати звіт');
    } finally {
      setIsGeneratingReport(false);
    }
  }, [prepareReportData, selectedYear, selectedMonth]);

  // Оптимізована функція генерації звіту
  const generateReport = useCallback(async () => {
    if (!prepareReportData) return;

    setIsGeneratingReport(true);

    try {
      // Використовуємо setTimeout для розбиття на частини
      await new Promise<void>(resolve => setTimeout(resolve, 10));

      const { monthlyMaintenanceData, monthStart } = prepareReportData;
      const monthName = monthStart.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });

      let reportText = `ЗВІТ ПРО ПЛАНОВЕ ТЕХНІЧНЕ ОБСЛУГОВУВАННЯ\n`;
      reportText += `Період: ${monthName}\n`;
      reportText += `Дата формування: ${new Date().toLocaleDateString('uk-UA')}\n`;
      reportText += `${'='.repeat(60)}\n\n`;

      if (monthlyMaintenanceData.length === 0) {
        reportText += `На ${monthName} планових робіт з технічного обслуговування не заплановано.\n`;
      } else {
        reportText += `Загальна кількість об'єктів для ТО: ${monthlyMaintenanceData.length}\n\n`;

        // Обробляємо по частинах для уникнення зависання
        for (let i = 0; i < monthlyMaintenanceData.length; i++) {
          const item = monthlyMaintenanceData[i];
          
          reportText += `${i + 1}. ${item.object?.name || 'Невідомий об&apos;єкт'}\n`;
          reportText += `   Договір: ${item.contract.contractNumber}\n`;
          reportText += `   Клієнт: ${item.contract.clientName}\n`;
          reportText += `   Адреса: ${item.contract.address || item.object?.address || 'Не вказано'}\n`;

          if (item.contract.workTypes && item.contract.workTypes.length > 0) {
            reportText += `   Види робіт: ${item.contract.workTypes.join(', ')}\n`;
          }

          reportText += `   Періоди ТО в цьому місяці:\n`;
          item.periods.forEach(period => {
            const startStr = formatDate(period.effectiveStartDate.toISOString().split('T')[0]);
            const endStr = formatDate(period.effectiveEndDate.toISOString().split('T')[0]);
            reportText += `     • ${startStr} - ${endStr}`;
            if (period.status === 'adjusted') {
              reportText += ` (скориговано ${period.adjustedBy || 'Начальник'})`;
            }
            reportText += `\n`;
          });

          if (item.contract.notes) {
            reportText += `   Примітки: ${item.contract.notes}\n`;
          }

          reportText += `\n`;

          // Додаємо паузу кожні 10 елементів
          if (i % 10 === 9) {
            await new Promise<void>(resolve => setTimeout(resolve, 5));
          }
        }

        // Статистика по видах робіт
        const workTypeStats: Record<string, number> = {};
        monthlyMaintenanceData.forEach(item => {
          item.contract.workTypes?.forEach(workType => {
            workTypeStats[workType] = (workTypeStats[workType] || 0) + 1;
          });
        });

        if (Object.keys(workTypeStats).length > 0) {
          reportText += `СТАТИСТИКА ПО ВИДАХ РОБІТ:\n`;
          reportText += `${'-'.repeat(30)}\n`;
          Object.entries(workTypeStats).forEach(([workType, count]) => {
            reportText += `${workType}: ${count} об&apos;єктів\n`;
          });
          reportText += `\n`;
        }
      }

      reportText += `${'-'.repeat(60)}\n`;
      reportText += `Звіт сформовано автоматично системою управління ТО\n`;

      // Експортуємо звіт
      await exportReport(reportText, `TO_Report_${selectedYear}_${selectedMonth!.toString().padStart(2, '0')}.txt`);

    } catch (error) {
      console.error('❌ [Reports] Error generating report:', error);
      Alert.alert('Помилка', 'Не вдалося згенерувати звіт');
    } finally {
      setIsGeneratingReport(false);
    }
  }, [prepareReportData, selectedYear, selectedMonth]);

  // Функція для експорту звіту
  // Функції для імпорту/експорту
  const handleExportContracts = async () => {
    if (isDebugEnabled('reports')) {
      console.log('🔄 [Reports] Export contracts button pressed');
    }
    
    Alert.alert(
      'Експорт договорів',
      'Ви дійсно хочете експортувати всі договори?',
      [
        {
          text: 'Відмінити',
          style: 'cancel'
        },
        {
          text: 'Експортувати',
          onPress: async () => {
            try {
              const data = await exportSelectedData(['contracts']);
              if (isDebugEnabled('reports')) {
                console.log('✅ [Reports] Export contracts data prepared');
              }
              await exportFile(data, `contracts_export_${new Date().toISOString().split('T')[0]}.json`);
              if (isDebugEnabled('reports')) {
                console.log('✅ [Reports] Export contracts completed');
              }
            } catch (error) {
              console.error('❌ [Reports] Export contracts error:', error);
              Alert.alert('Помилка', 'Не вдалося експортувати договори');
            }
          }
        }
      ]
    );
  };

  const handleExportEngineers = async () => {
    if (isDebugEnabled('reports')) {
      console.log('🔄 [Reports] Export engineers button pressed');
    }
    
    Alert.alert(
      'Експорт інженерів',
      'Ви дійсно хочете експортувати всіх інженерів?',
      [
        {
          text: 'Відмінити',
          style: 'cancel'
        },
        {
          text: 'Експортувати',
          onPress: async () => {
            try {
              const data = await exportSelectedData(['engineers']);
              if (isDebugEnabled('reports')) {
                console.log('✅ [Reports] Export engineers data prepared');
              }
              await exportFile(data, `engineers_export_${new Date().toISOString().split('T')[0]}.json`);
              if (isDebugEnabled('reports')) {
                console.log('✅ [Reports] Export engineers completed');
              }
            } catch (error) {
              console.error('❌ [Reports] Export engineers error:', error);
              Alert.alert('Помилка', 'Не вдалося експортувати інженерів');
            }
          }
        }
      ]
    );
  };

  const handleExportAll = async () => {
    Alert.alert(
      'Експорт всіх даних',
      'Ви дійсно хочете експортувати всі дані (договори, інженери, об\'єкти)?',
      [
        {
          text: 'Відмінити',
          style: 'cancel'
        },
        {
          text: 'Експортувати',
          onPress: async () => {
            try {
              const data = await exportData();
              await exportFile(data, `full_export_${new Date().toISOString().split('T')[0]}.json`);
            } catch (error) {
              console.error('❌ [Reports] Export all error:', error);
              Alert.alert('Помилка', 'Не вдалося експортувати всі дані');
            }
          }
        }
      ]
    );
  };

  const handleImportContracts = async () => {
    if (isDebugEnabled('reports')) {
      console.log('🔄 [Reports] Import contracts button pressed');
    }
    
    Alert.alert(
      'Імпорт договорів',
      'Ви дійсно хочете імпортувати договори? Це може замінити існуючі дані.',
      [
        {
          text: 'Відмінити',
          style: 'cancel'
        },
        {
          text: 'Імпортувати',
          onPress: async () => {
            if (Platform.OS === 'web') {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = async (e: any) => {
                const file = e.target.files[0];
                if (file) {
                  if (isDebugEnabled('reports')) {
                    console.log('📁 [Reports] File selected for contracts import:', file.name);
                  }
                  const text = await file.text();
                  try {
                    await importSelectedData(text, ['contracts']);
                    if (isDebugEnabled('reports')) {
                      console.log('✅ [Reports] Import contracts completed');
                    }
                    Alert.alert('Успіх', 'Договори успішно імпортовано');
                  } catch (error) {
                    console.error('❌ [Reports] Import contracts error:', error);
                    Alert.alert('Помилка', 'Не вдалося імпортувати договори: ' + (error as Error).message);
                  }
                }
              };
              input.click();
            } else {
              // Мобільна версія з DocumentPicker
              try {
                const result = await DocumentPicker.getDocumentAsync({
                  type: 'application/json',
                  copyToCacheDirectory: true,
                });
                
                if (!result.canceled && result.assets && result.assets.length > 0) {
                  const asset = result.assets[0];
                  if (isDebugEnabled('reports')) {
                    console.log('📁 [Reports] File selected for import:', asset.name);
                  }
                  
                  const fileContent = await FileSystem.readAsStringAsync(asset.uri);
                  try {
                    // Визначаємо тип імпорту за контекстом
                    if (asset.name.includes('contracts') || asset.name.includes('договори')) {
                      await importSelectedData(fileContent, ['contracts']);
                      Alert.alert('Успіх', 'Договори успішно імпортовано');
                    } else if (asset.name.includes('engineers') || asset.name.includes('інженери')) {
                      await importSelectedData(fileContent, ['engineers']);
                      Alert.alert('Успіх', 'Інженерів успішно імпортовано');
                    } else {
                      await importData(fileContent);
                      Alert.alert('Успіх', 'Всі дані успішно імпортовано');
                    }
                  } catch (error) {
                    console.error('❌ [Reports] Import error:', error);
                    Alert.alert('Помилка', 'Не вдалося імпортувати дані: ' + (error as Error).message);
                  }
                }
              } catch (error) {
                console.error('❌ [Reports] Document picker error:', error);
                Alert.alert('Помилка', 'Не вдалося відкрити файл');
              }
            }
          }
        }
      ]
    );
  };

  const handleImportEngineers = async () => {
    if (isDebugEnabled('reports')) {
      console.log('🔄 [Reports] Import engineers button pressed');
    }
    
    Alert.alert(
      'Імпорт інженерів',
      'Ви дійсно хочете імпортувати інженерів? Це може замінити існуючі дані.',
      [
        {
          text: 'Відмінити',
          style: 'cancel'
        },
        {
          text: 'Імпортувати',
          onPress: async () => {
            if (Platform.OS === 'web') {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = async (e: any) => {
                const file = e.target.files[0];
                if (file) {
                  if (isDebugEnabled('reports')) {
                    console.log('📁 [Reports] File selected for engineers import:', file.name);
                  }
                  const text = await file.text();
                  try {
                    await importSelectedData(text, ['engineers']);
                    if (isDebugEnabled('reports')) {
                      console.log('✅ [Reports] Import engineers completed');
                    }
                    Alert.alert('Успіх', 'Інженерів успішно імпортовано');
                  } catch (error) {
                    console.error('❌ [Reports] Import engineers error:', error);
                    Alert.alert('Помилка', 'Не вдалося імпортувати інженерів: ' + (error as Error).message);
                  }
                }
              };
              input.click();
            } else {
              // Мобільна версія з DocumentPicker
              try {
                const result = await DocumentPicker.getDocumentAsync({
                  type: 'application/json',
                  copyToCacheDirectory: true,
                });
                
                if (!result.canceled && result.assets && result.assets.length > 0) {
                  const asset = result.assets[0];
                  if (isDebugEnabled('reports')) {
                    console.log('📁 [Reports] File selected for import:', asset.name);
                  }
                  
                  const fileContent = await FileSystem.readAsStringAsync(asset.uri);
                  try {
                    // Визначаємо тип імпорту за контекстом
                    if (asset.name.includes('contracts') || asset.name.includes('договори')) {
                      await importSelectedData(fileContent, ['contracts']);
                      Alert.alert('Успіх', 'Договори успішно імпортовано');
                    } else if (asset.name.includes('engineers') || asset.name.includes('інженери')) {
                      await importSelectedData(fileContent, ['engineers']);
                      Alert.alert('Успіх', 'Інженерів успішно імпортовано');
                    } else {
                      await importData(fileContent);
                      Alert.alert('Успіх', 'Всі дані успішно імпортовано');
                    }
                  } catch (error) {
                    console.error('❌ [Reports] Import error:', error);
                    Alert.alert('Помилка', 'Не вдалося імпортувати дані: ' + (error as Error).message);
                  }
                }
              } catch (error) {
                console.error('❌ [Reports] Document picker error:', error);
                Alert.alert('Помилка', 'Не вдалося відкрити файл');
              }
            }
          }
        }
      ]
    );
  };

  const handleImportAll = async () => {
    Alert.alert(
      'Імпорт всіх даних',
      'Ви дійсно хочете імпортувати всі дані? Це замінить всі існуючі договори, інженерів та об\'єкти.',
      [
        {
          text: 'Відмінити',
          style: 'cancel'
        },
        {
          text: 'Імпортувати',
          style: 'destructive',
          onPress: async () => {
            if (Platform.OS === 'web') {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = async (e: any) => {
                const file = e.target.files[0];
                if (file) {
                  const text = await file.text();
                  try {
                    await importData(text);
                    Alert.alert('Успіх', 'Всі дані успішно імпортовано');
                  } catch (error) {
                    Alert.alert('Помилка', 'Не вдалося імпортувати дані: ' + (error as Error).message);
                  }
                }
              };
              input.click();
            } else {
              // Мобільна версія з DocumentPicker
              try {
                const result = await DocumentPicker.getDocumentAsync({
                  type: 'application/json',
                  copyToCacheDirectory: true,
                });
                
                if (!result.canceled && result.assets && result.assets.length > 0) {
                  const asset = result.assets[0];
                  if (isDebugEnabled('reports')) {
                    console.log('📁 [Reports] File selected for import:', asset.name);
                  }
                  
                  const fileContent = await FileSystem.readAsStringAsync(asset.uri);
                  try {
                    // Визначаємо тип імпорту за контекстом
                    if (asset.name.includes('contracts') || asset.name.includes('договори')) {
                      await importSelectedData(fileContent, ['contracts']);
                      Alert.alert('Успіх', 'Договори успішно імпортовано');
                    } else if (asset.name.includes('engineers') || asset.name.includes('інженери')) {
                      await importSelectedData(fileContent, ['engineers']);
                      Alert.alert('Успіх', 'Інженерів успішно імпортовано');
                    } else {
                      await importData(fileContent);
                      Alert.alert('Успіх', 'Всі дані успішно імпортовано');
                    }
                  } catch (error) {
                    console.error('❌ [Reports] Import error:', error);
                    Alert.alert('Помилка', 'Не вдалося імпортувати дані: ' + (error as Error).message);
                  }
                }
              } catch (error) {
                console.error('❌ [Reports] Document picker error:', error);
                Alert.alert('Помилка', 'Не вдалося відкрити файл');
              }
            }
          }
        }
      ]
    );
  };

  const exportFile = async (content: string, filename: string) => {
    try {
      if (Platform.OS === 'web') {
        // Веб-версія
        const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
        
        Alert.alert('Успіх', `Файл "${filename}" завантажено`);
      } else {
        // Мобільна версія
        const fileUri = FileSystem.documentDirectory + filename;
        await FileSystem.writeAsStringAsync(fileUri, content, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Поділитися файлом даних',
          });
          Alert.alert('Успіх', `Файл "${filename}" готовий до поділення`);
        } else {
          Alert.alert('Файл створено', `Файл збережено як "${filename}"`);
        }
      }
    } catch (error) {
      console.error('❌ [Reports] Export file error:', error);
      Alert.alert('Помилка', 'Не вдалося експортувати файл');
    }
  };

  const exportReport = async (content: string, filename: string) => {
    try {
      if (Platform.OS === 'web') {
        // Веб-версія
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
        
        Alert.alert('Успіх', `Звіт "${filename}" завантажено`);
      } else {
        // Мобільна версія
        const fileUri = FileSystem.documentDirectory + filename;
        await FileSystem.writeAsStringAsync(fileUri, content, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/plain',
            dialogTitle: 'Поділитися звітом ТО',
          });
          Alert.alert('Успіх', `Звіт "${filename}" готовий до поділення`);
        } else {
          Alert.alert('Файл створено', `Звіт збережено як "${filename}"`);
        }
      }
    } catch (error) {
      console.error('❌ [Reports] Export error:', error);
      Alert.alert('Помилка', 'Не вдалося експортувати звіт');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Завантаження даних...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
        <View style={styles.headerContent}>
          <ClipboardList size={28} color="#3B82F6" />
          <View style={styles.headerTexts}>
            <Text style={styles.title}>Звіти ТО</Text>
            <Text style={styles.subtitle}>Генерація звітів по технічному обслуговуванню</Text>
          </View>

        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Тип звіту</Text>
          </View>
          
          <View style={styles.reportTypeButtons}>
            <TouchableOpacity
              style={[
                styles.reportTypeButton,
                selectedReportType === 'maintenance' && styles.selectedReportTypeButton
              ]}
              onPress={() => setSelectedReportType('maintenance')}
            >
              <Calendar size={18} color={selectedReportType === 'maintenance' ? '#FFFFFF' : '#6B7280'} />
              <Text style={[
                styles.reportTypeButtonText,
                selectedReportType === 'maintenance' && styles.selectedReportTypeButtonText
              ]}>
                Звіти ТО
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.reportTypeButton,
                selectedReportType === 'engineers' && styles.selectedReportTypeButton
              ]}
              onPress={() => setSelectedReportType('engineers')}
            >
              <Users size={18} color={selectedReportType === 'engineers' ? '#FFFFFF' : '#6B7280'} />
              <Text style={[
                styles.reportTypeButtonText,
                selectedReportType === 'engineers' && styles.selectedReportTypeButtonText
              ]}>
                Розподіл ТО
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.reportTypeButton,
                selectedReportType === 'contracts' && styles.selectedReportTypeButton
              ]}
              onPress={() => setSelectedReportType('contracts')}
            >
              <BarChart3 size={18} color={selectedReportType === 'contracts' ? '#FFFFFF' : '#6B7280'} />
              <Text style={[
                styles.reportTypeButtonText,
                selectedReportType === 'contracts' && styles.selectedReportTypeButtonText
              ]}>
                Статуси ТО
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.reportTypeButton,
                selectedReportType === 'trends' && styles.selectedReportTypeButton
              ]}
              onPress={() => setSelectedReportType('trends')}
            >
              <Activity size={18} color={selectedReportType === 'trends' ? '#FFFFFF' : '#6B7280'} />
              <Text style={[
                styles.reportTypeButtonText,
                selectedReportType === 'trends' && styles.selectedReportTypeButtonText
              ]}>
                Динаміка ТО
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {selectedReportType === 'maintenance' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Calendar size={20} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Оберіть період та підрозділ</Text>
            </View>
          
          <View style={styles.dateSelectionRow}>
            <View style={styles.dateSelectionItem}>
              <Text style={styles.dateSelectionLabel}>Рік:</Text>
              <TouchableOpacity
                style={styles.dateDropdown}
                onPress={() => setShowYearPicker(true)}
                disabled={isGeneratingReport}
              >
                <Text style={styles.dateDropdownText}>
                  {selectedYear ? selectedYear.toString() : 'Рік'}
                </Text>
                <ChevronDown size={18} color={colors.gray600} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.dateSelectionItem}>
              <Text style={styles.dateSelectionLabel}>Місяць:</Text>
              <TouchableOpacity
                style={styles.dateDropdown}
                onPress={() => setShowMonthPicker(true)}
                disabled={isGeneratingReport}
              >
                <Text style={styles.dateDropdownText}>
                  {selectedMonth ? months.find(m => m.value === selectedMonth)?.name : 'Місяць'}
                </Text>
                <ChevronDown size={18} color={colors.gray600} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.departmentSection}>
            <Text style={styles.dateSelectionLabel}>Підрозділ:</Text>
            <View style={styles.departmentButtons}>
              {(['ALL', 'КОНД', 'ДБЖ', 'ДГУ'] as const).map(dept => {
                const isSelected = selectedDepartment === dept;
                const departmentLabels = {
                  'ALL': 'Всі підрозділи',
                  'КОНД': 'КОНД',
                  'ДБЖ': 'ДБЖ',
                  'ДГУ': 'ДГУ'
                };
                
                return (
                  <TouchableOpacity
                    key={dept}
                    style={[
                      styles.departmentFilterButton,
                      isSelected && styles.selectedDepartmentFilterButton
                    ]}
                    onPress={() => setSelectedDepartment(dept)}
                    disabled={isGeneratingReport}
                  >
                    <Text style={[
                      styles.departmentFilterButtonText,
                      isSelected && styles.selectedDepartmentFilterButtonText
                    ]}>
                      {departmentLabels[dept]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          

          </View>
        )}

        {selectedReportType === 'engineers' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <PieChart size={20} color="#10B981" />
              <Text style={styles.sectionTitle}>Розподіл ТО між інженерами</Text>
            </View>
            
            <View style={styles.chartContainer}>
              {engineersChartData.filter(item => item.maintenancePeriodsCount > 0).length > 0 ? (
                <PieChartComponent data={engineersChartData.filter(item => item.maintenancePeriodsCount > 0)} />
              ) : (
                <View style={styles.emptyState}>
                  <Users size={48} color="#9CA3AF" />
                  <Text style={styles.emptyStateText}>Немає призначених ТО</Text>
                  <Text style={styles.emptyStateSubtext}>Призначте інженерів до договорів з періодами ТО для відображення діаграми</Text>
                </View>
              )}
              
              <View style={styles.legendContainer}>
                <View style={styles.legendGrid}>
                  {engineersChartData.map((item, index) => (
                    <View key={item.engineer.id} style={styles.legendGridItem}>
                      <View style={[
                        styles.legendColor,
                        { backgroundColor: item.engineer.color }
                      ]} />
                      <View style={styles.legendTextContainer}>
                        <Text style={styles.legendName}>
                          {item.engineer.name || `Інженер ${item.engineer.id}`}
                        </Text>
                        <Text style={styles.legendStats}>
                          {item.maintenancePeriodsCount} ТО ({item.percentage.toFixed(1)}%)
                          {item.maintenancePeriodsCount === 0 && ' - не призначено'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {selectedReportType === 'contracts' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <BarChart3 size={20} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Статуси ТО</Text>
            </View>
            
            {contractsStatusData.length > 0 ? (
              <View style={styles.chartContainer}>
                <BarChartComponent data={contractsStatusData} />
                
                <View style={styles.legendContainer}>
                  {contractsStatusData.map((item, index) => (
                    <View key={item.status} style={styles.legendItem}>
                      <View style={[
                        styles.legendColor,
                        { backgroundColor: item.color }
                      ]} />
                      <View style={styles.legendTextContainer}>
                        <Text style={styles.legendName}>
                          {item.label}
                        </Text>
                        <Text style={styles.legendStats}>
                          {item.count} договорів ({item.percentage.toFixed(1)}%)
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
                
                <View style={styles.summaryCard}>
                  <View style={styles.summaryHeader}>
                    <FileCheck size={20} color="#3B82F6" />
                    <Text style={styles.summaryTitle}>Загальна статистика</Text>
                  </View>
                  <Text style={styles.summaryText}>
                    Всього договорів: {contracts.length}
                  </Text>
                  <Text style={styles.summaryText}>
                    Активних: {contractsStatusData.find(item => item.status === 'active')?.count || 0}
                  </Text>
                  <Text style={styles.summaryText}>
                    Завершених: {contractsStatusData.find(item => item.status === 'completed')?.count || 0}
                  </Text>
                  <Text style={styles.summaryText}>
                    Завершальні роботи: {contractsStatusData.find(item => item.status === 'final_works')?.count || 0}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <BarChart3 size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>Немає договорів для аналізу</Text>
                <Text style={styles.emptyStateSubtext}>Додайте договори до системи</Text>
              </View>
            )}
          </View>
        )}

        {selectedReportType === 'trends' && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Calendar size={20} color="#3B82F6" />
                <Text style={styles.sectionTitle}>Оберіть рік для аналізу</Text>
              </View>
            
              <View style={styles.dateSelectionRow}>
                <View style={styles.dateSelectionItem}>
                  <Text style={styles.dateSelectionLabel}>Рік:</Text>
                  <TouchableOpacity
                    style={styles.dateDropdown}
                    onPress={() => setShowYearPicker(true)}
                  >
                    <Text style={styles.dateDropdownText}>
                      {selectedYear ? selectedYear.toString() : 'Рік'}
                    </Text>
                    <ChevronDown size={18} color={colors.gray600} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            {selectedYear && maintenanceTrendsData.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Activity size={20} color="#10B981" />
                  <Text style={styles.sectionTitle}>Динаміка ТО за {selectedYear} рік</Text>
                </View>
                
                <View style={styles.chartContainer}>
                  <LineChartComponent data={maintenanceTrendsData} />
                  
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryHeader}>
                      <TrendingUp size={20} color="#10B981" />
                      <Text style={styles.summaryTitle}>Статистика за рік</Text>
                    </View>
                    <Text style={styles.summaryText}>
                      Всього періодів ТО: {maintenanceTrendsData.reduce((sum, item) => sum + item.count, 0)}
                    </Text>
                    <Text style={styles.summaryText}>
                      Найактивніший місяць: {maintenanceTrendsData.reduce((max, item) => item.count > max.count ? item : max, maintenanceTrendsData[0])?.monthName || 'Немає даних'}
                    </Text>
                    <Text style={styles.summaryText}>
                      Середньо за місяць: {(maintenanceTrendsData.reduce((sum, item) => sum + item.count, 0) / 12).toFixed(1)} періодів ТО
                    </Text>
                  </View>
                  
                  <View style={styles.monthlyBreakdown}>
                    <Text style={styles.breakdownTitle}>Помісячна деталізація:</Text>
                    <View style={styles.monthsRow}>
                      {maintenanceTrendsData.map((item, index) => (
                        <View key={item.month} style={styles.monthItem}>
                          <Text style={styles.monthName}>{item.monthName.slice(0, 3)}</Text>
                          <Text style={styles.monthCount}>{item.count}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )}
            
            {selectedYear && maintenanceTrendsData.every(item => item.count === 0) && (
              <View style={styles.section}>
                <View style={styles.emptyState}>
                  <Activity size={48} color="#9CA3AF" />
                  <Text style={styles.emptyStateText}>Немає періодів ТО за {selectedYear} рік</Text>
                  <Text style={styles.emptyStateSubtext}>Оберіть інший рік або додайте періоди ТО</Text>
                </View>
              </View>
            )}
          </>
        )}



        {selectedReportType === 'maintenance' && selectedMonth && selectedYear && prepareReportData && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={20} color="#10B981" />
              <Text style={styles.sectionTitle}>Попередній перегляд</Text>
            </View>
            
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>
                Звіт за {months.find(m => m.value === selectedMonth!)?.name} {selectedYear}
                {selectedDepartment !== 'ALL' && ` (${selectedDepartment})`}
              </Text>
              <Text style={styles.previewStats}>
                Об&apos;єктів для ТО: {prepareReportData.monthlyMaintenanceData.length}
                {selectedDepartment !== 'ALL' && ` • Підрозділ: ${selectedDepartment}`}
              </Text>
              
              {prepareReportData.monthlyMaintenanceData.length > 0 && (
                <View style={styles.previewList}>
                  {prepareReportData.monthlyMaintenanceData.slice(0, 3).map((item, index) => (
                    <View key={item.contract.id}>
                      <TouchableOpacity 
                        style={styles.previewItem}
                        onPress={() => {
                          // Показуємо всі договори для вибору
                          setShowAllContracts(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.previewItemText} numberOfLines={1}>
                          {index + 1}. {item.object?.name || 'Невідомий об&apos;єкт'}
                        </Text>
                        <Text style={styles.previewContractNumber}>
                          {item.contract.contractNumber}
                        </Text>
                      </TouchableOpacity>
                      
                      {/* Показуємо періоди ТО для цього договору */}
                      <View style={styles.periodsContainer}>
                        {item.periods.slice(0, 2).map((period, periodIndex) => {
                          // Визначаємо номер періоду на основі всіх періодів договору
                          const allPeriods = item.contract.maintenancePeriods || [];
                          const globalPeriodIndex = allPeriods.findIndex(p => p.id === period.id);
                          const periodNumber = globalPeriodIndex !== -1 ? globalPeriodIndex + 1 : periodIndex + 1;
                          
                          return (
                            <TouchableOpacity
                              key={period.id}
                              style={styles.periodItem}
                              onPress={() => router.push(`/maintenance-period-report?contractId=${item.contract.id}&periodId=${period.id}&selectedDepartment=${selectedDepartment}`)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.periodContent}>
                                <Text style={styles.periodText}>
                                  #{periodNumber} ({formatDate(period.effectiveStartDate.toISOString().split('T')[0])} - {formatDate(period.effectiveEndDate.toISOString().split('T')[0])})
                                </Text>
                                {((period.departments && period.departments.length > 0) || period.department) && (
                                  <Text style={styles.periodDepartment}>
                                    {period.departments ? period.departments.join(', ') : period.department}
                                  </Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                        {item.periods.length > 2 && (
                          <Text style={styles.morePeriods}>
                            +{item.periods.length - 2} ще періодів
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                  {prepareReportData.monthlyMaintenanceData.length > 3 && (
                    <TouchableOpacity 
                      style={styles.previewMoreButton}
                      onPress={() => {
                        // Показуємо всі договори для вибраного періоду
                        setShowAllContracts(true);
                      }}
                    >
                      <Text style={styles.previewMore}>
                        +{prepareReportData.monthlyMaintenanceData.length - 3} ще... (натисніть для перегляду всіх)
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {selectedReportType === 'maintenance' && selectedMonth && selectedYear && (
          <View style={styles.section}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  styles.bossReportButton,
                  isGeneratingReport && styles.generateButtonDisabled
                ]}
                onPress={generateBossReport}
                disabled={isGeneratingReport}
              >
                {isGeneratingReport ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.generateButtonText}>Генерація...</Text>
                  </>
                ) : (
                  <>
                    <FileText size={20} color="#FFFFFF" />
                    <Text style={styles.generateButtonText}>Фірмовий звіт</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  styles.detailedReportButton,
                  isGeneratingReport && styles.generateButtonDisabled
                ]}
                onPress={generateReport}
                disabled={isGeneratingReport}
              >
                {isGeneratingReport ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.generateButtonText}>Генерація...</Text>
                  </>
                ) : (
                  <>
                    <Download size={20} color="#FFFFFF" />
                    <Text style={styles.generateButtonText}>Детальний звіт</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Модальне вікно для вибору року */}
        <Modal
          visible={showYearPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowYearPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowYearPicker(false)}
          >
            <View style={styles.pickerModal}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Оберіть рік</Text>
              </View>
              <ScrollView style={styles.pickerList}>
                {availableYears.map(year => {
                  const isSelected = selectedYear === year;
                  const isCurrent = year === currentYear;
                  
                  return (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.pickerItem,
                        isSelected && styles.selectedPickerItem,
                        isCurrent && !isSelected && styles.currentPickerItem,
                      ]}
                      onPress={() => {
                        setSelectedYear(year);
                        setShowYearPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        isSelected && styles.selectedPickerItemText,
                        isCurrent && !isSelected && styles.currentPickerItemText,
                      ]}>
                        {year}
                      </Text>
                      {isCurrent && (
                        <View style={styles.currentIndicator} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
        
        {/* Модальне вікно для вибору місяця */}
        <Modal
          visible={showMonthPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMonthPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowMonthPicker(false)}
          >
            <View style={styles.pickerModal}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Оберіть місяць</Text>
              </View>
              <ScrollView style={styles.pickerList}>
                {months.map(month => {
                  const isSelected = selectedMonth === month.value;
                  const isCurrent = month.value === currentMonth && selectedYear === currentYear;
                  
                  return (
                    <TouchableOpacity
                      key={month.value}
                      style={[
                        styles.pickerItem,
                        isSelected && styles.selectedPickerItem,
                        isCurrent && !isSelected && styles.currentPickerItem,
                      ]}
                      onPress={() => {
                        setSelectedMonth(month.value);
                        setShowMonthPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        isSelected && styles.selectedPickerItemText,
                        isCurrent && !isSelected && styles.currentPickerItemText,
                      ]}>
                        {month.name}
                      </Text>
                      {isCurrent && (
                        <View style={styles.currentIndicator} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Модальне вікно для перегляду всіх договорів */}
        <Modal
          visible={showAllContracts}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAllContracts(false)}
        >
          <View style={styles.contractsModalOverlay}>
            <View style={styles.contractsModal}>
              <View style={styles.contractsModalHeader}>
                <Text style={styles.contractsModalTitle}>
                  Договори за {months.find(m => m.value === selectedMonth)?.name} {selectedYear}
                  {selectedDepartment !== 'ALL' && ` (${selectedDepartment})`}
                </Text>
                <TouchableOpacity 
                  onPress={() => setShowAllContracts(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.contractsList}>
                {prepareReportData?.monthlyMaintenanceData.map((item, index) => (
                  <View key={item.contract.id} style={styles.contractItem}>
                    <View style={styles.contractItemHeader}>
                      <Text style={styles.contractItemName}>
                        {index + 1}. {item.object?.name || 'Невідомий об\'єкт'}
                      </Text>
                      <Text style={styles.contractItemNumber}>
                        {item.contract.contractNumber}
                      </Text>
                    </View>
                    <Text style={styles.contractItemClient}>
                      {item.contract.clientName}
                    </Text>
                    {(item.contract.address || item.object?.address) && (
                      <Text style={styles.contractItemAddress} numberOfLines={1}>
                        {item.contract.address || item.object?.address}
                      </Text>
                    )}
                    <View style={styles.contractItemPeriods}>
                      {item.periods.map((period, periodIndex) => {
                        // Визначаємо номер періоду на основі всіх періодів договору
                        const allPeriods = item.contract.maintenancePeriods || [];
                        const globalPeriodIndex = allPeriods.findIndex(p => p.id === period.id);
                        const periodNumber = globalPeriodIndex !== -1 ? globalPeriodIndex + 1 : periodIndex + 1;
                        
                        return (
                          <TouchableOpacity
                            key={period.id}
                            style={styles.contractPeriodButton}
                            onPress={() => {
                              setShowAllContracts(false);
                              router.push(`/maintenance-period-report?contractId=${item.contract.id}&periodId=${period.id}&selectedDepartment=${selectedDepartment}`);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.contractPeriodContent}>
                              <Text style={styles.contractItemPeriod}>
                                #{periodNumber}: {formatDate(period.effectiveStartDate.toISOString().split('T')[0])} - {formatDate(period.effectiveEndDate.toISOString().split('T')[0])}
                              </Text>
                              {((period.departments && period.departments.length > 0) || period.department) && (
                                <Text style={styles.contractPeriodDepartment}>
                                  Підрозділ: {period.departments ? period.departments.join(', ') : period.department}
                                </Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Секція нотифікацій */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Нотифікації</Text>
          </View>
          
          <View style={styles.notificationsContainer}>
            <Text style={styles.notificationsDescription}>
              Керування сповіщеннями про технічне обслуговування та важливі події системи.
            </Text>
            
            <View style={styles.notificationButtons}>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => router.push('/notifications')}
                activeOpacity={0.7}
                testID="view-notifications-button"
              >
                <Bell size={18} color={colors.white} />
                <Text style={styles.notificationButtonText}>
                  Переглянути нотифікації
                </Text>
                {getUnreadCount() > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {getUnreadCount()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.notificationButton, styles.notificationSettingsButton]}
                onPress={() => router.push('/notification-settings')}
                activeOpacity={0.7}
                testID="notification-settings-button"
              >
                <Download size={18} color={colors.white} />
                <Text style={styles.notificationButtonText}>
                  Налаштування нотифікацій
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Секція імпорту/експорту */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Download size={20} color="#10B981" />
            <Text style={styles.sectionTitle}>Імпорт та експорт даних</Text>
          </View>
          
          <View style={styles.importExportContainer}>
            <Text style={styles.importExportDescription}>
              Експортуйте або імпортуйте дані для резервного копіювання або синхронізації між пристроями.
            </Text>
            
            <View style={styles.importExportButtons}>
              <TouchableOpacity
                style={[styles.importExportButton, styles.exportButton]}
                onPress={handleExportContracts}
                activeOpacity={0.7}
                testID="export-contracts-button"
              >
                <Download size={18} color="#FFFFFF" />
                <Text style={styles.importExportButtonText}>Експорт договорів</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.importExportButton, styles.exportButton]}
                onPress={handleExportEngineers}
                activeOpacity={0.7}
                testID="export-engineers-button"
              >
                <Users size={18} color="#FFFFFF" />
                <Text style={styles.importExportButtonText}>Експорт інженерів</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.importExportButton, styles.exportButton]}
                onPress={handleExportAll}
                activeOpacity={0.7}
                testID="export-all-button"
              >
                <FileText size={18} color="#FFFFFF" />
                <Text style={styles.importExportButtonText}>Експорт всього</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.importExportButtons}>
              <TouchableOpacity
                style={[styles.importExportButton, styles.importButton]}
                onPress={handleImportContracts}
                activeOpacity={0.7}
                testID="import-contracts-button"
              >
                <Download size={18} color="#FFFFFF" />
                <Text style={styles.importExportButtonText}>Імпорт договорів</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.importExportButton, styles.importButton]}
                onPress={handleImportEngineers}
                activeOpacity={0.7}
                testID="import-engineers-button"
              >
                <Users size={18} color="#FFFFFF" />
                <Text style={styles.importExportButtonText}>Імпорт інженерів</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.importExportButton, styles.importButton]}
                onPress={handleImportAll}
                activeOpacity={0.7}
                testID="import-all-button"
              >
                <FileText size={18} color="#FFFFFF" />
                <Text style={styles.importExportButtonText}>Імпорт всього</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {isDebugEnabled('reports') && (
          <DebugDataDisplay
            title="Звіти"
            data={{
              contracts: contracts.length,
              objects: objects.length,
              engineers: engineers.length,
              selectedReportType,
              selectedYear,
              selectedMonth,
              selectedDepartment,
              engineersWithMaintenance: engineersChartData.filter(e => e.maintenancePeriodsCount > 0).length,
              totalMaintenancePeriods: engineersChartData.reduce((sum, e) => sum + e.maintenancePeriodsCount, 0),
              contractsStatusData: contractsStatusData.length,
              availableYears: availableYears.length,
              prepareReportDataLength: prepareReportData?.monthlyMaintenanceData.length || 0
            }}
          />
        )}

        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <FileText size={20} color="#6B7280" />
            <Text style={styles.infoTitle}>Про звіти</Text>
          </View>
          <Text style={styles.infoText}>
            {selectedReportType === 'maintenance' 
              ? 'Доступні два типи звітів: "Фірмовий звіт" - стислий формат у вигляді: номер договору, строк дії, контрагент, адреса, місяць і примітка. "Детальний звіт" - повна інформація про всі заплановані роботи з ТО, включаючи дати, об\'єкти, договори та статистику.'
              : selectedReportType === 'engineers'
              ? 'Аналітика показує розподіл періодів ТО між інженерами у вигляді кругової діаграми. Допомагає оцінити навантаження на кожного спеціаліста та оптимізувати розподіл робіт з технічного обслуговування.'
              : selectedReportType === 'contracts'
              ? 'Звіт показує розподіл договорів за статусами у вигляді стовпчастої діаграми. Допомагає контролювати стан всіх договорів та планувати роботу з клієнтами.'
              : 'Лінійна діаграма показує динаміку періодів технічного обслуговування протягом року. Допомагає аналізувати навантаження по місяцях, планувати ресурси та оптимізувати графік ТО.'
            }
          </Text>
        </View>
      </ScrollView>
      </SafeAreaView>
    </View>
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
    gap: spacing.md,
    backgroundColor: colors.gray50,
  },
  loadingText: {
    fontSize: fontSize.lg,
    color: colors.gray600,
    fontWeight: fontWeight.medium,
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
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTexts: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.gray900,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.gray600,
    fontWeight: fontWeight.medium,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.white,
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.gray900,
  },
  dateSelectionRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  dateSelectionItem: {
    flex: 1,
  },
  dateSelectionLabel: {
    fontSize: fontSize.base,
    color: colors.gray700,
    marginBottom: spacing.sm,
    fontWeight: fontWeight.semibold,
  },
  dateDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray50,
    borderWidth: 2,
    borderColor: colors.gray200,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 48,
  },
  dateDropdownText: {
    fontSize: fontSize.base,
    color: colors.gray700,
    fontWeight: fontWeight.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  pickerModal: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    width: '100%',
    maxWidth: 300,
    maxHeight: 400,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  pickerHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    alignItems: 'center',
  },
  pickerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.gray900,
  },
  pickerList: {
    maxHeight: 300,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    position: 'relative',
  },
  selectedPickerItem: {
    backgroundColor: colors.primary,
  },
  currentPickerItem: {
    backgroundColor: colors.successBg,
  },
  pickerItemText: {
    fontSize: fontSize.lg,
    color: colors.gray700,
    fontWeight: fontWeight.medium,
  },
  selectedPickerItemText: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  currentPickerItemText: {
    color: colors.success,
    fontWeight: fontWeight.semibold,
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  monthButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.gray50,
    borderWidth: 2,
    borderColor: colors.gray200,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    alignItems: 'center',
    position: 'relative',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedMonthButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  currentMonthButton: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  monthButtonText: {
    fontSize: fontSize.base,
    color: colors.gray700,
    fontWeight: fontWeight.medium,
  },
  selectedMonthButtonText: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  currentMonthButtonText: {
    color: colors.success,
    fontWeight: fontWeight.semibold,
  },
  currentIndicator: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  previewCard: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  previewTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray900,
    marginBottom: spacing.sm,
  },
  previewStats: {
    fontSize: fontSize.base,
    color: colors.gray600,
    marginBottom: spacing.md,
    fontWeight: fontWeight.medium,
  },
  previewList: {
    gap: spacing.xs,
  },
  previewItem: {
    backgroundColor: colors.white,
    borderRadius: spacing.xs,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray200,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  previewItemText: {
    fontSize: fontSize.sm,
    color: colors.gray700,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  previewContractNumber: {
    fontSize: fontSize.xs,
    color: colors.gray500,
    fontWeight: fontWeight.medium,
  },
  previewMoreButton: {
    backgroundColor: colors.gray50,
    borderRadius: spacing.xs,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: 'dashed',
  },
  previewMore: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontStyle: 'italic',
    textAlign: 'center',
    fontWeight: fontWeight.medium,
  },
  generateButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  infoSection: {
    backgroundColor: colors.white,
    margin: spacing.lg,
    marginTop: 0,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray700,
  },
  infoText: {
    fontSize: fontSize.base,
    color: colors.gray600,
    lineHeight: 20,
    fontWeight: fontWeight.medium,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  bossReportButton: {
    flex: 1,
    backgroundColor: '#10B981',
  },
  detailedReportButton: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  reportTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  reportTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.gray50,
    borderWidth: 2,
    borderColor: colors.gray200,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    minHeight: 56,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedReportTypeButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  reportTypeButtonText: {
    fontSize: fontSize.base,
    color: colors.gray700,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
    flex: 1,
  },
  selectedReportTypeButtonText: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  chartContainer: {
    alignItems: 'center',
    gap: spacing.xl,
  },
  legendContainer: {
    width: '100%',
    gap: spacing.md,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    width: '100%',
  },
  legendGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    flex: 1,
    minWidth: '45%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray900,
    marginBottom: spacing.xs,
  },
  legendStats: {
    fontSize: fontSize.sm,
    color: colors.gray600,
    fontWeight: fontWeight.medium,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray600,
  },
  emptyStateSubtext: {
    fontSize: fontSize.base,
    color: colors.gray400,
    textAlign: 'center',
  },
  pieChartContainer: {
    alignItems: 'center',
  },
  barChartContainer: {
    alignItems: 'center',
    width: '100%',
  },
  barItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    width: '100%',
  },
  barLabel: {
    width: 80,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray700,
    textAlign: 'right',
    marginRight: spacing.md,
  },
  barContainer: {
    flex: 1,
    height: 24,
    backgroundColor: colors.gray200,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  barValue: {
    position: 'absolute',
    right: spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  barValueText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  summaryCard: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray900,
  },
  summaryText: {
    fontSize: fontSize.base,
    color: colors.gray700,
    marginBottom: spacing.xs,
    fontWeight: fontWeight.medium,
  },
  monthlyBreakdown: {
    marginTop: spacing.lg,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  breakdownTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray900,
    marginBottom: spacing.md,
  },
  monthsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  monthItem: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    minWidth: 60,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  monthName: {
    fontSize: fontSize.xs,
    color: colors.gray600,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  monthCount: {
    fontSize: fontSize.base,
    color: colors.gray900,
    fontWeight: fontWeight.bold,
  },
  departmentSection: {
    marginBottom: spacing.lg,
  },
  departmentButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  departmentFilterButton: {
    backgroundColor: colors.gray50,
    borderWidth: 2,
    borderColor: colors.gray200,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedDepartmentFilterButton: {
    backgroundColor: colors.success,
    borderColor: colors.success,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  departmentFilterButtonText: {
    fontSize: fontSize.sm,
    color: colors.gray700,
    fontWeight: fontWeight.medium,
  },
  selectedDepartmentFilterButtonText: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  lineChartContainer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.lg,
  },

  contractsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  contractsModal: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 600,
    height: '90%',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  contractsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  contractsModalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.gray900,
    flex: 1,
  },
  contractsList: {
    flex: 1,
    padding: spacing.lg,
  },
  contractItem: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contractItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  contractItemName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray900,
    flex: 1,
    marginRight: spacing.sm,
  },
  contractItemNumber: {
    fontSize: fontSize.sm,
    color: colors.gray600,
    fontWeight: fontWeight.medium,
  },
  contractItemClient: {
    fontSize: fontSize.sm,
    color: colors.gray700,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  contractItemAddress: {
    fontSize: fontSize.sm,
    color: colors.gray600,
    marginBottom: spacing.sm,
  },
  contractItemPeriods: {
    gap: spacing.xs,
  },
  contractItemPeriod: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  contractItemMorePeriods: {
    fontSize: fontSize.xs,
    color: colors.gray500,
    fontStyle: 'italic',
  },
  closeButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray100,
  },
  periodsContainer: {
    marginTop: spacing.sm,
    paddingLeft: spacing.md,
    gap: spacing.xs,
  },
  periodItem: {
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.success,
  },
  periodText: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  morePeriods: {
    fontSize: fontSize.xs,
    color: colors.gray500,
    fontStyle: 'italic',
    paddingHorizontal: spacing.sm,
  },
  contractPeriodButton: {
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.success,
  },
  periodContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  periodDepartment: {
    fontSize: fontSize.xs,
    color: colors.gray600,
    fontWeight: fontWeight.medium,
    backgroundColor: colors.gray100,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  contractPeriodContent: {
    flex: 1,
  },
  contractPeriodDepartment: {
    fontSize: fontSize.xs,
    color: colors.gray600,
    fontWeight: fontWeight.medium,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  importExportContainer: {
    gap: spacing.lg,
  },
  importExportDescription: {
    fontSize: fontSize.base,
    color: colors.gray600,
    lineHeight: 20,
    fontWeight: fontWeight.medium,
  },
  importExportButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  importExportButton: {
    flex: 1,
    minWidth: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 48,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  exportButton: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  importButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#2563EB',
  },
  importExportButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  notificationsContainer: {
    gap: spacing.lg,
  },
  notificationsDescription: {
    fontSize: fontSize.base,
    color: colors.gray600,
    lineHeight: 20,
    fontWeight: fontWeight.medium,
  },
  notificationButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  notificationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 48,
    position: 'relative',
  },
  notificationSettingsButton: {
    backgroundColor: colors.gray600,
  },
  notificationButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    flex: 1,
  },
  notificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  notificationBadgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
});

// Компонент кругової діаграми
interface PieChartProps {
  data: {
    engineer: ServiceEngineer;
    contractsCount: number;
    maintenancePeriodsCount: number;
    percentage: number;
  }[];
}

// Компонент стовпчастої діаграми
interface BarChartProps {
  data: {
    status: string;
    label: string;
    count: number;
    percentage: number;
    color: string;
  }[];
}

// Компонент лінійної діаграми
interface LineChartProps {
  data: {
    month: number;
    monthName: string;
    count: number;
    cumulative: number;
  }[];
}

function PieChartComponent({ data }: PieChartProps) {
  const { width: screenWidth } = Dimensions.get('window');
  const size = Math.min(screenWidth - 80, 300);
  const outerRadius = size / 2 - 20;
  const innerRadius = outerRadius * 0.6; // Внутрішній радіус для створення кільця
  const centerX = size / 2;
  const centerY = size / 2;
  
  let currentAngle = -90; // Починаємо зверху
  
  const paths = data.map((item, index) => {
    const angle = (item.percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    // Зовнішні точки
    const x1Outer = centerX + outerRadius * Math.cos(startAngleRad);
    const y1Outer = centerY + outerRadius * Math.sin(startAngleRad);
    const x2Outer = centerX + outerRadius * Math.cos(endAngleRad);
    const y2Outer = centerY + outerRadius * Math.sin(endAngleRad);
    
    // Внутрішні точки
    const x1Inner = centerX + innerRadius * Math.cos(startAngleRad);
    const y1Inner = centerY + innerRadius * Math.sin(startAngleRad);
    const x2Inner = centerX + innerRadius * Math.cos(endAngleRad);
    const y2Inner = centerY + innerRadius * Math.sin(endAngleRad);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    // Створюємо шлях для кільця (donut)
    const pathData = [
      `M ${x1Outer} ${y1Outer}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer}`,
      `L ${x2Inner} ${y2Inner}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1Inner} ${y1Inner}`,
      'Z'
    ].join(' ');
    
    // Обчислюємо позицію для відсотків на дузі
    const midAngle = (startAngle + endAngle) / 2;
    const midAngleRad = (midAngle * Math.PI) / 180;
    const labelRadius = (outerRadius + innerRadius) / 2;
    const labelX = centerX + labelRadius * Math.cos(midAngleRad);
    const labelY = centerY + labelRadius * Math.sin(midAngleRad);
    
    currentAngle += angle;
    
    return {
      path: pathData,
      color: item.engineer.color,
      percentage: item.percentage,
      labelX,
      labelY,
      maintenanceCount: item.maintenancePeriodsCount,
      engineerName: item.engineer.name
    };
  });
  
  const totalMaintenance = data.reduce((sum, item) => sum + item.maintenancePeriodsCount, 0);
  const totalEngineers = data.length;
  const averagePerEngineer = totalEngineers > 0 ? (totalMaintenance / totalEngineers).toFixed(1) : '0';
  
  return (
    <View style={styles.pieChartContainer}>
      <Svg width={size} height={size}>
        {/* Тіні для кілець */}
        {paths.map((pathData, index) => (
          <Path
            key={`shadow-${index}`}
            d={pathData.path}
            fill={pathData.color}
            opacity={0.1}
            transform={`translate(2, 2)`}
          />
        ))}
        
        {/* Основні кільця */}
        {paths.map((pathData, index) => (
          <Path
            key={`path-${index}`}
            d={pathData.path}
            fill={pathData.color}
            stroke="#FFFFFF"
            strokeWidth={3}
          />
        ))}
        
        {/* Відсотки та кількість ТО на дугах */}
        {paths.map((pathData, index) => {
          if (pathData.percentage < 5) return null; // Не показуємо підписи для дуже малих сегментів
          
          return (
            <React.Fragment key={`labels-${index}`}>
              {/* Відсоток */}
              <SvgText
                x={pathData.labelX}
                y={pathData.labelY - 8}
                textAnchor="middle"
                fontSize={fontSize.sm}
                fontWeight={fontWeight.bold}
                fill="#FFFFFF"
                stroke={pathData.color}
                strokeWidth={0.8}
              >
                <Text>{pathData.percentage.toFixed(1)}%</Text>
              </SvgText>
              {/* Кількість ТО */}
              <SvgText
                x={pathData.labelX}
                y={pathData.labelY + 8}
                textAnchor="middle"
                fontSize={fontSize.xs}
                fontWeight={fontWeight.semibold}
                fill="#FFFFFF"
                stroke={pathData.color}
                strokeWidth={0.5}
              >
                <Text>{pathData.maintenanceCount} ТО</Text>
              </SvgText>
            </React.Fragment>
          );
        })}
        
        {/* Центральна інформація */}
        <SvgText
          x={centerX}
          y={centerY - 30}
          textAnchor="middle"
          fontSize={fontSize.xxl}
          fontWeight={fontWeight.bold}
          fill={colors.primary}
        >
          <Text>{totalMaintenance}</Text>
        </SvgText>
        <SvgText
          x={centerX}
          y={centerY - 8}
          textAnchor="middle"
          fontSize={fontSize.base}
          fill={colors.gray700}
          fontWeight={fontWeight.semibold}
        >
          <Text>Всього ТО</Text>
        </SvgText>
        <SvgText
          x={centerX}
          y={centerY + 12}
          textAnchor="middle"
          fontSize={fontSize.sm}
          fill={colors.gray600}
          fontWeight={fontWeight.medium}
        >
          <Text>{totalEngineers} інженерів</Text>
        </SvgText>
        <SvgText
          x={centerX}
          y={centerY + 30}
          textAnchor="middle"
          fontSize={fontSize.sm}
          fill={colors.success}
          fontWeight={fontWeight.semibold}
        >
          <Text>≈{averagePerEngineer} ТО/інж.</Text>
        </SvgText>
      </Svg>
    </View>
  );
}

function BarChartComponent({ data }: BarChartProps) {
  const maxCount = Math.max(...data.map(item => item.count));
  
  return (
    <View style={styles.barChartContainer}>
      {data.map((item, index) => {
        const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
        
        return (
          <View key={item.status} style={styles.barItem}>
            <Text style={styles.barLabel}>{item.label}</Text>
            <View style={styles.barContainer}>
              <View 
                style={[
                  styles.barFill,
                  { 
                    backgroundColor: item.color,
                    width: `${barWidth}%`
                  }
                ]} 
              />
              {item.count > 0 && (
                <View style={styles.barValue}>
                  <Text style={styles.barValueText}>{item.count}</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function LineChartComponent({ data }: LineChartProps) {
  const { width: screenWidth } = Dimensions.get('window');
  const chartWidth = screenWidth - 80;
  const chartHeight = 200;
  const padding = 40;
  const innerWidth = chartWidth - padding * 2;
  const innerHeight = chartHeight - padding * 2;
  
  const maxCount = Math.max(...data.map(item => item.count), 1);
  const stepX = innerWidth / (data.length - 1);
  
  // Створюємо точки для лінії
  const points = data.map((item, index) => {
    const x = padding + index * stepX;
    const y = padding + innerHeight - (item.count / maxCount) * innerHeight;
    return { x, y, count: item.count, month: item.monthName };
  });
  
  // Створюємо шлях для лінії
  const pathData = points.reduce((path, point, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${path} ${command} ${point.x} ${point.y}`;
  }, '');
  
  // Створюємо шлях для заливки області під лінією
  const areaPath = `${pathData} L ${points[points.length - 1].x} ${padding + innerHeight} L ${padding} ${padding + innerHeight} Z`;
  
  return (
    <View style={styles.lineChartContainer}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Сітка */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = padding + innerHeight * ratio;
          return (
            <Path
              key={`grid-${index}`}
              d={`M ${padding} ${y} L ${padding + innerWidth} ${y}`}
              stroke={colors.gray200}
              strokeWidth={1}
              strokeDasharray="3,3"
            />
          );
        })}
        
        {/* Область під лінією */}
        <Path
          d={areaPath}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="none"
        />
        
        {/* Лінія */}
        <Path
          d={pathData}
          fill="none"
          stroke="#3B82F6"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Точки */}
        {points.map((point, index) => (
          <React.Fragment key={`point-${index}`}>
            <Circle
              cx={point.x}
              cy={point.y}
              r={4}
              fill="#3B82F6"
              stroke="#FFFFFF"
              strokeWidth={2}
            />
            {/* Підписи місяців */}
            <SvgText
              x={point.x}
              y={padding + innerHeight + 20}
              textAnchor="middle"
              fontSize={fontSize.xs}
              fill={colors.gray600}
            >
              {point.month.slice(0, 3)}
            </SvgText>
            {/* Значення */}
            {point.count > 0 && (
              <SvgText
                x={point.x}
                y={point.y - 10}
                textAnchor="middle"
                fontSize={fontSize.xs}
                fontWeight={fontWeight.semibold}
                fill={colors.gray900}
              >
                {point.count}
              </SvgText>
            )}
          </React.Fragment>
        ))}
        
        {/* Підписи осі Y */}
        {[0, 0.5, 1].map((ratio, index) => {
          const y = padding + innerHeight * (1 - ratio);
          const value = Math.round(maxCount * ratio);
          return (
            <SvgText
              key={`y-label-${index}`}
              x={padding - 10}
              y={y + 4}
              textAnchor="end"
              fontSize={fontSize.xs}
              fill={colors.gray600}
            >
              <Text>{value}</Text>
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}