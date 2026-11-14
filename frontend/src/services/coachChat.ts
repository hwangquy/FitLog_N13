// frontend/src/services/coachChat.ts
import { API_BASE_URL } from '../config/env';
import { createHttpClient } from './http';
import { getAccessToken, setAccessToken } from './session';
import type { PlanBatchChoice } from './api';

const api = createHttpClient({
  baseUrl: API_BASE_URL, timeoutMs: 110000, getToken: getAccessToken,
  onUnauthorized: async requested => {
    if ((await getAccessToken()) === requested) await setAccessToken(null);
  }
});
export type AiAction = { id: string; type: 'CREATE_PLAN' | 'RESCHEDULE' | 'SKIP_PLAN' | 'LOG_WORKOUT'; payload: unknown };
export type AiMessage = { id: string; role: 'user' | 'assistant'; content: string; createdAt: string };
export type ChatHistory = { sessionId: string; messages: AiMessage[]; pendingActions: AiAction[] };
export type CoachProfile = {
  goal: 'habit' | 'endurance' | 'activity' | 'relax';
  level: 'beginner' | 'intermediate' | 'advanced';
  daysPerWeek: number; minutesPerSession: number;
  equipment: string; preferences: string;
};
export type CoachDashboard = {
  profile: CoachProfile & { consentEnabled: boolean };
  last7Days: { sessions: number; minutes: number };
  previous7Days: { sessions: number; minutes: number };
  latestCheckin?: { fatigue: number; soreness: number; createdAt: string };
};

export const coachChatApi = {
  async dashboard() { return (await api.get<CoachDashboard>('/coach/dashboard')).data; },
  async sessions() {
    return (await api.get<{ id: string; title: string }[]>('/coach/chat/sessions')).data;
  },
  async deleteSession(id: string) { await api.del(`/coach/chat/sessions/${encodeURIComponent(id)}`); },
  async history(id: string) {
    return (await api.get<ChatHistory>(`/coach/chat/sessions/${encodeURIComponent(id)}`)).data;
  },
  async send(text: string, sessionId?: string) {
    return (await api.post<{ sessionId: string; reply: string; action?: AiAction }>('/coach/chat',
      { text, ...(sessionId ? { sessionId } : {}) })).data;
  },
  async apply(id: string, choices?: PlanBatchChoice[]) {
    const decisions = choices ? {
      choices: choices.map(choice => ({ date: choice.plan.date, decision: choice.decision,
        expectedExistingId: choice.expectedExistingId }))
    } : {};
    return (await api.post<{ status: string; message: string }>(`/coach/chat/actions/${encodeURIComponent(id)}/apply`, decisions)).data;
  },
  async cancel(id: string) {
    return (await api.post<{ status: string }>(`/coach/chat/actions/${encodeURIComponent(id)}/cancel`, {})).data;
  },
  async consent() { return (await api.get<{ enabled: boolean }>('/coach/consent')).data; },
  async setConsent(enabled: boolean) { return (await api.put<{ enabled: boolean }>('/coach/consent', { enabled })).data; },
  async profile() { return (await api.get<CoachProfile>('/coach/profile')).data; },
  async updateProfile(profile: CoachProfile) { return (await api.put<CoachProfile>('/coach/profile', profile)).data; },
  async checkin(fatigue: number, soreness: number, sleepHours?: number) {
    return (await api.post('/coach/checkin', { fatigue, soreness, sleepHours })).data;
  },
  async report() { return (await api.post<{ weekStart: string; report: string }>('/coach/report', {})).data; }
};
