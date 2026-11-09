import type { Workout, WorkoutType } from '../../types';
import { addDays, formatDateShort, weekdayShortOf } from '../../utils/date';

export type Summary = {
  sessions: number;
  minutes: number;
  distance: number;
  /** Tổng calories của những buổi có nhập calories. */
  calories: number;
  /** Số buổi có nhập calories (để UI biết con số có đầy đủ hay không). */
  caloriesSessions: number;
};

export function inRange(w: Workout, start: string, end: string): boolean {
  return w.date >= start && w.date <= end;
}

export function summarize(workouts: Workout[], start: string, end: string): Summary {
  const s: Summary = { sessions: 0, minutes: 0, distance: 0, calories: 0, caloriesSessions: 0 };
  for (const w of workouts) {
    if (!inRange(w, start, end)) continue;
    s.sessions += 1;
    s.minutes += w.duration;
    s.distance += w.distance;
    if (w.calories !== undefined) {
      s.calories += w.calories;
      s.caloriesSessions += 1;
    }
  }
  s.distance = Math.round(s.distance * 10) / 10;
  return s;
}

export type Bucket = { key: string; label: string; start: string; end: string; minutes: number; sessions: number };

/** `days` cột, mỗi cột là một ngày, kết thúc ở endISO. */
export function dailySeries(workouts: Workout[], endISO: string, days = 7): Bucket[] {
  const out: Bucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(endISO, -i);
    const s = summarize(workouts, day, day);
    out.push({ key: day, label: weekdayShortOf(day), start: day, end: day, minutes: s.minutes, sessions: s.sessions });
  }
  return out;
}

/** `weeks` cột, mỗi cột 7 ngày liên tiếp, cột cuối kết thúc ở endISO. */
export function weeklySeries(workouts: Workout[], endISO: string, weeks = 4): Bucket[] {
  const out: Bucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = addDays(endISO, -7 * i);
    const start = addDays(end, -6);
    const s = summarize(workouts, start, end);
    out.push({ key: start, label: formatDateShort(start), start, end, minutes: s.minutes, sessions: s.sessions });
  }
  return out;
}

export type PeriodKind = '7d' | '4w';
export type Windows = { current: { start: string; end: string }; previous: { start: string; end: string } };

export function periodWindows(kind: PeriodKind, todayISO: string): Windows {
  const len = kind === '7d' ? 7 : 28;
  const curStart = addDays(todayISO, -(len - 1));
  return {
    current: { start: curStart, end: todayISO },
    previous: { start: addDays(curStart, -len), end: addDays(curStart, -1) }
  };
}

/** Phần trăm thay đổi so với kỳ trước. null nếu kỳ trước bằng 0 (không so sánh được). */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export type TypeBreakdown = { type: WorkoutType; sessions: number; minutes: number };

export function breakdownByType(workouts: Workout[], start: string, end: string): TypeBreakdown[] {
  const map = new Map<WorkoutType, TypeBreakdown>();
  for (const w of workouts) {
    if (!inRange(w, start, end)) continue;
    const cur = map.get(w.type) ?? { type: w.type, sessions: 0, minutes: 0 };
    cur.sessions += 1;
    cur.minutes += w.duration;
    map.set(w.type, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.sessions - a.sessions || b.minutes - a.minutes);
}
