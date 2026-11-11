import { API_BASE_URL } from '../config/env';
import { getAccessToken, setAccessToken } from './session';
import type { Goal, GoalInput, Reminder, ReminderInput, Workout, WorkoutInput, WorkoutType, WorkoutPlan, WorkoutPlanInput } from '../types';
import { normalizeGoal, normalizeList, normalizeReminder, normalizeWorkout } from '../utils/normalize';
import { ApiError, createHttpClient, toQuery } from './http';

export { ApiError };
export const http = createHttpClient({ baseUrl: API_BASE_URL, timeoutMs: 10000, getToken: getAccessToken,
  onUnauthorized: async requested => { if ((await getAccessToken()) === requested) await setAccessToken(null); } });
export const PAGE_SIZE = 10;

function must<T>(value: T | null): T {
  if (value === null) throw new ApiError('parse', 'Dữ liệu máy chủ trả về không hợp lệ.');
  return value;
}
const WORKOUT_SORT = { _sort: 'date,createdAt', _order: 'desc,desc' } as const;

export type WorkoutPage = { items: Workout[]; total: number | null; rawCount: number };

export const workoutsApi = {
  /** Phân trang phía server (Spring Boot: _page/_limit, tổng ở header X-Total-Count). */
  async list(params: { page: number; limit?: number; query?: string; type?: WorkoutType | 'all' }): Promise<WorkoutPage> {
    const qs = toQuery({
      ...WORKOUT_SORT,
      _page: params.page,
      _limit: params.limit ?? PAGE_SIZE,
      q: params.query,
      type: params.type && params.type !== 'all' ? params.type : undefined
    });
    const r = await http.get<unknown>(`/workouts${qs}`);
    return { items: normalizeList(r.data, normalizeWorkout), total: r.total, rawCount: Array.isArray(r.data) ? r.data.length : 0 };
  },
  /** Toàn bộ buổi tập, dùng cho Dashboard, thống kê, mục tiêu, AI Coach. */
  async all(): Promise<Workout[]> {
    const r = await http.get<unknown>(`/workouts${toQuery(WORKOUT_SORT)}`);
    return normalizeList(r.data, normalizeWorkout);
  },
  async get(id: string): Promise<Workout> {
    const r = await http.get<unknown>(`/workouts/${encodeURIComponent(id)}`);
    return must(normalizeWorkout(r.data));
  },
  async create(input: WorkoutInput): Promise<Workout> {
    const r = await http.post<unknown>('/workouts', input);
    return must(normalizeWorkout(r.data));
  },
  // PUT thay thế toàn bộ bản ghi để xoá được các trường tuỳ chọn (calories, ghi chú, ảnh...).
  async update(id: string, input: WorkoutInput): Promise<Workout> {
    const r = await http.put<unknown>(`/workouts/${encodeURIComponent(id)}`, { ...input, id });
    return must(normalizeWorkout(r.data));
  },
  remove: (id: string) => http.del(`/workouts/${encodeURIComponent(id)}`)
};

export const goalsApi = {
  async list(): Promise<Goal[]> {
    const r = await http.get<unknown>('/goals');
    return normalizeList(r.data, normalizeGoal);
  },
  async create(input: GoalInput): Promise<Goal> {
    const r = await http.post<unknown>('/goals', input);
    return must(normalizeGoal(r.data));
  },
  async update(id: string, input: GoalInput): Promise<Goal> {
    const r = await http.put<unknown>(`/goals/${encodeURIComponent(id)}`, { ...input, id });
    return must(normalizeGoal(r.data));
  },
  remove: (id: string) => http.del(`/goals/${encodeURIComponent(id)}`)
};

export const remindersApi = {
  async list(): Promise<Reminder[]> {
    const r = await http.get<unknown>('/reminders');
    return normalizeList(r.data, normalizeReminder);
  },
  async create(input: ReminderInput): Promise<Reminder> {
    const r = await http.post<unknown>('/reminders', input);
    return must(normalizeReminder(r.data));
  },
  async update(id: string, input: ReminderInput): Promise<Reminder> {
    const r = await http.put<unknown>(`/reminders/${encodeURIComponent(id)}`, { ...input, id });
    return must(normalizeReminder(r.data));
  },
  async setEnabled(id: string, enabled: boolean): Promise<Reminder> {
    const r = await http.patch<unknown>(`/reminders/${encodeURIComponent(id)}`, { enabled });
    return must(normalizeReminder(r.data));
  },
  remove: (id: string) => http.del(`/reminders/${encodeURIComponent(id)}`)
};

/** Kiểm tra API Spring Boot qua danh sách thuộc tài khoản. */
export async function pingApi(): Promise<number> {
  const started = Date.now();
  await http.get<unknown>('/workouts?_page=1&_limit=1');
  return Date.now() - started;
}


export const plannerApi = {
  async list(from: string, to: string): Promise<WorkoutPlan[]> {
    const r = await http.get<WorkoutPlan[]>(`/plans${toQuery({ from, to })}`);
    return r.data;
  },
  async create(input: WorkoutPlanInput): Promise<WorkoutPlan> {
    const r = await http.post<WorkoutPlan>('/plans', input);
    return r.data;
  },
  async update(id: string, input: WorkoutPlanInput): Promise<WorkoutPlan> {
    const r = await http.put<WorkoutPlan>(`/plans/${encodeURIComponent(id)}`, input);
    return r.data;
  },
  async complete(id: string): Promise<WorkoutPlan> {
    const r = await http.post<WorkoutPlan>(`/plans/${encodeURIComponent(id)}/complete`, {});
    return r.data;
  },
  async skip(id: string): Promise<WorkoutPlan> {
    const r = await http.post<WorkoutPlan>(`/plans/${encodeURIComponent(id)}/skip`, {});
    return r.data;
  },
  remove: (id: string) => http.del(`/plans/${encodeURIComponent(id)}`)
};
