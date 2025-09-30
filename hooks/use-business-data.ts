import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
// import { ERROR_MESSAGES, getErrorMessage, logError } from '@/constants/error-messages';
import type { 
  Contract, 
  MaintenanceTask, 
  ServiceEngineer, 
  ServiceObject,
  KanbanTask,
  KanbanColumn,
  ContractKanbanTask,
  ContractKanbanColumn,
  MaintenancePeriod,
  MaintenanceReport
} from '@/types/business';

// Утиліти для роботи з датами

// Функція для парсингу дати з різних форматів в ISO формат
export const parseDate = (dateStr: string): string => {
  if (!dateStr) {
    return '';
  }
  
  // Якщо дата вже в ISO форматі (YYYY-MM-DD), повертаємо як є
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Якщо дата в повному українському форматі ("1 вересня 2025 р.")
  const ukrainianMonths = {
    'січня': '01', 'лютого': '02', 'березня': '03', 'квітня': '04',
    'травня': '05', 'червня': '06', 'липня': '07', 'серпня': '08',
    'вересня': '09', 'жовтня': '10', 'листопада': '11', 'грудня': '12'
  };
  
  const ukrainianMatch = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})\s*р?\.?/);
  if (ukrainianMatch) {
    const [, day, monthName, year] = ukrainianMatch;
    const monthNum = ukrainianMonths[monthName as keyof typeof ukrainianMonths];
    if (monthNum) {
      return `${year}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }
  
  // Якщо дата вже в форматі dd.mm.yyyy, конвертуємо в ISO
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('.');
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  
  // Якщо дата в форматі DD.MM.YYYY або DD.MM.YY
  if (dateStr.includes('.')) {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      let year = parts[2];
      
      // Якщо рік короткий (25), конвертуємо в повний (2025)
      if (year.length === 2) {
        const shortYear = parseInt(year);
        if (shortYear <= 50) {
          year = `20${year}`;
        } else {
          year = `19${year}`;
        }
      }
      
      return `${year}-${month}-${day}`;
    }
  }
  
  return dateStr;
};

// Функція для форматування дати в формат dd.mm.yyyy
export const formatDateDisplay = (isoDate: string): string => {
  if (!isoDate) {
    return '';
  }
  
  // Якщо дата вже в форматі dd.mm.yyyy, повертаємо як є
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(isoDate)) {
    return isoDate;
  }
  
  // Якщо дата в українському форматі, конвертуємо її
  if (isoDate.includes('р.')) {
    const parsedISO = parseDate(isoDate);
    if (parsedISO && parsedISO !== isoDate) {
      const date = new Date(parsedISO);
      if (!isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
      }
    }
  }
  
  // Спробуємо спарсити дату з ISO формату
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) {
    return isoDate;
  }
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}.${month}.${year}`;
};

// Функція для конвертації відображуваної дати в ISO формат
export const convertDisplayToISO = (displayDate: string): string => {
  return parseDate(displayDate);
};

// Залишаємо старі функції для зворотної сумісності
export const parseShortDate = parseDate;

const STORAGE_KEYS = {
  CONTRACTS: 'contracts',
  OBJECTS: 'objects',
  ENGINEERS: 'engineers',
  TASKS: 'tasks',
  KANBAN: 'kanban',
  CONTRACT_KANBAN: 'contract_kanban',
  REPORTS: 'maintenance_reports'
};

export const [BusinessDataProvider, useBusinessData] = createContextHook(() => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [objects, setObjects] = useState<ServiceObject[]>([]);
  const [engineers, setEngineers] = useState<ServiceEngineer[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [kanbanTasks, setKanbanTasks] = useState<KanbanTask[]>([]);
  const [contractKanbanTasks, setContractKanbanTasks] = useState<ContractKanbanTask[]>([]);
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Завантаження даних при старті
  useEffect(() => {
    let isMounted = true;
    
    const initializeApp = async () => {
      try {
        console.log('🚀 Starting app initialization');
        
        if (!isMounted) return;
        
        // Завантажуємо дані
        await loadAllData();
        
        if (isMounted) {
          console.log('✅ App initialization completed');
        }
      } catch (error) {
        console.error('❌ Error initializing app:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    // Запускаємо ініціалізацію негайно
    initializeApp();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      const [contractsData, objectsData, engineersData, tasksData, kanbanData, contractKanbanData, reportsData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.CONTRACTS),
        AsyncStorage.getItem(STORAGE_KEYS.OBJECTS),
        AsyncStorage.getItem(STORAGE_KEYS.ENGINEERS),
        AsyncStorage.getItem(STORAGE_KEYS.TASKS),
        AsyncStorage.getItem(STORAGE_KEYS.KANBAN),
        AsyncStorage.getItem(STORAGE_KEYS.CONTRACT_KANBAN),
        AsyncStorage.getItem(STORAGE_KEYS.REPORTS)
      ]);

      // Ініціалізуємо дані тільки якщо їх зовсім немає
      const hasAnyData = contractsData || objectsData || engineersData || tasksData || kanbanData || contractKanbanData || reportsData;
      
      if (!hasAnyData) {
        // Ініціалізуємо дефолтні дані
        // Розбиваємо ініціалізацію на менші частини
        await initializeDefaultData();
      } else {
        // Завантажуємо існуючі дані
        // Завантажуємо кожен тип даних окремо
        if (contractsData) {
          let parsedContracts;
          try {
            parsedContracts = JSON.parse(contractsData);
            // Дані завантажено
          } catch (parseError) {
            console.error('Error parsing contracts data:', parseError);
            // Очищуємо пошкоджені дані
            await AsyncStorage.removeItem(STORAGE_KEYS.CONTRACTS);
            parsedContracts = [];
          }
          // Міграція старих даних
          const migratedContracts = parsedContracts.map((contract: any) => {
            // Обробляємо договір
            
            // Конвертуємо старі значення serviceFrequency
            if (typeof contract.serviceFrequency === 'string') {
              const frequencyMap: Record<string, number> = {
                'quarterly': 3,
                'biannual': 6,
                'triannual': 4,
                'annual': 12
              };
              contract.serviceFrequency = frequencyMap[contract.serviceFrequency] || 3;
            }
            
            // Мігруємо старі дані про ТО в новий формат
            if (!contract.maintenancePeriods && contract.maintenanceStartDate && contract.maintenanceEndDate) {
              contract.maintenancePeriods = [{
                id: '1',
                startDate: contract.maintenanceStartDate,
                endDate: contract.maintenanceEndDate,
                status: 'planned' as const
              }];
            }
            
            // Додаємо статус до існуючих періодів, якщо його немає
            if (contract.maintenancePeriods) {
              contract.maintenancePeriods = contract.maintenancePeriods.map((period: any) => ({
                ...period,
                status: period.status || 'planned' as const
              }));
            }
            
            // Мігруємо старий assignedEngineerId в новий assignedEngineerIds
            if (contract.assignedEngineerId && !contract.assignedEngineerIds) {
              contract.assignedEngineerIds = [contract.assignedEngineerId];
            }
            
            // Міграція завершена
            return contract;
          });
          setContracts(migratedContracts);
        } else {
          setContracts([]);
        }
        
        if (objectsData) {
          try {
            setObjects(JSON.parse(objectsData));
          } catch (parseError) {
            console.error('🔥 Error parsing objects data:', parseError);
            console.log('🔥 Corrupted objects data:', objectsData.substring(0, 100));
            await AsyncStorage.removeItem(STORAGE_KEYS.OBJECTS);
            setObjects([]);
          }
        } else {
          setObjects([]);
        }
        
        if (engineersData) {
          let parsedEngineers;
          try {
            parsedEngineers = JSON.parse(engineersData);
          } catch (parseError) {
            console.error('🔥 Error parsing engineers data:', parseError);
            console.log('🔥 Corrupted engineers data:', engineersData.substring(0, 100));
            await AsyncStorage.removeItem(STORAGE_KEYS.ENGINEERS);
            parsedEngineers = [];
          }
          
          // Якщо інженери були видалені (порожній масив), відновлюємо дефолтних
          if (parsedEngineers.length === 0) {
            console.log('🔧 Engineers data is empty, restoring default engineers');
            const defaultEngineers: ServiceEngineer[] = [
              { id: '1', name: 'Інженер 1', phone: '', email: '', specialization: ['КОНД'], color: '#3B82F6' },
              { id: '2', name: 'Інженер 2', phone: '', email: '', specialization: ['КОНД', 'ДБЖ'], color: '#10B981' },
              { id: '3', name: 'Інженер 3', phone: '', email: '', specialization: ['ДГУ'], color: '#F59E0B' }
            ];
            setEngineers(defaultEngineers);
            await AsyncStorage.setItem(STORAGE_KEYS.ENGINEERS, JSON.stringify(defaultEngineers));
          } else {
            // Міграція старих даних інженерів
            const migratedEngineers = parsedEngineers.map((engineer: any) => {
              // Конвертуємо старі спеціалізації в масив
              if (typeof engineer.specialization === 'string') {
                // Мапимо старі спеціалізації на нові
                const specializationMap: Record<string, string[]> = {
                  'VRF системи': ['КОНД'],
                  'Чилери': ['КОНД'],
                  'Спліт-системи': ['КОНД'],
                  'КОНД': ['КОНД'],
                  'ДБЖ': ['ДБЖ'],
                  'ДГУ': ['ДГУ']
                };
                engineer.specialization = specializationMap[engineer.specialization] || ['КОНД'];
              }
              return engineer;
            });
            setEngineers(migratedEngineers);
            // Зберігаємо мігровані дані
            await AsyncStorage.setItem(STORAGE_KEYS.ENGINEERS, JSON.stringify(migratedEngineers));
          }
        } else {
          // Якщо інженерів немає, створюємо дефолтних
          const defaultEngineers: ServiceEngineer[] = [
            { id: '1', name: 'Інженер 1', phone: '', email: '', specialization: ['КОНД'], color: '#3B82F6' },
            { id: '2', name: 'Інженер 2', phone: '', email: '', specialization: ['КОНД', 'ДБЖ'], color: '#10B981' },
            { id: '3', name: 'Інженер 3', phone: '', email: '', specialization: ['ДГУ'], color: '#F59E0B' }
          ];
          setEngineers(defaultEngineers);
          await AsyncStorage.setItem(STORAGE_KEYS.ENGINEERS, JSON.stringify(defaultEngineers));
        }
        
        // Завантажуємо tasks з обробкою помилок
        if (tasksData) {
          try {
            setTasks(JSON.parse(tasksData));
          } catch (parseError) {
            console.error('🔥 Error parsing tasks data:', parseError);
            console.log('🔥 Corrupted tasks data:', tasksData.substring(0, 100));
            await AsyncStorage.removeItem(STORAGE_KEYS.TASKS);
            setTasks([]);
          }
        } else {
          setTasks([]);
        }
        
        // Завантажуємо kanban з обробкою помилок
        if (kanbanData) {
          try {
            setKanbanTasks(JSON.parse(kanbanData));
          } catch (parseError) {
            console.error('🔥 Error parsing kanban data:', parseError);
            console.log('🔥 Corrupted kanban data:', kanbanData.substring(0, 100));
            await AsyncStorage.removeItem(STORAGE_KEYS.KANBAN);
            setKanbanTasks([]);
          }
        } else {
          setKanbanTasks([]);
        }
        
        // Завантажуємо contract kanban з обробкою помилок
        if (contractKanbanData) {
          try {
            setContractKanbanTasks(JSON.parse(contractKanbanData));
          } catch (parseError) {
            console.error('🔥 Error parsing contract kanban data:', parseError);
            console.log('🔥 Corrupted contract kanban data:', contractKanbanData.substring(0, 100));
            await AsyncStorage.removeItem(STORAGE_KEYS.CONTRACT_KANBAN);
            setContractKanbanTasks([]);
          }
        } else {
          setContractKanbanTasks([]);
        }
        
        // Завантажуємо звіти з обробкою помилок
        if (reportsData) {
          try {
            setReports(JSON.parse(reportsData));
          } catch (parseError) {
            console.error('🔥 Error parsing reports data:', parseError);
            console.log('🔥 Corrupted reports data:', reportsData.substring(0, 100));
            await AsyncStorage.removeItem(STORAGE_KEYS.REPORTS);
            setReports([]);
          }
        } else {
          setReports([]);
        }
        
        // Після завантаження всіх даних, перевіряємо чи потрібно генерувати канбан дані для договорів
        // Використовуємо parsedContracts замість contracts, оскільки contracts ще не оновлені
        const currentContracts = contractsData ? JSON.parse(contractsData) : [];
        if (!contractKanbanData && currentContracts.length > 0) {
          console.log('🔄 Generating contract kanban data for existing contracts');
          const generatedContractKanban = currentContracts.map((contract: any, index: number) => ({
            id: (index + 1).toString(),
            contractId: contract.id,
            column: contract.status as ContractKanbanColumn,
            order: index
          }));
          setContractKanbanTasks(generatedContractKanban);
          await AsyncStorage.setItem(STORAGE_KEYS.CONTRACT_KANBAN, JSON.stringify(generatedContractKanban));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      await initializeDefaultData();
    } finally {
      setIsLoading(false);
    }
  };

  const initializeDefaultData = async () => {
    // Ініціалізуємо дефолтні дані
    const defaultEngineers: ServiceEngineer[] = [
      { id: '1', name: 'Інженер 1', phone: '', email: '', specialization: ['КОНД'], color: '#3B82F6' },
      { id: '2', name: 'Інженер 2', phone: '', email: '', specialization: ['КОНД', 'ДБЖ'], color: '#10B981' },
      { id: '3', name: 'Інженер 3', phone: '', email: '', specialization: ['ДГУ'], color: '#F59E0B' }
    ];

    const defaultObjects: ServiceObject[] = [
      {
        id: '1',
        name: 'Головний офіс',
        address: 'м. Київ, вул. Академіка Туполєва, 1',
        clientName: 'АТ «Антонов»',
        clientContact: '+380 44 206-8000',
        equipmentCount: 15,
        notes: 'VRF система Daikin, ДБЖ APC Smart-UPS 3000VA',
        contactPersonName: 'Іванов Іван Іванович',
        contactPersonPhone: '+380 44 206-8001'
      }
    ];

    // Функція для генерації періодів ТО в межах дат договору
    const generateMaintenancePeriods = (startDate: string, endDate: string, frequency: number = 3): MaintenancePeriod[] => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const periods: MaintenancePeriod[] = [];
      
      // Починаємо з першого місяця після початку договору
      let currentDate = new Date(start);
      currentDate.setMonth(currentDate.getMonth() + 1);
      
      let periodId = 1;
      
      while (currentDate <= end) {
        const periodStart = new Date(currentDate);
        const periodEnd = new Date(currentDate);
        periodEnd.setDate(periodEnd.getDate() + 14); // 2 тижні на виконання ТО
        
        // Перевіряємо, щоб кінець періоду не виходив за межі договору
        if (periodEnd <= end) {
          periods.push({
            id: periodId.toString(),
            startDate: periodStart.toISOString().split('T')[0],
            endDate: periodEnd.toISOString().split('T')[0],
            status: 'planned'
          });
        }
        
        // Додаємо частоту в місяцях
        currentDate.setMonth(currentDate.getMonth() + frequency);
        periodId++;
      }
      
      return periods;
    };

    const defaultContracts: Contract[] = [
      {
        id: '1',
        contractNumber: 'АТ-001/2024',
        clientName: 'АТ «Антонов»',

        objectId: '1',
        address: 'м. Київ, вул. Академіка Туполєва, 1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        serviceFrequency: 3,
        workTypes: ['КОНД', 'ДБЖ'],
        assignedEngineerIds: ['1', '2'],
        status: 'active',
        maintenancePeriods: [
          {
            id: '1',
            startDate: '2024-03-01',
            endDate: '2024-03-15',
            status: 'planned'
          },
          {
            id: '2',
            startDate: '2024-06-01',
            endDate: '2024-06-15',
            status: 'planned'
          },
          {
            id: '3',
            startDate: '2024-09-01',
            endDate: '2024-09-15',
            status: 'planned'
          },
          {
            id: '4',
            startDate: '2024-12-01',
            endDate: '2024-12-15',
            status: 'planned'
          }
        ]
      }
    ];

    // Генеруємо задачі на основі періодів ТО
    const generateTasksFromContracts = (contracts: Contract[]): MaintenanceTask[] => {
      const tasks: MaintenanceTask[] = [];
      let taskId = 1;
      
      contracts.forEach(contract => {
        contract.maintenancePeriods?.forEach((period, index) => {
          const periodStart = new Date(period.startDate);
          const periodEnd = new Date(period.endDate);
          
          // Планова дата - в середині періоду
          const scheduledDate = new Date(periodStart);
          scheduledDate.setDate(scheduledDate.getDate() + Math.floor((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24) / 2));
          
          // Визначаємо статус залежно від дати
          const now = new Date();
          let status: MaintenanceTask['status'] = 'planned';
          let completedDate: string | undefined;
          
          if (scheduledDate < now) {
            // Якщо дата вже минула, робимо частину задач виконаними
            if (index % 3 === 0) {
              status = 'completed';
              completedDate = scheduledDate.toISOString().split('T')[0];
            } else if (index % 2 === 0) {
              status = 'in_progress';
            }
          }
          
          const engineerId = contract.assignedEngineerIds?.[0] || '1';
          
          tasks.push({
            id: taskId.toString(),
            contractId: contract.id,
            objectId: contract.objectId,
            engineerId,
            scheduledDate: scheduledDate.toISOString().split('T')[0],
            completedDate,
            type: index === 0 ? 'seasonal' : 'routine',
            status,
            duration: (contract.workTypes?.length || 1) * 2 + 2 // Базова тривалість залежно від типів робіт
          });
          
          taskId++;
        });
      });
      
      return tasks;
    };
    


    const defaultTasks = generateTasksFromContracts(defaultContracts);
    // Генеруємо канбан дані на основі згенерованих задач
    const generateKanbanFromTasks = (tasks: MaintenanceTask[]): KanbanTask[] => {
      return tasks.map((task, index) => {
        let column: KanbanColumn = 'todo';
        
        if (task.status === 'completed') {
          column = 'completed';
        } else if (task.status === 'in_progress') {
          column = 'in_progress';
        }
        
        return {
          id: (index + 1).toString(),
          taskId: task.id,
          column,
          order: index
        };
      });
    };

    const defaultKanban = generateKanbanFromTasks(defaultTasks);
    
    // Генеруємо канбан дані для договорів
    // Генеруємо канбан дані для договорів
    const generateContractKanbanFromContracts = (contracts: Contract[]): ContractKanbanTask[] => {
      return contracts.map((contract, index) => ({
        id: (index + 1).toString(),
        contractId: contract.id,
        column: contract.status as ContractKanbanColumn,
        order: index
      }));
    };
    
    const defaultContractKanban = generateContractKanbanFromContracts(defaultContracts);

    // Встановлюємо стан
    setEngineers(defaultEngineers);
    setObjects(defaultObjects);
    setContracts(defaultContracts);
    setTasks(defaultTasks);
    setKanbanTasks(defaultKanban);
    setContractKanbanTasks(defaultContractKanban);
    setReports([]);

    // Зберігаємо дані
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.ENGINEERS, JSON.stringify(defaultEngineers)),
      AsyncStorage.setItem(STORAGE_KEYS.OBJECTS, JSON.stringify(defaultObjects)),
      AsyncStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(defaultContracts)),
      AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(defaultTasks)),
      AsyncStorage.setItem(STORAGE_KEYS.KANBAN, JSON.stringify(defaultKanban)),
      AsyncStorage.setItem(STORAGE_KEYS.CONTRACT_KANBAN, JSON.stringify(defaultContractKanban)),
      AsyncStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify([]))
    ]);
  };

  // CRUD операції для об'єктів
  const addObject = async (object: Omit<ServiceObject, 'id'>) => {
    const newObject: ServiceObject = { ...object, id: Date.now().toString() };
    const updated = [...objects, newObject];
    setObjects(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.OBJECTS, JSON.stringify(updated));
    return newObject;
  };

  // Функція для генерації задач для конкретного договору
  const generateTasksForContract = (contract: Contract): MaintenanceTask[] => {
    const contractTasks: MaintenanceTask[] = [];
    let taskId = Date.now();
    
    console.log('🔥 Generating tasks for contract:', contract.contractNumber);
    console.log('🔥 Contract work types:', contract.workTypes);
    console.log('🔥 Contract maintenance periods:', contract.maintenancePeriods?.length || 0);
    
    if (!contract.maintenancePeriods || contract.maintenancePeriods.length === 0) {
      console.log('🔥 No maintenance periods found for contract:', contract.contractNumber);
      return [];
    }
    
    contract.maintenancePeriods.forEach((period, index) => {
      const periodStart = new Date(period.startDate);
      const periodEnd = new Date(period.endDate);
      
      console.log(`🔥 Processing period ${index + 1}:`, period.startDate, 'to', period.endDate);
      
      // Планова дата - в середині періоду
      const scheduledDate = new Date(periodStart);
      scheduledDate.setDate(scheduledDate.getDate() + Math.floor((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24) / 2));
      
      // Визначаємо статус залежно від дати
      const now = new Date();
      let status: MaintenanceTask['status'] = 'planned';
      let completedDate: string | undefined;
      
      if (scheduledDate < now) {
        // Якщо дата вже минула, робимо частину задач виконаними
        if (index % 3 === 0) {
          status = 'completed';
          completedDate = scheduledDate.toISOString().split('T')[0];
        } else if (index % 2 === 0) {
          status = 'in_progress';
        }
      }
      
      const engineerId = contract.assignedEngineerIds?.[0] || '1';
      
      const task: MaintenanceTask = {
        id: (taskId + index).toString(),
        contractId: contract.id,
        objectId: contract.objectId,
        engineerId,
        scheduledDate: scheduledDate.toISOString().split('T')[0],
        completedDate,
        type: (index === 0 ? 'seasonal' : 'routine') as MaintenanceTask['type'],
        status,
        duration: (contract.workTypes?.length || 1) * 2 + 2,
        maintenancePeriodId: period.id
      };
      
      console.log('🔥 Generated task:', task.id, 'for object:', task.objectId, 'scheduled:', task.scheduledDate);
      contractTasks.push(task);
    });
    
    console.log('🔥 Generated tasks for contract:', contract.contractNumber, 'tasks:', contractTasks.length);
    return contractTasks;
  };

  // Функція для регенерації всіх задач на основі існуючих договорів
  const regenerateAllTasks = async () => {
    console.log('🔄 Regenerating all tasks from contracts...');
    
    const allTasks: MaintenanceTask[] = [];
    const allKanbanTasks: any[] = [];
    
    contracts.forEach(contract => {
      const contractTasks = generateTasksForContract(contract);
      allTasks.push(...contractTasks);
      
      // Генеруємо канбан дані для кожної задачі
      contractTasks.forEach((task, index) => {
        let column: any = 'todo';
        
        if (task.status === 'completed') {
          column = 'completed';
        } else if (task.status === 'in_progress') {
          column = 'in_progress';
        }
        
        allKanbanTasks.push({
          id: (allKanbanTasks.length + 1).toString(),
          taskId: task.id,
          column,
          order: allKanbanTasks.filter(k => k.column === column).length
        });
      });
    });
    
    console.log('🔄 Regenerated tasks:', allTasks.length);
    console.log('🔄 Regenerated kanban tasks:', allKanbanTasks.length);
    
    // Оновлюємо стан
    setTasks(allTasks);
    setKanbanTasks(allKanbanTasks);
    
    // Зберігаємо в AsyncStorage
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(allTasks)),
      AsyncStorage.setItem(STORAGE_KEYS.KANBAN, JSON.stringify(allKanbanTasks))
    ]);
    
    return { tasks: allTasks, kanbanTasks: allKanbanTasks };
  };

  // CRUD операції для контрактів
  const addContract = async (contract: Omit<Contract, 'id'>) => {
    try {
      console.log('🔥 addContract called with:', contract.contractNumber);
      
      // Перевіряємо унікальність номера договору
      const existingContract = contracts.find(c => c.contractNumber === contract.contractNumber);
      if (existingContract) {
        console.error(`Contract with this number already exists: ${contract.contractNumber}`);
        throw new Error('Договір з таким номером вже існує.');
      }
      
      const newContract: Contract = { ...contract, id: Date.now().toString() };
      const updated = [...contracts, newContract];
      
      console.log('🔥 Saving contract to state and storage...');
      setContracts(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(updated));
      
      // Генеруємо задачі на основі періодів ТО нового договору
      const newTasks = generateTasksForContract(newContract);
      const updatedTasks = [...tasks, ...newTasks];
      setTasks(updatedTasks);
      await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updatedTasks));
      
      // Генеруємо канбан дані для нових задач
      const newKanbanTasks = newTasks.map((task: MaintenanceTask, index: number) => {
        let column: KanbanColumn = 'todo';
        
        if (task.status === 'completed') {
          column = 'completed';
        } else if (task.status === 'in_progress') {
          column = 'in_progress';
        }
        
        return {
          id: (kanbanTasks.length + index + 1).toString(),
          taskId: task.id,
          column,
          order: kanbanTasks.filter(k => k.column === column).length + index
        };
      });
      
      const updatedKanbanTasks = [...kanbanTasks, ...newKanbanTasks];
      setKanbanTasks(updatedKanbanTasks);
      await AsyncStorage.setItem(STORAGE_KEYS.KANBAN, JSON.stringify(updatedKanbanTasks));
      
      // Генеруємо канбан дані для договору
      const newContractKanban: ContractKanbanTask = {
        id: (contractKanbanTasks.length + 1).toString(),
        contractId: newContract.id,
        column: newContract.status as ContractKanbanColumn,
        order: contractKanbanTasks.filter(k => k.column === newContract.status).length
      };
      
      const updatedContractKanban = [...contractKanbanTasks, newContractKanban];
      setContractKanbanTasks(updatedContractKanban);
      await AsyncStorage.setItem(STORAGE_KEYS.CONTRACT_KANBAN, JSON.stringify(updatedContractKanban));
    
      console.log('🔥 Contract added with generated data:', {
        contract: newContract.contractNumber,
        tasksGenerated: newTasks.length,
        kanbanTasksGenerated: newKanbanTasks.length
      });
      
      console.log('🔥 Contract successfully added and saved');
      return newContract;
    } catch (error) {
      console.error('Error in addContract:', error);
      throw new Error('Не вдалося зберегти договір.');
    }
  };

  const archiveContract = async (id: string) => {
    console.log('🗂️ archiveContract called with id:', id);
    
    const contractToArchive = contracts.find(c => c.id === id);
    if (!contractToArchive) {
      console.error(`Contract not found for archiving: ${id}`);
      throw new Error('Договір не знайдено.');
    }
    
    console.log('🗂️ Contract found for archiving:', contractToArchive.contractNumber);
    
    // Оновлюємо статус договору на 'archived'
    const updated = contracts.map(c => c.id === id ? { ...c, status: 'archived' as const } : c);
    console.log('🗂️ Updated contracts array length:', updated.length);
    
    // Оновлюємо стан
    setContracts(updated);
    
    // Зберігаємо в AsyncStorage
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CONTRACTS);
      await new Promise(resolve => setTimeout(resolve, 100));
      await AsyncStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(updated));
      console.log('🗂️ Contract archived successfully and saved to storage');
      
      // Оновлюємо канбан дані для договору
      const updatedContractKanban = contractKanbanTasks.map(k => 
        k.contractId === id ? { ...k, column: 'archived' as ContractKanbanColumn } : k
      );
      setContractKanbanTasks(updatedContractKanban);
      await AsyncStorage.setItem(STORAGE_KEYS.CONTRACT_KANBAN, JSON.stringify(updatedContractKanban));
      
      console.log('🗂️ Contract successfully archived');
    } catch (error) {
      console.error('Error in archiveContract:', error);
      // Відкатуємо зміни в стані якщо збереження не вдалося
      setContracts(contracts);
      throw new Error('Не вдалося зберегти дані.');
    }
  };

  const updateContract = async (id: string, updates: Partial<Contract>) => {
    console.log('🔥 updateContract called with:', { id, updates });
    console.log('🔥 Current contracts before update:', contracts.length);
    
    const contractToUpdate = contracts.find(c => c.id === id);
    if (!contractToUpdate) {
      console.error(`Contract not found for update: ${id}`);
      throw new Error('Договір не знайдено.');
    }
    
    console.log('🔥 Contract found for update:', contractToUpdate.contractNumber);
    console.log('🔥 Original maintenance periods:', contractToUpdate.maintenancePeriods);
    console.log('🔥 Updates maintenance periods:', updates.maintenancePeriods);
    
    const updated = contracts.map(c => c.id === id ? { ...c, ...updates } : c);
    console.log('🔥 Updated contracts array length:', updated.length);
    
    const updatedContract = updated.find(c => c.id === id);
    console.log('🔥 Updated contract data:', updatedContract?.contractNumber, updatedContract?.clientName);
    console.log('🔥 Updated contract maintenance periods:', updatedContract?.maintenancePeriods);
    
    // Оновлюємо стан ПЕРЕД збереженням в AsyncStorage
    setContracts(updated);
    
    // Очищаємо кеш і зберігаємо нові дані
    try {
      // Спочатку очищаємо старі дані
      await AsyncStorage.removeItem(STORAGE_KEYS.CONTRACTS);
      // Невелика затримка для гарантії очищення
      await new Promise(resolve => setTimeout(resolve, 100));
      // Зберігаємо нові дані
      await AsyncStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(updated));
      console.log('🔥 Contract updated successfully and saved to storage');
      
      // Якщо оновлювалися періоди ТО, регенеруємо задачі
      if (updates.maintenancePeriods && updatedContract) {
        console.log('🔥 Maintenance periods updated, regenerating tasks...');
        
        // Видаляємо старі задачі цього договору
        const tasksWithoutContract = tasks.filter(t => t.contractId !== id);
        const kanbanWithoutContract = kanbanTasks.filter(k => {
          const task = tasks.find(t => t.id === k.taskId);
          return !task || task.contractId !== id;
        });
        
        // Генеруємо нові задачі
        const newTasks = generateTasksForContract(updatedContract);
        const updatedTasks = [...tasksWithoutContract, ...newTasks];
        
        // Генеруємо нові канбан дані
        const newKanbanTasks = newTasks.map((task, index) => {
          let column: any = 'todo';
          
          if (task.status === 'completed') {
            column = 'completed';
          } else if (task.status === 'in_progress') {
            column = 'in_progress';
          }
          
          return {
            id: (kanbanWithoutContract.length + index + 1).toString(),
            taskId: task.id,
            column,
            order: kanbanWithoutContract.filter(k => k.column === column).length + index
          };
        });
        
        const updatedKanban = [...kanbanWithoutContract, ...newKanbanTasks];
        
        // Оновлюємо стан
        setTasks(updatedTasks);
        setKanbanTasks(updatedKanban);
        
        // Зберігаємо оновлені задачі
        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updatedTasks)),
          AsyncStorage.setItem(STORAGE_KEYS.KANBAN, JSON.stringify(updatedKanban))
        ]);
        
        console.log('🔥 Tasks regenerated for updated contract:', newTasks.length);
      }
      
      // Додаткова перевірка збереження
      const savedData = await AsyncStorage.getItem(STORAGE_KEYS.CONTRACTS);
      if (savedData) {
        const savedContracts = JSON.parse(savedData);
        const savedContract = savedContracts.find((c: any) => c.id === id);
        console.log('🔥 Verification - saved contract maintenance periods:', savedContract?.maintenancePeriods);
      }
    } catch (error) {
      console.error('Error in updateContract:', error);
      throw new Error('Не вдалося зберегти дані.');
    }
  };

  // CRUD операції для задач
  const addTask = async (task: Omit<MaintenanceTask, 'id'>) => {
    const newTask: MaintenanceTask = { ...task, id: Date.now().toString() };
    const updated = [...tasks, newTask];
    setTasks(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
    
    // Додаємо в канбан
    const kanbanTask: KanbanTask = {
      id: Date.now().toString(),
      taskId: newTask.id,
      column: 'todo',
      order: kanbanTasks.filter(k => k.column === 'todo').length
    };
    const updatedKanban = [...kanbanTasks, kanbanTask];
    setKanbanTasks(updatedKanban);
    await AsyncStorage.setItem(STORAGE_KEYS.KANBAN, JSON.stringify(updatedKanban));
    
    return newTask;
  };

  const updateTask = async (id: string, updates: Partial<MaintenanceTask>) => {
    const updated = tasks.map(t => t.id === id ? { ...t, ...updates } : t);
    setTasks(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
  };

  // Канбан операції
  const moveKanbanTask = async (taskId: string, newColumn: KanbanColumn) => {
    const updated = kanbanTasks.map(k => 
      k.taskId === taskId ? { ...k, column: newColumn } : k
    );
    setKanbanTasks(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.KANBAN, JSON.stringify(updated));
    
    // Оновлюємо статус задачі
    const statusMap: Record<KanbanColumn, MaintenanceTask['status']> = {
      'todo': 'planned',
      'in_progress': 'in_progress',
      'review': 'in_progress',
      'completed': 'completed'
    };
    
    await updateTask(taskId, { status: statusMap[newColumn] });
  };
  
  // Канбан операції для договорів
  const moveContractKanbanTask = async (contractId: string, newColumn: ContractKanbanColumn) => {
    const updated = contractKanbanTasks.map(k => 
      k.contractId === contractId ? { ...k, column: newColumn } : k
    );
    setContractKanbanTasks(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.CONTRACT_KANBAN, JSON.stringify(updated));
    
    // Оновлюємо статус договору
    await updateContract(contractId, { status: newColumn });
  };

  // CRUD операції для інженерів
  const addEngineer = async (engineer: Omit<ServiceEngineer, 'id'>) => {
    const newEngineer: ServiceEngineer = { ...engineer, id: Date.now().toString() };
    const updated = [...engineers, newEngineer];
    setEngineers(updated);
    
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ENGINEERS, JSON.stringify(updated));
      console.log('🔧 Engineer added and saved successfully');
      return newEngineer;
    } catch (error) {
      console.error('Error in addEngineer:', error);
      // Відкатуємо зміни в стані якщо збереження не вдалося
      setEngineers(engineers);
      throw new Error('Не вдалося зберегти дані.');
    }
  };

  const updateEngineer = async (id: string, updates: Partial<ServiceEngineer>) => {
    console.log('🔧 updateEngineer called with:', { id, updates });
    const engineerToUpdate = engineers.find(e => e.id === id);
    if (!engineerToUpdate) {
      console.error(`Engineer not found for update: ${id}`);
      throw new Error('Інженера не знайдено.');
    }
    
    const updated = engineers.map(e => e.id === id ? { ...e, ...updates } : e);
    setEngineers(updated);
    
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ENGINEERS, JSON.stringify(updated));
      console.log('🔧 Engineer updated and saved successfully');
    } catch (error) {
      console.error('Error in updateEngineer:', error);
      // Відкатуємо зміни в стані якщо збереження не вдалося
      setEngineers(engineers);
      throw new Error('Не вдалося зберегти дані.');
    }
  };

  const deleteEngineer = async (id: string) => {
    console.log('🗑️ deleteEngineer called with id:', id);
    
    const engineerToDelete = engineers.find(e => e.id === id);
    if (!engineerToDelete) {
      throw new Error('Інженера не знайдено.');
    }
    
    // Перевіряємо, чи не призначений інженер до активних контрактів
    const assignedContracts = contracts.filter(c => 
      (c.assignedEngineerIds?.includes(id) || c.assignedEngineerId === id) && c.status === 'active'
    );
    if (assignedContracts.length > 0) {
      throw new Error('Неможливо видалити інженера. Він призначений до активних договорів.');
    }
    
    const updated = engineers.filter(e => e.id !== id);
    setEngineers(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.ENGINEERS, JSON.stringify(updated));
    
    console.log('🗑️ Engineer deleted successfully');
  };

  // Функція для коригування дат періоду ТО
  const adjustMaintenancePeriod = async (contractId: string, periodId: string, adjustedStartDate: string, adjustedEndDate: string, adjustedBy: string = 'Начальник') => {
    console.log('🔧 adjustMaintenancePeriod called:', { contractId, periodId, adjustedStartDate, adjustedEndDate });
    
    const contract = contracts.find(c => c.id === contractId);
    if (!contract || !contract.maintenancePeriods) {
      throw new Error('Договір не знайдено.');
    }
    
    const updatedPeriods = contract.maintenancePeriods.map(period => {
      if (period.id === periodId) {
        return {
          ...period,
          adjustedStartDate,
          adjustedEndDate,
          status: 'adjusted' as const,
          adjustedDate: new Date().toISOString().split('T')[0],
          adjustedBy
        };
      }
      return period;
    });
    
    await updateContract(contractId, { maintenancePeriods: updatedPeriods });
  };
  
  // Функція для створення звіту про виконання ТО
  const createMaintenanceReport = async (report: Omit<MaintenanceReport, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.log('📝 createMaintenanceReport called:', report);
    
    const newReport: MaintenanceReport = {
      ...report,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const updatedReports = [...reports, newReport];
    setReports(updatedReports);
    await AsyncStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(updatedReports));
    
    // Оновлюємо задачу з посиланням на звіт, якщо taskId передано
    if (report.taskId) {
      await updateTask(report.taskId, { 
        completionReport: newReport,
        status: 'archived',
        completedDate: report.completedDate
      });
      
      // Оновлюємо статус періоду ТО на завершений
      const task = tasks.find(t => t.id === report.taskId);
      if (task && task.maintenancePeriodId) {
        const contract = contracts.find(c => c.id === task.contractId);
        if (contract && contract.maintenancePeriods) {
          const updatedPeriods = contract.maintenancePeriods.map(period => {
            if (period.id === task.maintenancePeriodId) {
              return { ...period, status: 'completed' as const };
            }
            return period;
          });
          await updateContract(contract.id, { maintenancePeriods: updatedPeriods });
        }
      }
    }
    
    return newReport;
  };
  
  // Функція для отримання звітів по договору
  const getReportsByContract = (contractId: string): MaintenanceReport[] => {
    return reports.filter(report => report.contractId === contractId)
      .sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime());
  };
  
  // Функція для отримання останнього звіту по договору
  const getLastReportByContract = (contractId: string): MaintenanceReport | undefined => {
    const contractReports = getReportsByContract(contractId);
    return contractReports[0];
  };
  
  // Функція для отримання звітів по інженеру
  const getReportsByEngineer = (engineerId: string): MaintenanceReport[] => {
    return reports.filter(report => report.engineerId === engineerId)
      .sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime());
  };

  const resetData = async () => {
    console.log('🔄 Resetting all data...');
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.CONTRACTS),
      AsyncStorage.removeItem(STORAGE_KEYS.OBJECTS),
      AsyncStorage.removeItem(STORAGE_KEYS.ENGINEERS),
      AsyncStorage.removeItem(STORAGE_KEYS.TASKS),
      AsyncStorage.removeItem(STORAGE_KEYS.KANBAN),
      AsyncStorage.removeItem(STORAGE_KEYS.CONTRACT_KANBAN),
      AsyncStorage.removeItem(STORAGE_KEYS.REPORTS)
    ]);
    console.log('🔄 All data cleared, reloading...');
    await loadAllData();
    console.log('🔄 Data reset complete');
  };

  const resetContractsOnly = async () => {
    console.log('🔄 Clearing contracts data only...');
    
    // Очищаємо тільки дані пов'язані з договорами
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.CONTRACTS),
      AsyncStorage.removeItem(STORAGE_KEYS.OBJECTS),
      AsyncStorage.removeItem(STORAGE_KEYS.TASKS),
      AsyncStorage.removeItem(STORAGE_KEYS.KANBAN),
      AsyncStorage.removeItem(STORAGE_KEYS.CONTRACT_KANBAN),
      AsyncStorage.removeItem(STORAGE_KEYS.REPORTS)
    ]);
    
    // Оновлюємо стан
    setContracts([]);
    setObjects([]);
    setTasks([]);
    setKanbanTasks([]);
    setContractKanbanTasks([]);
    setReports([]);
    
    console.log('🔄 Contracts data cleared, engineers preserved');
  };

  const clearAllContractsAndSetAntonov = async () => {
    console.log('🔄 Clearing all contracts and setting only Antonov...');
    
    // Очищаємо всі дані пов'язані з договорами
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.CONTRACTS),
      AsyncStorage.removeItem(STORAGE_KEYS.OBJECTS),
      AsyncStorage.removeItem(STORAGE_KEYS.TASKS),
      AsyncStorage.removeItem(STORAGE_KEYS.KANBAN),
      AsyncStorage.removeItem(STORAGE_KEYS.CONTRACT_KANBAN),
      AsyncStorage.removeItem(STORAGE_KEYS.REPORTS)
    ]);
    
    // Створюємо тільки договір АТ «Антонов»
    const antonovObject: ServiceObject = {
      id: '1',
      name: 'Головний офіс',
      address: 'м. Київ, вул. Академіка Туполєва, 1',
      clientName: 'АТ «Антонов»',
      clientContact: '+380 44 206-8000',
      equipmentCount: 15,
      notes: 'VRF система Daikin, ДБЖ APC Smart-UPS 3000VA',
      contactPersonName: 'Іванов Іван Іванович',
      contactPersonPhone: '+380 44 206-8001'
    };
    
    const antonovContract: Contract = {
      id: '1',
      contractNumber: 'АТ-001/2024',
      clientName: 'АТ «Антонов»',
      objectId: '1',
      address: 'м. Київ, вул. Академіка Туполєва, 1',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      serviceFrequency: 3,
      workTypes: ['КОНД', 'ДБЖ'],
      assignedEngineerIds: ['1', '2'],
      status: 'active',
      maintenancePeriods: [
        {
          id: '1',
          startDate: '2024-03-01',
          endDate: '2024-03-15',
          status: 'planned'
        },
        {
          id: '2',
          startDate: '2024-06-01',
          endDate: '2024-06-15',
          status: 'planned'
        },
        {
          id: '3',
          startDate: '2024-09-01',
          endDate: '2024-09-15',
          status: 'planned'
        },
        {
          id: '4',
          startDate: '2024-12-01',
          endDate: '2024-12-15',
          status: 'planned'
        }
      ]
    };
    
    // Генеруємо задачі на основі періодів ТО
    const antonovTasks: MaintenanceTask[] = [];
    let taskId = 1;
    
    antonovContract.maintenancePeriods?.forEach((period, index) => {
      const periodStart = new Date(period.startDate);
      const periodEnd = new Date(period.endDate);
      
      // Планова дата - в середині періоду
      const scheduledDate = new Date(periodStart);
      scheduledDate.setDate(scheduledDate.getDate() + Math.floor((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24) / 2));
      
      // Визначаємо статус залежно від дати
      const now = new Date();
      let status: MaintenanceTask['status'] = 'planned';
      let completedDate: string | undefined;
      
      if (scheduledDate < now) {
        // Якщо дата вже минула, робимо частину задач виконаними
        if (index % 3 === 0) {
          status = 'completed';
          completedDate = scheduledDate.toISOString().split('T')[0];
        } else if (index % 2 === 0) {
          status = 'in_progress';
        }
      }
      
      const engineerId = antonovContract.assignedEngineerIds?.[0] || '1';
      
      antonovTasks.push({
        id: taskId.toString(),
        contractId: antonovContract.id,
        objectId: antonovContract.objectId,
        engineerId,
        scheduledDate: scheduledDate.toISOString().split('T')[0],
        completedDate,
        type: index === 0 ? 'seasonal' : 'routine',
        status,
        duration: (antonovContract.workTypes?.length || 1) * 2 + 2
      });
      
      taskId++;
    });
    
    // Генеруємо канбан дані
    const antonovKanban: KanbanTask[] = antonovTasks.map((task, index) => {
      let column: KanbanColumn = 'todo';
      
      if (task.status === 'completed') {
        column = 'completed';
      } else if (task.status === 'in_progress') {
        column = 'in_progress';
      }
      
      return {
        id: (index + 1).toString(),
        taskId: task.id,
        column,
        order: index
      };
    });
    
    const antonovContractKanban: ContractKanbanTask[] = [{
      id: '1',
      contractId: antonovContract.id,
      column: antonovContract.status as ContractKanbanColumn,
      order: 0
    }];
    
    // Оновлюємо стан
    setContracts([antonovContract]);
    setObjects([antonovObject]);
    setTasks(antonovTasks);
    setKanbanTasks(antonovKanban);
    setContractKanbanTasks(antonovContractKanban);
    setReports([]);
    
    // Зберігаємо дані
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify([antonovContract])),
      AsyncStorage.setItem(STORAGE_KEYS.OBJECTS, JSON.stringify([antonovObject])),
      AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(antonovTasks)),
      AsyncStorage.setItem(STORAGE_KEYS.KANBAN, JSON.stringify(antonovKanban)),
      AsyncStorage.setItem(STORAGE_KEYS.CONTRACT_KANBAN, JSON.stringify(antonovContractKanban)),
      AsyncStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify([]))
    ]);
    
    console.log('🔄 All contracts cleared and Antonov contract restored');
  };

  // Функція для видалення дублікатів договорів
  const removeDuplicateContracts = async () => {
    console.log('🔄 Removing duplicate contracts...');
    
    // Створюємо Map для відстеження унікальних номерів договорів
    const uniqueContracts = new Map<string, Contract>();
    
    // Проходимо по всіх договорах і залишаємо тільки перший з кожним номером
    contracts.forEach(contract => {
      if (!uniqueContracts.has(contract.contractNumber)) {
        uniqueContracts.set(contract.contractNumber, contract);
      }
    });
    
    const deduplicatedContracts = Array.from(uniqueContracts.values());
    
    if (deduplicatedContracts.length !== contracts.length) {
      console.log(`🔄 Removed ${contracts.length - deduplicatedContracts.length} duplicate contracts`);
      
      // Оновлюємо стан
      setContracts(deduplicatedContracts);
      await AsyncStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(deduplicatedContracts));
      
      // Також оновлюємо канбан дані для договорів
      const updatedContractKanban = contractKanbanTasks.filter(kanbanTask => 
        deduplicatedContracts.some(contract => contract.id === kanbanTask.contractId)
      );
      
      setContractKanbanTasks(updatedContractKanban);
      await AsyncStorage.setItem(STORAGE_KEYS.CONTRACT_KANBAN, JSON.stringify(updatedContractKanban));
      
      return deduplicatedContracts.length;
    }
    
    return 0;
  };

  // Функція для експорту всіх даних
  const exportData = async (): Promise<string> => {
    console.log('📤 Exporting all data');
    
    const exportData = {
      contracts,
      objects,
      engineers,
      tasks,
      kanbanTasks,
      contractKanbanTasks,
      reports,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const jsonString = JSON.stringify(exportData, null, 2);
    console.log('📤 Data exported successfully, size:', jsonString.length);
    
    return jsonString;
  };
  
  // Функція для селективного експорту даних
  const exportSelectedData = async (dataTypes: string[]): Promise<string> => {
    console.log('📤 Exporting selected data types:', dataTypes);
    
    const exportData: any = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      dataTypes
    };
    
    if (dataTypes.includes('all') || dataTypes.includes('contracts')) {
      exportData.contracts = contracts;
      exportData.objects = objects;
      exportData.tasks = tasks;
      exportData.kanbanTasks = kanbanTasks;
      exportData.contractKanbanTasks = contractKanbanTasks;
      exportData.reports = reports;
    }
    
    if (dataTypes.includes('all') || dataTypes.includes('engineers')) {
      exportData.engineers = engineers;
    }
    
    const jsonString = JSON.stringify(exportData, null, 2);
    console.log('📤 Selected data exported successfully, size:', jsonString.length);
    
    return jsonString;
  };

  // Функція для імпорту даних
  const importData = async (jsonString: string): Promise<void> => {
    console.log('📥 Importing data, size:', jsonString.length);
    
    try {
      const importedData = JSON.parse(jsonString);
      
      // Перевіряємо структуру даних
      if (!importedData.contracts && !importedData.engineers) {
        throw new Error('Невірний формат файлу даних');
      }
      
      console.log('📥 Parsed data successfully');
      console.log('📥 Contracts:', importedData.contracts?.length || 0);
      console.log('📥 Objects:', importedData.objects?.length || 0);
      console.log('📥 Engineers:', importedData.engineers?.length || 0);
      
      // СПОЧАТКУ очищаємо всі старі дані з AsyncStorage
      console.log('📥 Clearing old data from AsyncStorage...');
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.CONTRACTS),
        AsyncStorage.removeItem(STORAGE_KEYS.OBJECTS),
        AsyncStorage.removeItem(STORAGE_KEYS.ENGINEERS),
        AsyncStorage.removeItem(STORAGE_KEYS.TASKS),
        AsyncStorage.removeItem(STORAGE_KEYS.KANBAN),
        AsyncStorage.removeItem(STORAGE_KEYS.CONTRACT_KANBAN),
        AsyncStorage.removeItem(STORAGE_KEYS.REPORTS)
      ]);
      
      // Невелика затримка для гарантії очищення
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Зберігаємо нові дані в AsyncStorage
      console.log('📥 Saving imported data to AsyncStorage...');
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(importedData.contracts || [])),
        AsyncStorage.setItem(STORAGE_KEYS.OBJECTS, JSON.stringify(importedData.objects || [])),
        AsyncStorage.setItem(STORAGE_KEYS.ENGINEERS, JSON.stringify(importedData.engineers || [])),
        AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(importedData.tasks || [])),
        AsyncStorage.setItem(STORAGE_KEYS.KANBAN, JSON.stringify(importedData.kanbanTasks || [])),
        AsyncStorage.setItem(STORAGE_KEYS.CONTRACT_KANBAN, JSON.stringify(importedData.contractKanbanTasks || [])),
        AsyncStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(importedData.reports || []))
      ]);
      
      // Тепер оновлюємо стан компонента
      console.log('📥 Updating component state...');
      setContracts(importedData.contracts || []);
      setObjects(importedData.objects || []);
      setEngineers(importedData.engineers || []);
      setTasks(importedData.tasks || []);
      setKanbanTasks(importedData.kanbanTasks || []);
      setContractKanbanTasks(importedData.contractKanbanTasks || []);
      setReports(importedData.reports || []);
      
      // Додаткова перевірка збереження
      const verificationData = await AsyncStorage.getItem(STORAGE_KEYS.CONTRACTS);
      if (verificationData) {
        const savedContracts = JSON.parse(verificationData);
        console.log('📥 Verification - saved contracts count:', savedContracts.length);
      }
      
      console.log('📥 Data imported and saved successfully');
    } catch (error) {
      console.error('Error in importData:', error);
      throw new Error('Не вдалося імпортувати дані.');
    }
  };
  
  // Функція для селективного імпорту даних
  const importSelectedData = async (jsonString: string, dataTypes: string[]): Promise<void> => {
    console.log('📥 Importing selected data types:', dataTypes, 'size:', jsonString.length);
    
    try {
      const importedData = JSON.parse(jsonString);
      
      console.log('📥 Parsed data successfully');
      
      // Імпортуємо тільки вибрані типи даних
      if (dataTypes.includes('all') || dataTypes.includes('contracts')) {
        if (importedData.contracts) {
          console.log('📥 Importing contracts:', importedData.contracts.length);
          setContracts(importedData.contracts);
          await AsyncStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(importedData.contracts));
        }
        
        if (importedData.objects) {
          console.log('📥 Importing objects:', importedData.objects.length);
          setObjects(importedData.objects);
          await AsyncStorage.setItem(STORAGE_KEYS.OBJECTS, JSON.stringify(importedData.objects));
        }
        
        if (importedData.tasks) {
          console.log('📥 Importing tasks:', importedData.tasks.length);
          setTasks(importedData.tasks);
          await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(importedData.tasks));
        }
        
        if (importedData.kanbanTasks) {
          setKanbanTasks(importedData.kanbanTasks);
          await AsyncStorage.setItem(STORAGE_KEYS.KANBAN, JSON.stringify(importedData.kanbanTasks));
        }
        
        if (importedData.contractKanbanTasks) {
          setContractKanbanTasks(importedData.contractKanbanTasks);
          await AsyncStorage.setItem(STORAGE_KEYS.CONTRACT_KANBAN, JSON.stringify(importedData.contractKanbanTasks));
        }
        
        if (importedData.reports) {
          console.log('📥 Importing reports:', importedData.reports.length);
          setReports(importedData.reports);
          await AsyncStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(importedData.reports));
        }
      }
      
      if (dataTypes.includes('all') || dataTypes.includes('engineers')) {
        if (importedData.engineers) {
          console.log('📥 Importing engineers:', importedData.engineers.length);
          setEngineers(importedData.engineers);
          await AsyncStorage.setItem(STORAGE_KEYS.ENGINEERS, JSON.stringify(importedData.engineers));
        }
      }
      
      console.log('📥 Selected data imported and saved successfully');
    } catch (error) {
      console.error('Error in importSelectedData:', error);
      throw new Error('Не вдалося імпортувати дані.');
    }
  };

  // Функція для синхронізації з іншим пристроєм через QR код
  const generateSyncQR = async (): Promise<string> => {
    const data = await exportData();
    // Стискаємо дані для QR коду
    const compressed = JSON.stringify({
      contracts: contracts.length,
      objects: objects.length,
      engineers: engineers.length,
      tasks: tasks.length,
      timestamp: Date.now(),
      data: btoa(data) // Base64 кодування
    });
    
    return compressed;
  };









  return {
    contracts,
    objects,
    engineers,
    tasks,
    kanbanTasks,
    contractKanbanTasks,
    reports,
    isLoading,
    addObject,
    addContract,
    updateContract,
    addTask,
    updateTask,
    addEngineer,
    updateEngineer,
    deleteEngineer,
    moveKanbanTask,
    moveContractKanbanTask,
    adjustMaintenancePeriod,
    createMaintenanceReport,
    getReportsByContract,
    getLastReportByContract,
    getReportsByEngineer,
    refreshData: loadAllData,
    resetData,
    removeDuplicateContracts,
    regenerateAllTasks,
    exportData,
    exportSelectedData,
    importData,
    importSelectedData,
    generateSyncQR,
    archiveContract
  };
});

