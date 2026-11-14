import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

// Chỉ điều khiển cửa sổ chat đang mở và văn bản nháp; dữ liệu nghiệp vụ lưu ở MariaDB.
type ChatRequest = { id: number; draft: string };
type ChatLauncher = {
  request: ChatRequest | null;
  openChat: (draft?: string) => void;
};

const Context = createContext<ChatLauncher | null>(null);

export function CoachChatLauncherProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ChatRequest | null>(null);
  const value = useMemo<ChatLauncher>(() => ({
    request,
    openChat: (draft = '') => setRequest(previous => ({ id: (previous?.id ?? 0) + 1, draft })),
  }), [request]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCoachChatLauncher(): ChatLauncher {
  const value = useContext(Context);
  if (!value) throw new Error('CoachChatLauncherProvider chưa được cài đặt.');
  return value;
}
