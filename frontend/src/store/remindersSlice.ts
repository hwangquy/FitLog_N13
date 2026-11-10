import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { remindersApi } from '../services/api';
import { reconcileReminderNotifications } from '../services/notifications';
import type { DeviceStatus } from '../services/notifications';
import type { Reminder, ReminderInput } from '../types';
import { errorMessage } from '../utils/format';

export type RemindersState = {
  items: Reminder[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  /** Đã tải thành công ít nhất một lần. Chỉ khi đó mới đồng bộ thông báo (tránh huỷ nhầm khi API lỗi). */
  loaded: boolean;
  /** Trạng thái thông báo thực sự trên thiết bị cho từng nhắc nhở. */
  device: Record<string, DeviceStatus>;
};
const initialState: RemindersState = { items: [], status: 'idle', error: null, loaded: false, device: {} };
type Cfg = { rejectValue: string };

export const fetchReminders = createAsyncThunk<Reminder[], void, Cfg>('reminders/fetch', async (_, { rejectWithValue }) => {
  try {
    return await remindersApi.list();
  } catch (e) {
    return rejectWithValue(errorMessage(e));
  }
});
export const createReminder = createAsyncThunk<Reminder, ReminderInput, Cfg>('reminders/create', async (input, { rejectWithValue }) => {
  try {
    return await remindersApi.create({ ...input, createdAt: input.createdAt ?? new Date().toISOString() });
  } catch (e) {
    return rejectWithValue(errorMessage(e));
  }
});
export const updateReminder = createAsyncThunk<Reminder, { id: string; input: ReminderInput }, Cfg>('reminders/update', async ({ id, input }, { rejectWithValue }) => {
  try {
    return await remindersApi.update(id, input);
  } catch (e) {
    return rejectWithValue(errorMessage(e));
  }
});
export const setReminderEnabled = createAsyncThunk<Reminder, { id: string; enabled: boolean }, Cfg>('reminders/setEnabled', async ({ id, enabled }, { rejectWithValue }) => {
  try {
    return await remindersApi.setEnabled(id, enabled);
  } catch (e) {
    return rejectWithValue(errorMessage(e));
  }
});
export const deleteReminder = createAsyncThunk<string, string, Cfg>('reminders/delete', async (id, { rejectWithValue }) => {
  try {
    await remindersApi.remove(id);
    return id;
  } catch (e) {
    return rejectWithValue(errorMessage(e));
  }
});

/** Đối chiếu thông báo trên thiết bị với danh sách nhắc nhở từ API. */
export const syncNotifications = createAsyncThunk<Record<string, DeviceStatus>, Reminder[]>('reminders/sync', async items => reconcileReminderNotifications(items));

const byTime = (a: Reminder, b: Reminder) => a.time.localeCompare(b.time);

const slice = createSlice({
  name: 'reminders',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchReminders.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchReminders.fulfilled, (state, a) => {
        state.items = [...a.payload].sort(byTime);
        state.status = 'succeeded';
        state.loaded = true;
      })
      .addCase(fetchReminders.rejected, (state, a) => {
        state.status = 'failed';
        state.error = a.payload ?? 'Không tải được nhắc nhở.';
      })
      .addCase(createReminder.fulfilled, (state, a) => {
        state.items = [...state.items.filter(r => r.id !== a.payload.id), a.payload].sort(byTime);
      })
      .addCase(updateReminder.fulfilled, (state, a) => {
        state.items = state.items.map(r => (r.id === a.payload.id ? a.payload : r)).sort(byTime);
      })
      .addCase(setReminderEnabled.fulfilled, (state, a) => {
        state.items = state.items.map(r => (r.id === a.payload.id ? a.payload : r));
      })
      .addCase(deleteReminder.fulfilled, (state, a) => {
        state.items = state.items.filter(r => r.id !== a.payload);
        delete state.device[a.payload];
      })
      .addCase(syncNotifications.fulfilled, (state, a) => {
        state.device = a.payload;
      });
  }
});

export default slice.reducer;
