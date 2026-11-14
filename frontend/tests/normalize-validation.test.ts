import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGoal, normalizeList, normalizeReminder, normalizeWorkout } from '../src/utils/normalize';
import { parseGoalForm, parseReminderForm, parseWorkoutForm } from '../src/utils/validation';

test('normalizeWorkout: bản ghi hợp lệ giữ nguyên, calories thiếu thì để undefined (không bịa)', () => {
  const w = normalizeWorkout({ id: 'w9', title: ' Chạy ', type: 'Chạy bộ', date: '2026-10-26', duration: '30', distance: 3 });
  assert.ok(w);
  assert.equal(w.title, 'Chạy');
  assert.equal(w.duration, 30);
  assert.equal(w.calories, undefined);
});

test('normalizeWorkout: loại bản ghi hỏng, sửa trường thiếu', () => {
  assert.equal(normalizeWorkout(null), null);
  assert.equal(normalizeWorkout({ title: 'x', date: '2026-10-26' }), null); // thiếu id
  assert.equal(normalizeWorkout({ id: 1, date: 'bad' }), null); // ngày sai
  const w = normalizeWorkout({ id: 5, date: '2026-10-26', type: 'Bơi lội', duration: -3 });
  assert.ok(w);
  assert.equal(w.id, '5');
  assert.equal(w.type, 'Khác');
  assert.equal(w.duration, 0);
  assert.deepEqual(normalizeList([{ id: 'a', date: '2026-10-26' }, 42, {}], normalizeWorkout).map(x => x.id), ['a']);
});

test('normalizeGoal: tương thích dữ liệu cũ {unit, current}', () => {
  const g = normalizeGoal({ id: 'g1', title: 'Vận động đều đặn', target: 5, unit: 'buổi/tuần', current: 3 });
  assert.ok(g);
  assert.equal(g.metric, 'sessions');
  assert.equal(g.period, 'week');
  assert.equal(g.workoutType, 'all');
  assert.equal(normalizeGoal({ id: 'g2', target: 0 }), null);
});

test('normalizeReminder: giờ sai bị loại, days thiếu = mỗi ngày, enabled mặc định false', () => {
  assert.equal(normalizeReminder({ id: 'r', time: '25:00' }), null);
  const r = normalizeReminder({ id: 'r1', time: '6:05', title: 'Chạy' });
  assert.ok(r);
  assert.equal(r.time, '06:05');
  assert.equal(r.days.length, 7);
  assert.equal(r.enabled, false);
  assert.deepEqual(normalizeReminder({ id: 'r2', time: '07:00', days: [3, 1, 3, 9, 'x'], enabled: true })?.days, [1, 3]);
});

const base = { title: 'Chạy sáng', type: 'Chạy bộ' as const, date: '2026-10-28', duration: '30', distance: '3,5', calories: '', note: '', location: '' };

test('parseWorkoutForm: hợp lệ, hỗ trợ dấu phẩy thập phân, calories trống = undefined', () => {
  const r = parseWorkoutForm(base, '2026-10-28');
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.distance, 3.5);
    assert.equal(r.value.calories, undefined);
  }
});

test('parseWorkoutForm: báo lỗi từng trường', () => {
  const r = parseWorkoutForm({ ...base, title: ' ', date: '2026-10-29', duration: '0', distance: 'abc', calories: '-5' }, '2026-10-28');
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ['calories', 'date', 'distance', 'duration', 'title']);
  const bad = parseWorkoutForm({ ...base, date: '2026-02-30' }, '2026-10-28');
  assert.equal(bad.ok, false);
});

test('parseGoalForm', () => {
  assert.ok(parseGoalForm({ title: 'Chạy', metric: 'distance', target: '20,5', period: 'month', workoutType: 'Chạy bộ' }).ok);
  const bad = parseGoalForm({ title: '', metric: 'sessions', target: '2.5', period: 'week', workoutType: 'all' });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.deepEqual(Object.keys(bad.errors).sort(), ['target', 'title']);
});

test('parseReminderForm: chuẩn hoá giờ, bắt buộc ít nhất 1 ngày', () => {
  const ok = parseReminderForm({ title: 'Tập', time: '6:30', days: [3, 1], enabled: true });
  assert.ok(ok.ok);
  if (ok.ok) assert.deepEqual([ok.value.time, ok.value.days], ['06:30', [1, 3]]);
  const bad = parseReminderForm({ title: 'Tập', time: '99:99', days: [], enabled: true });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.deepEqual(Object.keys(bad.errors).sort(), ['days', 'time']);
});
