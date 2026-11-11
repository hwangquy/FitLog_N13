import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'fitlog_access_token_v2';
let memoryToken: string | null | undefined;
const listeners = new Set<() => void>();

// Mobile: OS-backed encrypted key store. Web fallback is sessionStorage only for development;
// a production web deployment must use HttpOnly/Secure/SameSite cookies + CSRF protection.
export async function getAccessToken(): Promise<string | null> {
  if (memoryToken !== undefined) return memoryToken;
  if (Platform.OS === 'web') {
    memoryToken = typeof window !== 'undefined' ? window.sessionStorage.getItem(KEY) : null;
  } else {
    memoryToken = await SecureStore.getItemAsync(KEY);
  }
  return memoryToken;
}
export async function setAccessToken(token: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      if (token) window.sessionStorage.setItem(KEY, token);
      else window.sessionStorage.removeItem(KEY);
    }
  } else if (token) await SecureStore.setItemAsync(KEY, token);
  else await SecureStore.deleteItemAsync(KEY);
  memoryToken = token;
  for (const fn of listeners) fn();
}
export function onSessionChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
