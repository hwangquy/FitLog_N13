import { useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { formatDateLong, parseISODate, toLocalISODate } from '../../utils/date';

type Props = {
  label: string;
  /** Ngày đang chọn, định dạng YYYY-MM-DD (giờ địa phương). */
  value: string;
  onChange: (iso: string) => void;
  /** Ngày lớn nhất được chọn (mặc định: không giới hạn). Dùng để chặn ngày tương lai. */
  maxDate?: string;
  /** Ngày nhỏ nhất được chọn (mặc định: không giới hạn). */
  minDate?: string;
  required?: boolean;
  error?: string;
  hint?: string;
};

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** Lưới tháng, tuần bắt đầu từ Thứ Hai. Ô trống = null. */
export function buildMonthGrid(year: number, month: number): (number | null)[] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * Ô chọn ngày: bấm vào để mở lịch tháng (có chuyển tháng, đánh dấu hôm nay, chặn ngày ngoài khoảng cho phép).
 * Viết bằng React Native thuần nên chạy giống nhau trên Android, iOS và Web, đổi màu theo theme sáng/tối.
 */
export function DatePickerField({ label, value, onChange, maxDate, minDate, required, error, hint }: Props) {
  const { colors } = useAppTheme();
  const today = toLocalISODate(new Date());
  const selected = parseISODate(value) ? value : null;
  const [open, setOpen] = useState(false);
  const base = parseISODate(selected ?? today) ?? new Date();
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });

  const cells = useMemo(() => buildMonthGrid(view.y, view.m), [view.y, view.m]);
  const prevDisabled = minDate ? iso(view.y, view.m, 1) <= minDate : false;
  const nextFirst = new Date(view.y, view.m + 1, 1);
  const nextBlocked = maxDate ? toLocalISODate(nextFirst) > maxDate : false;

  const openPicker = () => {
    const d = parseISODate(selected ?? today) ?? new Date();
    setView({ y: d.getFullYear(), m: d.getMonth() });
    setOpen(true);
  };
  const shift = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const disabledDay = (d: string) => Boolean((maxDate && d > maxDate) || (minDate && d < minDate));
  const pick = (d: string) => {
    if (disabledDay(d)) return;
    onChange(d);
    setOpen(false);
  };

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.color, fontWeight: '700', fontSize: 14 }}>
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected ? formatDateLong(selected) : 'chưa chọn'}. Bấm để mở lịch`}
        onPress={openPicker}
        style={{
          minHeight: 48,
          borderWidth: 1,
          borderRadius: 14,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.panel,
          borderColor: error ? colors.danger : colors.borderColor
        }}
      >
        <Text style={{ color: selected ? colors.color : colors.muted, fontSize: 15 }}>
          {selected ? formatDateLong(selected) : 'Chọn ngày'}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={colors.brand} />
      </Pressable>

      {error ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.danger, fontSize: 12 }}>{error}</Text>
      ) : hint ? (
        <Text style={{ color: colors.muted, fontSize: 12 }}>{hint}</Text>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          accessibilityLabel="Đóng lịch"
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
        >
          {/* Bấm vào thẻ lịch không đóng modal. */}
          <Pressable
            onPress={() => {}}
            accessible={false}
            style={{ width: '100%', maxWidth: 380, backgroundColor: colors.panel, borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.borderColor }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tháng trước"
                disabled={prevDisabled}
                onPress={() => shift(-1)}
                hitSlop={8}
                style={{ padding: 8, opacity: prevDisabled ? 0.3 : 1 }}
              >
                <Ionicons name="chevron-back" size={22} color={colors.color} />
              </Pressable>
              <Text accessibilityRole="header" style={{ color: colors.color, fontWeight: '800', fontSize: 16 }}>
                Tháng {view.m + 1}/{view.y}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tháng sau"
                disabled={nextBlocked}
                onPress={() => shift(1)}
                hitSlop={8}
                style={{ padding: 8, opacity: nextBlocked ? 0.3 : 1 }}
              >
                <Ionicons name="chevron-forward" size={22} color={colors.color} />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row' }}>
              {WEEKDAYS.map(w => (
                <Text key={w} style={{ width: `${100 / 7}%`, textAlign: 'center', color: colors.muted, fontSize: 12, fontWeight: '700' }}>{w}</Text>
              ))}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {cells.map((day, i) => {
                if (day === null) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
                const d = iso(view.y, view.m, day);
                const isSel = d === selected;
                const isToday = d === today;
                const off = disabledDay(d);
                return (
                  <View key={d} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={formatDateLong(d)}
                      accessibilityState={{ selected: isSel, disabled: off }}
                      disabled={off}
                      onPress={() => pick(d)}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 999,
                        backgroundColor: isSel ? colors.brand : 'transparent',
                        borderWidth: isToday && !isSel ? 1.5 : 0,
                        borderColor: colors.brand,
                        opacity: off ? 0.3 : 1
                      }}
                    >
                      <Text style={{ color: isSel ? colors.brandText : colors.color, fontWeight: isSel || isToday ? '800' : '500', fontSize: 14 }}>{day}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Pressable
                accessibilityRole="button"
                disabled={disabledDay(today)}
                onPress={() => pick(today)}
                style={{ paddingVertical: 10, paddingHorizontal: 14, opacity: disabledDay(today) ? 0.3 : 1 }}
              >
                <Text style={{ color: colors.brand, fontWeight: '700' }}>Hôm nay</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={{ paddingVertical: 10, paddingHorizontal: 14 }}>
                <Text style={{ color: colors.muted, fontWeight: '700' }}>Đóng</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}