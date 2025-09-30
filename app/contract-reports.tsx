import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, Clock, User, Calendar, AlertTriangle, Lightbulb, Package } from 'lucide-react-native';
import { useBusinessData, formatDateDisplay } from '@/hooks/use-business-data';

export default function ContractReportsScreen() {
  const { contractId } = useLocalSearchParams<{
    contractId: string;
  }>();
  
  const { contracts, objects, engineers, reports, isLoading } = useBusinessData();
  
  const contract = contracts.find(c => c.id === contractId);
  const object = objects.find(o => o.id === contract?.objectId);
  const contractReports = reports.filter(r => r.contractId === contractId).sort((a, b) => 
    new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime()
  );
  
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Звіти ТО' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Завантаження даних...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!contract) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Помилка' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Договір не знайдено</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  const getEngineerName = (engineerId: string) => {
    const engineer = engineers.find(e => e.id === engineerId);
    return engineer?.name || 'Невідомий інженер';
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Звіти по договору',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <ArrowLeft size={24} color="#007AFF" />
            </TouchableOpacity>
          )
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Інформація про договір */}
          <View style={styles.contractInfo}>
            <Text style={styles.contractTitle}>{contract.contractNumber}</Text>
            <Text style={styles.contractClient}>{contract.clientName}</Text>
            {object && (
              <Text style={styles.contractObject}>{object.name}</Text>
            )}
            <Text style={styles.contractPeriod}>
              Період: {formatDateDisplay(contract.startDate)} - {formatDateDisplay(contract.endDate)}
            </Text>
          </View>
          
          {/* Статистика */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <FileText size={24} color="#10B981" />
              <Text style={styles.statNumber}>{contractReports.length}</Text>
              <Text style={styles.statLabel}>Звітів</Text>
            </View>
            <View style={styles.statItem}>
              <Calendar size={24} color="#3B82F6" />
              <Text style={styles.statNumber}>
                {contractReports.length > 0 ? formatDateDisplay(contractReports[0].completedDate) : '-'}
              </Text>
              <Text style={styles.statLabel}>Останнє ТО</Text>
            </View>
          </View>
          
          {/* Список звітів */}
          {contractReports.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Звітів поки немає</Text>
              <Text style={styles.emptyDescription}>
                Звіти про виконання ТО з&apos;являться тут після завершення робіт
              </Text>
            </View>
          ) : (
            <View style={styles.reportsSection}>
              <Text style={styles.sectionTitle}>Звіти про виконання ТО</Text>
              {contractReports.map((report) => (
                <View key={report.id} style={styles.reportCard}>
                  {/* Заголовок звіту */}
                  <View style={styles.reportHeader}>
                    <View style={styles.reportHeaderLeft}>
                      <Text style={styles.reportDate}>
                        {formatDateDisplay(report.completedDate)}
                      </Text>
                      <View style={styles.reportMeta}>
                        <User size={14} color="#6B7280" />
                        <Text style={styles.reportEngineer}>
                          {getEngineerName(report.engineerId)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.reportTime}>
                      <Clock size={14} color="#6B7280" />
                      <Text style={styles.reportTimeText}>
                        {report.actualStartTime} - {report.actualEndTime}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Опис робіт */}
                  <View style={styles.reportSection}>
                    <View style={styles.reportSectionHeader}>
                      <FileText size={16} color="#374151" />
                      <Text style={styles.reportSectionTitle}>Виконані роботи</Text>
                    </View>
                    <Text style={styles.reportText}>{report.workDescription}</Text>
                  </View>
                  
                  {/* Проблеми */}
                  <View style={styles.reportSection}>
                    <View style={styles.reportSectionHeader}>
                      <AlertTriangle size={16} color="#F59E0B" />
                      <Text style={styles.reportSectionTitle}>Виявлені проблеми</Text>
                    </View>
                    <Text style={styles.reportText}>{report.issues}</Text>
                  </View>
                  
                  {/* Рекомендації */}
                  {report.recommendations && (
                    <View style={styles.reportSection}>
                      <View style={styles.reportSectionHeader}>
                        <Lightbulb size={16} color="#10B981" />
                        <Text style={styles.reportSectionTitle}>Рекомендації</Text>
                      </View>
                      <Text style={styles.reportText}>{report.recommendations}</Text>
                    </View>
                  )}
                  
                  {/* Матеріали */}
                  {report.materialsUsed && (
                    <View style={styles.reportSection}>
                      <View style={styles.reportSectionHeader}>
                        <Package size={16} color="#6366F1" />
                        <Text style={styles.reportSectionTitle}>Використані матеріали</Text>
                      </View>
                      <Text style={styles.reportText}>{report.materialsUsed}</Text>
                    </View>
                  )}
                  
                  {/* Примітки для наступного ТО */}
                  {report.nextMaintenanceNotes && (
                    <View style={styles.reportSection}>
                      <View style={styles.reportSectionHeader}>
                        <FileText size={16} color="#8B5CF6" />
                        <Text style={styles.reportSectionTitle}>Примітки для наступного ТО</Text>
                      </View>
                      <Text style={[styles.reportText, styles.nextMaintenanceText]}>
                        {report.nextMaintenanceNotes}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  headerButton: {
    padding: 8
  },
  scrollView: {
    flex: 1
  },
  content: {
    padding: 16
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  contractInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  contractTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4
  },
  contractClient: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4
  },
  contractObject: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4
  },
  contractPeriod: {
    fontSize: 14,
    color: '#6B7280'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16
  },
  statItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center'
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20
  },
  reportsSection: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  reportHeaderLeft: {
    flex: 1
  },
  reportDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4
  },
  reportMeta: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  reportEngineer: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4
  },
  reportTime: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  reportTimeText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4
  },
  reportSection: {
    marginBottom: 12
  },
  reportSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  reportSectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 6
  },
  reportText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20
  },
  nextMaintenanceText: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6'
  }
});