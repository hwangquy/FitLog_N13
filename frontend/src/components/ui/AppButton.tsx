import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'lime';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'sm';
  fullWidth?: boolean;
  accessibilityLabel?: string;
};

export function AppButton({ label, onPress, variant = 'primary', icon, loading = false, disabled = false, size = 'md', fullWidth = false, accessibilityLabel }: Props) {
  const { colors } = useAppTheme();
  const scheme = {
    primary: { bg: colors.brand, fg: colors.brandText, border: colors.brand },
    secondary: { bg: colors.panel, fg: colors.color, border: colors.borderColor },
    ghost: { bg: 'transparent', fg: colors.brand, border: 'transparent' },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
    lime: { bg: colors.lime, fg: colors.limeText, border: colors.lime }
  }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        fullWidth && styles.full,
        { backgroundColor: scheme.bg, borderColor: scheme.border, opacity: inactive ? 0.55 : pressed ? 0.85 : 1 }
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={scheme.fg} /> : icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} color={scheme.fg} /> : null}
      <Text style={{ color: scheme.fg, fontWeight: '700', fontSize: size === 'sm' ? 13 : 15 }}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, tone = 'default', disabled = false }: { icon: IconName; label: string; onPress: () => void; tone?: 'default' | 'danger' | 'brand'; disabled?: boolean }) {
  const { colors } = useAppTheme();
  const fg = tone === 'danger' ? colors.danger : tone === 'brand' ? colors.brandText : colors.color;
  const bg = tone === 'danger' ? colors.dangerSoft : tone === 'brand' ? colors.brand : colors.panel;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.icon, { backgroundColor: bg, borderColor: tone === 'default' ? colors.borderColor : bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }]}
    >
      <Icon name={icon} size={20} color={fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1 },
  md: { minHeight: 48, paddingHorizontal: 18 },
  sm: { minHeight: 38, paddingHorizontal: 12 },
  full: { alignSelf: 'stretch' },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 }
});
