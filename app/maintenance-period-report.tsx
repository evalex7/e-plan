import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Save, FileText, Clock, AlertTriangle, Plus, Users, Building2 } from 'lucide-react-native';
import { useBusinessData, formatDateDisplay } from '@/hooks/use-business-data';
import type { Contract, MaintenancePeriod, MaintenanceReport, MaintenancePeriodReport } from '@/types/business';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/colors';
import DatePicker from '@/components/DatePicker';

const formatDate = formatDateDisplay;

type DepartmentReportData = {
  [K in 'КОНД' | 'ДБЖ' | 'ДГУ']: {
    completedDate: string;
    actualStartTime: string;
    actualEndTime: string;
    workDescription: string;
    issues: string;
    recommendations: string;
    materialsUsed: string;
    nextMaintenanceNotes: string;
    engineerId: string;
  };
};

export default function MaintenancePeriodReportScreen() {
  const { contractId, periodId, selectedDepartment } = useLocalSearchParams<{ 
    contractId: string; 
    periodId: string; 
    selectedDepartment?: string;
  }>();
  const { contracts, engineers, isLoading } = useBusinessData();
  
  // Тимчасово створюємо пусті масиви для звітів, поки не додамо їх в useBusinessData
  const [maintenanceReports] = useState<MaintenanceReport[]>([]);
  const saveMaintenanceReport = async (reportData: Omit<MaintenanceReport, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string) => {
    if (!reportData.workDescription?.trim()) {
      console.warn('Work description is required');
      return;
    }
    console.log('Saving maintenance report:', reportData, existingId);
    // TODO: Реалізувати збереження звіту
  };
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [period, setPeriod] = useState<MaintenancePeriod | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeDepartments, setActiveDepartments] = useState<('КОНД' | 'ДБЖ' | 'ДГУ')[]>([]);
  
  // Дані звітів по підрозділах
  const [departmentReports, setDepartmentReports] = useState<Partial<DepartmentReportData>>({});

  useEffect(() => {
    if (contractId && periodId) {
      const foundContract = contracts.find(c => c.id === contractId);
      if (foundContract) {
        setContract(foundContract);
        const foundPeriod = foundContract.maintenancePeriods?.find(p => p.id === periodId);
        if (foundPeriod) {
          setPeriod(foundPeriod);
          
          // Визначаємо активні підрозділи для цього періоду
          const allDepartments = foundPeriod.departments || (foundPeriod.department ? [foundPeriod.department] : []);
          
          // Якщо передано конкретний підрозділ, показуємо тільки його
          let departments = allDepartments;
          if (selectedDepartment && selectedDepartment !== 'ALL' && allDepartments.includes(selectedDepartment as any)) {
            departments = [selectedDepartment as 'КОНД' | 'ДБЖ' | 'ДГУ'];
          }
          
          setActiveDepartments(departments);
          
          // Ініціалізуємо дані звітів для кожного підрозділу
          const initialReports: Partial<DepartmentReportData> = {};
          const currentDate = new Date().toISOString().split('T')[0];
          
          departments.forEach(dept => {
            initialReports[dept] = {
              completedDate: currentDate,
              actualStartTime: '',
              actualEndTime: '',
              workDescription: '',
              issues: '',
              recommendations: '',
              materialsUsed: '',
              nextMaintenanceNotes: '',
              engineerId: foundContract.assignedEngineerId || foundContract.assignedEngineerIds?.[0] || '',
            };
          });
          
          setDepartmentReports(initialReports);
          
          // Завантажуємо існуючі звіти (поки що пусто, оскільки maintenanceReports порожній)
          // departments.forEach(dept => {
          //   const existingReport = maintenanceReports.find((r: MaintenanceReport) => 
          //     r.contractId === contractId && 
          //     r.maintenancePeriodId === periodId &&
          //     r.department === dept
          //   );
          //   
          //   if (existingReport) {
          //     setDepartmentReports(prev => ({
          //       ...prev,
          //       [dept]: {
          //         completedDate: existingReport.completedDate,
          //         actualStartTime: existingReport.actualStartTime,
          //         actualEndTime: existingReport.actualEndTime,
          //         workDescription: existingReport.workDescription,
          //         issues: existingReport.issues,
          //         recommendations: existingReport.recommendations,
          //         materialsUsed: existingReport.materialsUsed || '',
          //         nextMaintenanceNotes: existingReport.nextMaintenanceNotes || '',
          //         engineerId: existingReport.engineerId,
          //       }
          //     }));
          //   }
          // });
        }
      }
    }
  }, [contractId, periodId, contracts, selectedDepartment]);

  const updateDepartmentReport = (department: 'КОНД' | 'ДБЖ' | 'ДГУ', field: string, value: string) => {
    setDepartmentReports(prev => ({
      ...prev,
      [department]: {
        ...prev[department]!,
        [field]: value,
      }
    }));
  };

  const handleSaveAll = async () => {
    if (!contract || !period) {
      console.warn('Contract or period not found');
      return;
    }

    setIsSaving(true);

    try {
      // Зберігаємо звіт для кожного активного підрозділу
      for (const department of activeDepartments) {
        const reportData = departmentReports[department];
        if (!reportData) continue;
        
        if (!reportData.completedDate || !reportData.actualStartTime || !reportData.actualEndTime || !reportData.workDescription) {
          console.warn(`Missing required fields for department ${department}`);
          continue;
        }

        const maintenanceReportData: Omit<MaintenanceReport, 'id' | 'createdAt' | 'updatedAt'> = {
          taskId: periodId,
          contractId: contract.id,
          engineerId: reportData.engineerId,
          completedDate: reportData.completedDate,
          actualStartTime: reportData.actualStartTime,
          actualEndTime: reportData.actualEndTime,
          workDescription: reportData.workDescription,
          issues: reportData.issues,
          recommendations: reportData.recommendations,
          materialsUsed: reportData.materialsUsed,
          nextMaintenanceNotes: reportData.nextMaintenanceNotes,
          maintenancePeriodId: periodId,
          department: department,
        };

        // Шукаємо існуючий звіт для цього підрозділу
        const existingReport = maintenanceReports.find((r: MaintenanceReport) => 
          r.contractId === contractId && 
          r.maintenancePeriodId === periodId &&
          r.department === department
        );

        await saveMaintenanceReport(maintenanceReportData, existingReport?.id);
      }
      
      console.log('All reports saved successfully');
      router.back();
    } catch (error) {
      console.error('Error saving maintenance reports:', error);
      console.error('Failed to save reports');
    } finally {
      setIsSaving(false);
    }
  };

  const getEngineerById = (engineerId: string) => {
    return engineers.find(e => e.id === engineerId);
  };
  
  const getDepartmentColor = (department: 'КОНД' | 'ДБЖ' | 'ДГУ') => {
    switch (department) {
      case 'КОНД': return '#3B82F6'; // Синій
      case 'ДБЖ': return '#10B981'; // Зелений
      case 'ДГУ': return '#F59E0B'; // Помаранчевий
      default: return colors.gray600;
    }
  };
  
  const getDepartmentIcon = (department: 'КОНД' | 'ДБЖ' | 'ДГУ') => {
    switch (department) {
      case 'КОНД': return Building2;
      case 'ДБЖ': return AlertTriangle;
      case 'ДГУ': return Plus;
      default: return FileText;
    }
  };

  const getPeriodNumber = () => {
    if (!contract || !period) return '';
    const periodIndex = contract.maintenancePeriods?.findIndex(p => p.id === period.id);
    return periodIndex !== undefined ? `ТО${periodIndex + 1}` : 'ТО';
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Завантаження...</Text>
      </View>
    );
  }

  if (!contract || !period) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Звіт ТО', headerShown: true }} />
        <View style={styles.errorContainer}>
          <AlertTriangle size={48} color={colors.error} />
          <Text style={styles.errorText}>Не знайдено договір або період ТО</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.white} />
            <Text style={styles.backButtonText}>Повернутися</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const periodNumber = getPeriodNumber();
  const effectiveStartDate = period.adjustedStartDate ? new Date(period.adjustedStartDate) : new Date(period.startDate);
  const effectiveEndDate = period.adjustedEndDate ? new Date(period.adjustedEndDate) : new Date(period.endDate);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: `${periodNumber} - Звіти по підрозділах`, 
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity 
              onPress={handleSaveAll} 
              style={[styles.headerButton, styles.saveHeaderButton]}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Save size={20} color={colors.white} />
              )}
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView style={styles.content}>
        {/* Інформація про договір та період */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Інформація про {periodNumber}</Text>
          </View>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Договір:</Text>
              <Text style={styles.infoValue}>{contract.contractNumber}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Клієнт:</Text>
              <Text style={styles.infoValue}>{contract.clientName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Адреса:</Text>
              <Text style={styles.infoValue}>{contract.address || 'Не вказано'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Період ТО:</Text>
              <Text style={styles.infoValue}>
                {formatDate(effectiveStartDate.toISOString().split('T')[0])} - {formatDate(effectiveEndDate.toISOString().split('T')[0])}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Підрозділи:</Text>
              <Text style={styles.infoValue}>
                {activeDepartments.join(', ')}
              </Text>
            </View>
          </View>
        </View>

        {/* Звіти по підрозділах */}
        {activeDepartments.map((department) => {
          const departmentData = departmentReports[department];
          if (!departmentData) return null;
          
          const DepartmentIcon = getDepartmentIcon(department);
          const departmentColor = getDepartmentColor(department);
          const assignedEngineer = getEngineerById(departmentData.engineerId);
          
          return (
            <View key={department} style={[styles.section, { borderLeftWidth: 4, borderLeftColor: departmentColor }]}>
              <View style={styles.sectionHeader}>
                <DepartmentIcon size={20} color={departmentColor} />
                <Text style={[styles.sectionTitle, { color: departmentColor }]}>Звіт підрозділу {department}</Text>
              </View>
              
              {/* Інформація про інженера */}
              {assignedEngineer && (
                <View style={[styles.engineerCard, { borderColor: departmentColor }]}>
                  <Users size={16} color={departmentColor} />
                  <Text style={styles.engineerName}>{assignedEngineer.name}</Text>
                </View>
              )}
              
              {/* Дата та час виконання */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Дата завершення ТО *</Text>
                <DatePicker
                  label=""
                  value={departmentData.completedDate}
                  onDateChange={(date) => updateDepartmentReport(department, 'completedDate', date)}
                  placeholder="Оберіть дату"
                />
              </View>
              
              <View style={styles.timeRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: spacing.md }]}>
                  <Text style={styles.label}>Час початку *</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={departmentData.actualStartTime}
                    onChangeText={(value) => updateDepartmentReport(department, 'actualStartTime', value)}
                    placeholder="09:00"
                    placeholderTextColor={colors.gray400}
                  />
                </View>
                
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Час завершення *</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={departmentData.actualEndTime}
                    onChangeText={(value) => updateDepartmentReport(department, 'actualEndTime', value)}
                    placeholder="17:00"
                    placeholderTextColor={colors.gray400}
                  />
                </View>
              </View>
              
              {/* Опис робіт */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Опис виконаних робіт *</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={departmentData.workDescription}
                  onChangeText={(value) => updateDepartmentReport(department, 'workDescription', value)}
                  placeholder={`Детальний опис робіт підрозділу ${department}...`}
                  placeholderTextColor={colors.gray400}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              
              {/* Проблеми та рекомендації */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Виявлені несправності та особливості</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={departmentData.issues}
                  onChangeText={(value) => updateDepartmentReport(department, 'issues', value)}
                  placeholder={`Проблеми виявлені підрозділом ${department}...`}
                  placeholderTextColor={colors.gray400}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Рекомендації для наступного ТО</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={departmentData.recommendations}
                  onChangeText={(value) => updateDepartmentReport(department, 'recommendations', value)}
                  placeholder={`Рекомендації від підрозділу ${department}...`}
                  placeholderTextColor={colors.gray400}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
              
              {/* Додаткова інформація */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Використані матеріали</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={departmentData.materialsUsed}
                  onChangeText={(value) => updateDepartmentReport(department, 'materialsUsed', value)}
                  placeholder={`Матеріали використані підрозділом ${department}...`}
                  placeholderTextColor={colors.gray400}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Особливі примітки</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={departmentData.nextMaintenanceNotes}
                  onChangeText={(value) => updateDepartmentReport(department, 'nextMaintenanceNotes', value)}
                  placeholder={`Примітки від підрозділу ${department}...`}
                  placeholderTextColor={colors.gray400}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>
            </View>
          );
        })}

        {/* Кнопка збереження всіх звітів */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
            onPress={handleSaveAll}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <ActivityIndicator size="small" color={colors.white} />
                <Text style={styles.saveButtonText}>Збереження звітів...</Text>
              </>
            ) : (
              <>
                <Save size={20} color={colors.white} />
                <Text style={styles.saveButtonText}>
                  Зберегти всі звіти ({activeDepartments.length})
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.error,
    textAlign: 'center',
    fontWeight: fontWeight.medium,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  backButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  headerButton: {
    padding: spacing.sm,
  },
  saveHeaderButton: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
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
  infoCard: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: fontSize.base,
    color: colors.gray600,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  infoValue: {
    fontSize: fontSize.base,
    color: colors.gray900,
    fontWeight: fontWeight.semibold,
    flex: 2,
    textAlign: 'right',
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.base,
    color: colors.gray700,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.gray200,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.gray900,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  timeInput: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.gray200,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.gray900,
    textAlign: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButton: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  engineerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  engineerName: {
    fontSize: fontSize.base,
    color: colors.gray700,
    fontWeight: fontWeight.medium,
  },
});