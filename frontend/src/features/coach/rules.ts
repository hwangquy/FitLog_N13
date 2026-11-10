// Gợi ý theo QUY TẮC từ lịch sử luyện tập thật. Đây KHÔNG phải AI.
// Phần AI (nếu có backend) nằm ở src/services/ai.ts và luôn được gắn nhãn riêng trên giao diện.
import type { Workout, WorkoutType } from '../../types';
import { addDays, diffDays } from '../../utils/date';
import { summarize, weeklySeries } from '../stats/stats';

export type CoachGoal = 'endurance' | 'habit' | 'activity' | 'relax';
export type CoachLevel = 'beginner' | 'intermediate';
export type CoachPrefs = { goal: CoachGoal; daysPerWeek: number; level: CoachLevel };

export const coachGoalLabel: Record<CoachGoal, string> = {
  endurance: 'Tăng sức bền',
  habit: 'Duy trì thói quen',
  activity: 'Tăng vận động',
  relax: 'Thư giãn'
};
export const coachLevelLabel: Record<CoachLevel, string> = { beginner: 'Mới bắt đầu', intermediate: 'Trung bình' };

export type Analysis = {
  hasData: boolean;
  sessionsLast7: number;
  minutesLast7: number;
  sessionsPrev7: number;
  daysSinceLast: number | null;
  avgMinutes: number | null;
  favoriteTypes: WorkoutType[];
};

export type PlanItem = { label: string; type: WorkoutType; title: string; minutes: number; intensity: 'nhẹ' | 'vừa'; note: string };

const round5 = (n: number) => Math.round(n / 5) * 5;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function analyzeHistory(workouts: Workout[], todayISO: string): Analysis {
  const past = workouts.filter(w => w.date <= todayISO);
  const last7 = summarize(past, addDays(todayISO, -6), todayISO);
  const prev7 = summarize(past, addDays(todayISO, -13), addDays(todayISO, -7));
  const recent = past.filter(w => w.date >= addDays(todayISO, -27)).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10);
  const avgMinutes = recent.length ? Math.round(recent.reduce((s, w) => s + w.duration, 0) / recent.length) : null;
  const counts = new Map<WorkoutType, number>();
  for (const w of past.filter(x => x.date >= addDays(todayISO, -27))) counts.set(w.type, (counts.get(w.type) ?? 0) + 1);
  const favoriteTypes = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t);
  const lastDate = past.reduce<string | null>((m, w) => (m === null || w.date > m ? w.date : m), null);
  return {
    hasData: past.length > 0,
    sessionsLast7: last7.sessions,
    minutesLast7: last7.minutes,
    sessionsPrev7: prev7.sessions,
    daysSinceLast: lastDate === null ? null : Math.max(0, diffDays(lastDate, todayISO)),
    avgMinutes,
    favoriteTypes
  };
}

export function buildInsights(a: Analysis, prefs: CoachPrefs): string[] {
  if (!a.hasData) return ['Chưa có buổi tập nào được ghi. Lịch bên dưới là lịch khởi đầu chung, hãy ghi buổi tập để gợi ý sát với bạn hơn.'];
  const out: string[] = [];
  let line = `7 ngày gần nhất: ${a.sessionsLast7} buổi, ${a.minutesLast7} phút.`;
  if (a.sessionsPrev7 > 0) line += ` Tuần trước đó: ${a.sessionsPrev7} buổi.`;
  out.push(line);
  if (a.daysSinceLast !== null) {
    out.push(a.daysSinceLast === 0 ? 'Bạn đã tập hôm nay.' : `Buổi gần nhất cách đây ${a.daysSinceLast} ngày.`);
  }
  const missing = Math.max(0, prefs.daysPerWeek - a.sessionsLast7);
  out.push(missing === 0 ? `Bạn đã đạt mức ${prefs.daysPerWeek} buổi trong 7 ngày gần nhất.` : `Mục tiêu ${prefs.daysPerWeek} buổi/tuần: còn thiếu ${missing} buổi so với 7 ngày gần nhất.`);
  if (a.favoriteTypes.length) out.push(`Hoạt động bạn tập nhiều nhất gần đây: ${a.favoriteTypes.join(', ')}.`);
  return out;
}

type Role = 'cardio' | 'strength' | 'recovery' | 'yoga' | 'favorite';
const PATTERN: Record<CoachGoal, Role[]> = {
  endurance: ['cardio', 'strength', 'cardio', 'recovery', 'cardio'],
  habit: ['favorite', 'recovery', 'favorite', 'strength', 'favorite'],
  activity: ['cardio', 'recovery', 'strength', 'cardio', 'recovery'],
  relax: ['recovery', 'yoga', 'recovery', 'yoga', 'recovery']
};

