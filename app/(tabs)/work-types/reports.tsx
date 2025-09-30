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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { Calendar, Download, FileText, TrendingUp, ArrowLeft, Share2 } from 'lucide-react-native';
import { formatDateDisplay } from '@/hooks/use-business-data';
import { useFilteredBusinessData } from '@/hooks/use-filtered-business-data';
import type { Contract, MaintenancePeriod } from '@/types/business';
import { router } from 'expo-router';
import { colors, spacing } from '@/constants/colors';

const formatDate = formatDateDisplay;

type MonthlyReportData = {
  contract: Contract;
  object: any;
  periods: (MaintenancePeriod & { effectiveStartDate: Date; effectiveEndDate: Date })[];
};

export default function WorkTypesReportsScreen() {
  const { contracts, objects, isLoading } = useFilteredBusinessData(); // Використовуємо фільтровані дані без архівних договорів
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

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

  const getObject = useCallback((objectId: string) => {
    return objects.find(o => o.id === objectId);
  }, [objects]);

  const prepareReportData = useMemo(() => {
    if (!selectedYear || !selectedMonth) return null;

    const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
    const monthEnd = new Date(selectedYear, selectedMonth, 0);

    const monthlyMaintenanceData: MonthlyReportData[] = [];

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
          return (period.effectiveStartDate <= monthEnd && period.effectiveEndDate >= monthStart);
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

    monthlyMaintenanceData.sort((a, b) => {
      const aMinDate = Math.min(...a.periods.map(p => p.effectiveStartDate.getTime()));
      const bMinDate = Math.min(...b.periods.map(p => p.effectiveStartDate.getTime()));
      return aMinDate - bMinDate;
    });

    return { monthlyMaintenanceData, monthStart, monthEnd };
  }, [contracts, selectedYear, selectedMonth, getObject]);

  const generateReport = useCallback(async () => {
    if (!prepareReportData) return;

    setIsGeneratingReport(true);

    try {
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

        for (let i = 0; i < monthlyMaintenanceData.length; i++) {
          const item = monthlyMaintenanceData[i];
          
          reportText += `${i + 1}. ${item.object?.name || 'Невідомий об\'єкт'}\n`;
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

          if (i % 10 === 9) {
            await new Promise<void>(resolve => setTimeout(resolve, 5));
          }
        }

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

      await exportAsText(reportText, `TO_Report_${selectedYear}_${selectedMonth!.toString().padStart(2, '0')}.txt`);

    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Помилка', 'Не вдалося згенерувати звіт');
    } finally {
      setIsGeneratingReport(false);
    }
  }, [prepareReportData, selectedYear, selectedMonth]);

  const exportAsText = async (content: string, filename: string) => {
    try {
      if (Platform.OS === 'web') {
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
        
        Alert.alert('Успіх', `Звіт "${filename}" завантажено як текстовий файл`);
      } else {
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
      console.error('Export error:', error);
      Alert.alert('Помилка', 'Не вдалося експортувати звіт');
    }
  };

  const exportAsHTML = async (content: string, filename: string) => {
    try {
      const monthName = new Date(selectedYear!, selectedMonth! - 1, 1).toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
      
      // Створюємо HTML версію звіту
      let htmlContent = `
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Звіт про технічне обслуговування - ${monthName}</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 18px;
            color: #666;
        }
        .report-item {
            margin-bottom: 25px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #f9f9f9;
        }
        .contract-number {
            font-weight: bold;
            color: #2563eb;
            font-size: 16px;
        }
        .client-name {
            font-size: 16px;
            margin: 5px 0;
            font-weight: 600;
        }
        .address {
            color: #666;
            font-style: italic;
            margin: 5px 0;
        }
        .work-types {
            color: #059669;
            margin: 5px 0;
        }
        .periods {
            margin: 10px 0;
            padding: 10px;
            background-color: #fff;
            border-left: 4px solid #10b981;
        }
        .period-item {
            margin: 5px 0;
        }
        .notes {
            margin-top: 10px;
            padding: 10px;
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
        }
        .stats {
            margin-top: 30px;
            padding: 20px;
            background-color: #e3f2fd;
            border-radius: 5px;
        }
        .stats-title {
            font-weight: bold;
            margin-bottom: 10px;
        }
        @media print {
            body { margin: 0; padding: 15px; }
            .report-item { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">ЗВІТ ПРО ПЛАНОВЕ ТЕХНІЧНЕ ОБСЛУГОВУВАННЯ</div>
        <div class="subtitle">Період: ${monthName}</div>
        <div>Дата формування: ${new Date().toLocaleDateString('uk-UA')}</div>
    </div>
`;
      
      if (!prepareReportData || prepareReportData.monthlyMaintenanceData.length === 0) {
        htmlContent += `
    <div class="report-item">
        <p>На ${monthName} планових робіт з технічного обслуговування не заплановано.</p>
    </div>`;
      } else {
        htmlContent += `
    <div style="margin-bottom: 20px; font-weight: bold;">
        Загальна кількість об'єктів для ТО: ${prepareReportData.monthlyMaintenanceData.length}
    </div>
`;
        
        prepareReportData.monthlyMaintenanceData.forEach((item, index) => {
          htmlContent += `
    <div class="report-item">
        <div class="contract-number">${index + 1}. ${item.object?.name || 'Невідомий об\'єкт'}</div>
        <div>Договір: ${item.contract.contractNumber}</div>
        <div class="client-name">Клієнт: ${item.contract.clientName}</div>
        <div class="address">Адреса: ${item.contract.address || item.object?.address || 'Не вказано'}</div>`;
          
          if (item.contract.workTypes && item.contract.workTypes.length > 0) {
            htmlContent += `
        <div class="work-types">Види робіт: ${item.contract.workTypes.join(', ')}</div>`;
          }
          
          htmlContent += `
        <div class="periods">
            <strong>Періоди ТО в цьому місяці:</strong>`;
          
          item.periods.forEach(period => {
            const startStr = formatDate(period.effectiveStartDate.toISOString().split('T')[0]);
            const endStr = formatDate(period.effectiveEndDate.toISOString().split('T')[0]);
            htmlContent += `
            <div class="period-item">• ${startStr} - ${endStr}`;
            if (period.status === 'adjusted') {
              htmlContent += ` (скориговано ${period.adjustedBy || 'Начальник'})`;
            }
            htmlContent += `</div>`;
          });
          
          htmlContent += `
        </div>`;
          
          if (item.contract.notes) {
            htmlContent += `
        <div class="notes">Примітки: ${item.contract.notes}</div>`;
          }
          
          htmlContent += `
    </div>`;
        });
        
        // Статистика
        const workTypeStats: Record<string, number> = {};
        prepareReportData.monthlyMaintenanceData.forEach(item => {
          item.contract.workTypes?.forEach(workType => {
            workTypeStats[workType] = (workTypeStats[workType] || 0) + 1;
          });
        });
        
        if (Object.keys(workTypeStats).length > 0) {
          htmlContent += `
    <div class="stats">
        <div class="stats-title">СТАТИСТИКА ПО ВИДАХ РОБІТ:</div>`;
          Object.entries(workTypeStats).forEach(([workType, count]) => {
            htmlContent += `
        <div>${workType}: ${count} об'єктів</div>`;
          });
          htmlContent += `
    </div>`;
        }
      }
      
      htmlContent += `
    <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
        Звіт сформовано автоматично системою управління ТО
    </div>
</body>
</html>`;
      
      const htmlFilename = filename.replace('.txt', '.html');
      
      if (Platform.OS === 'web') {
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = htmlFilename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
        
        Alert.alert('Успіх', `Звіт "${htmlFilename}" завантажено як HTML файл`);
      } else {
        const fileUri = FileSystem.documentDirectory + htmlFilename;
        await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/html',
            dialogTitle: 'Поділитися HTML звітом ТО',
          });
          Alert.alert('Успіх', `HTML звіт "${htmlFilename}" готовий до поділення`);
        } else {
          Alert.alert('Файл створено', `HTML звіт збережено як "${htmlFilename}"`);
        }
      }
    } catch (error) {
      console.error('HTML Export error:', error);
      Alert.alert('Помилка', 'Не вдалося експортувати HTML звіт');
    }
  };

  const showExportOptions = useCallback(async () => {
    if (!prepareReportData) return;

    Alert.alert(
      'Експорт звіту',
      'Оберіть формат для експорту звіту:',
      [
        { text: 'Скасувати', style: 'cancel' },
        { 
          text: 'Текстовий файл (.txt)', 
          onPress: async () => {
            setIsGeneratingReport(true);
            try {
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
                
                for (let i = 0; i < monthlyMaintenanceData.length; i++) {
                  const item = monthlyMaintenanceData[i];
                  
                  reportText += `${i + 1}. ${item.object?.name || 'Невідомий об\'єкт'}\n`;
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
                }
                
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
                    reportText += `${workType}: ${count} об'єктів\n`;
                  });
                  reportText += `\n`;
                }
              }
              
              reportText += `${'-'.repeat(60)}\n`;
              reportText += `Звіт сформовано автоматично системою управління ТО\n`;
              
              await exportAsText(reportText, `TO_Report_${selectedYear}_${selectedMonth!.toString().padStart(2, '0')}.txt`);
            } catch (error) {
              console.error('Error generating text report:', error);
              Alert.alert('Помилка', 'Не вдалося згенерувати текстовий звіт');
            } finally {
              setIsGeneratingReport(false);
            }
          }
        },
        { 
          text: 'HTML файл (.html)', 
          onPress: async () => {
            setIsGeneratingReport(true);
            try {
              const { monthlyMaintenanceData, monthStart } = prepareReportData;
              const filename = `TO_Report_${selectedYear}_${selectedMonth!.toString().padStart(2, '0')}.txt`;
              await exportAsHTML('', filename);
            } catch (error) {
              console.error('Error generating HTML report:', error);
              Alert.alert('Помилка', 'Не вдалося згенерувати HTML звіт');
            } finally {
              setIsGeneratingReport(false);
            }
          }
        }
      ]
    );
  }, [prepareReportData, selectedYear, selectedMonth]);

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
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Звіти ТО</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Оберіть період</Text>
          </View>
          
          <Text style={styles.yearLabel}>Рік: {currentYear}</Text>
          
          <View style={styles.monthsGrid}>
            {months.map(month => {
              const isSelected = selectedMonth === month.value;
              const isCurrent = month.value === currentMonth;
              
              return (
                <TouchableOpacity
                  key={month.value}
                  style={[
                    styles.monthButton,
                    isSelected && styles.selectedMonthButton,
                    isCurrent && !isSelected && styles.currentMonthButton,
                  ]}
                  onPress={() => {
                    setSelectedMonth(month.value);
                    setSelectedYear(currentYear);
                  }}
                  disabled={isGeneratingReport}
                >
                  <Text style={[
                    styles.monthButtonText,
                    isSelected && styles.selectedMonthButtonText,
                    isCurrent && !isSelected && styles.currentMonthButtonText,
                  ]}>
                    {month.name}
                  </Text>
                  {isCurrent && (
                    <View style={styles.currentIndicator} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {selectedMonth && prepareReportData && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={20} color="#10B981" />
              <Text style={styles.sectionTitle}>Попередній перегляд</Text>
            </View>
            
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>
                Звіт за {months.find(m => m.value === selectedMonth!)?.name} {selectedYear}
              </Text>
              <Text style={styles.previewStats}>
                Об&apos;єктів для ТО: {prepareReportData.monthlyMaintenanceData.length}
              </Text>
              
              {prepareReportData.monthlyMaintenanceData.length > 0 && (
                <View style={styles.previewList}>
                  {prepareReportData.monthlyMaintenanceData.slice(0, 3).map((item, index) => (
                    <View key={item.contract.id} style={styles.previewItem}>
                      <Text style={styles.previewItemText} numberOfLines={1}>
                        {index + 1}. {item.object?.name || 'Невідомий об&apos;єкт'}
                      </Text>
                    </View>
                  ))}
                  {prepareReportData.monthlyMaintenanceData.length > 3 && (
                    <Text style={styles.previewMore}>
                      +{prepareReportData.monthlyMaintenanceData.length - 3} ще...
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {selectedMonth && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.generateButton,
                isGeneratingReport && styles.generateButtonDisabled
              ]}
              onPress={showExportOptions}
              disabled={isGeneratingReport}
            >
              {isGeneratingReport ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.generateButtonText}>Генерація звіту...</Text>
                </>
              ) : (
                <>
                  <Share2 size={20} color="#FFFFFF" />
                  <Text style={styles.generateButtonText}>Експортувати звіт</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <FileText size={20} color="#6B7280" />
            <Text style={styles.infoTitle}>Про звіти</Text>
          </View>
          <Text style={styles.infoText}>
            Звіти містять інформацію про всі заплановані роботи з технічного обслуговування на обраний місяць.
            Включають дати проведення ТО, інформацію про об&apos;єкти, договори та статистику по видах робіт.
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
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#111827',
  },
  yearLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
    fontWeight: '500' as const,
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  monthButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    position: 'relative',
  },
  selectedMonthButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  currentMonthButton: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  monthButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500' as const,
  },
  selectedMonthButtonText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  currentMonthButtonText: {
    color: '#10B981',
    fontWeight: '600' as const,
  },
  currentIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  previewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 8,
  },
  previewStats: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  previewList: {
    gap: 4,
  },
  previewItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 8,
  },
  previewItemText: {
    fontSize: 12,
    color: '#374151',
  },
  previewMore: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  generateButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#374151',
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});