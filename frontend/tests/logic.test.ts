process.env.TZ = 'Asia/Ho_Chi_Minh';
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Goal, Workout } from '../src/types';
import { buildTriggerSpecs, formatDays, parseTime } from '../src/features/reminders/schedule';
import { goalProgress, periodRange } from '../src/features/goals/progress';
import { breakdownByType, dailySeries, percentChange, periodWindows, summarize, weeklySeries } from '../src/features/stats/stats';
import { analyzeHistory, buildAiPayload, buildInsights, buildPlan, parseAiResponse, todaySuggestion } from '../src/features/coach/rules';

const TODAY = '2026-10-28'; // Thứ Tư
const w = (id: string, date: string, over: Partial<Workout> = {}): Workout => ({ id, title: `Buổi ${id} bí mật`, type: 'Chạy bộ', date, duration: 30, distance: 3, ...over });
const data: Workout[] = [
  w('a', '2026-10-26', { calories: 250 }),               // tuần này (T2)
  w('b', '2026-10-28', { type: 'Gym', distance: 0, duration: 45 }), // tuần này (T4), không calories
  w('c', '2026-10-25', { note: 'riêng tư', location: 'nhà' }),      // CN tuần trước
  w('d', '2026-10-19', { type: 'Đạp xe', distance: 12, duration: 50, calories: 400 }) // 2 tuần trước
];

test('buildTriggerSpecs: đủ 7 ngày = daily; còn lại = weekly với weekday Expo (1=CN)', () => {
  assert.deepEqual(buildTriggerSpecs({ time: '18:30', days: [0, 1, 2, 3, 4, 5, 6] }), [{ kind: 'daily', hour: 18, minute: 30 }]);
  assert.deepEqual(buildTriggerSpecs({ time: '06:05', days: [1, 3, 0] }), [
    { kind: 'weekly', weekday: 1, hour: 6, minute: 5 },
    { kind: 'weekly', weekday: 2, hour: 6, minute: 5 },
    { kind: 'weekly', weekday: 4, hour: 6, minute: 5 }
  ]);
  assert.deepEqual(buildTriggerSpecs({ time: '25:00', days: [1] }), []);
  assert.deepEqual(buildTriggerSpecs({ time: '07:00', days: [] }), []);
  assert.equal(parseTime('7:00')?.hour, 7);
  assert.equal(formatDays([0, 1, 3]), 'T2, T4, CN');
  assert.equal(formatDays([0, 1, 2, 3, 4, 5, 6]), 'Mỗi ngày');
});

test('goalProgress: tính từ buổi tập thật trong kỳ, lọc theo loại', () => {
  const sessions: Goal = { id: 'g', title: 't', metric: 'sessions', target: 5, period: 'week', workoutType: 'all' };
  assert.deepEqual(periodRange('week', TODAY), { start: '2026-10-26', end: '2026-11-01' });
  const p = goalProgress(sessions, data, TODAY);
  assert.equal(p.current, 2); // a, b; c là Chủ nhật tuần trước
  assert.equal(p.ratio, 0.4);
  assert.equal(p.remaining, 3);
  assert.equal(p.completed, false);

  const running: Goal = { ...sessions, workoutType: 'Chạy bộ', target: 1 };
  assert.equal(goalProgress(running, data, TODAY).completed, true);

  const kcal: Goal = { ...sessions, metric: 'calories', target: 1000, period: 'month' };
  assert.equal(goalProgress(kcal, data, TODAY).current, 250 + 400); // chỉ tính calories đã nhập
  const over: Goal = { ...sessions, metric: 'minutes', target: 50 };
  const po = goalProgress(over, data, TODAY);
  assert.equal(po.ratio, 1);
  assert.equal(po.percent, 150);
  assert.equal(goalProgress(sessions, [], TODAY).current, 0);
});

