import { View } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { AppText, Card } from './primitives';

export function StatCard({ icon, value, label, hint }: { icon: IconName; value: string; label: string; hint?: string }) {
  const { colors } = useAppTheme();
  return (
    <Card flex={1} padding="$3" gap="$2" borderRadius="$5">
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={colors.brand} />
      </View>
      <View style={{ gap: 2 }}>
        <AppText size="lg" weight="bold" numberOfLines={1} adjustsFontSizeToFit>{value}</AppText>
        <AppText tone="muted" size="xs">{label}</AppText>
        {hint ? <AppText tone="muted" size="xs">{hint}</AppText> : null}
      </View>
    </Card>
  );
}
