import { View } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { AppText } from '../ui/primitives';

export type BarDatum = { key: string; label: string; value: number };

/** Biểu đồ cột đơn giản bằng View (không phụ thuộc thư viện biểu đồ). Chỉ vẽ dữ liệu được truyền vào. */
export function BarChart({ data, unit, height = 140, highlightLast = true }: { data: BarDatum[]; unit: string; height?: number; highlightLast?: boolean }) {
  const { colors } = useAppTheme();
  const max = Math.max(...data.map(d => d.value), 0);
  const summary = data.map(d => `${d.label}: ${d.value} ${unit}`).join(', ');
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`Biểu đồ. ${summary}`} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: height + 40 }}>
      {data.map((d, i) => {
        const h = max > 0 ? Math.max(d.value > 0 ? 6 : 3, (d.value / max) * height) : 3;
        const last = highlightLast && i === data.length - 1;
        return (
          <View key={d.key} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
            <AppText size="xs" tone="muted">{d.value > 0 ? String(d.value) : ''}</AppText>
            <View style={{ width: '100%', height: h, borderRadius: 8, backgroundColor: d.value === 0 ? colors.borderColor : last ? colors.brand : colors.brandSoft, borderWidth: d.value > 0 && !last ? 1 : 0, borderColor: colors.brand }} />
            <AppText size="xs" tone="muted">{d.label}</AppText>
          </View>
        );
      })}
    </View>
  );
}
