import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';

import { useAdminColors } from '../../src/components/admin/AdminUI';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function AdminLayout() {
  const C = useAdminColors();

  const nav = (title: string, icon: IconName) => ({
    title,
    tabBarIcon: ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => (
      <Ionicons name={icon} color={String(color ?? C.muted)} size={size} />
    )
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: { backgroundColor: C.panel, borderTopColor: C.stroke },
        tabBarLabelStyle: { fontSize: 10 },
        sceneStyle: { backgroundColor: C.bg }
      }}
    >
      <Tabs.Screen name="index" options={nav('Tổng quan', 'grid-outline')} />
      <Tabs.Screen name="users" options={nav('Người dùng', 'people-outline')} />
      <Tabs.Screen name="analytics" options={nav('Tracking', 'analytics-outline')} />
      <Tabs.Screen name="audit" options={nav('Hoạt động', 'document-text-outline')} />
      <Tabs.Screen name="profile" options={nav('Tài khoản', 'shield-checkmark-outline')} />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
    </Tabs>
  );
}
