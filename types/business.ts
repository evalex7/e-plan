export interface ServiceEngineer {
  id: string;
  name: string;
  phone: string;
  email: string;
  specialization: string[];
  color: string; // для візуалізації
}

export interface ServiceObject {
  id: string;
  name: string;
  address: string;
  clientName: string;
  clientContact: string;
  equipmentCount: number;
  notes?: string;
  mapLink?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
}

export interface MaintenancePeriod {
  id: string;
  startDate: string;
  endDate: string;
  // Скориговані дати від начальника
  adjustedStartDate?: string;
  adjustedEndDate?: string;
  // Статус періоду
  status: 'planned' | 'adjusted' | 'in_progress' | 'completed';
  // Дата коли були внесені корективи
  adjustedDate?: string;
  // Хто вніс корективи
  adjustedBy?: string;
  // Підрозділи, які виконують ТО для цього періоду
  departments?: ('КОНД' | 'ДБЖ' | 'ДГУ')[];
  // Залишаємо для сумісності зі старими даними
  department?: 'КОНД' | 'ДБЖ' | 'ДГУ';
}

export interface Contract {
  id: string;
  contractNumber: string;
  objectId: string;
  clientName: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'final_works' | 'extension' | 'archived';
  address?: string;
  mapLink?: string;
  notes?: string;
  workTypes?: string[];
  contactPerson?: string; // контактна особа
  contractValue?: number; // вартість договору в гривнях
  maintenancePeriods?: MaintenancePeriod[]; // масив періодів ТО
  assignedEngineerIds?: string[]; // відповідальні сервісні інженери
  assignedEngineerId?: string; // залишаємо для сумісності зі старими даними
  equipmentType?: 'КОНД' | 'ДБЖ' | 'ДГУ' | 'КОМПЛЕКСНЕ'; // тип обладнання/підрозділ
  // Залишаємо для сумісності зі старими даними
  serviceFrequency?: number;
  maintenanceStartDate?: string;
  maintenanceEndDate?: string;
}

export interface MaintenanceTask {
  id: string;
  contractId: string;
  objectId: string;
  engineerId: string;
  scheduledDate: string;
  completedDate?: string;
  type: 'routine' | 'emergency' | 'seasonal' | 'diagnostic';
  status: 'planned' | 'in_progress' | 'completed' | 'overdue' | 'archived';
  notes?: string;
  duration: number; // в годинах
  // Звіт про виконання
  completionReport?: MaintenanceReport;
  // Посилання на період ТО
  maintenancePeriodId?: string;
}

// Новий інтерфейс для звітів про ТО
export interface MaintenanceReport {
  id: string;
  taskId?: string; // опціональний для звітів, створених напряму з договору
  contractId: string;
  engineerId: string;
  completedDate: string;
  actualStartTime: string; // час початку робіт
  actualEndTime: string; // час завершення робіт
  workDescription: string; // опис виконаних робіт
  issues: string; // виявлені проблеми та нюанси
  recommendations: string; // рекомендації для наступного ТО
  materialsUsed?: string; // використані матеріали
  photos?: string[]; // посилання на фото (якщо будуть)
  nextMaintenanceNotes?: string; // особливі примітки для наступного ТО
  equipmentType?: 'КОНД' | 'ДБЖ' | 'ДГУ' | 'КОМПЛЕКСНЕ'; // тип обладнання/підрозділ
  maintenancePeriodId?: string; // посилання на період ТО
  department: 'КОНД' | 'ДБЖ' | 'ДГУ'; // підрозділ, який виконував ТО
  createdAt: string;
  updatedAt: string;
}

// Інтерфейс для звіту по періоду ТО з розділенням по підрозділах
export interface MaintenancePeriodReport {
  id: string;
  contractId: string;
  maintenancePeriodId: string;
  departmentReports: MaintenanceReport[]; // звіти від різних підрозділів
  createdAt: string;
  updatedAt: string;
}

export type KanbanColumn = 'todo' | 'in_progress' | 'review' | 'completed';
export type ContractKanbanColumn = 'active' | 'final_works' | 'extension' | 'completed' | 'archived';

export interface KanbanTask {
  id: string;
  taskId: string; // MaintenanceTask id
  column: KanbanColumn;
  order: number;
}

export interface ContractKanbanTask {
  id: string;
  contractId: string; // Contract id
  column: ContractKanbanColumn;
  order: number;
}

// Типи для системи аутентифікації
export type UserRole = 'owner' | 'admin' | 'manager' | 'engineer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  engineerId?: string; // Посилання на інженера, якщо користувач - інженер
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Типи для системи нотифікацій
export type NotificationType = 'maintenance_due' | 'maintenance_overdue' | 'contract_expiring' | 'task_assigned' | 'report_required';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  contractId?: string;
  taskId?: string;
  engineerId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  createdAt: string;
  scheduledFor?: string; // Коли показати нотифікацію
  expiresAt?: string; // Коли нотифікація стає неактуальною
  actionRequired?: boolean; // Чи потрібна дія від користувача
  metadata?: {
    daysUntilDue?: number;
    maintenancePeriodId?: string;
    contractNumber?: string;
    objectName?: string;
    engineerName?: string;
  };
}

export interface NotificationSettings {
  enabled: boolean;
  maintenanceReminders: {
    enabled: boolean;
    daysBeforeDue: number[]; // Наприклад, [7, 3, 1] - за 7, 3 та 1 день
    overdueReminders: boolean;
  };
  contractReminders: {
    enabled: boolean;
    daysBeforeExpiry: number[];
  };
  taskAssignments: {
    enabled: boolean;
    immediateNotification: boolean;
  };
  reportReminders: {
    enabled: boolean;
    daysAfterCompletion: number;
  };
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM
    endTime: string; // HH:MM
  };
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

// Права доступу для різних ролей
export interface Permissions {
  canViewContracts: boolean;
  canEditContracts: boolean;
  canDeleteContracts: boolean;
  canViewAllEngineers: boolean;
  canEditEngineers: boolean;
  canDeleteEngineers: boolean;
  canViewReports: boolean;
  canCreateReports: boolean;
  canViewAnalytics: boolean;
  canManageUsers: boolean;
  canExportData: boolean;
  canImportData: boolean;
  canAdjustMaintenancePeriods: boolean;
}