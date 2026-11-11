
import { API_BASE_URL } from '../config/env';
import { getAccessToken } from './session';
import { createHttpClient } from './http';

export type EventType =
  | 'screen_view'
  | 'workout_created'
  | 'goal_created'
  | 'planner_opened'
  | 'coach_opened';

export type ScreenName =
  | 'home'
  | 'workouts'
  | 'progress'
  | 'coach'
  | 'profile'
  | 'planner'
  | 'goals'
  | 'reminders'
  | 'workout_detail'
  | 'other';

// Client riêng cho tracking.
// Tracking gặp lỗi không được tự xóa token đăng nhập.
const trackingHttp = createHttpClient({
  baseUrl: API_BASE_URL,
  timeoutMs: 10000,
  getToken: getAccessToken
});

let optedIn = false;

export async function loadTrackingConsent(): Promise<boolean> {
  const response = await trackingHttp.get<{ enabled: boolean }>(
    '/tracking/consent'
  );

  optedIn = response.data.enabled;
  return optedIn;
}

export async function setTrackingConsent(
  enabled: boolean
): Promise<boolean> {
  const response = await trackingHttp.put<{ enabled: boolean }>(
    '/tracking/consent',
    { enabled }
  );

  optedIn = response.data.enabled;
  return optedIn;
}

export function resetTrackingConsent() {
  optedIn = false;
}

export async function track(
  type: EventType,
  screen: ScreenName
): Promise<void> {
  if (!optedIn) return;

  try {
    await trackingHttp.post('/tracking/events', { type, screen });
  } catch {
    // Tracking không được làm gián đoạn chức năng chính.
  }
}

export function routeToScreen(
  segments: readonly string[]
): ScreenName {
  const s = segments.join('/');

  if (s.includes('workout/')) return 'workout_detail';
  if (s.includes('planner')) return 'planner';
  if (s.includes('goals')) return 'goals';
  if (s.includes('reminders')) return 'reminders';
  if (s.includes('coach')) return 'coach';
  if (s.includes('progress')) return 'progress';
  if (s.includes('workouts')) return 'workouts';
  if (s.includes('profile')) return 'profile';

  if (s === '(tabs)' || s === '(tabs)/index') {
    return 'home';
  }

  return 'other';
}
