import { track } from '../../src/services/tracking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AppButton, AppInput, AppText, Chip, ErrorState, LoadingState, Screen, ScreenHeader } from '../../src/components/ui';
import { showError } from '../../src/components/ui/dialogs';
import { metricLabel, metricUnit, periodLabel } from '../../src/features/goals/progress';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { createGoal, updateGoal } from '../../src/store/goalsSlice';
import { goalMetrics, goalPeriods, workoutTypes } from '../../src/types';
import type { GoalMetric, GoalPeriod, WorkoutType } from '../../src/types';
import { errorMessage } from '../../src/utils/format';
import { parseGoalForm } from '../../src/utils/validation';
import type { Errors, GoalField } from '../../src/utils/validation';

export default function GoalFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const dispatch = useAppDispatch();
  const status = useAppSelector(s => s.goals.status);
  const source = useAppSelector(s => (id ? s.goals.items.find(g => g.id === id) : undefined));
  const populated = useRef(false);

  const [title, setTitle] = useState('');
  const [metric, setMetric] = useState<GoalMetric>('sessions');
  const [target, setTarget] = useState('');
  const [period, setPeriod] = useState<GoalPeriod>('week');
  const [workoutType, setWorkoutType] = useState<WorkoutType | 'all'>('all');
  const [errors, setErrors] = useState<Errors<GoalField>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!source || populated.current) return;
    populated.current = true;
    setTitle(source.title);
    setMetric(source.metric);
    setTarget(String(source.target));
    setPeriod(source.period);
    setWorkoutType(source.workoutType);
  }, [source]);

  const onSave = async () => {
    if (saving) return;
    const parsed = parseGoalForm({ title, metric, target, period, workoutType });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const input = { ...parsed.value, createdAt: source?.createdAt };
      if (editing && id) await dispatch(updateGoal({ id, input })).unwrap();
      else { await dispatch(createGoal(input)).unwrap(); void track('goal_created','goals'); }
      router.back();
    } catch (e) {
      showError('Không lưu được mục tiêu', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const missing = editing && !source;
  return (
    <Screen keyboard edges={['top', 'bottom']}>
      <ScreenHeader back title={editing ? 'Sửa mục tiêu' : 'Tạo mục tiêu'} />
      {missing && (status === 'loading' || status === 'idle') ? <LoadingState /> : null}
      {missing && status !== 'loading' && status !== 'idle' ? <ErrorState message="Không tìm thấy mục tiêu này. Có thể nó đã bị xoá." onRetry={() => router.back()} /> : null}
      {!missing ? (
        <>
          <AppInput label="Tên mục tiêu" required value={title} onChangeText={setTitle} placeholder="Ví dụ: Chạy 20 km mỗi tháng" error={errors.title} maxLength={60} />
          <View style={{ gap: 8 }}>
            <AppText weight="bold" size="sm">Đo bằng</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
              {goalMetrics.map(m => <Chip key={m} label={metricLabel[m]} selected={metric === m} onPress={() => setMetric(m)} />)}
            </ScrollView>
          </View>
          <AppInput
            label={`Chỉ tiêu (${metricUnit[metric]} mỗi ${periodLabel[period]})`}
            required
            value={target}
            onChangeText={setTarget}
            keyboardType={metric === 'distance' ? 'decimal-pad' : 'number-pad'}
            placeholder={metric === 'sessions' ? '5' : metric === 'distance' ? '20' : '150'}
            error={errors.target}
            hint={metric === 'calories' ? 'Chỉ tính calories bạn đã nhập ở các buổi tập.' : undefined}
            maxLength={8}
          />
          <View style={{ gap: 8 }}>
            <AppText weight="bold" size="sm">Chu kỳ</AppText>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {goalPeriods.map(p => <Chip key={p} label={p === 'week' ? 'Mỗi tuần' : 'Mỗi tháng'} selected={period === p} onPress={() => setPeriod(p)} />)}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <AppText weight="bold" size="sm">Áp dụng cho</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
              <Chip label="Mọi hoạt động" selected={workoutType === 'all'} onPress={() => setWorkoutType('all')} />
              {workoutTypes.map(t => <Chip key={t} label={t} selected={workoutType === t} onPress={() => setWorkoutType(t)} />)}
            </ScrollView>
          </View>
          <AppButton label={editing ? 'Lưu thay đổi' : 'Tạo mục tiêu'} icon="checkmark" fullWidth loading={saving} onPress={onSave} />
        </>
      ) : null}
    </Screen>
  );
}
