
import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';

import { Icon } from '../../src/components/ui';
import CoachChatCard from '../../src/components/coach/CoachChatCard';
import { CoachChatLauncherProvider } from '../../src/components/coach/CoachChatLauncher';
import type { IconName } from '../../src/components/ui';
import { useAppTheme } from '../../src/hooks/useAppTheme';

const tab = (
  title: string,
  active: IconName,
  inactive: IconName
) => ({
  title,
  tabBarIcon: ({
    focused,
    color,
  }: {
    focused: boolean;
    color: ColorValue;
    size: number;
  }) => (
    <Icon
      name={focused ? active : inactive}
      size={22}
      color={String(color ?? '#888888')}
    />
  ),
});

export default function TabsLayout() {
  const { colors } = useAppTheme();

  return (
    <CoachChatLauncherProvider>
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.panel,
          borderTopColor: colors.borderColor,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={tab('Tổng quan', 'home', 'home-outline')}
      />

      <Tabs.Screen
        name="workouts"
        options={tab('Nhật ký', 'book', 'book-outline')}
      />

      <Tabs.Screen
        name="progress"
        options={tab('Tiến độ', 'stats-chart', 'stats-chart-outline')}
      />

      <Tabs.Screen
        name="coach"
        options={tab('Kế hoạch', 'calendar', 'calendar-outline')}
      />

      <Tabs.Screen
        name="profile"
        options={tab('Cá nhân', 'person', 'person-outline')}
      />
    </Tabs>
    <CoachChatCard />
    </View>
    </CoachChatLauncherProvider>
  );
}
