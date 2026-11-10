import { configureStore, combineReducers, createAction } from '@reduxjs/toolkit';
import type { UnknownAction } from '@reduxjs/toolkit';
import settings from './settingsSlice';

export const resetAccountData = createAction('auth/resetAccountData');

// Các slice nghiệp vụ (workouts, goals, reminders, planner...) do thành viên khác thêm vào đây.
const combined = combineReducers({ settings });
type StoreState = ReturnType<typeof combined>;

function rootReducer(state: StoreState | undefined, action: UnknownAction): StoreState {
  if (resetAccountData.match(action)) {
    // Giữ lại giao diện sáng/tối, luôn thu hồi đồng ý AI khi đổi tài khoản.
    return combined({ settings: state?.settings ? { ...state.settings, aiConsent: false } : undefined } as StoreState, action);
  }
  return combined(state, action);
}

export const store = configureStore({ reducer: rootReducer });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
