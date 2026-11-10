// Toàn bộ ngày trong app là chuỗi YYYY-MM-DD theo GIỜ ĐỊA PHƯƠNG.
// Không dùng toISOString() để lấy ngày vì nó trả về UTC (sai ngày ở UTC+7 trước 7h sáng).

const pad = (n: number) => String(n).padStart(2, '0');

export function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + n);
  return toLocalISODate(d);
}

/** Thứ Hai đầu tuần chứa ngày iso. */
export function startOfWeek(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  const offset = (d.getDay() + 6) % 7; // Thứ Hai = 0
  d.setDate(d.getDate() - offset);
  return toLocalISODate(d);
}

export function endOfWeek(iso: string): string {
  return addDays(startOfWeek(iso), 6);
}

export function startOfMonth(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  return toLocalISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function endOfMonth(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  return toLocalISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/** Số ngày từ a đến b (b - a), tính theo ngày lịch. */
export function diffDays(a: string, b: string): number {
  const da = parseISODate(a);
  const db = parseISODate(b);
  if (!da || !db) return 0;
  const utcA = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const utcB = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((utcB - utcA) / 86400000);
}

const WEEKDAY_FULL = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function weekdayShort(day: number): string {
  return WEEKDAY_SHORT[((day % 7) + 7) % 7];
}

export function weekdayShortOf(iso: string): string {
  const d = parseISODate(iso);
  return d ? WEEKDAY_SHORT[d.getDay()] : '';
}

/** "Thứ Hai, 26/10/2026" */
export function formatDateLong(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  return `${WEEKDAY_FULL[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** "26/10" */
export function formatDateShort(iso: string): string {
  const d = parseISODate(iso);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` : iso;
}

/** "26/10/2026" */
export function formatDate(iso: string): string {
  const d = parseISODate(iso);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : iso;
}
