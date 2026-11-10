import { ActivityIndicator, View } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { AppButton } from './AppButton';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { AppText } from './primitives';

export function LoadingState({ message = 'Đang tải dữ liệu...' }: { message?: string }) {
  const { colors } = useAppTheme();
  return (
    <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: 12, paddingVertical: 40 }}>
      <ActivityIndicator size="large" color={colors.brand} />
      <AppText tone="muted" size="sm">{message}</AppText>
    </View>
  );
}

export function EmptyState({ icon, title, message, actionLabel, onAction }: { icon: IconName; title: string; message?: string; actionLabel?: string; onAction?: () => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 32, paddingHorizontal: 16 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={30} color={colors.brand} />
      </View>
      <AppText weight="bold" size="lg" style={{ textAlign: 'center' }}>{title}</AppText>
      {message ? <AppText tone="muted" size="sm" style={{ textAlign: 'center' }}>{message}</AppText> : null}
      {actionLabel && onAction ? <AppButton label={actionLabel} onPress={onAction} icon="add" /> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors } = useAppTheme();
  return (
    <View accessibilityRole="alert" style={{ alignItems: 'center', gap: 10, paddingVertical: 32, paddingHorizontal: 16 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="cloud-offline-outline" size={30} color={colors.danger} />
      </View>
      <AppText weight="bold" size="lg" style={{ textAlign: 'center' }}>Không tải được dữ liệu</AppText>
      <AppText tone="muted" size="sm" style={{ textAlign: 'center' }}>{message}</AppText>
      {onRetry ? <AppButton label="Thử lại" icon="refresh" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}
