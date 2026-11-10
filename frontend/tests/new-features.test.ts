import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceKm, routeDistanceKm } from '../src/features/location/route';
import { calculateStreak } from '../src/features/stats/streak';
import type { Workout } from '../src/types';
const workout = (date: string) => ({ id: date, date, title: 'Chạy bộ', type: 'Chạy bộ', duration: 30, distance: 0 }) as Workout;
test('GPS distance for identical points is 0', () => {
  const h = {latitude: 10.82, longitude: 106.63};
  assert.equal(distanceKm(h,h),0);
  assert.equal(routeDistanceKm([h]),0);
});
test('GPS route distance reasonable for nearby points', () => {
  const length = routeDistanceKm([{latitude:10.82,longitude:106.63},{latitude:10.83,longitude:106.63}]);
  assert.ok(length > 1 && length < 1.3);
});
test('streak includes today and preceding consecutive days', () => {
  assert.equal(calculateStreak([workout('2026-11-03'),workout('2026-11-02'),workout('2026-10-31')],'2026-11-03'),2);
  assert.equal(calculateStreak([workout('2026-11-02'),workout('2026-11-01')],'2026-11-03'),2);
  assert.equal(calculateStreak([workout('2026-10-29')],'2026-11-03'),0);
});
