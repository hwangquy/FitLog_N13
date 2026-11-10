import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { DayMetric, Metric } from '../../services/admin';

/** Bảng màu Admin lấy từ theme chung nên tự đổi theo chế độ Sáng/Tối/Hệ thống. */
export function useAdminColors() {
  const { colors, isDark } = useAppTheme();
  return {
    isDark,
    bg: colors.background,
    panel: colors.panel,
    text: colors.color,
    muted: colors.muted,
    stroke: colors.borderColor,
    green: colors.success,
    greenSoft: colors.successSoft,
    red: colors.danger,
    redSoft: colors.dangerSoft,
    brand: colors.brand
  };
}

export function AdminScreen({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  const C = useAdminColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 36, gap: 14 }}>
        <Text style={{ color: C.green, fontSize: 12, fontWeight: '700', letterSpacing: 1.8 }}>FITLOG · CONTROL CENTER</Text>
        <Text accessibilityRole="header" style={{ color: C.text, fontSize: 28, fontWeight: '800' }}>{title}</Text>
        {subtitle ? <Text style={{ color: C.muted, marginBottom: 5, lineHeight: 20 }}>{subtitle}</Text> : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Panel({ title, children }: { title?: string; children: React.ReactNode }) {
  const C = useAdminColors();
  return (
    <View style={{ backgroundColor: C.panel, borderColor: C.stroke, borderWidth: 1, borderRadius: 16, padding: 15, gap: 7 }}>
      {title ? <Text style={{ color: C.text, fontSize: 15, fontWeight: '800', marginBottom: 4 }}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  const C = useAdminColors();
  return (
    <View style={{ backgroundColor: C.panel, borderColor: C.stroke, borderWidth: 1, borderRadius: 16, padding: 15, gap: 7, flexGrow: 1, minWidth: 145, flexBasis: '45%' }}>
      <Text style={{ color: C.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 28, fontWeight: '800', marginTop: 7 }}>{value}</Text>
      {sub ? <Text style={{ color: C.green, fontSize: 11, marginTop: 4 }}>{sub}</Text> : null}
    </View>
  );
}

export function State({ loading, error, onRetry }: { loading?: boolean; error?: string | null; onRetry?: () => void }) {
  const C = useAdminColors();
  if (loading) return <ActivityIndicator color={C.green} size="large" style={{ margin: 25 }} />;
  if (error) {
    return (
      <Panel>
        <Text accessibilityRole="alert" style={{ color: C.red }}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={onRetry}><Text style={{ color: C.green, marginTop: 10, fontWeight: '700' }}>Thử lại</Text></Pressable>
      </Panel>
    );
  }
  return null;
}

/** Biểu đồ cột (View thuần, không cần thư viện). Hiển thị tối đa 10 cột gần nhất. */
export function Bars({ data, labelKey = 'label', title }: { data: Metric[] | DayMetric[]; labelKey?: 'label' | 'day'; title: string }) {
  const C = useAdminColors();
  const safe = data.slice(-10);
  const max = Math.max(1, ...safe.map(v => Math.max(0, Number(v.count) || 0)));
  const summary = safe.map(d => `${labelKey === 'day' ? (d as DayMetric).day : (d as Metric).label}: ${d.count}`).join(', ');
  return (
    <Panel title={title}>
      {safe.length === 0 ? (
        <Text style={{ color: C.muted }}>Chưa có dữ liệu</Text>
      ) : (
        <View accessible accessibilityRole="image" accessibilityLabel={`${title}. ${summary}`} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 7, height: 175, marginTop: 15 }}>
          {safe.map((d, i) => (
            <View key={`${i}`} style={{ flex: 1, alignItems: 'center', minWidth: 0 }}>
              <Text style={{ fontSize: 10, color: C.text }}>{d.count}</Text>
              <View style={{ height: 125, width: '75%', justifyContent: 'flex-end', marginTop: 5 }}>
                <View style={{ height: Math.max(4, (125 * Math.max(0, Number(d.count) || 0)) / max), backgroundColor: i % 2 ? C.brand : C.green, borderTopLeftRadius: 5, borderTopRightRadius: 5 }} />
              </View>
              <Text numberOfLines={1} style={{ fontSize: 9, color: C.muted, marginTop: 6, width: '100%', textAlign: 'center' }}>
                {String(labelKey === 'day' ? (d as DayMetric).day : (d as Metric).label).slice(-6)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Panel>
  );
}

export function Action({ label, onPress, danger = false, disabled = false }: { label: string; onPress: () => void; danger?: boolean; disabled?: boolean }) {
  const C = useAdminColors();
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: danger ? C.redSoft : C.greenSoft, opacity: disabled ? 0.5 : 1, alignSelf: 'flex-start' }}
    >
      <Text style={{ color: danger ? C.red : C.green, fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}
