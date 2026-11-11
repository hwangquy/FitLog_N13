import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { PAGE_SIZE, workoutsApi } from '../services/api';
import type { Workout, WorkoutInput, WorkoutType } from '../types';
import { errorMessage } from '../utils/format';

export type ListStatus = 'idle' | 'loading' | 'loadingMore' | 'refreshing' | 'succeeded' | 'failed';
export type WorkoutFilter = WorkoutType | 'all';

type ListState = {
  items: Workout[];
  page: number;
  hasMore: boolean;
  total: number | null;
  status: ListStatus;
  error: string | null;
  query: string;
  type: WorkoutFilter;
  requestId: string | null;
};
export type WorkoutsState = {
  /** Danh sách phân trang cho màn Nhật ký. */
  list: ListState;
  /** Toàn bộ buổi tập, dùng cho Dashboard, thống kê, mục tiêu, AI Coach. */
  all: Workout[];
  allStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  allError: string | null;
};
type Slice = { workouts: WorkoutsState };

const initialState: WorkoutsState = {
  list: { items: [], page: 0, hasMore: true, total: null, status: 'idle', error: null, query: '', type: 'all', requestId: null },
  all: [],
  allStatus: 'idle',
  allError: null
};

const byNewest = (a: Workout, b: Workout) =>
  a.date === b.date ? (b.createdAt ?? '').localeCompare(a.createdAt ?? '') : b.date.localeCompare(a.date);

type PageResult = { items: Workout[]; page: number; total: number | null; rawCount: number; reset: boolean };

export const fetchWorkoutPage = createAsyncThunk<PageResult, { reset: boolean; refreshing?: boolean }, { rejectValue: string }>(
  'workouts/fetchPage',
  async ({ reset }, { getState, rejectWithValue }) => {
    const { list } = (getState() as Slice).workouts;
    const page = reset ? 1 : list.page + 1;
    try {
      const r = await workoutsApi.list({ page, query: list.query, type: list.type });
      return { ...r, page, reset };
    } catch (e) {
      return rejectWithValue(errorMessage(e));
    }
  },
  {
    condition: ({ reset }, { getState }) => {
      const { list } = (getState() as Slice).workouts;
      if (reset) return true;
      return list.hasMore && list.status !== 'loadingMore' && list.status !== 'loading' && list.status !== 'refreshing';
    }
  }
);

export const fetchAllWorkouts = createAsyncThunk<Workout[], void, { rejectValue: string }>('workouts/fetchAll', async (_, { rejectWithValue }) => {
  try {
    return await workoutsApi.all();
  } catch (e) {
    return rejectWithValue(errorMessage(e));
  }
});

export const createWorkout = createAsyncThunk<Workout, WorkoutInput, { rejectValue: string }>('workouts/create', async (input, { dispatch, rejectWithValue }) => {
  try {
    const created = await workoutsApi.create({ ...input, createdAt: input.createdAt ?? new Date().toISOString() });
    void dispatch(fetchWorkoutPage({ reset: true, refreshing: true }));
    return created;
  } catch (e) {
    return rejectWithValue(errorMessage(e));
  }
});

export const updateWorkout = createAsyncThunk<Workout, { id: string; input: WorkoutInput }, { rejectValue: string }>('workouts/update', async ({ id, input }, { dispatch, rejectWithValue }) => {
  try {
    const updated = await workoutsApi.update(id, input);
    void dispatch(fetchWorkoutPage({ reset: true, refreshing: true }));
    return updated;
  } catch (e) {
    return rejectWithValue(errorMessage(e));
  }
});

export const deleteWorkout = createAsyncThunk<string, string, { rejectValue: string }>('workouts/delete', async (id, { dispatch, rejectWithValue }) => {
  try {
    await workoutsApi.remove(id);
    void dispatch(fetchWorkoutPage({ reset: true, refreshing: true }));
    return id;
  } catch (e) {
    return rejectWithValue(errorMessage(e));
  }
});

const slice = createSlice({
  name: 'workouts',
  initialState,
  reducers: {
    setListFilters(state, a: { payload: { query: string; type: WorkoutFilter } }) {
      state.list.query = a.payload.query;
      state.list.type = a.payload.type;
    }
  },
  extraReducers: builder => {
    builder
      .addCase(fetchWorkoutPage.pending, (state, a) => {
        const { reset, refreshing } = a.meta.arg;
        state.list.requestId = a.meta.requestId;
        state.list.error = null;
        if (!reset) state.list.status = 'loadingMore';
        else if (refreshing) state.list.status = 'refreshing';
        else {
          state.list.status = 'loading';
          state.list.items = []; // đổi bộ lọc/từ khoá: không hiện kết quả của bộ lọc cũ
          state.list.page = 0;
          state.list.hasMore = true;
        }
      })
      .addCase(fetchWorkoutPage.fulfilled, (state, a) => {
        if (state.list.requestId !== a.meta.requestId) return; // kết quả cũ, đã có yêu cầu mới hơn
        const { items, page, total, rawCount, reset } = a.payload;
        if (reset) state.list.items = items;
        else {
          const seen = new Set(state.list.items.map(w => w.id));
          state.list.items.push(...items.filter(w => !seen.has(w.id)));
        }
        state.list.page = page;
        state.list.total = total;
        state.list.hasMore = total !== null ? page * PAGE_SIZE < total : rawCount >= PAGE_SIZE;
        state.list.status = 'succeeded';
      })
      .addCase(fetchWorkoutPage.rejected, (state, a) => {
        if (state.list.requestId !== a.meta.requestId) return;
        state.list.status = 'failed';
        state.list.error = a.payload ?? 'Không tải được nhật ký.';
      })
      .addCase(fetchAllWorkouts.pending, state => {
        state.allStatus = 'loading';
        state.allError = null;
      })
      .addCase(fetchAllWorkouts.fulfilled, (state, a) => {
        state.all = [...a.payload].sort(byNewest);
        state.allStatus = 'succeeded';
      })
      .addCase(fetchAllWorkouts.rejected, (state, a) => {
        state.allStatus = 'failed';
        state.allError = a.payload ?? 'Không tải được dữ liệu luyện tập.';
      })
      .addCase(createWorkout.fulfilled, (state, a) => {
        state.all = [a.payload, ...state.all.filter(w => w.id !== a.payload.id)].sort(byNewest);
      })
      .addCase(updateWorkout.fulfilled, (state, a) => {
        state.all = state.all.map(w => (w.id === a.payload.id ? a.payload : w)).sort(byNewest);
      })
      .addCase(deleteWorkout.fulfilled, (state, a) => {
        state.all = state.all.filter(w => w.id !== a.payload);
        state.list.items = state.list.items.filter(w => w.id !== a.payload);
      });
  }
});

export const { setListFilters } = slice.actions;
export default slice.reducer;
