import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Search, 
  Plus, 
  FileText, 
  Calendar, 
  User, 
  Building2, 
  Clock,
  CheckCircle2,
  ArrowLeft,
  ClipboardCheck,
  Filter
} from 'lucide-react-native';
import { useBusinessData, formatDateDisplay } from '@/hooks/use-business-data';

export default function MaintenanceReportsScreen() {
  const { 
    contracts, 
    objects, 
    engineers, 
    tasks,
    reports,
    isLoading 
  } = useBusinessData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'completed'>('active');
  
  // Фільтруємо договори для ТО
  const filteredContracts = useMemo(() => {
    let contractsToShow = contracts;
    
    // Фільтруємо за статусом
    if (selectedFilter === 'active') {
      contractsToShow = contractsToShow.filter(contract => contract.status === 'active');
    } else if (selectedFilter === 'completed') {
      contractsToShow = contractsToShow.filter(contract => contract.status === 'completed');
    }
    
    // Фільтруємо за пошуковим запитом
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      contractsToShow = contractsToShow.filter(contract => {
        const object = objects.find(o => o.id === contract.objectId);
        
        return (
          contract.contractNumber.toLowerCase().includes(query) ||
          contract.clientName.toLowerCase().includes(query) ||
          object?.name.toLowerCase().includes(query)
        );
      });
    }
    
    // Сортуємо за номером договору
    return contractsToShow.sort((a, b) => a.contractNumber.localeCompare(b.contractNumber));
  }, [contracts, objects, searchQuery, selectedFilter]);
  
  const getObject = (objectId: string) => objects.find(o => o.id === objectId);
  const getEngineer = (engineerId: string) => engineers.find(e => e.id === engineerId);
  const getContractReports = (contractId: string) => reports.filter(r => r.contractId === contractId);
  const getLastReport = (contractId: string) => {
    const contractReports = getContractReports(contractId);
    return contractReports.sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime())[0];
  };
  
  const getMaintenanceStatus = (contract: any) => {
    const contractReports = getContractReports(contract.id);
    const lastReport = getLastReport(contract.id);
    
    if (!contract.maintenancePeriods || contract.maintenancePeriods.length === 0) {
      return { text: 'Періоди ТО не налаштовані', color: '#6B7280', canCreateReport: false };
    }
    
    const today = new Date();
    const currentPeriod = contract.maintenancePeriods.find((period: any) => {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);
      return today >= startDate && today <= endDate;
    });
    
    if (currentPeriod) {
      const hasReportForPeriod = contractReports.some(report => {
        const reportDate = new Date(report.completedDate);
        const periodStart = new Date(currentPeriod.startDate);
        const periodEnd = new Date(currentPeriod.endDate);
        return reportDate >= periodStart && reportDate <= periodEnd;
      });
      
      if (hasReportForPeriod) {
        return { text: 'ТО виконано в поточному періоді', color: '#10B981', canCreateReport: false };
      } else {
        return { text: 'Потрібно виконати ТО', color: '#F59E0B', canCreateReport: true };
      }
    }
    
    // Перевіряємо прострочені періоди
    const overduePeriods = contract.maintenancePeriods.filter((period: any) => {
      const endDate = new Date(period.endDate);
      return endDate < today;
    });
    
    const overdueWithoutReports = overduePeriods.filter((period: any) => {
      const hasReportForPeriod = contractReports.some(report => {
        const reportDate = new Date(report.completedDate);
        const periodStart = new Date(period.startDate);
        const periodEnd = new Date(period.endDate);
        return reportDate >= periodStart && reportDate <= periodEnd;
      });
      return !hasReportForPeriod;
    });
    
    if (overdueWithoutReports.length > 0) {
      return { text: `Прострочено ${overdueWithoutReports.length} періодів ТО`, color: '#DC2626', canCreateReport: true };
    }
    
    if (lastReport) {
      return { text: `Останнє ТО: ${formatDateDisplay(lastReport.completedDate)}`, color: '#10B981', canCreateReport: true };
    }
    
    return { text: 'ТО не виконувалось', color: '#6B7280', canCreateReport: true };
  };
  
  const handleCreateReport = (contractId: string) => {
    router.push(`/create-maintenance-report?contractId=${contractId}`);
  };
  
  const handleViewReports = (contractId: string) => {
    router.push(`/contract-reports?contractId=${contractId}`);
  };
  
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
  
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Звіти ТО',
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
      
      {/* Заголовок та опис */}
      <View style={styles.header}>
        <Text style={styles.title}>Звіти технічного обслуговування</Text>
        <Text style={styles.subtitle}>
          Оберіть договір для створення звіту про виконання ТО або перегляду існуючих звітів
        </Text>
      </View>
      
      {/* Пошук та фільтри */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Пошук договорів..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        
        <View style={styles.filterButtons}>
          <TouchableOpacity 
            style={[styles.filterButton, selectedFilter === 'all' && styles.activeFilterButton]}
            onPress={() => setSelectedFilter('all')}
          >
            <Filter size={14} color={selectedFilter === 'all' ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.filterButtonText, selectedFilter === 'all' && styles.activeFilterButtonText]}>
              Всі
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, selectedFilter === 'active' && styles.activeFilterButton]}
            onPress={() => setSelectedFilter('active')}
          >
            <Clock size={14} color={selectedFilter === 'active' ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.filterButtonText, selectedFilter === 'active' && styles.activeFilterButtonText]}>
              Активні
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, selectedFilter === 'completed' && styles.activeFilterButton]}
            onPress={() => setSelectedFilter('completed')}
          >
            <CheckCircle2 size={14} color={selectedFilter === 'completed' ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.filterButtonText, selectedFilter === 'completed' && styles.activeFilterButtonText]}>
              Завершені
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Статистика */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{contracts.filter(c => c.status === 'active').length}</Text>
          <Text style={styles.statLabel}>Активні договори</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{reports.length}</Text>
          <Text style={styles.statLabel}>Звітів ТО</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{new Set(reports.map(r => r.contractId)).size}</Text>
          <Text style={styles.statLabel}>Договорів зі звітами</Text>
        </View>
      </View>
      
      {/* Список договорів */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {filteredContracts.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Договорів не знайдено</Text>
            <Text style={styles.emptyDescription}>
              {searchQuery ? 'Спробуйте змінити пошуковий запит' : 'Договори з\'являться тут автоматично'}
            </Text>
          </View>
        ) : (
          filteredContracts.map(contract => {
            const object = getObject(contract.objectId);
            const contractReports = getContractReports(contract.id);
            const lastReport = getLastReport(contract.id);
            const maintenanceStatus = getMaintenanceStatus(contract);
            const assignedEngineers = contract.assignedEngineerIds?.map(id => getEngineer(id)).filter(Boolean) || [];
            
            return (
              <View key={contract.id} style={styles.contractCard}>
                {/* Заголовок договору */}
                <View style={styles.contractHeader}>
                  <View style={styles.contractTitleSection}>
                    <Text style={styles.contractObject}>
                      {object?.name || 'Невідомий об\'єкт'}
                    </Text>
                    <Text style={styles.contractTitle}>
                      {contract.contractNumber}
                    </Text>
                    <Text style={styles.contractClient}>
                      {contract.clientName}
                    </Text>
                  </View>
                  
                  <View style={[styles.statusBadge, { backgroundColor: maintenanceStatus.color + '20' }]}>
                    <Text style={[styles.statusText, { color: maintenanceStatus.color }]}>
                      {maintenanceStatus.text}
                    </Text>
                  </View>
                </View>
                
                {/* Деталі договору */}
                <View style={styles.contractDetails}>
                  <View style={styles.contractDetailRow}>
                    <Calendar size={14} color="#6B7280" />
                    <Text style={styles.contractDetailText}>
                      Період: {formatDateDisplay(contract.startDate)} - {formatDateDisplay(contract.endDate)}
                    </Text>
                  </View>
                  
                  {assignedEngineers.length > 0 && (
                    <View style={styles.contractDetailRow}>
                      <User size={14} color="#6B7280" />
                      <Text style={styles.contractDetailText}>
                        Інженери: {assignedEngineers.map(e => e?.name).join(', ')}
                      </Text>
                    </View>
                  )}
                  
                  {contract.workTypes && contract.workTypes.length > 0 && (
                    <View style={styles.contractDetailRow}>
                      <Building2 size={14} color="#6B7280" />
                      <Text style={styles.contractDetailText}>
                        Види робіт: {contract.workTypes.join(', ')}
                      </Text>
                    </View>
                  )}
                  
                  {contractReports.length > 0 && (
                    <View style={styles.contractDetailRow}>
                      <ClipboardCheck size={14} color="#10B981" />
                      <Text style={styles.contractDetailText}>
                        Звітів створено: {contractReports.length}
                      </Text>
                    </View>
                  )}
                </View>
                
                {/* Дії */}
                <View style={styles.contractActions}>
                  {contractReports.length > 0 && (
                    <TouchableOpacity 
                      style={styles.viewReportsButton}
                      onPress={() => handleViewReports(contract.id)}
                    >
                      <FileText size={16} color="#3B82F6" />
                      <Text style={styles.viewReportsButtonText}>Переглянути звіти</Text>
                    </TouchableOpacity>
                  )}
                  
                  {maintenanceStatus.canCreateReport && (
                    <TouchableOpacity 
                      style={styles.createReportButton}
                      onPress={() => handleCreateReport(contract.id)}
                    >
                      <Plus size={16} color="#FFFFFF" />
                      <Text style={styles.createReportButtonText}>Створити звіт ТО</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerButton: {
    padding: 8,
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
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  searchSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: '#111827',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  activeFilterButton: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  contractCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  contractTitleSection: {
    flex: 1,
  },
  contractTitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
    marginBottom: 2,
  },
  contractClient: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
    marginBottom: 2,
  },
  contractObject: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  contractDetails: {
    gap: 8,
    marginBottom: 16,
  },
  contractDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contractDetailText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  contractActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  createReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  createReportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  viewReportsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  viewReportsButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  pendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  pendingText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '500' as const,
  },
});