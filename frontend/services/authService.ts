import { API_BASE_URL } from "../src/config/env";
import { getAccessToken, setAccessToken } from "../src/services/session";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  avatar?: string | null;
}

type AuthResponse = {
  accessToken: string;
  tokenType: "Bearer";
  user: User;
};

async function readError(res: Response): Promise<string> {
  try {
    const json = await res.json();
    return typeof json.message === "string"
      ? json.message
      : `Lỗi ${res.status}`;
  } catch {
    return `Lỗi ${res.status}`;
  }
}

async function authorize(path: string, body: unknown): Promise<User> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Không kết nối được Spring Boot. Kiểm tra backend và EXPO_PUBLIC_API_URL.",
    );
  }
  if (!res.ok) throw new Error(await readError(res));
  const json: AuthResponse = await res.json();
  if (!json.accessToken || !json.user?.id)
    throw new Error("Phản hồi xác thực không hợp lệ.");
  await setAccessToken(json.accessToken);
  return json.user;
}

export const authService = {
  register: async (
    name: string,
    email: string,
    password: string,
  ): Promise<void> => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
    } catch {
      throw new Error(
        "Không kết nối được Spring Boot. Kiểm tra backend và EXPO_PUBLIC_API_URL.",
      );
    }
    if (!res.ok) throw new Error(await readError(res));

    // Không lưu token để ứng dụng không tự động nhảy vào trang chủ
    await setAccessToken(null);
  },

  login: (email: string, password: string): Promise<User> =>
    authorize("login", { email: email.trim().toLowerCase(), password }),

  forgotPassword: async (email: string): Promise<void> => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
    } catch {
      throw new Error(
        "Không kết nối được Spring Boot. Kiểm tra backend và EXPO_PUBLIC_API_URL.",
      );
    }
    if (!res.ok) throw new Error(await readError(res));
  },

  verifyOtp: async (email: string, otp: string): Promise<void> => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        }),
      });
    } catch {
      throw new Error(
        "Không kết nối được Spring Boot. Kiểm tra backend và EXPO_PUBLIC_API_URL.",
      );
    }
    if (!res.ok) throw new Error(await readError(res));
  },

  resetPassword: async (
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<void> => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          newPassword,
        }),
      });
    } catch {
      throw new Error(
        "Không kết nối được Spring Boot. Kiểm tra backend và EXPO_PUBLIC_API_URL.",
      );
    }
    if (!res.ok) throw new Error(await readError(res));

    // Không tự động đăng nhập sau khi đổi mật khẩu
    await setAccessToken(null);
  },

  logout: async (): Promise<void> => {
    const token = await getAccessToken();
    try {
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } finally {
      await setAccessToken(null);
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    const token = await getAccessToken();
    if (!token) return null;
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new Error(
        "Không thể kiểm tra phiên đăng nhập. Kiểm tra kết nối backend.",
      );
    }
    if (res.status === 401) {
      if ((await getAccessToken()) === token) await setAccessToken(null);
      return null;
    }
    if (!res.ok) throw new Error(await readError(res));
    return (await res.json()) as User;
  },

  updateAvatar: async (avatar: string | null): Promise<User> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Chưa đăng nhập.");
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/auth/avatar`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar }),
      });
    } catch {
      throw new Error("Không thể kết nối máy chủ để cập nhật ảnh đại diện.");
    }
    if (!res.ok) throw new Error(await readError(res));
    return (await res.json()) as User;
  },
};
