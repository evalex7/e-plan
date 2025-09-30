import React from 'react';
import { Stack } from 'expo-router';

export default function WorkTypesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="reports" />
    </Stack>
  );
}