import { API_BASE_URL } from '../config/env';
import { parseAiResponse } from '../features/coach/rules';
import type { AiPayload, AiPlan } from '../features/coach/rules';
import { ApiError, createHttpClient } from './http';
import { getAccessToken, setAccessToken } from './session';
export const isAiConfigured = (): boolean => true; // actual availability verified at server; returns 503 if missing key
export async function requestAiPlan(payload: AiPayload): Promise<AiPlan> {
  const api = createHttpClient({ baseUrl: API_BASE_URL, timeoutMs: 35000, getToken: getAccessToken, onUnauthorized: async requested => { if ((await getAccessToken()) === requested) await setAccessToken(null); } });
  const r = await api.post<unknown>('/coach/plan', { ...payload, consent: true });
  const result = parseAiResponse(r.data);
  if (!result) throw new ApiError('parse', 'AI trả về lịch không hợp lệ.');
  return result;
}
