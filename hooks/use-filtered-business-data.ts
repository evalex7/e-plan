// import { useAuth } from './use-auth'; // Тимчасово відключено
import { useBusinessData as useOriginalBusinessData } from './use-business-data';
import { useMemo } from 'react';
import type { Contract, MaintenanceTask, ServiceEngineer, MaintenanceReport } from '@/types/business';

// Хук-обгортка для фільтрації даних на основі прав користувача
export const useFilteredBusinessData = (includeArchived: boolean = false) => {
  // const { user, permissions } = useAuth(); // Тимчасово відключено
  const originalData = useOriginalBusinessData();

  // Тимчасово показуємо всі дані без фільтрації по користувачах
  const filteredContracts = useMemo((): Contract[] => {
    let contracts = originalData.contracts;
    
    // Фільтруємо архівні договори, якщо не потрібно їх включати
    if (!includeArchived) {
      contracts = contracts.filter(contract => contract.status !== 'completed' && contract.status !== 'archived');
    }
    
    // Тимчасово показуємо всі договори (без фільтрації по ролях)
    return contracts;
  }, [originalData.contracts, includeArchived]);

  // Фільтруємо задачі на основі статусу договорів
  const filteredTasks = useMemo((): MaintenanceTask[] => {
    let tasks = originalData.tasks;
    
    // Фільтруємо задачі архівних договорів, якщо не потрібно їх включати
    if (!includeArchived) {
      const activeContractIds = filteredContracts.map(c => c.id);
      tasks = tasks.filter(task => activeContractIds.includes(task.contractId));
    }
    
    // Тимчасово показуємо всі задачі (без фільтрації по ролях)
    return tasks;
  }, [originalData.tasks, filteredContracts, includeArchived]);

  // Показуємо всіх інженерів (тимчасово без фільтрації)
  const filteredEngineers = useMemo((): ServiceEngineer[] => {
    return originalData.engineers;
  }, [originalData.engineers]);

  // Фільтруємо звіти на основі статусу договорів
  const filteredReports = useMemo((): MaintenanceReport[] => {
    let reports = originalData.reports;
    
    // Фільтруємо звіти архівних договорів, якщо не потрібно їх включати
    if (!includeArchived) {
      const activeContractIds = filteredContracts.map(c => c.id);
      reports = reports.filter(report => activeContractIds.includes(report.contractId));
    }
    
    // Тимчасово показуємо всі звіти (без фільтрації по ролях)
    return reports;
  }, [originalData.reports, filteredContracts, includeArchived]);

  // Фільтруємо канбан задачі договорів на основі фільтрованих договорів
  const filteredContractKanbanTasks = useMemo(() => {
    const activeContractIds = filteredContracts.map(c => c.id);
    return originalData.contractKanbanTasks.filter(kanbanTask => 
      activeContractIds.includes(kanbanTask.contractId)
    );
  }, [originalData.contractKanbanTasks, filteredContracts]);

  // Фільтруємо канбан задачі на основі фільтрованих задач
  const filteredKanbanTasks = useMemo(() => {
    const activeTaskIds = filteredTasks.map(t => t.id);
    return originalData.kanbanTasks.filter(kanbanTask => 
      activeTaskIds.includes(kanbanTask.taskId)
    );
  }, [originalData.kanbanTasks, filteredTasks]);

  // Фільтруємо об'єкти на основі фільтрованих договорів
  const filteredObjects = useMemo(() => {
    const activeObjectIds = filteredContracts.map(c => c.objectId);
    return originalData.objects.filter(object => 
      activeObjectIds.includes(object.id)
    );
  }, [originalData.objects, filteredContracts]);

  return {
    ...originalData,
    contracts: filteredContracts,
    objects: filteredObjects,
    tasks: filteredTasks,
    engineers: filteredEngineers,
    reports: filteredReports,
    contractKanbanTasks: filteredContractKanbanTasks,
    kanbanTasks: filteredKanbanTasks,
    // Тимчасово відключаємо інформацію про фільтрацію
    isFiltered: false,
    userRole: 'admin' // Тимчасово встановлюємо як адміністратор
  };
};