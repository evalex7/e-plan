import React from 'react';
import { Stack } from 'expo-router';
import NotificationSettingsScreen from '@/components/NotificationSettings';

export default function NotificationSettingsPage() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Налаштування нотифікацій',
          headerBackTitle: 'Назад'
        }} 
      />
      <NotificationSettingsScreen />
    </>
  );
}