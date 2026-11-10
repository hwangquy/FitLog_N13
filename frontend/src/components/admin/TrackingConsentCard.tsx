
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Switch, Text, View } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import {
  loadTrackingConsent,
  setTrackingConsent,
} from '../../services/tracking';

export default function TrackingConsentCard() {
  const { colors } = useAppTheme();

  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTrackingConsent()
      .then(setEnabled)
      .catch(() => {
        setError('Chưa lấy được tùy chọn tracking.');
      });
  }, []);

  const toggle = async (value: boolean) => {
    if (busy) return;

    setBusy(true);
    setError('');

    try {
      const saved = await setTrackingConsent(value);
      setEnabled(saved);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Lỗi cập nhật'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.borderColor,
        backgroundColor: colors.panel,
        gap: 12,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: colors.color,
            flex: 1,
          }}
        >
          Cho phép thống kê sử dụng
        </Text>

        <Switch
          accessibilityLabel="Cho phép thống kê sử dụng"
          disabled={busy}
          value={enabled}
          onValueChange={toggle}
          trackColor={{
            false: colors.borderColor,
            true: colors.brand,
          }}
          thumbColor="#FFFFFF"
        />
      </View>

      <Text
        style={{
          fontSize: 13,
          lineHeight: 21,
          color: colors.muted,
        }}
      >
        Tùy chọn, mặc định tắt. Chỉ lưu màn hình đã xem
        và loại sự kiện. Không thu thập vị trí, ảnh,
        nội dung nhật ký hay dữ liệu sức khỏe.
        Tắt sẽ xóa lịch sử tracking đã thu thập của bạn.
      </Text>

      {busy ? (
        <ActivityIndicator color={colors.brand} />
      ) : null}

      {error ? (
        <Text
          style={{
            fontSize: 13,
            color: colors.danger,
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
