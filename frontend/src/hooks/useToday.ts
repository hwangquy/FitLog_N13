import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { toLocalISODate } from '../utils/date';

/** Ngày hôm nay (giờ địa phương), tự cập nhật khi qua nửa đêm hoặc khi app quay lại foreground. */
export function useToday(): string {
  const [today, setToday] = useState(() => toLocalISODate(new Date()));
  useEffect(() => {
    const refresh = () => setToday(prev => {
      const now = toLocalISODate(new Date());
      return now === prev ? prev : now;
    });
    const timer = setInterval(refresh, 60_000);
    const sub = AppState.addEventListener('change', s => { if (s === 'active') refresh(); });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  return today;
}
