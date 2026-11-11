import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { BarChart } from '../../src/components/charts/BarChart';
import { GoalCard } from '../../src/components/goals/GoalCard';
import { AppButton, AppText, Card, Chip, EmptyState, ErrorState, LoadingState, Screen, ScreenHeader, SectionTitle, StatCard } from '../../src/components/ui';
import { breakdownByType, dailySeries, percentChange, periodWindows, summarize, weeklySeries } from '../../src/features/stats/stats';
import type { PeriodKind } from '../../src/features/stats/stats';
import { useToday } from '../../src/hooks/useToday';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { fetchGoals } from '../../src/store/goalsSlice';
import { fetchAllWorkouts } from '../../src/store/workoutsSlice';
import { formatDate } from '../../src/utils/date';
import { formatDistance, formatDuration } from '../../src/utils/format';

export default function ProgressScreen() {
  const dispatch = useAppDispatch();
  const today = useToday();
  const [kind, setKind] = useState<PeriodKind>('7d');
  const all = useAppSelector(s => s.workouts.all);
  const status = useAppSelector(s => s.workouts.allStatus);
  const error = useAppSelector(s => s.workouts.allError);
  const goals = useAppSelector(s => s.goals.items);

  const refresh = useCallback(() => {
    void dispatch(fetchAllWorkouts());
    void dispatch(fetchGoals());
  }, [dispatch]);

  const { cur, prev, series, types, windows } = useMemo(() => {
    const w = periodWindows(kind, today);
    return {
      windows: w,
      cur: summarize(all, w.current.start, w.current.end),
      prev: summarize(all, w.previous.start, w.previous.end),
      series: kind === '7d' ? dailySeries(all, today, 7) : weeklySeries(all, today, 4),
      types: breakdownByType(all, w.current.start, w.current.end)
    };
  }, [all, kind, today]);

  const change = percentChange(cur.minutes, prev.minutes);
  const label = kind === '7d' ? '7 ngày gần nhất' : '4 tuần gần nhất';
  const prevLabel = kind === '7d' ? 'tuần trước' : '4 tuần trước đó';
  const loadingFirst = status === 'loading' && all.length === 0;
  const failedFirst = status === 'failed' && all.length === 0;

  return (
    <Screen onRefresh={refresh} refreshing={status === 'loading' && all.length > 0}>
      <ScreenHeader eyebrow="Thống kê" title="Tiến độ" subtitle={`${formatDate(windows.current.start)} – ${formatDate(windows.current.end)}`} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="7 ngày" selected={kind === '7d'} onPress={() => setKind('7d')} />
        <Chip label="4 tuần" selected={kind === '4w'} onPress={() => setKind('4w')} />
      </View>

      {loadingFirst ? <LoadingState /> : null}
      {failedFirst ? <ErrorState message={error ?? 'Không kết nối được máy chủ.'} onRetry={refresh} /> : null}
      {!loadingFirst && !failedFirst && all.length === 0 ? (
        <EmptyState icon="stats-chart-outline" title="Chưa có dữ liệu thống kê" message="Ghi các buổi tập để xem biểu đồ và so sánh theo thời gian." actionLabel="Ghi buổi tập" onAction={() => router.push('/workout/form')} />
      ) : null}

      {!loadingFirst && !failedFirst && all.length > 0 ? (
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard icon="flame" value={String(cur.sessions)} label="Buổi tập" />
            <StatCard icon="time" value={formatDuration(cur.minutes)} label="Thời gian" />
            <StatCard icon="navigate" value={formatDistance(cur.distance)} label="Quãng đường" />
          </View>

          <Card>
            <SectionTitle title="Thời gian tập (phút)" subtitle={label} />
            {cur.sessions === 0 && prev.sessions === 0 && series.every(b => b.minutes === 0) ? (
              <AppText tone="muted" size="sm">Không có buổi tập nào trong khoảng này.</AppText>
            ) : (
              <BarChart data={series.map(b => ({ key: b.key, label: b.label, value: b.minutes }))} unit="phút" />
            )}
            <AppText tone="muted" size="sm">
              {change === null
                ? `Chưa có dữ liệu ${prevLabel} để so sánh.`
                : change === 0
                  ? `Bằng ${prevLabel} (${formatDuration(prev.minutes)}).`
                  : `${change > 0 ? 'Tăng' : 'Giảm'} ${Math.abs(change)}% so với ${prevLabel} (${formatDuration(prev.minutes)}).`}
            </AppText>
            <AppText tone="muted" size="xs">
              {cur.caloriesSessions > 0 ? `Calories đã ghi: ${cur.calories} kcal (từ ${cur.caloriesSessions}/${cur.sessions} buổi có nhập calories).` : 'Chưa có buổi nào nhập calories nên FitLog không hiển thị tổng calories.'}
            </AppText>
          </Card>

          <Card>
            <SectionTitle title="Theo loại hoạt động" subtitle={label} />
            {types.length === 0 ? (
              <AppText tone="muted" size="sm">Chưa có buổi tập trong khoảng này.</AppText>
            ) : (
              types.map(t => (
                <View key={t.type} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText weight="semi">{t.type}</AppText>
                  <AppText tone="muted">{t.sessions} buổi · {formatDuration(t.minutes)}</AppText>
                </View>
              ))
            )}
          </Card>
        </>
      ) : null}

      <SectionTitle title="Mục tiêu" action={<AppButton label="Quản lý" variant="ghost" size="sm" onPress={() => router.push('/goals')} />} />
      {goals.length === 0 ? (
        <Card>
          <AppText tone="muted" size="sm">Chưa có mục tiêu nào.</AppText>
          <AppButton label="Tạo mục tiêu" icon="flag" variant="secondary" onPress={() => router.push('/goals/form')} />
        </Card>
      ) : (
        goals.slice(0, 3).map(g => <GoalCard key={g.id} goal={g} workouts={all} today={today} />)
      )}
    </Screen>
  );
}
