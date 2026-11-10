import { configureStore, combineReducers, createAction } from '@reduxjs/toolkit';
import type { Middleware, UnknownAction } from '@reduxjs/toolkit';
import goals from './goalsSlice';
import reminders from './remindersSlice';
import settings from './settingsSlice';
import workouts from './workoutsSlice';
import planner from './plannerSlice';

export const resetAccountData = createAction('auth/resetAccountData');
const combined = combineReducers({ workouts, goals, reminders, settings, planner });
type StoreState = ReturnType<typeof combined>;
function rootReducer(state: StoreState | undefined, action: UnknownAction): StoreState {
  if (resetAccountData.match(action)) {
    // Theme preference retained, but AI consent always revoked on user switch.
    return combined({ settings: state?.settings ? { ...state.settings, aiConsent: false } : undefined } as StoreState, action);
  }
  return combined(state, action);
}

// Prevent a pending request from a previous account populating Redux after logout.
const ignoreOldAccountResponses: Middleware = () => {
  let epoch = 0;
  const pending = new Map<string, number>();
  return next => action => {
    const a = action as { type?: string; meta?: { requestId?: string } };
    if (a.type === resetAccountData.type) { epoch += 1; pending.clear(); }
    const id = a.meta?.requestId;
    if (id && a.type?.endsWith('/pending')) pending.set(id, epoch);
    if (id && (a.type?.endsWith('/fulfilled') || a.type?.endsWith('/rejected'))) {
      const startedEpoch = pending.get(id);
      pending.delete(id);
      if (startedEpoch !== epoch) return action;
    }
    return next(action);
  };
};
export const store = configureStore({
  reducer: rootReducer,
  middleware: getDefault => getDefault().concat(ignoreOldAccountResponses)
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
