import Constants from 'expo-constants';
import { Platform } from 'react-native';
const API_PORT = 8080;
export function resolveApiBaseUrl(): string {
  const custom = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (custom) return custom.replace(/\/+$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && Platform.OS !== 'web') return `http://${host}:${API_PORT}/api`;
  if (Platform.OS === 'android') return `http://10.0.2.2:${API_PORT}/api`;
  return `http://localhost:${API_PORT}/api`;
}
export const API_BASE_URL = resolveApiBaseUrl();
// AI now shares the protected Spring Boot API; there is never an API key in the app.
export const AI_API_URL: string | null = API_BASE_URL;
