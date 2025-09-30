import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { Stack } from 'expo-router';
import { 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Shield, 
  ShieldCheck, 
  ShieldX,
  Eye,
  EyeOff,
  X
} from 'lucide-react-native';
import { useAuth } from '@/hooks/use-auth';
import type { User, UserRole } from '@/types/business';

export default function UserManagementScreen() {
  const { users = [], permissions, createUser, updateUser, changePassword } = useAuth();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'engineer' as UserRole,
    password: '',
    isActive: true
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);

  if (!permissions.canManageUsers) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Управління користувачами' }} />
        <View style={styles.noAccessContainer}>
          <ShieldX size={64} color="#EF4444" />
          <Text style={styles.noAccessText}>Немає доступу</Text>
          <Text style={styles.noAccessSubtext}>
            У вас немає прав для управління користувачами
          </Text>
        </View>
      </View>
    );
  }

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: 'engineer',
      password: '',
      isActive: true
    });
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: '',
      isActive: user.isActive
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      Alert.alert('Помилка', 'Заповніть всі обов\'язкові поля');
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      Alert.alert('Помилка', 'Введіть пароль для нового користувача');
      return;
    }

    try {
      if (editingUser) {
        // Оновлення існуючого користувача
        await updateUser(editingUser.id, {
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          isActive: formData.isActive
        });

        // Зміна пароля, якщо введено новий
        if (formData.password.trim()) {
          await changePassword(formData.email.trim(), formData.password.trim());
        }

        Alert.alert('Успіх', 'Користувача оновлено');
      } else {
        // Створення нового користувача
        await createUser({
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          isActive: formData.isActive
        }, formData.password.trim());

        Alert.alert('Успіх', 'Користувача створено');
      }

      setShowModal(false);
    } catch (error) {
      console.error('Error saving user:', error);
      Alert.alert('Помилка', 'Не вдалося зберегти користувача');
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return <ShieldCheck size={20} color="#7C3AED" />;
      case 'admin':
        return <ShieldCheck size={20} color="#EF4444" />;
      case 'manager':
        return <Shield size={20} color="#F59E0B" />;
      case 'engineer':
        return <Users size={20} color="#10B981" />;
      default:
        return <Users size={20} color="#6B7280" />;
    }
  };

  const getRoleText = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return 'Власник';
      case 'admin':
        return 'Адміністратор';
      case 'manager':
        return 'Менеджер';
      case 'engineer':
        return 'Інженер';
      default:
        return 'Невідомо';
    }
  };

  const renderUserCard = (user: User) => (
    <View key={user.id} style={styles.userCard}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          {getRoleIcon(user.role)}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <Text style={styles.userRole}>{getRoleText(user.role)}</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <View style={[styles.statusBadge, user.isActive ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={[styles.statusText, user.isActive ? styles.activeText : styles.inactiveText]}>
              {user.isActive ? 'Активний' : 'Неактивний'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(user)}
            testID={`edit-user-${user.id}`}
          >
            <Edit3 size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </View>
      
      {user.lastLogin && (
        <Text style={styles.lastLogin}>
          Останній вхід: {new Date(user.lastLogin).toLocaleString('uk-UA')}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Управління користувачами' }} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Користувачі ({users?.length || 0})</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openCreateModal}
          testID="add-user-button"
        >
          <Plus size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Додати</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {(!users || users.length === 0) ? (
          <View style={styles.emptyState}>
            <Users size={64} color="#9CA3AF" />
            <Text style={styles.emptyStateText}>Немає користувачів</Text>
          </View>
        ) : (
          users?.map(renderUserCard) || []
        )}
      </ScrollView>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingUser ? 'Редагувати користувача' : 'Новий користувач'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Ім'я *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Введіть ім'я"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                placeholder="Введіть email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Роль</Text>
              <View style={styles.roleButtons}>
                {(['owner', 'admin', 'manager', 'engineer'] as UserRole[]).map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleButton,
                      formData.role === role && styles.roleButtonActive
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, role }))}
                  >
                    {getRoleIcon(role)}
                    <Text style={[
                      styles.roleButtonText,
                      formData.role === role && styles.roleButtonTextActive
                    ]}>
                      {getRoleText(role)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                {editingUser ? 'Новий пароль (залиште порожнім, щоб не змінювати)' : 'Пароль *'}
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={formData.password}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                  placeholder={editingUser ? 'Новий пароль' : 'Введіть пароль'}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#6B7280" />
                  ) : (
                    <Eye size={20} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
              >
                <View style={[styles.checkbox, formData.isActive && styles.checkboxActive]}>
                  {formData.isActive && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Активний користувач</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.cancelButtonText}>Скасувати</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Зберегти</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  title: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#111827'
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
    fontSize: 16
  },
  content: {
    flex: 1,
    padding: 16
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  userDetails: {
    marginLeft: 12,
    flex: 1
  },
  userName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 2
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2
  },
  userRole: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  activeBadge: {
    backgroundColor: '#D1FAE5'
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2'
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500' as const
  },
  activeText: {
    color: '#065F46'
  },
  inactiveText: {
    color: '#991B1B'
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6'
  },
  lastLogin: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic'
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#9CA3AF',
    marginTop: 16
  },
  noAccessContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  noAccessText: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8
  },
  noAccessSubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#111827'
  },
  closeButton: {
    padding: 8
  },
  modalContent: {
    flex: 1,
    padding: 16
  },
  formGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#374151',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF'
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    gap: 8
  },
  roleButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6'
  },
  roleButtonText: {
    fontSize: 14,
    color: '#374151'
  },
  roleButtonTextActive: {
    color: '#FFFFFF'
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF'
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16
  },
  eyeButton: {
    padding: 12
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6'
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold' as const
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#374151'
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB'
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#374151'
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#3B82F6'
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600' as const
  }
});