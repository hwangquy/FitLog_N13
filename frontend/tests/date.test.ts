process.env.TZ = 'Asia/Ho_Chi_Minh'; // UTC+7: tái hiện lỗi ngày của bản cũ
import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, diffDays, endOfMonth, endOfWeek, parseISODate, startOfMonth, startOfWeek, toLocalISODate, formatDateLong } from '../src/utils/date';

test('toLocalISODate dùng giờ địa phương, không dùng UTC (lỗi cũ của toISOString)', () => {
  const earlyMorning = new Date(2026, 9, 28, 5, 30); // 05:30 giờ VN
  assert.equal(toLocalISODate(earlyMorning), '2026-10-28');
  assert.equal(earlyMorning.toISOString().slice(0, 10), '2026-10-27'); // chứng minh lỗi cũ có thật
});

test('parseISODate từ chối ngày không tồn tại', () => {
  assert.equal(parseISODate('2026-02-30'), null);
  assert.equal(parseISODate('2026-13-01'), null);
  assert.equal(parseISODate('26-10-2026'), null);
  assert.ok(parseISODate('2028-02-29'));
});

test('startOfWeek là Thứ Hai, endOfWeek là Chủ nhật', () => {
  assert.equal(startOfWeek('2026-10-28'), '2026-10-26'); // 28/10/2026 là Thứ Tư
  assert.equal(endOfWeek('2026-10-28'), '2026-11-01');
  assert.equal(startOfWeek('2026-11-01'), '2026-10-26'); // Chủ nhật thuộc tuần trước
  assert.equal(startOfWeek('2026-10-26'), '2026-10-26');
});

test('tháng và addDays/diffDays qua ranh giới tháng, năm', () => {
  assert.equal(startOfMonth('2026-02-15'), '2026-02-01');
  assert.equal(endOfMonth('2028-02-10'), '2028-02-29');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(diffDays('2026-10-20', '2026-10-28'), 8);
  assert.equal(diffDays('2026-10-28', '2026-10-20'), -8);
});

test('formatDateLong', () => {
  assert.equal(formatDateLong('2026-10-26'), 'Thứ Hai, 26/10/2026');
});