test('stats: summarize, series, so sánh kỳ trước, phân loại', () => {
  const s = summarize(data, '2026-10-26', '2026-11-01');
  assert.deepEqual(s, { sessions: 2, minutes: 75, distance: 3, calories: 250, caloriesSessions: 1 });
  const days = dailySeries(data, TODAY, 7);
  assert.equal(days.length, 7);
  assert.equal(days[6].key, TODAY);
  assert.equal(days[6].minutes, 45);
  assert.equal(days[0].key, '2026-10-22');
  const weeks = weeklySeries(data, TODAY, 4);
  // 4 tuần kết thúc 28/10: 1–7/10, 8–14/10, 15–21/10 (có buổi 19/10), 22–28/10 (a, b, c)
  assert.deepEqual(weeks.map(x => x.sessions), [0, 0, 1, 3]);
  assert.equal(weeks[3].start, '2026-10-22');
  assert.equal(weeks.length, 4);
  const win = periodWindows('7d', TODAY);
  assert.deepEqual(win.current, { start: '2026-10-22', end: TODAY });
  assert.deepEqual(win.previous, { start: '2026-10-15', end: '2026-10-21' });
  assert.equal(percentChange(10, 0), null);
  assert.equal(percentChange(15, 10), 50);
  assert.equal(percentChange(5, 10), -50);
  const types = breakdownByType(data, '2026-10-01', TODAY);
  assert.equal(types[0].type, 'Chạy bộ');
  assert.equal(types[0].sessions, 2);
});

test('coach: phân tích lịch sử, gợi ý hôm nay, kế hoạch thích ứng', () => {
  const a = analyzeHistory(data, TODAY);
  assert.equal(a.hasData, true);
  assert.equal(a.daysSinceLast, 0);
  assert.equal(a.sessionsLast7, 3); // 22..28/10: a, b, c
  const none = analyzeHistory([], TODAY);
  assert.equal(none.hasData, false);
  assert.equal(none.daysSinceLast, null);
  assert.match(todaySuggestion(none), /ghi buổi tập đầu tiên/);
  assert.match(todaySuggestion(a), /đã tập hôm nay/);

  const prefs = { goal: 'endurance' as const, daysPerWeek: 3, level: 'beginner' as const };
  const plan = buildPlan(a, prefs);
  assert.equal(plan.length, 3);
  assert.ok(plan.every(p => p.minutes >= 15 && p.minutes <= 60));
  const starter = buildPlan(none, prefs);
  assert.equal(starter[0].minutes, 15); // 20 * 0.8 làm tròn 5 = 15: khởi đầu nhẹ
  assert.match(starter[0].note, /nhẹ/i);
  assert.equal(buildPlan(a, { ...prefs, daysPerWeek: 99 }).length, 5);
  assert.ok(buildInsights(a, prefs).length >= 3);
  assert.equal(buildInsights(none, prefs).length, 1);

  const lapsed = analyzeHistory([w('z', '2026-10-15')], TODAY); // 13 ngày không tập
  assert.match(todaySuggestion(lapsed), /Đã 13 ngày chưa tập/);
});

test('AI payload không chứa tên buổi tập, ghi chú, địa điểm, ảnh', () => {
  const payload = buildAiPayload(data, { goal: 'habit', daysPerWeek: 3, level: 'beginner' }, TODAY);
  const text = JSON.stringify(payload);
  for (const secret of ['bí mật', 'riêng tư', 'nhà', 'image', 'location', 'title']) assert.equal(text.includes(secret), false, secret);
  assert.equal(payload.history.weeks.length, 4);
});

test('parseAiResponse chỉ nhận đúng định dạng', () => {
  assert.ok(parseAiResponse({ summary: 'ok', plan: [{ title: 'Đi bộ', minutes: 30, notes: 'nhẹ' }] }));
  assert.equal(parseAiResponse({ summary: 'ok', plan: [] }), null);
  assert.equal(parseAiResponse({ summary: 'ok', plan: [{ title: 'x', minutes: 9999 }] }), null);
  assert.equal(parseAiResponse('chuỗi'), null);
  assert.equal(parseAiResponse({ plan: [{ title: 'x', minutes: 30 }] }), null);
});
