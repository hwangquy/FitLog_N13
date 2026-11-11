import { useEffect } from 'react';
import { getJson, setJson } from '../services/storage';
import { useAppDispatch, useAppSelector } from './hooks';
import { hydrateSettings } from './settingsSlice';

const KEY = '@fitlog/settings';

/**
 * Đọc cài đặt khi mở app rồi ghi lại mỗi khi đổi. Chỉ ghi sau khi đã đọc xong
 * (cờ hydrated) để giá trị mặc định không ghi đè cài đặt đã lưu.
 */
export function useSettingsPersistence(): boolean {
  const dispatch = useAppDispatch();
  const { themeMode, aiConsent, hydrated } = useAppSelector(s => s.settings);

  useEffect(() => {
    let cancelled = false;
    getJson<Record<string, unknown>>(KEY, {}).then(saved => {
      if (!cancelled) dispatch(hydrateSettings(saved));
    });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    if (hydrated) void setJson(KEY, { themeMode, aiConsent });
  }, [hydrated, themeMode, aiConsent]);

  return hydrated;
}
