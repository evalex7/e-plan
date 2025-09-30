import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, ScrollView, Platform } from 'react-native';
import { Undo2, Redo2, RotateCcw, History, X } from 'lucide-react-native';
import { useUndoRedo } from '@/hooks/use-undo-redo';
import { useBusinessData } from '@/hooks/use-business-data';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UndoRedoControlsProps {
  onUndoRedo?: () => void;
}

const STORAGE_KEYS = {
  CONTRACTS: 'contracts',
  OBJECTS: 'objects',
  ENGINEERS: 'engineers',
  TASKS: 'tasks',
  KANBAN: 'kanban',
  CONTRACT_KANBAN: 'contract_kanban',
  REPORTS: 'maintenance_reports'
};

export default function UndoRedoControls({ onUndoRedo }: UndoRedoControlsProps) {
  const { 
    canUndo, 
    canRedo, 
    undo, 
    redo, 
    clearHistory, 
    getRecentActions 
  } = useUndoRedo();
  
  const businessData = useBusinessData();
  
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [clearModalVisible, setClearModalVisible] = useState(false);
  const [message, setMessage] = useState('');

  const handleUndo = async () => {
    const previousState = undo();
    if (previousState) {
      // Відновлюємо стан з історії
      await restoreState(previousState.state);
      onUndoRedo?.();
      setMessage(`Повернуто до: ${previousState.description}`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleRedo = async () => {
    const nextState = redo();
    if (nextState) {
      // Відновлюємо стан з історії
      await restoreState(nextState.state);
      onUndoRedo?.();
      setMessage(`Відновлено: ${nextState.description}`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const restoreState = async (state: any) => {
    if (!state || typeof state !== 'object') {
      console.warn('Invalid state provided for restoration');
      return;
    }
    
    console.log('🔄 Restoring state:', state);
    
    try {
      // Відновлюємо дані в AsyncStorage
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(state.contracts || [])),
        AsyncStorage.setItem(STORAGE_KEYS.OBJECTS, JSON.stringify(state.objects || [])),
        AsyncStorage.setItem(STORAGE_KEYS.ENGINEERS, JSON.stringify(state.engineers || [])),
        AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(state.tasks || [])),
        AsyncStorage.setItem(STORAGE_KEYS.KANBAN, JSON.stringify(state.kanbanTasks || [])),
        AsyncStorage.setItem(STORAGE_KEYS.CONTRACT_KANBAN, JSON.stringify(state.contractKanbanTasks || [])),
        AsyncStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(state.reports || []))
      ]);
      
      // Перезавантажуємо дані в businessData
      await businessData.refreshData();
      
      console.log('✅ State restored successfully');
    } catch (error) {
      console.error('❌ Error restoring state:', error);
      throw error;
    }
  };

  const handleClearHistory = () => {
    setClearModalVisible(true);
  };

  const confirmClearHistory = () => {
    clearHistory();
    setClearModalVisible(false);
    setMessage('Історію очищено');
    setTimeout(() => setMessage(''), 3000);
  };

  const showHistory = () => {
    const recentActions = getRecentActions(20); // Збільшуємо кількість записів
    console.log('📋 History actions count:', recentActions.length);
    console.log('📋 History actions:', recentActions.map(a => ({ id: a.id, desc: a.description, time: new Date(a.timestamp).toLocaleString() })));
    
    if (recentActions.length === 0) {
      setMessage('Історія змін порожня');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    setHistoryModalVisible(true);
  };

  const recentActions = getRecentActions(20);

  return (
    <>
      <View style={styles.container}>
        {message ? (
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.button, !canUndo && styles.buttonDisabled]}
            onPress={handleUndo}
            disabled={!canUndo}
            testID="undo-button"
          >
            <Undo2 size={20} color={canUndo ? '#007AFF' : '#999'} />
            <Text style={[styles.buttonText, !canUndo && styles.buttonTextDisabled]}>
              Відкат
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, !canRedo && styles.buttonDisabled]}
            onPress={handleRedo}
            disabled={!canRedo}
            testID="redo-button"
          >
            <Redo2 size={20} color={canRedo ? '#007AFF' : '#999'} />
            <Text style={[styles.buttonText, !canRedo && styles.buttonTextDisabled]}>
              Повтор
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={showHistory}
            testID="history-button"
          >
            <History size={20} color="#007AFF" />
            <Text style={styles.buttonText}>Історія</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={handleClearHistory}
            testID="clear-history-button"
          >
            <RotateCcw size={20} color="#FF3B30" />
            <Text style={[styles.buttonText, { color: '#FF3B30' }]}>
              Очистити
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Модальне вікно історії */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={historyModalVisible}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setHistoryModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Історія змін</Text>
              <TouchableOpacity 
                onPress={() => setHistoryModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.historyList} showsVerticalScrollIndicator={true}>
              {recentActions.length === 0 ? (
                <Text style={styles.emptyText}>Історія змін порожня</Text>
              ) : (
                recentActions.map((action, index) => {
                  const date = new Date(action.timestamp);
                  const timeString = date.toLocaleString('uk-UA', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  
                  // Скорочуємо довгі описи для кращого відображення
                  const shortDescription = action.description.length > 60 
                    ? action.description.substring(0, 60) + '...'
                    : action.description;
                  
                  return (
                    <TouchableOpacity 
                      key={action.id} 
                      style={styles.historyItem}
                      activeOpacity={0.7}
                    >
                      <View style={styles.historyContent}>
                        <View style={styles.historyHeader}>
                          <Text style={styles.historyIndex}>#{index + 1}</Text>
                          <Text style={styles.historyTime}>{timeString}</Text>
                        </View>
                        <Text style={styles.historyDescription} numberOfLines={2}>
                          {shortDescription}
                        </Text>
                        {action.description.length > 60 && (
                          <Text style={styles.fullDescription} numberOfLines={0}>
                            {action.description}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Модальне вікно підтвердження очищення */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={clearModalVisible}
        onRequestClose={() => setClearModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setClearModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Очистити історію</Text>
              <TouchableOpacity 
                onPress={() => setClearModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.confirmText}>
              Ви впевнені, що хочете очистити всю історію змін? Цю дію неможливо скасувати.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setClearModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Скасувати</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmClearHistory}
              >
                <Text style={styles.confirmButtonText}>Очистити</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  messageContainer: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  messageText: {
    fontSize: 12,
    color: '#065F46',
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E7',
    minWidth: 80,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E5E5E7',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 4,
  },
  buttonTextDisabled: {
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 500 : '95%',
    maxHeight: Platform.OS === 'web' ? '80%' : '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  historyList: {
    maxHeight: Platform.OS === 'web' ? 400 : 350,
    minHeight: 200,
  },
  historyItem: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    borderRadius: 8,
    marginVertical: 2,
  },
  historyContent: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyIndex: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    minWidth: 30,
  },
  historyTime: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'right',
    flex: 1,
  },
  historyDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    flexWrap: 'wrap',
    flex: 1,
  },
  fullDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
  confirmText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmButton: {
    backgroundColor: '#EF4444',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});