import { API_BASE_URL } from "../config/env";
import { getAccessToken, setAccessToken } from "./session";
import { createHttpClient } from "./http";

/** HTTP client dùng chung (có Bearer token). 401 sẽ xóa token đã hết hạn. */
export const http = createHttpClient({
  baseUrl: API_BASE_URL,
  timeoutMs: 10000,
  getToken: getAccessToken,
  onUnauthorized: async requested => {
    if ((await getAccessToken()) === requested) await setAccessToken(null);
  }
});
