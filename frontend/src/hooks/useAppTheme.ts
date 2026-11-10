import { useColorScheme } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { palette, resolveScheme } from '../theme/colors';
import type { AppColors } from '../theme/colors';

export function useAppTheme() {
  const mode = useAppSelector(s => s.settings.themeMode);
  const system = useColorScheme();
  const scheme = resolveScheme(mode, system === 'dark' || system === 'light' ? system : null);
  const colors: AppColors = palette[scheme];
  return { mode, scheme, colors, isDark: scheme === 'dark' };
}
