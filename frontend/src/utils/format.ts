export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} giờ` : `${h} giờ ${String(rest).padStart(2, '0')} phút`;
}

export function formatDistance(km: number): string {
  const rounded = Math.round(km * 10) / 10;
  return `${rounded.toLocaleString('vi-VN')} km`;
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('vi-VN');
}

export function errorMessage(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e instanceof Error && e.message) return e.message;
  return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}
