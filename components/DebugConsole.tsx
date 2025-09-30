import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { X, Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

interface LogEntry {
  id: string;
  message: string;
  timestamp: Date;
  type: 'log' | 'error' | 'warn';
}

interface DebugConsoleProps {
  visible: boolean;
  onClose: () => void;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({ visible, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const isInterceptingRef = useRef(false);

  const addLog = useCallback((message: string, type: 'log' | 'error' | 'warn') => {
    // Використовуємо setTimeout для уникнення setState під час рендерингу
    setTimeout(() => {
      setLogs(prev => [...prev.slice(-49), {
        id: `${Date.now()}-${Math.random()}`,
        message,
        timestamp: new Date(),
        type
      }]);
    }, 0);
  }, []);

  useEffect(() => {
    if (!visible || isInterceptingRef.current) return;

    isInterceptingRef.current = true;

    // Перехоплюємо console.log
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      addLog(message, 'log');
      originalLog(...args);
    };

    console.error = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      addLog(message, 'error');
      originalError(...args);
    };

    console.warn = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      addLog(message, 'warn');
      originalWarn(...args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      isInterceptingRef.current = false;
    };
  }, [visible, addLog]);

  const copyLogsToClipboard = async () => {
    const logsText = logs.map(log => 
      `${log.timestamp.toLocaleTimeString()}\n${log.message}`
    ).join('\n\n');
    
    try {
      await Clipboard.setStringAsync(logsText);
      Alert.alert('Успіх', 'Логи скопійовано в буфер обміну');
    } catch (error) {
      Alert.alert('Помилка', 'Не вдалося скопіювати логи');
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.console}>
        <View style={styles.header}>
          <Text style={styles.title}>Debug Console</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={copyLogsToClipboard} style={styles.copyButton}>
              <Copy size={18} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView style={styles.logContainer} showsVerticalScrollIndicator={true}>
          {logs.map((log) => (
            <View key={log.id} style={styles.logEntry}>
              <Text style={styles.timestamp}>
                {log.timestamp.toLocaleTimeString()}
              </Text>
              <Text style={[
                styles.logMessage,
                log.type === 'error' && styles.errorMessage,
                log.type === 'warn' && styles.warnMessage
              ]}>
                {log.message}
              </Text>
            </View>
          ))}
        </ScrollView>
        
        <View style={styles.bottomButtons}>
          <TouchableOpacity 
            style={styles.copyAllButton}
            onPress={copyLogsToClipboard}
          >
            <Copy size={16} color="#4CAF50" />
            <Text style={styles.copyAllButtonText}>Копіювати всі логи</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => setLogs([])}
          >
            <Text style={styles.clearButtonText}>Очистити</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 10000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  console: {
    width: '90%',
    height: '80%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyButton: {
    padding: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 6,
  },
  closeButton: {
    padding: 4,
  },
  logContainer: {
    flex: 1,
    padding: 8,
  },
  logEntry: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  timestamp: {
    color: '#888',
    fontSize: 10,
    marginBottom: 2,
  },
  logMessage: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  errorMessage: {
    color: '#ff6b6b',
  },
  warnMessage: {
    color: '#ffd93d',
  },
  bottomButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  copyAllButton: {
    flex: 1,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderRightWidth: 1,
    borderRightColor: '#444',
  },
  copyAllButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#444',
    padding: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});