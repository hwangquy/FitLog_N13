import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage chỉ dùng cho cài đặt cục bộ (theme, đồng ý AI). Dữ liệu nghiệp vụ nằm ở API.
export async function getJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function setJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Không ghi được AsyncStorage', key, e);
  }
}
