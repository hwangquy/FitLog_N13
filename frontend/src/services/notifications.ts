import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { buildTriggerSpecs } from '../features/reminders/schedule';
import type { TriggerSpec } from '../features/reminders/schedule';
import type { Reminder } from '../types';

export type DeviceStatus = 'scheduled' | 'off' | 'permission_denied' | 'unsupported' | 'error';
export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

const CHANNEL_ID = 'workout-reminders';
const supported = Platform.OS !== 'web';

/** Gọi một lần khi app khởi động. Android 13+ cần có channel trước khi xin quyền. */
export async function initNotifications(): Promise<void> {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false })
  });
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, { name: 'Nhắc lịch tập', importance: Notifications.AndroidImportance.HIGH });
    } catch (e) {
      console.warn('Không tạo được notification channel', e);
    }
  }
}

export async function getPermissionState(): Promise<PermissionState> {
  if (!supported) return 'unsupported';
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

/** Xin quyền khi cần (chỉ hiện hộp thoại hệ thống nếu còn được phép hỏi). */
export async function ensureNotificationPermission(): Promise<PermissionState> {
  const state = await getPermissionState();
  if (state !== 'undetermined') return state;
  const r = await Notifications.requestPermissionsAsync();
  return r.granted ? 'granted' : 'denied';
}

function toTrigger(spec: TriggerSpec): Notifications.NotificationTriggerInput {
  return spec.kind === 'daily'
    ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: spec.hour, minute: spec.minute, channelId: CHANNEL_ID }
    : { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: spec.weekday, hour: spec.hour, minute: spec.minute, channelId: CHANNEL_ID };
}

async function cancelOwnNotifications(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    const data = n.content.data as Record<string, unknown> | undefined;
    if (data && typeof data.reminderId === 'string') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

async function reconcileNow(reminders: Reminder[]): Promise<Record<string, DeviceStatus>> {
  const status: Record<string, DeviceStatus> = {};
  if (!supported) {
    for (const r of reminders) status[r.id] = 'unsupported';
    return status;
  }
  // Nguồn sự thật là danh sách thông báo đang lên lịch trên thiết bị (đánh dấu bằng data.reminderId):
  // huỷ toàn bộ của FitLog rồi lên lịch lại theo dữ liệu API, nên cập nhật/xoá/tắt đều đúng và không bị trùng.
  try {
    await cancelOwnNotifications();
  } catch (e) {
    console.warn('Không huỷ được thông báo cũ', e);
  }
  const permission = await getPermissionState();
  for (const r of reminders) {
    if (!r.enabled) {
      status[r.id] = 'off';
      continue;
    }
    if (permission !== 'granted') {
      status[r.id] = 'permission_denied';
      continue;
    }
    const specs = buildTriggerSpecs(r);
    if (specs.length === 0) {
      status[r.id] = 'error';
      continue;
    }
    try {
      for (const spec of specs) {
        await Notifications.scheduleNotificationAsync({
          content: { title: r.title, body: 'Đến giờ tập luyện. Một buổi ngắn cũng là một bước tiến.', data: { reminderId: r.id } },
          trigger: toTrigger(spec)
        });
      }
      status[r.id] = 'scheduled';
    } catch (e) {
      console.warn('Không lên lịch được thông báo', r.id, e);
      status[r.id] = 'error';
    }
  }
  return status;
}

// Chạy tuần tự để các lần bật/tắt liên tiếp không chạy chồng và gây trùng thông báo.
let queue: Promise<unknown> = Promise.resolve();
export function reconcileReminderNotifications(reminders: Reminder[]): Promise<Record<string, DeviceStatus>> {
  const run = queue.then(() => reconcileNow(reminders));
  queue = run.catch(() => undefined);
  return run;
}
