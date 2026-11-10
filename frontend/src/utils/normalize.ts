import { goalMetrics, goalPeriods, workoutTypes } from '../types';
import type { Goal, Reminder, Workout, WorkoutType } from '../types';
import { parseISODate } from './date';

// Dữ liệu từ API được xem là không đáng tin: kiểm tra và chuẩn hoá trước khi vào store.
// Bản ghi thiếu trường bắt buộc (id, ngày hợp lệ...) bị loại thay vì làm hỏng màn hình.

type Rec = Record<string, unknown>;
const isRecord = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const asString = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const asNumber = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
};
const asId = (v: unknown): string | undefined =>
  typeof v === 'string' && v !== '' ? v : typeof v === 'number' ? String(v) : undefined;

export const isWorkoutType = (v: unknown): v is WorkoutType =>
  typeof v === 'string' && (workoutTypes as readonly string[]).includes(v);

export function isValidTime(s: string): boolean {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(s.trim());
}

export function normalizeTime(s: string): string | null {
  if (!isValidTime(s)) return null;
  const [h, m] = s.trim().split(':');
  return `${h.padStart(2, '0')}:${m}`;
}

export function normalizeWorkout(raw: unknown): Workout | null {
  if (!isRecord(raw)) return null;
  const id = asId(raw.id);
  const date = asString(raw.date);
  if (!id || !date || !parseISODate(date)) return null;
  const calories = asNumber(raw.calories);
  const lat = isRecord(raw.coords) ? asNumber(raw.coords.latitude) : undefined;
  const lng = isRecord(raw.coords) ? asNumber(raw.coords.longitude) : undefined;
  return {
    id,
    title: asString(raw.title)?.trim() || 'Buổi tập',
    type: isWorkoutType(raw.type) ? raw.type : 'Khác',
    date,
    duration: Math.max(0, asNumber(raw.duration) ?? 0),
    distance: Math.max(0, asNumber(raw.distance) ?? 0),
    calories: calories !== undefined && calories >= 0 ? calories : undefined,
    note: asString(raw.note),
    location: asString(raw.location),
    coords: lat !== undefined && lng !== undefined ? { latitude: lat, longitude: lng } : undefined,
    route: Array.isArray(raw.route) ? raw.route.filter((p): p is {latitude:number;longitude:number} =>
      isRecord(p) && typeof p.latitude === 'number' && typeof p.longitude === 'number' &&
      Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180).slice(0,1000) : [],
    image: asString(raw.image) ?? null,
    createdAt: asString(raw.createdAt)
  };
}

export function normalizeGoal(raw: unknown): Goal | null {
  if (!isRecord(raw)) return null;
  const id = asId(raw.id);
  const target = asNumber(raw.target);
  if (!id || target === undefined || target <= 0) return null;
  // Dữ liệu cũ ({unit: "buổi/tuần", current}) không có metric/period: hiểu là số buổi mỗi tuần.
  const metric = (goalMetrics as readonly string[]).includes(raw.metric as string)
    ? (raw.metric as Goal['metric'])
    : 'sessions';
  const period = (goalPeriods as readonly string[]).includes(raw.period as string)
    ? (raw.period as Goal['period'])
    : 'week';
  return {
    id,
    title: asString(raw.title)?.trim() || 'Mục tiêu',
    metric,
    target,
    period,
    workoutType: isWorkoutType(raw.workoutType) ? raw.workoutType : 'all',
    createdAt: asString(raw.createdAt)
  };
}

export function normalizeReminder(raw: unknown): Reminder | null {
  if (!isRecord(raw)) return null;
  const id = asId(raw.id);
  const time = typeof raw.time === 'string' ? normalizeTime(raw.time) : null;
  if (!id || !time) return null;
  const days = Array.isArray(raw.days)
    ? Array.from(
        new Set(raw.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))
      ).sort((a, b) => a - b)
    : [];
  return {
    id,
    title: asString(raw.title)?.trim() || 'Nhắc lịch tập',
    time,
    days: days.length > 0 ? days : [0, 1, 2, 3, 4, 5, 6],
    enabled: raw.enabled === true,
    createdAt: asString(raw.createdAt)
  };
}

export function normalizeList<T>(raw: unknown, fn: (r: unknown) => T | null): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  for (const r of raw) {
    const item = fn(r);
    if (item) out.push(item);
  }
  return out;
}
