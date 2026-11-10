import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { IconButton } from './AppButton';
import { AppText } from './primitives';

export function ScreenHeader({ eyebrow, title, subtitle, back = false, right }: { eyebrow?: string; title: string; subtitle?: string; back?: boolean; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {back ? <IconButton icon="chevron-back" label="Quay lại" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        {eyebrow ? <AppText tone="muted" size="xs" weight="semi">{eyebrow.toUpperCase()}</AppText> : null}
        <AppText size="xl" weight="bold" accessibilityRole="header">{title}</AppText>
        {subtitle ? <AppText tone="muted" size="sm">{subtitle}</AppText> : null}
      </View>
      {right}
    </View>
  );
}
