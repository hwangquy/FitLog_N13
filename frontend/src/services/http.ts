// HTTP client thuần (không phụ thuộc React Native) để test được bằng Node.
export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'parse';

export class ApiError extends Error {
  kind: ApiErrorKind;
  status: number | undefined;
  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

export type HttpResponse<T> = { data: T; total: number | null; status: number };
export type HttpClientOptions = { baseUrl: string; timeoutMs?: number; fetchImpl?: typeof fetch; getToken?: () => Promise<string | null>; onUnauthorized?: (token: string) => Promise<void> };
export type HttpClient = {
  get<T>(path: string): Promise<HttpResponse<T>>;
  post<T>(path: string, body: unknown): Promise<HttpResponse<T>>;
  put<T>(path: string, body: unknown): Promise<HttpResponse<T>>;
  patch<T>(path: string, body: unknown): Promise<HttpResponse<T>>;
  del(path: string): Promise<void>;
};

function httpMessage(status: number): string {
  if (status === 404) return 'Không tìm thấy dữ liệu (404).';
  if (status >= 500) return `Máy chủ đang gặp lỗi (${status}).`;
  return `Yêu cầu bị từ chối (${status}).`;
}

export function toQuery(params: Record<string, string | number | undefined | null>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const timeoutMs = options.timeoutMs ?? 10000;
  const base = options.baseUrl.replace(/\/+$/, '');

  async function send<T>(method: string, path: string, body?: unknown): Promise<HttpResponse<T>> {
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const doFetch = options.fetchImpl ?? fetch;
    const token = options.getToken ? await options.getToken() : null;
    const controller = new AbortController();
    let res: Response;
    try {
      res = await doFetch(`${base}${path}`, {
        method,
        headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
    } catch {
      if (controller.signal.aborted) throw new ApiError('timeout', 'Máy chủ phản hồi quá lâu. Hãy thử lại.');
      throw new ApiError('network', 'Không kết nối được Spring Boot. Kiểm tra backend, mạng và EXPO_PUBLIC_API_URL.');
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      if (res.status === 401 && token && options.onUnauthorized) await options.onUnauthorized(token);
      let message = httpMessage(res.status);
      try { const payload = await res.json(); if (typeof payload?.message === 'string') message = payload.message; } catch {}
      throw new ApiError('http', message, res.status);
    }
    let data: unknown;
    try {
      const text = await res.text();
      data = text.trim() === '' ? undefined : JSON.parse(text);
    } catch {
      throw new ApiError('parse', 'Dữ liệu máy chủ trả về không hợp lệ.');
    }
    const totalHeader = res.headers.get('X-Total-Count');
    const total = totalHeader !== null && totalHeader !== '' && Number.isFinite(Number(totalHeader)) ? Number(totalHeader) : null;
    return { data: data as T, total, status: res.status };
  }

  return {
    get: <T,>(path: string) => send<T>('GET', path),
    post: <T,>(path: string, body: unknown) => send<T>('POST', path, body),
    put: <T,>(path: string, body: unknown) => send<T>('PUT', path, body),
    patch: <T,>(path: string, body: unknown) => send<T>('PATCH', path, body),
    del: async (path: string) => {
      await send<unknown>('DELETE', path);
    }
  };
}
