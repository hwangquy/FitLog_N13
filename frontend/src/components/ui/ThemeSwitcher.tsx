import { View } from 'react-native';
import { useAppDispatch } from '../../store/hooks';
import { setThemeMode } from '../../store/settingsSlice';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { ThemeMode } from '../../theme/colors';
import { Chip } from './Chip';

const MODES: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: 'Theo hệ thống' },
  { mode: 'light', label: 'Sáng' },
  { mode: 'dark', label: 'Tối' }
];

/** Chọn giao diện Sáng / Tối / Theo hệ thống. Lựa chọn được lưu bởi useSettingsPersistence. */
export function ThemeSwitcher() {
  const dispatch = useAppDispatch();
  const { mode } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {MODES.map(m => (
        <Chip key={m.mode} label={m.label} selected={mode === m.mode} onPress={() => dispatch(setThemeMode(m.mode))} />
      ))}
    </View>
  );
}
