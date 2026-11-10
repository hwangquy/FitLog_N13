import { Alert, Linking, Platform } from 'react-native';

/** Hộp thoại xác nhận trước khi thực hiện hành động xoá. */
export function confirmDestructive(opts: { title: string; message: string; confirmLabel?: string; onConfirm: () => void }) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${opts.title}\n\n${opts.message}`)) opts.onConfirm();
    return;
  }
  Alert.alert(opts.title, opts.message, [
    { text: 'Huỷ', style: 'cancel' },
    { text: opts.confirmLabel ?? 'Xoá', style: 'destructive', onPress: opts.onConfirm }
  ]);
}

export function showError(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
  } else Alert.alert(title, message);
}

export function offerOpenSettings(title: string, message: string) {
  Alert.alert(title, message, [
    { text: 'Để sau', style: 'cancel' },
    { text: 'Mở cài đặt', onPress: () => void Linking.openSettings() }
  ]);
}
