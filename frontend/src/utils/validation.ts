import { goalMetrics, goalPeriods, workoutTypes } from '../types';
import type { GoalInput, GoalMetric, GoalPeriod, ReminderInput, WorkoutInput, WorkoutType } from '../types';
import { parseISODate } from './date';
import { normalizeTime } from './normalize';

export type Errors<K extends string> = Partial<Record<K, string>>;
export type Parsed<V, K extends string> = { ok: true; value: V } | { ok: false; errors: Errors<K> };

function parseDecimal(s: string): number | null {
  const t = s.trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null;
}
function parseIntStrict(s: string): number | null {
  const t = s.trim();
  return /^\d+$/.test(t) ? Number(t) : null;
}

// ---------- Buổi tập ----------
export type WorkoutFormValues = {
  title: string;
  type: WorkoutType;
  date: string;
  duration: string;
  distance: string;
  calories: string;
  note: string;
  location: string;
};
export type WorkoutField = 'title' | 'date' | 'duration' | 'distance' | 'calories';

export function parseWorkoutForm(
  v: WorkoutFormValues,
  todayISO: string
): Parsed<Omit<WorkoutInput, 'image' | 'coords' | 'createdAt'>, WorkoutField> {
  const errors: Errors<WorkoutField> = {};
  const title = v.title.trim();
  if (!title) errors.title = 'Hãy nhập tên buổi tập.';
  else if (title.length > 80) errors.title = 'Tên tối đa 80 ký tự.';

  const date = v.date.trim();
  if (!parseISODate(date)) errors.date = 'Ngày không hợp lệ. Dùng định dạng YYYY-MM-DD.';
  else if (date > todayISO) errors.date = 'Ngày tập không được ở tương lai.';

  const duration = parseIntStrict(v.duration);
  if (duration === null || duration < 1 || duration > 1440) errors.duration = 'Thời lượng là số phút từ 1 đến 1440.';

  const distance = v.distance.trim() === '' ? 0 : parseDecimal(v.distance);
  if (distance === null || distance > 1000) errors.distance = 'Quãng đường là số km từ 0 đến 1000.';

  let calories: number | undefined;
  if (v.calories.trim() !== '') {
    const c = parseIntStrict(v.calories);
    if (c === null || c > 20000) errors.calories = 'Calories là số nguyên từ 0 đến 20000, hoặc để trống.';
    else calories = c;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title,
      type: v.type,
      date,
      duration: duration as number,
      distance: distance as number,
      calories,
      note: v.note.trim() || undefined,
      location: v.location.trim() || undefined
    }
  };
}

// ---------- Mục tiêu ----------
export type GoalFormValues = {
  title: string;
  metric: GoalMetric;
  target: string;
  period: GoalPeriod;
  workoutType: WorkoutType | 'all';
};
export type GoalField = 'title' | 'target';

export function parseGoalForm(v: GoalFormValues): Parsed<Omit<GoalInput, 'createdAt'>, GoalField> {
  const errors: Errors<GoalField> = {};
  const title = v.title.trim();
  if (!title) errors.title = 'Hãy nhập tên mục tiêu.';
  else if (title.length > 60) errors.title = 'Tên tối đa 60 ký tự.';

  if (!(goalMetrics as readonly string[]).includes(v.metric) || !(goalPeriods as readonly string[]).includes(v.period)) {
    errors.title = errors.title ?? 'Loại mục tiêu không hợp lệ.';
  }
  const integerMetric = v.metric !== 'distance';
  const target = integerMetric ? parseIntStrict(v.target) : parseDecimal(v.target);
  const max = v.metric === 'sessions' ? 100 : 1_000_000;
  if (target === null || target <= 0 || target > max) {
    errors.target = integerMetric
      ? `Chỉ tiêu phải là số nguyên từ 1 đến ${max.toLocaleString('vi-VN')}.`
      : 'Chỉ tiêu phải là số km lớn hơn 0.';
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { title, metric: v.metric, target: target as number, period: v.period, workoutType: v.workoutType }
  };
}

// ---------- Nhắc nhở ----------
export type ReminderFormValues = { title: string; time: string; days: number[]; enabled: boolean };
export type ReminderField = 'title' | 'time' | 'days';

export function parseReminderForm(v: ReminderFormValues): Parsed<Omit<ReminderInput, 'createdAt'>, ReminderField> {
  const errors: Errors<ReminderField> = {};
  const title = v.title.trim();
  if (!title) errors.title = 'Hãy nhập nội dung nhắc.';
  else if (title.length > 60) errors.title = 'Nội dung tối đa 60 ký tự.';
  const time = normalizeTime(v.time);
  if (!time) errors.time = 'Giờ không hợp lệ. Dùng định dạng HH:mm, ví dụ 18:30.';
  if (v.days.length === 0) errors.days = 'Chọn ít nhất một ngày trong tuần.';
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const days = Array.from(new Set(v.days)).sort((a, b) => a - b);
  return { ok: true, value: { title, time: time as string, days, enabled: v.enabled } };
}

export { workoutTypes };
