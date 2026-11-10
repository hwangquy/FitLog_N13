import type { Goal, GoalMetric, GoalPeriod, Workout } from '../../types';
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from '../../utils/date';

export type GoalProgress = {
  current: number;
  target: number;
  /** 0..1, đã chặn trên ở 1. */
  ratio: number;
  /** Phần trăm thực, có thể > 100. */
  percent: number;
  completed: boolean;
  remaining: number;
  start: string;
  end: string;
};

export function periodRange(period: GoalPeriod, todayISO: string): { start: string; end: string } {
  return period === 'week'
    ? { start: startOfWeek(todayISO), end: endOfWeek(todayISO) }
    : { start: startOfMonth(todayISO), end: endOfMonth(todayISO) };
}

export const metricLabel: Record<GoalMetric, string> = {
  sessions: 'Số buổi tập',
  minutes: 'Tổng thời gian',
  distance: 'Quãng đường',
  calories: 'Calories đã ghi'
};
export const metricUnit: Record<GoalMetric, string> = { sessions: 'buổi', minutes: 'phút', distance: 'km', calories: 'kcal' };
export const periodLabel: Record<GoalPeriod, string> = { week: 'tuần', month: 'tháng' };

function contribution(metric: GoalMetric, w: Workout): number {
  switch (metric) {
    case 'sessions':
      return 1;
    case 'minutes':
      return w.duration;
    case 'distance':
      return w.distance;
    case 'calories':
      return w.calories ?? 0; // chỉ tính calories người dùng đã nhập
  }
}

/** Tiến độ tính hoàn toàn từ danh sách buổi tập thật trong kỳ hiện tại. */
export function goalProgress(goal: Goal, workouts: Workout[], todayISO: string): GoalProgress {
  const { start, end } = periodRange(goal.period, todayISO);
  let current = 0;
  for (const w of workouts) {
    if (w.date < start || w.date > end) continue;
    if (goal.workoutType !== 'all' && w.type !== goal.workoutType) continue;
    current += contribution(goal.metric, w);
  }
  current = Math.round(current * 10) / 10;
  const ratio = goal.target > 0 ? Math.min(1, current / goal.target) : 0;
  return {
    current,
    target: goal.target,
    ratio,
    percent: goal.target > 0 ? Math.round((current / goal.target) * 100) : 0,
    completed: goal.target > 0 && current >= goal.target,
    remaining: Math.max(0, Math.round((goal.target - current) * 10) / 10),
    start,
    end
  };
}
