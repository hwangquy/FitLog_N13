import { createSlice } from '@reduxjs/toolkit';
import type { ThemeMode } from '../theme/colors';

export type SettingsState = { themeMode: ThemeMode; aiConsent: boolean; hydrated: boolean };
const initialState: SettingsState = { themeMode: 'system', aiConsent: false, hydrated: false };

const isMode = (v: unknown): v is ThemeMode => v === 'system' || v === 'light' || v === 'dark';

const slice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    hydrateSettings(state, a: { payload: { themeMode?: unknown; aiConsent?: unknown } }) {
      if (isMode(a.payload.themeMode)) state.themeMode = a.payload.themeMode;
      if (typeof a.payload.aiConsent === 'boolean') state.aiConsent = a.payload.aiConsent;
      state.hydrated = true;
    },
    setThemeMode(state, a: { payload: ThemeMode }) {
      state.themeMode = a.payload;
    },
    setAiConsent(state, a: { payload: boolean }) {
      state.aiConsent = a.payload;
    }
  }
});

export const { hydrateSettings, setThemeMode, setAiConsent } = slice.actions;
export default slice.reducer;
