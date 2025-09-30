import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Download, 
  Upload, 
  Database, 
  FileText, 
  Users, 
  Building2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useBusinessData } from '@/hooks/use-business-data';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/colors';
import * as Clipboard from 'expo-clipboard';

export default function SyncDataScreen() {
  const { 
    contracts, 
    objects, 
    engineers, 
    tasks, 
    reports,
    exportData, 
    exportSelectedData,
    importData,
    resetData,
    regenerateAllTasks
  } = useBusinessData();
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExportAll = async () => {
    try {
      setIsExporting(true);
      const data = await exportData();
      
      if (Platform.OS === 'web') {
        // На веб-платформі створюємо файл для завантаження
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('Дані експортовано та завантажено як файл');
      } else {
        // На мобільних пристроях показуємо дані для копіювання
        console.log('Експорт завершено');
        copyToClipboard(data);
      }
    } catch (error) {
      console.error('Export error:', error);
      console.error('Не вдалося експортувати дані:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportContracts = async () => {
    try {
      setIsExporting(true);
      const data = await exportSelectedData(['contracts']);
      
      if (Platform.OS === 'web') {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contracts-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('Договори експортовано та завантажено як файл');
      } else {
        console.log('Експорт договорів завершено');
        copyToClipboard(data);
      }
    } catch (error) {
      console.error('Export contracts error:', error);
      console.error('Не вдалося експортувати договори:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportEngineers = async () => {
    try {
      setIsExporting(true);
      const data = await exportSelectedData(['engineers']);
      
      if (Platform.OS === 'web') {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `engineers-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('Інженери експортовано та завантажено як файл');
      } else {
        console.log('Експорт інженерів завершено');
        copyToClipboard(data);
      }
    } catch (error) {
      console.error('Export engineers error:', error);
      console.error('Не вдалося експортувати інженерів:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = async (data: string) => {
    try {
      if (!data || !data.trim()) {
        console.error('Дані для копіювання порожні');
        return;
      }
      
      if (data.length > 1000000) {
        console.error('Дані занадто великі для копіювання');
        return;
      }
      
      const sanitizedData = data.trim();
      await Clipboard.setStringAsync(sanitizedData);
      console.log('Дані скопійовано в буфер обміну');
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  // Функція для поширення даних (поки не використовується)
  const shareData = async (data: string) => {
    try {
      if (Platform.OS !== 'web') {
        await Share.share({
          message: data,
          title: 'Резервна копія даних'
        });
      }
    } catch (error) {
      console.error('Share error:', error);
      console.error('Не вдалося поділитися даними');
    }
  };
  
  // Використовуємо shareData для уникнення попередження
  console.log('shareData function available:', typeof shareData);

  const handleImportFromClipboard = async () => {
    try {
      setIsImporting(true);
      const clipboardData = await Clipboard.getStringAsync();
      
      if (!clipboardData) {
        console.error('Буфер обміну порожній');
        return;
      }

      console.log('📥 Starting import process...');
      await importData(clipboardData);
      
      // Примусово перезавантажуємо дані після імпорту
      console.log('📥 Forcing data reload after import...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Затримка для гарантії збереження
      
      // Перезавантажуємо всі дані з AsyncStorage
      window.location?.reload?.(); // Для веб-версії
      
      console.log('📥 Дані успішно імпортовано з буфера обміну');
    } catch (error) {
      console.error('Import error:', error);
      console.error('Не вдалося імпортувати дані:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleRegenerateTasks = async () => {
    try {
      setIsImporting(true);
      console.log('🔄 Starting task regeneration...');
      const result = await regenerateAllTasks();
      console.log(`✅ Regenerated ${result.tasks.length} tasks and ${result.kanbanTasks.length} kanban entries`);
      
      // Показуємо результат користувачу
      if (Platform.OS === 'web') {
        alert(`Успішно регенеровано ${result.tasks.length} завдань ТО!`);
      }
    } catch (error) {
      console.error('❌ Task regeneration failed:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleResetData = async () => {
    try {
      await resetData();
      console.log('Всі дані скинуто');
      router.back();
    } catch {
      console.error('Не вдалося скинути дані');
    }
  };

  const getDataStats = () => {
    return {
      contracts: contracts.length,
      objects: objects.length,
      engineers: engineers.length,
      tasks: tasks.length,
      reports: reports.length
    };
  };

  const stats = getDataStats();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.gray700} />
          </TouchableOpacity>
          <Text style={styles.title}>Управління даними</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Статистика */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Поточні дані</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Building2 size={20} color={colors.primary} />
                <Text style={styles.statNumber}>{stats.contracts}</Text>
                <Text style={styles.statLabel}>Договори</Text>
              </View>
              <View style={styles.statItem}>
                <Database size={20} color={colors.success} />
                <Text style={styles.statNumber}>{stats.objects}</Text>
                <Text style={styles.statLabel}>Об&apos;єкти</Text>
              </View>
              <View style={styles.statItem}>
                <Users size={20} color={colors.warning} />
                <Text style={styles.statNumber}>{stats.engineers}</Text>
                <Text style={styles.statLabel}>Інженери</Text>
              </View>
              <View style={styles.statItem}>
                <FileText size={20} color={colors.info} />
                <Text style={styles.statNumber}>{stats.tasks}</Text>
                <Text style={styles.statLabel}>Задачі</Text>
              </View>
            </View>
          </View>

          {/* Експорт */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Експорт даних</Text>
            <Text style={styles.sectionDescription}>
              Створіть резервну копію ваших даних для збереження або передачі на інший пристрій
            </Text>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.exportButton]}
              onPress={handleExportAll}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Download size={20} color={colors.white} />
              )}
              <Text style={styles.actionButtonText}>
                {isExporting ? 'Експортування...' : 'Експортувати всі дані'}
              </Text>
            </TouchableOpacity>

            <View style={styles.selectiveExportContainer}>
              <Text style={styles.selectiveExportTitle}>Селективний експорт:</Text>
              <View style={styles.selectiveExportButtons}>
                <TouchableOpacity 
                  style={[styles.selectiveButton, styles.contractsButton]}
                  onPress={handleExportContracts}
                  disabled={isExporting}
                >
                  <Building2 size={16} color={colors.white} />
                  <Text style={styles.selectiveButtonText}>Договори</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.selectiveButton, styles.engineersButton]}
                  onPress={handleExportEngineers}
                  disabled={isExporting}
                >
                  <Users size={16} color={colors.white} />
                  <Text style={styles.selectiveButtonText}>Інженери</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Імпорт */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Імпорт даних</Text>
            <Text style={styles.sectionDescription}>
              Відновіть дані з резервної копії. Скопіюйте JSON дані в буфер обміну та натисніть кнопку нижче
            </Text>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.importButton]}
              onPress={handleImportFromClipboard}
              disabled={isImporting}
            >
              {isImporting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Upload size={20} color={colors.white} />
              )}
              <Text style={styles.actionButtonText}>
                {isImporting ? 'Імпортування...' : 'Імпортувати з буфера обміну'}
              </Text>
            </TouchableOpacity>

            <View style={styles.warningContainer}>
              <AlertTriangle size={16} color={colors.warning} />
              <Text style={styles.warningText}>
                Імпорт замінить всі поточні дані. Рекомендується створити резервну копію перед імпортом.
              </Text>
            </View>
          </View>

          {/* Регенерація завдань */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Виправлення проблем</Text>
            <Text style={styles.sectionDescription}>
              Якщо ТО не відображаються на лінії часу після додавання договору, скористайтеся регенерацією завдань
            </Text>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.regenerateButton]}
              onPress={handleRegenerateTasks}
              disabled={isImporting || isExporting}
            >
              <RefreshCw size={20} color={colors.white} />
              <Text style={styles.actionButtonText}>Регенерувати завдання ТО</Text>
            </TouchableOpacity>
          </View>

          {/* Скидання даних */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Скидання даних</Text>
            <Text style={styles.sectionDescription}>
              Видалити всі дані та повернутися до початкового стану
            </Text>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.resetButton]}
              onPress={handleResetData}
            >
              <AlertTriangle size={20} color={colors.white} />
              <Text style={styles.actionButtonText}>Скинути всі дані</Text>
            </TouchableOpacity>
          </View>

          {/* Інструкції для мобільних пристроїв */}
          {Platform.OS !== 'web' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Інструкції</Text>
              <View style={styles.instructionContainer}>
                <View style={styles.instructionStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.instructionText}>
                    Натисніть &quot;Експортувати всі дані&quot; та оберіть &quot;Копіювати&quot; або &quot;Поділитися&quot;
                  </Text>
                </View>
                
                <View style={styles.instructionStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.instructionText}>
                    Збережіть дані в надійному місці (хмарне сховище, повідомлення собі тощо)
                  </Text>
                </View>
                
                <View style={styles.instructionStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={styles.instructionText}>
                    Для відновлення: скопіюйте дані в буфер обміну та натисніть &quot;Імпортувати з буфера обміну&quot;
                  </Text>
                </View>
              </View>
            </View>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    gap: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray100,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.gray900,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray900,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.gray600,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: 80,
    padding: spacing.md,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.lg,
  },
  statNumber: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray900,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.gray600,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  exportButton: {
    backgroundColor: colors.primary,
  },
  importButton: {
    backgroundColor: colors.success,
  },
  resetButton: {
    backgroundColor: colors.error,
  },
  regenerateButton: {
    backgroundColor: '#8B5CF6',
  },
  selectiveExportContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  selectiveExportTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray700,
    marginBottom: spacing.md,
  },
  selectiveExportButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  selectiveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  selectiveButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  contractsButton: {
    backgroundColor: colors.primary,
  },
  engineersButton: {
    backgroundColor: colors.warning,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.warning,
    lineHeight: 18,
  },
  instructionContainer: {
    gap: spacing.lg,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  instructionText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.gray700,
    lineHeight: 20,
  },
});