import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { WorkoutType } from '../../types';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color: string }) {
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
