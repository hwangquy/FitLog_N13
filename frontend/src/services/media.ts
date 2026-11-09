import { API_BASE_URL } from '../config/env';
import { getAccessToken } from './session';
import { Platform } from 'react-native';

/** Store one private image as a server-side file. Never send file:// URI in workout JSON. */
export async function uploadWorkoutImage(uri: string): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('Bạn cần đăng nhập trước khi tải ảnh.');
  const form = new FormData();
  const name = `workout-${Date.now()}.jpg`;
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob, name);
  } else {
    form.append('file', { uri, name, type: 'image/jpeg' } as unknown as Blob);
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/media`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form
    });
  } catch { throw new Error('Không tải được ảnh. Hãy kiểm tra kết nối.'); }
  if (!response.ok) {
    try { const json = await response.json(); throw new Error(json.message || `Upload thất bại (${response.status})`); }
    catch(e) { if(e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e; throw new Error('Upload ảnh thất bại.'); }
  }
  const result = await response.json();
  if (typeof result.image !== 'string' || !result.image.startsWith('/media/')) throw new Error('Server trả về địa chỉ ảnh không hợp lệ.');
  return result.image;
}
