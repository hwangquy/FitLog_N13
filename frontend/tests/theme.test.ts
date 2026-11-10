import assert from 'node:assert/strict';
import test from 'node:test';
import { palette, resolveScheme } from '../src/theme/colors.ts';

test('resolveScheme: chế độ cố định bỏ qua cài đặt hệ thống', () => {
  assert.equal(resolveScheme('light', 'dark'), 'light');
  assert.equal(resolveScheme('dark', 'light'), 'dark');
});

test('resolveScheme: chế độ system theo hệ thống, mặc định sáng', () => {
  assert.equal(resolveScheme('system', 'dark'), 'dark');
  assert.equal(resolveScheme('system', 'light'), 'light');
  assert.equal(resolveScheme('system', null), 'light');
  assert.equal(resolveScheme('system', undefined), 'light');
});

test('palette sáng và tối có cùng bộ key (tránh thiếu màu khi đổi theme)', () => {
  assert.deepEqual(Object.keys(palette.light).sort(), Object.keys(palette.dark).sort());
});