export function buildPlan(a: Analysis, prefs: CoachPrefs): PlanItem[] {
  const days = clamp(Math.round(prefs.daysPerWeek), 1, 5);
  const levelBase = prefs.level === 'beginner' ? 20 : 30;
  let base = a.avgMinutes !== null ? clamp(round5(a.avgMinutes), 15, 60) : levelBase;
  let note = '';
  if (!a.hasData || (a.daysSinceLast !== null && a.daysSinceLast >= 5)) {
    base = clamp(round5(base * 0.8), 15, 60); // quay lại nhịp từ từ
    note = 'Bắt đầu nhẹ để cơ thể làm quen lại.';
  } else if (a.sessionsLast7 > 0 && a.sessionsLast7 >= a.sessionsPrev7 && (prefs.goal === 'endurance' || prefs.goal === 'activity')) {
    base = clamp(round5(base * 1.1), 15, 60); // tăng tối đa ~10%
    note = 'Tăng dần thời lượng khoảng 10% so với mức gần đây.';
  }
  const cardio: WorkoutType = a.favoriteTypes.find(t => t === 'Chạy bộ' || t === 'Đạp xe' || t === 'Đi bộ') ?? (prefs.level === 'beginner' ? 'Đi bộ' : 'Chạy bộ');
  const favorite: WorkoutType = a.favoriteTypes[0] ?? 'Đi bộ';

  return PATTERN[prefs.goal].slice(0, days).map((role, i): PlanItem => {
    const label = `Buổi ${i + 1}`;
    switch (role) {
      case 'cardio':
        return { label, type: cardio, title: `${cardio} nhịp vừa phải`, minutes: base, intensity: prefs.level === 'beginner' ? 'nhẹ' : 'vừa', note: note || 'Giữ nhịp vẫn nói chuyện được.' };
      case 'strength':
        return { label, type: 'Gym', title: 'Sức mạnh toàn thân', minutes: clamp(round5(base * 0.9), 15, 60), intensity: prefs.level === 'beginner' ? 'nhẹ' : 'vừa', note: 'Nghỉ giữa các hiệp đủ để thở đều.' };
      case 'recovery':
        return { label, type: 'Đi bộ', title: 'Đi bộ phục hồi', minutes: clamp(round5(base * 0.7), 15, 45), intensity: 'nhẹ', note: 'Vận động nhẹ, không cần ép tốc độ.' };
      case 'yoga':
        return { label, type: 'Yoga', title: 'Yoga / giãn cơ', minutes: clamp(round5(base * 0.7), 15, 45), intensity: 'nhẹ', note: 'Tập chậm, tập trung hơi thở.' };
      case 'favorite':
        return { label, type: favorite, title: `${favorite} yêu thích`, minutes: base, intensity: 'nhẹ', note: note || 'Giữ đều đặn quan trọng hơn cường độ.' };
    }
  });
}

/** Một câu gợi ý ngắn cho Dashboard, tính từ lịch sử thật. */
export function todaySuggestion(a: Analysis): string {
  if (!a.hasData) return 'Hãy ghi buổi tập đầu tiên để FitLog bắt đầu theo dõi tiến độ cho bạn.';
  if (a.daysSinceLast === 0) return 'Bạn đã tập hôm nay. Nghỉ ngơi hoặc giãn cơ nhẹ là đủ.';
  if (a.daysSinceLast !== null && a.daysSinceLast >= 3) {
    const m = clamp(round5((a.avgMinutes ?? 30) * 0.8), 15, 45);
    return `Đã ${a.daysSinceLast} ngày chưa tập. Một buổi nhẹ khoảng ${m} phút là cách tốt để quay lại nhịp.`;
  }
  return 'Bạn đang giữ nhịp khá đều. Một buổi vừa sức hôm nay sẽ giúp duy trì thói quen.';
}

/** Dữ liệu gửi cho AI backend: chỉ số tổng hợp, KHÔNG gồm tên buổi tập, ghi chú, vị trí, ảnh. */
export type AiPayload = {
  prefs: CoachPrefs;
  history: {
    sessionsLast7: number;
    minutesLast7: number;
    sessionsPrev7: number;
    daysSinceLast: number | null;
    avgMinutes: number | null;
    favoriteTypes: WorkoutType[];
    weeks: { weekStart: string; sessions: number; minutes: number }[];
  };
};

export function buildAiPayload(workouts: Workout[], prefs: CoachPrefs, todayISO: string): AiPayload {
  const a = analyzeHistory(workouts, todayISO);
  return {
    prefs,
    history: {
      sessionsLast7: a.sessionsLast7,
      minutesLast7: a.minutesLast7,
      sessionsPrev7: a.sessionsPrev7,
      daysSinceLast: a.daysSinceLast,
      avgMinutes: a.avgMinutes,
      favoriteTypes: a.favoriteTypes,
      weeks: weeklySeries(workouts, todayISO, 4).map(b => ({ weekStart: b.start, sessions: b.sessions, minutes: b.minutes }))
    }
  };
}

export type AiPlan = {
  summary: string;
  plan: { title: string; minutes: number; notes: string }[];
};

/** Kiểm tra phản hồi của AI backend trước khi hiển thị. Trả về null nếu sai định dạng. */
export function parseAiResponse(raw: unknown): AiPlan | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as { summary?: unknown; plan?: unknown };
  if (typeof r.summary !== 'string' || !Array.isArray(r.plan) || r.plan.length === 0 || r.plan.length > 7) return null;
  const plan: AiPlan['plan'] = [];
  for (const p of r.plan) {
    if (typeof p !== 'object' || p === null) return null;
    const q = p as { title?: unknown; minutes?: unknown; notes?: unknown };
    if (typeof q.title !== 'string' || typeof q.minutes !== 'number' || !Number.isFinite(q.minutes) || q.minutes < 5 || q.minutes > 180) return null;
    plan.push({ title: q.title.slice(0, 80), minutes: Math.round(q.minutes), notes: typeof q.notes === 'string' ? q.notes.slice(0, 200) : '' });
  }
  return { summary: r.summary.slice(0, 600), plan };
}
