import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Bug } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/colors';

interface DebugDataDisplayProps {
  title: string;
  data: Record<string, any>;
}

export const DebugDataDisplay: React.FC<DebugDataDisplayProps> = ({ title, data }) => {
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Bug size={20} color="#10B981" />
        <Text style={styles.title}>Debug: {title}</Text>
      </View>
      
      <View style={styles.dataContainer}>
        {Object.entries(data).map(([key, value]) => (
          <View key={key} style={styles.dataRow}>
            <Text style={styles.dataKey}>{key}:</Text>
            <Text style={styles.dataValue}>{formatValue(value)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    margin: spacing.lg,
    marginTop: 0,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: '#10B981',
  },
  dataContainer: {
    gap: spacing.sm,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  dataKey: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray700,
    minWidth: 120,
  },
  dataValue: {
    fontSize: fontSize.sm,
    color: colors.gray600,
    flex: 1,
    fontFamily: 'monospace',
  },
});