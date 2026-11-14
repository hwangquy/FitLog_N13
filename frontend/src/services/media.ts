
import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { API_BASE_URL } from '../config/env';
import { getAccessToken } from './session';

export async function uploadWorkoutImage(uri: string): Promise<string> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Bạn cần đăng nhập trước khi tải ảnh.');
  }

  const form = new FormData();
  const name = `workout-${Date.now()}.jpg`;

  try {
    if (Platform.OS === 'web') {
      const imageResponse = await globalThis.fetch(uri);
      if (!imageResponse.ok) {
        throw new Error('Không thể đọc ảnh đã chọn.');
      }

      const blob = await imageResponse.blob();
      form.append('file', blob, name);
    } else {
      // File của Expo tương thích với Blob và FormData.
      const imageFile = new File(uri);

      if (!imageFile.exists) {
        throw new Error('Không tìm thấy ảnh trên điện thoại.');
      }

      console.log('IMAGE SIZE:', imageFile.size);

      form.append('file', imageFile, imageFile.name || name);
    }

    const url = `${API_BASE_URL}/media`;

    console.log('UPLOAD URL:', url);
    console.log('UPLOAD PLATFORM:', Platform.OS);

    const response =
      Platform.OS === 'web'
        ? await globalThis.fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: form,
          })
        : await expoFetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: form,
          });

    console.log('UPLOAD STATUS:', response.status);

    const responseText = await response.text();

    if (!response.ok) {
      console.error('UPLOAD ERROR:', response.status, responseText);

      let message = `Không thể tải ảnh lên (HTTP ${response.status}).`;

      try {
        const errorData = JSON.parse(responseText);
        if (typeof errorData.message === 'string') {
          message = errorData.message;
        }
      } catch {
        // Server có thể trả về nội dung không phải JSON.
      }

      throw new Error(message);
    }

    let result: unknown;

    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error('Máy chủ trả về dữ liệu ảnh không hợp lệ.');
    }

    if (
      typeof result !== 'object' ||
      result === null ||
      !('image' in result) ||
      typeof result.image !== 'string' ||
      !result.image.startsWith('/media/')
    ) {
      throw new Error('Server trả về địa chỉ ảnh không hợp lệ.');
    }

    console.log('UPLOAD SUCCESS:', result.image);

    return result.image;

  } catch (error) {
    console.error('UPLOAD IMAGE ERROR:', error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Không thể tải ảnh. Vui lòng thử lại.');
  }
}
