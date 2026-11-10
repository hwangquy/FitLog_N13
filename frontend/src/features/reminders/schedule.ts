// Logic thuần của nhắc lịch: chuyển dữ liệu nhắc nhở thành "trigger" cho Expo Notifications.
export type TriggerSpec =
  | { kind: 'daily'; hour: number; minute: number }
  | { kind: 'weekly'; weekday: number; hour: number; minute: number };

export function parseTime(s: string): { hour: number; minute: number } | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(s.trim());
  return m ? { hour: Number(m[1]), minute: Number(m[2]) } : null;
}

/**
 * days dùng Date.getDay() (0 = Chủ nhật). Expo weekday: 1 = Chủ nhật ... 7 = Thứ bảy.
 * Đủ 7 ngày => 1 thông báo hằng ngày; ngược lại 1 thông báo hằng tuần cho mỗi ngày.
 */
export function buildTriggerSpecs(reminder: { time: string; days: number[] }): TriggerSpec[] {
  const t = parseTime(reminder.time);
  if (!t) return [];
  const days = Array.from(new Set(reminder.days.filter(d => Number.isInteger(d) && d >= 0 && d <= 6))).sort((a, b) => a - b);
  if (days.length === 0) return [];
  if (days.length === 7) return [{ kind: 'daily', hour: t.hour, minute: t.minute }];
  return days.map(d => ({ kind: 'weekly', weekday: d + 1, hour: t.hour, minute: t.minute }));
}

const SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export function formatDays(days: number[]): string {
  const sorted = Array.from(new Set(days)).sort((a, b) => a - b);
  if (sorted.length === 7) return 'Mỗi ngày';
  // Hiển thị T2 -> CN cho dễ đọc.
  const order = [1, 2, 3, 4, 5, 6, 0].filter(d => sorted.includes(d));
  return order.map(d => SHORT[d]).join(', ');
}
