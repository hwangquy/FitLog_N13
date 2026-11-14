import { Ionicons } from '@expo/vector-icons';
import { createContext, useContext, type ComponentProps } from 'react';
import { Text } from 'react-native';
import type { WorkoutType } from '../../types';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// RootLayout tải font Ionicons một lần; khi lỗi tải, dùng ký hiệu fallback thay vì icon trống.
export const IconFontReadyContext = createContext(false);

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color: string }) {
  const ready = useContext(IconFontReadyContext);
  if (!ready) return <Text accessibilityElementsHidden style={{ color, fontSize: size, lineHeight: size + 3 }}>✦</Text>;
  return <Ionicons name={name} size={size} color={color} accessible={false} />;
}

export const workoutIcon: Record<WorkoutType, IconName> = {
  'Chạy bộ': 'walk',
  Gym: 'barbell',
  'Đạp xe': 'bicycle',
  'Đi bộ': 'footsteps',
  Yoga: 'body',
  Khác: 'fitness'
};
