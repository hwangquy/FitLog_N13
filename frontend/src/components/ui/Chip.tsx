import { Pressable, Text } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={4}
      style={{
        minHeight: 38,
        paddingHorizontal: 14,
        borderRadius: 19,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? colors.brand : colors.panel,
        borderColor: selected ? colors.brand : colors.borderColor
      }}
    >
      <Text style={{ color: selected ? colors.brandText : colors.color, fontWeight: selected ? '700' : '500', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}
