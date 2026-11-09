import type { ReactNode } from 'react';
import { View } from 'react-native';
import { AppText } from './primitives';

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText size="lg" weight="bold" accessibilityRole="header">{title}</AppText>
        {subtitle ? <AppText tone="muted" size="xs">{subtitle}</AppText> : null}
      </View>
      {action}
    </View>
  );
}
