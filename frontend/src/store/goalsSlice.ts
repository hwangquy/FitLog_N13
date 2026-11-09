import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { goalsApi } from '../services/api';
import type { Goal, GoalInput } from '../types';
import { errorMessage } from '../utils/format';

export type GoalsState = { items: Goal[]; status: 'idle' | 'loading' | 'succeeded' | 'failed'; error: string | null };
const initialState: GoalsState = { items: [], status: 'idle', error: null };
type Cfg = { rejectValue: string };

export const fetchGoals = createAsyncThunk<Goal[], void, Cfg>('goals/fetch', async (_, { rejectWithValue }) => {
  try {
    return await goalsApi.list();
  } catch (e) {
    return rejectWithValue(errorMessage(e));
  }
});
export const createGoal = createAsyncThunk<Goal, GoalInput, Cfg>('goals/create', async (input, { rejectWithValue }) => {
  try {
    return await goalsApi.create({ ...input, createdAt: input.createdAt ?? new Date().toISOString() });
  } catch (e) {
    return rejectWithValue(errorMessage(e));
  }
});
export const updateGoal = createAsyncThunk<Goal, { id: string; input: GoalInput }, Cfg>('goals/update', async ({ id, input }, { rejectWithValue }) => {
  try {
    return await goalsApi.update(id, input);
  } catch (e) {
    return rejectWithValue(errorMessage(e));
  }
});
export const deleteGoal = createAsyncThunk<string, string, Cfg>('goals/delete', async (id, { rejectWithValue }) => {
  try {
    await goalsApi.remove(id);
    return id;
  } catch (e) {
    return rejectWithValue(errorMessage(e));
  }
});

const byCreated = (a: Goal, b: Goal) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '');

const slice = createSlice({
  name: 'goals',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchGoals.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchGoals.fulfilled, (state, a) => {
        state.items = [...a.payload].sort(byCreated);
        state.status = 'succeeded';
      })
      .addCase(fetchGoals.rejected, (state, a) => {
        state.status = 'failed';
        state.error = a.payload ?? 'Không tải được mục tiêu.';
      })
      .addCase(createGoal.fulfilled, (state, a) => {
        state.items = [...state.items.filter(g => g.id !== a.payload.id), a.payload].sort(byCreated);
      })
      .addCase(updateGoal.fulfilled, (state, a) => {
        state.items = state.items.map(g => (g.id === a.payload.id ? a.payload : g));
      })
      .addCase(deleteGoal.fulfilled, (state, a) => {
        state.items = state.items.filter(g => g.id !== a.payload);
      });
  }
});

export default slice.reducer;
