import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Switch, View } from 'react-native';
import { AppButton, AppInput, AppText, Chip, ErrorState, LoadingState, Screen, ScreenHeader } from '../../src/components/ui';
import { offerOpenSettings, showError } from '../../src/components/ui/dialogs';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { ensureNotificationPermission } from '../../src/services/notifications';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { createReminder, updateReminder } from '../../src/store/remindersSlice';
import { errorMessage } from '../../src/utils/format';
import { weekdayShort } from '../../src/utils/date';
import { parseReminderForm } from '../../src/utils/validation';
import type { Errors, ReminderField } from '../../src/utils/validation';

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // hiển thị T2 -> CN
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function ReminderFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const dispatch = useAppDispatch();
  const { colors } = useAppTheme();
  const status = useAppSelector(s => s.reminders.status);
  const source = useAppSelector(s => (id ? s.reminders.items.find(r => r.id === id) : undefined));
  const populated = useRef(false);

  const [title, setTitle] = useState('Nhắc lịch tập');
  const [time, setTime] = useState('18:30');
  const [days, setDays] = useState<number[]>(ALL_DAYS);
  const [enabled, setEnabled] = useState(true);
  const [errors, setErrors] = useState<Errors<ReminderField>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!source || populated.current) return;
    populated.current = true;
    setTitle(source.title);
    setTime(source.time);
    setDays(source.days);
    setEnabled(source.enabled);
  }, [source]);

  const toggleDay = (d: number) => setDays(cur => (cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d]));

  const onSave = async () => {
    if (saving) return;
    const parsed = parseReminderForm({ title, time, days, enabled });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      let enabledFinal = parsed.value.enabled;
      let permissionDenied = false;
      if (enabledFinal) {
        const permission = await ensureNotificationPermission();
        if (permission === 'denied') {
          enabledFinal = false; // không thể lên lịch thật nên lưu ở trạng thái tắt, không giả vờ đã bật
          permissionDenied = true;
        }
      }
      const input = { ...parsed.value, enabled: enabledFinal, createdAt: source?.createdAt };
      if (editing && id) await dispatch(updateReminder({ id, input })).unwrap();
      else await dispatch(createReminder(input)).unwrap();
      router.back();
      if (permissionDenied) {
        offerOpenSettings('Đã lưu nhưng đang tắt', 'FitLog chưa có quyền thông báo nên nhắc nhở được lưu ở trạng thái tắt. Bật quyền trong cài đặt rồi bật lại nhắc nhở.');
      }
    } catch (e) {
      showError('Không lưu được nhắc nhở', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const missing = editing && !source;
  return (
    <Screen keyboard edges={['top', 'bottom']}>
      <ScreenHeader back title={editing ? 'Sửa nhắc nhở' : 'Thêm nhắc nhở'} />
      {missing && (status === 'loading' || status === 'idle') ? <LoadingState /> : null}
      {missing && status !== 'loading' && status !== 'idle' ? <ErrorState message="Không tìm thấy nhắc nhở này. Có thể nó đã bị xoá." onRetry={() => router.back()} /> : null}
      {!missing ? (
        <>
          <AppInput label="Nội dung nhắc" required value={title} onChangeText={setTitle} error={errors.title} maxLength={60} />
          <AppInput label="Giờ nhắc (HH:mm, 24 giờ)" required value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" placeholder="18:30" error={errors.time} maxLength={5} />
          <View style={{ gap: 8 }}>
            <AppText weight="bold" size="sm">Lặp lại vào</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DAY_ORDER.map(d => <Chip key={d} label={weekdayShort(d)} selected={days.includes(d)} onPress={() => toggleDay(d)} />)}
            </View>
            {errors.days ? <AppText tone="danger" size="xs">{errors.days}</AppText> : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <AppButton label="Mỗi ngày" variant="ghost" size="sm" onPress={() => setDays(ALL_DAYS)} />
              <AppButton label="T2–T6" variant="ghost" size="sm" onPress={() => setDays([1, 2, 3, 4, 5])} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText weight="semi">Bật nhắc nhở</AppText>
            <Switch accessibilityLabel="Bật nhắc nhở" value={enabled} onValueChange={setEnabled} trackColor={{ true: colors.brand, false: colors.borderColor }} thumbColor="#FFFFFF" />
          </View>
          <AppButton label={editing ? 'Lưu thay đổi' : 'Lưu nhắc nhở'} icon="checkmark" fullWidth loading={saving} onPress={onSave} />
        </>
      ) : null}
    </Screen>
  );
}
