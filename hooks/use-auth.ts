import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { ERROR_MESSAGES, getErrorMessage, logError } from '@/constants/error-messages';
import type { User, AuthState, UserRole, Permissions } from '@/types/business';


const STORAGE_KEYS = {
  USERS: 'users',
  CURRENT_USER: 'current_user',
  PASSWORDS: 'user_passwords' // Зберігаємо паролі окремо для безпеки
};

// Дефолтні паролі для ролей (в реальному додатку це має бути зашифровано)
const DEFAULT_PASSWORDS: Record<string, string> = {
  'owner@company.com': 'owner2024',
  'admin@company.com': 'admin123',
  'manager@company.com': 'manager123'
};

// Спеціальний код для отримання прав власника
const OWNER_ACCESS_CODE = 'OWNER2024';

// Функція для отримання прав доступу на основі ролі
const getPermissionsForRole = (role: UserRole): Permissions => {
  switch (role) {
    case 'owner':
      return {
        canViewContracts: true,
        canEditContracts: true,
        canDeleteContracts: true,
        canViewAllEngineers: true,
        canEditEngineers: true,
        canDeleteEngineers: true,
        canViewReports: true,
        canCreateReports: true,
        canViewAnalytics: true,
        canManageUsers: true,
        canExportData: true,
        canImportData: true,
        canAdjustMaintenancePeriods: true
      };
    case 'admin':
      return {
        canViewContracts: true,
        canEditContracts: true,
        canDeleteContracts: true,
        canViewAllEngineers: true,
        canEditEngineers: true,
        canDeleteEngineers: true,
        canViewReports: true,
        canCreateReports: true,
        canViewAnalytics: true,
        canManageUsers: true,
        canExportData: true,
        canImportData: true,
        canAdjustMaintenancePeriods: true
      };
    case 'manager':
      return {
        canViewContracts: true,
        canEditContracts: true,
        canDeleteContracts: false,
        canViewAllEngineers: true,
        canEditEngineers: false,
        canDeleteEngineers: false,
        canViewReports: true,
        canCreateReports: false,
        canViewAnalytics: true,
        canManageUsers: false,
        canExportData: true,
        canImportData: false,
        canAdjustMaintenancePeriods: true
      };
    case 'engineer':
      return {
        canViewContracts: true,
        canEditContracts: false,
        canDeleteContracts: false,
        canViewAllEngineers: false,
        canEditEngineers: false,
        canDeleteEngineers: false,
        canViewReports: true,
        canCreateReports: true,
        canViewAnalytics: false,
        canManageUsers: false,
        canExportData: false,
        canImportData: false,
        canAdjustMaintenancePeriods: false
      };
    default:
      return {
        canViewContracts: false,
        canEditContracts: false,
        canDeleteContracts: false,
        canViewAllEngineers: false,
        canEditEngineers: false,
        canDeleteEngineers: false,
        canViewReports: false,
        canCreateReports: false,
        canViewAnalytics: false,
        canManageUsers: false,
        canExportData: false,
        canImportData: false,
        canAdjustMaintenancePeriods: false
      };
  }
};

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });
  const [users, setUsers] = useState<User[]>([]);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  
  // Тимчасово відключаємо синхронізацію з інженерами
  // const { engineers } = useBusinessData();

  // Завантаження даних при старті
  useEffect(() => {
    loadAuthData();
  }, []);

  // Тимчасово відключаємо синхронізацію з інженерами
  // useEffect(() => {
  //   if (engineers.length > 0) {
  //     syncUsersWithEngineers();
  //   }
  // }, [engineers]);

  const loadAuthData = async () => {
    try {
      console.log('🔐 Starting auth data load...');
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // Спочатку швидко перевіряємо поточного користувача
      const currentUserData = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      
      if (currentUserData) {
        try {
          const currentUser = JSON.parse(currentUserData);
          // Швидко встановлюємо аутентифікованого користувача
          setAuthState({
            user: currentUser,
            isAuthenticated: true,
            isLoading: false
          });
          console.log('🔐 Quick auth successful for:', currentUser.name);
        } catch (error) {
          console.error('🔐 Error parsing current user data:', error);
          await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        }
      }
      
      // Завантажуємо решту даних асинхронно
      const [usersData, passwordsData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USERS),
        AsyncStorage.getItem(STORAGE_KEYS.PASSWORDS)
      ]);
      
      console.log('🔐 AsyncStorage data loaded');

      // Завантажуємо користувачів
      let loadedUsers: User[] = [];
      if (usersData) {
        try {
          loadedUsers = JSON.parse(usersData);
        } catch (error) {
          console.error('Error parsing users data:', error);
          await AsyncStorage.removeItem(STORAGE_KEYS.USERS);
        }
      }

      // Завантажуємо паролі
      let loadedPasswords: Record<string, string> = { ...DEFAULT_PASSWORDS };
      if (passwordsData) {
        try {
          const parsed = JSON.parse(passwordsData);
          loadedPasswords = { ...loadedPasswords, ...parsed };
        } catch (error) {
          console.error('Error parsing passwords data:', error);
          await AsyncStorage.removeItem(STORAGE_KEYS.PASSWORDS);
        }
      }

      // Якщо немає користувачів, створюємо дефолтних
      if (loadedUsers.length === 0) {
        console.log('🔐 Creating default users...');
        loadedUsers = await createDefaultUsers();
      }

      console.log('🔐 Setting users and passwords...');
      setUsers(loadedUsers);
      setPasswords(loadedPasswords);

      // Якщо не було швидкої аутентифікації, встановлюємо стан
      if (!currentUserData) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
      
      console.log('🔐 Auth data load completed successfully');
    } catch (error) {
      console.error('🔐 Error loading auth data:', error);
      // Встановлюємо стан без аутентифікації, щоб додаток міг запуститися
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
      // Створюємо дефолтних користувачів у випадку помилки
      try {
        const defaultUsers = await createDefaultUsers();
        setUsers(defaultUsers);
        setPasswords(DEFAULT_PASSWORDS);
        console.log('🔐 Default users created after error');
      } catch (createError) {
        console.error('🔐 Failed to create default users:', createError);
      }
    }
  };

  const createDefaultUsers = async (): Promise<User[]> => {
    const defaultUsers: User[] = [
      {
        id: '0',
        email: 'owner@company.com',
        name: 'Власник застосунку',
        role: 'owner',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: '1',
        email: 'admin@company.com',
        name: 'Адміністратор',
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        email: 'manager@company.com',
        name: 'Менеджер',
        role: 'manager',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];

    await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
    await AsyncStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(DEFAULT_PASSWORDS));
    
    return defaultUsers;
  };

  // Тимчасово відключаємо синхронізацію з інженерами
  // const syncUsersWithEngineers = async () => {
  //   console.log('🔐 Syncing users with engineers');
  //   // ... код синхронізації
  // };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 Login attempt for:', email);
      
      // Перевіряємо спеціальний код власника
      if (password === OWNER_ACCESS_CODE) {
        const ownerUser = users.find(u => u.role === 'owner' && u.isActive);
        if (ownerUser) {
          console.log('🔐 Owner access granted with special code');
          
          const updatedUser = {
            ...ownerUser,
            lastLogin: new Date().toISOString()
          };

          const updatedUsers = users.map(u => u.id === ownerUser.id ? updatedUser : u);
          setUsers(updatedUsers);
          await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
          await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
          
          setAuthState({
            user: updatedUser,
            isAuthenticated: true,
            isLoading: false
          });

          return { success: true };
        }
      }
      
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.isActive);
      if (!user) {
        return { success: false, error: ERROR_MESSAGES.USER_NOT_FOUND };
      }

      const storedPassword = passwords[user.email];
      if (!storedPassword || storedPassword !== password) {
        return { success: false, error: ERROR_MESSAGES.INVALID_PASSWORD };
      }

      // Оновлюємо час останнього входу
      const updatedUser = {
        ...user,
        lastLogin: new Date().toISOString()
      };

      const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u);
      setUsers(updatedUsers);
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));

      // Зберігаємо поточного користувача
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
      
      setAuthState({
        user: updatedUser,
        isAuthenticated: true,
        isLoading: false
      });

      console.log('🔐 Login successful for:', user.name, 'Role:', user.role);
      return { success: true };
    } catch (error) {
      logError(error, 'login');
      return { success: false, error: getErrorMessage(error) };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
      console.log('🔐 Logout successful');
    } catch (error) {
      logError(error, 'logout');
    }
  };

  const changePassword = async (email: string, newPassword: string): Promise<boolean> => {
    try {
      const updatedPasswords = {
        ...passwords,
        [email]: newPassword
      };
      
      setPasswords(updatedPasswords);
      await AsyncStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(updatedPasswords));
      
      console.log('🔐 Password changed for:', email);
      return true;
    } catch (error) {
      logError(error, 'changePassword');
      return false;
    }
  };

  const createUser = async (userData: Omit<User, 'id' | 'createdAt'>, password: string): Promise<User> => {
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    const updatedUsers = [...users, newUser];
    const updatedPasswords = {
      ...passwords,
      [newUser.email]: password
    };

    setUsers(updatedUsers);
    setPasswords(updatedPasswords);

    await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    await AsyncStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(updatedPasswords));

    return newUser;
  };

  const updateUser = async (userId: string, updates: Partial<User>): Promise<boolean> => {
    try {
      const updatedUsers = users.map(u => u.id === userId ? { ...u, ...updates } : u);
      setUsers(updatedUsers);
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
      
      // Якщо оновлюємо поточного користувача, оновлюємо і стан аутентифікації
      if (authState.user?.id === userId) {
        const updatedCurrentUser = { ...authState.user, ...updates };
        setAuthState(prev => ({ ...prev, user: updatedCurrentUser }));
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedCurrentUser));
      }
      
      return true;
    } catch (error) {
      logError(error, 'updateUser');
      return false;
    }
  };

  const getPermissions = useCallback((role?: UserRole): Permissions => {
    if (!role) return getPermissionsForRole('engineer');
    return getPermissionsForRole(role);
  }, []);

  const getUserPermissions = useCallback((): Permissions => {
    return getPermissions(authState.user?.role);
  }, [authState.user?.role, getPermissions]);

  return {
    ...authState,
    users,
    permissions: getUserPermissions(),
    login,
    logout,
    changePassword,
    createUser,
    updateUser,
    getPermissions,
    refreshAuth: loadAuthData,
    OWNER_ACCESS_CODE // Експортуємо для використання в UI
  };
});