// Функція для генерації наступної дати ТО
export const getNextMaintenanceDate = (contract: Contract): { date: string; status: 'upcoming' | 'due' | 'overdue' } => {
  console.log('🔥 getNextMaintenanceDate called for contract:', contract.contractNumber);
  console.log('🔥 Contract maintenance periods:', contract.maintenancePeriods);
  
  if (!contract.maintenancePeriods || contract.maintenancePeriods.length === 0) {
    console.log('🔥 No maintenance periods found');
    return { date: 'Не вказано', status: 'due' };
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  console.log('🔥 Today date:', today.toISOString().split('T')[0]);
  
  // Знаходимо найближчий майбутній період ТО
  const upcomingPeriods = contract.maintenancePeriods
    .map(period => {
      console.log('🔥 Processing period:', period.id, 'startDate:', period.startDate, 'endDate:', period.endDate);
      return {
        ...period,
        startDate: new Date(period.startDate),
        endDate: new Date(period.endDate)
      };
    })
    .filter(period => {
      const isUpcoming = period.endDate >= today;
      console.log('🔥 Period', period.id, 'is upcoming:', isUpcoming, 'endDate:', period.endDate.toISOString().split('T')[0]);
      return isUpcoming;
    })
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  
  console.log('🔥 Upcoming periods count:', upcomingPeriods.length);
  
  if (upcomingPeriods.length === 0) {
    console.log('🔥 No upcoming periods, returning ТО завершено');
    return { date: 'ТО завершено', status: 'due' };
  }
  
  const nextPeriod = upcomingPeriods[0];
  console.log('🔥 Next period:', nextPeriod.id, 'startDate:', nextPeriod.startDate.toISOString().split('T')[0], 'endDate:', nextPeriod.endDate.toISOString().split('T')[0]);
  
  const daysUntilStart = Math.ceil((nextPeriod.startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  console.log('🔥 Days until start:', daysUntilStart);
  
  let status: 'upcoming' | 'due' | 'overdue' = 'upcoming';
  
  if (daysUntilStart < 0) {
    // Період вже почався
    const daysUntilEnd = Math.ceil((nextPeriod.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    console.log('🔥 Days until end:', daysUntilEnd);
    if (daysUntilEnd < 0) {
      status = 'overdue';
    } else {
      status = 'due';
    }
  } else if (daysUntilStart <= 7) {
    status = 'due';
  }
  
  const result = {
    date: `${formatDateDisplay(nextPeriod.startDate.toISOString().split('T')[0])} - ${formatDateDisplay(nextPeriod.endDate.toISOString().split('T')[0])}`,
    status
  };
  
  console.log('🔥 getNextMaintenanceDate result:', result);
  return result;
};