import { Tabs } from "expo-router";
import { FileText, Users, BarChart3, Wrench, ClipboardList, MoreVertical } from "lucide-react-native";
import React from "react";
import { colors, fontSize, fontWeight } from '@/constants/colors';
import AnimatedTabIcon from '@/components/AnimatedTabIcon';

import { useTabBarVisibility } from '@/hooks/use-tab-bar-visibility';

export default function TabLayout() {
  const { isTabBarVisible } = useTabBarVisibility();
  
  // Стилі для табів з покращеною анімацією іконок
  const getTabScreenOptions = () => {
    return {
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.gray400,
      headerShown: false,
      headerTitle: "",
      title: "",
      tabBarStyle: {
        backgroundColor: colors.white,
        borderTopColor: colors.gray100,
        borderTopWidth: 1,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 16,
        display: isTabBarVisible ? 'flex' : 'none',
      },
      tabBarHideOnKeyboard: true,
      tabBarLabelStyle: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
        marginTop: 2,
      },
      tabBarIconStyle: {
        marginBottom: -2,
      },
    };
  };

  // Стилі для налаштувань (менша вкладка)
  const getSettingsTabOptions = () => {
    return {
      ...getTabScreenOptions(),
      tabBarItemStyle: {
        flex: 0.7, // Менший розмір для налаштувань
        maxWidth: 50,
      },
      tabBarLabelStyle: {
        ...getTabScreenOptions().tabBarLabelStyle,
        fontSize: 0, // Приховуємо текст
      },
    };
  };

  // Стилі для основних вкладок (більший розмір)
  const getMainTabOptions = () => {
    return {
      ...getTabScreenOptions(),
      tabBarItemStyle: {
        flex: 1.2, // Більший розмір для основних вкладок
      },
    };
  };

  return (
    <Tabs screenOptions={getTabScreenOptions()}
    >
      <Tabs.Screen
        name="index"
        options={{
          ...getMainTabOptions(),
          title: "Договори",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon Icon={FileText} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="kanban"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="gantt"
        options={{
          ...getMainTabOptions(),
          title: "Лінія часу",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon Icon={BarChart3} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="work-types"
        options={{
          ...getMainTabOptions(),
          title: "Види робіт",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon Icon={Wrench} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="resources"
        options={{
          ...getMainTabOptions(),
          title: "Виконавці",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon Icon={Users} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          ...getMainTabOptions(),
          title: "Звіти",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon Icon={ClipboardList} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="contract-status"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="engineers"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          ...getSettingsTabOptions(),
          title: "",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon Icon={MoreVertical} color={color} focused={focused} />
          ),
        }}
      />

    </Tabs>
  );
}