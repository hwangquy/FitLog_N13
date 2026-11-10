import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { GoalCard } from '../../src/components/goals/GoalCard';
import { AppButton, AppText, Card, EmptyState, ErrorState, Icon, IconButton, LoadingState, Screen, ScreenHeader, SectionTitle, StatCard } from '../../src/components/ui';
import { WorkoutCard } from '../../src/components/workouts/WorkoutCard';
import { analyzeHistory, todaySuggestion } from '../../src/features/coach/rules';
import { summarize } from '../../src/features/stats/stats';
import { calculateStreak } from '../../src/features/stats/streak';
import { getJson, setJson } from '../../src/services/storage';
import { useEffect } from 'react';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useToday } from '../../src/hooks/useToday';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { fetchGoals } from '../../src/store/goalsSlice';
import { fetchReminders } from '../../src/store/remindersSlice';
import { fetchAllWorkouts } from '../../src/store/workoutsSlice';
import { endOfWeek, formatDateLong, startOfWeek } from '../../src/utils/date';
import { formatDistance, formatDuration } from '../../src/utils/format';

export default function DashboardScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useAppTheme();
  const today = useToday();
  const all = useAppSelector(s => s.workouts.all);
  const allStatus = useAppSelector(s => s.workouts.allStatus);
  const allError = useAppSelector(s => s.workouts.allError);
  const goals = useAppSelector(s => s.goals.items);
  const goalsStatus = useAppSelector(s => s.goals.status);

  const refresh = useCallback(() => {
    void dispatch(fetchAllWorkouts());
    void dispatch(fetchGoals());
    void dispatch(fetchReminders());
  }, [dispatch]);

  useEffect(() => {
    let active=true;
    getJson<boolean>('@fitlog/onboarded-v2', false).then(done=>{
      if(active&&!done)router.push('/onboarding');
    }).catch(()=>{});
    return ()=>{active=false;};
  }, []);
  const week = useMemo(() => summarize(all, startOfWeek(today), endOfWeek(today)), [all, today]);
  const analysis = useMemo(() => analyzeHistory(all, today), [all, today]);
  const recent = all.slice(0, 3);
  const loadingFirst = allStatus === 'loading' && all.length === 0;
  const failedFirst = allStatus === 'failed' && all.length === 0;

  return (
    <Screen onRefresh={refresh} refreshing={allStatus === 'loading' && all.length > 0}>
      <ScreenHeader
        eyebrow={formatDateLong(today)}
        title="Chào bạn"
        subtitle="Hôm nay bạn muốn vận động thế nào?"
        right={<IconButton icon="notifications-outline" label="Nhắc lịch tập" onPress={() => router.push('/reminders')} />}
      />
      <AppButton label="Ghi buổi tập" icon="add-circle" variant="lime" fullWidth onPress={() => router.push('/workout/form')} />
      <AppButton label="Xem lịch tập tuần" icon="calendar-outline" variant="secondary" fullWidth onPress={() => router.push('/planner')} />

      {loadingFirst ? <LoadingState /> : null}
      {failedFirst ? <ErrorState message={allError ?? 'Không kết nối được máy chủ.'} onRetry={refresh} /> : null}

      {!loadingFirst && !failedFirst ? (
        <>
          <SectionTitle title="Mục tiêu hiện tại" action={<AppButton label="Quản lý" variant="ghost" size="sm" onPress={() => router.push('/goals')} />} />
          {goals[0] ? (
            <GoalCard goal={goals[0]} workouts={all} today={today} />
          ) : (
            <Card>
              <AppText weight="semi">{goalsStatus === 'failed' ? 'Không tải được mục tiêu.' : 'Chưa có mục tiêu nào.'}</AppText>
              <AppText tone="muted" size="sm">Đặt mục tiêu để theo dõi tiến độ dựa trên các buổi tập thật của bạn.</AppText>
              <AppButton label="Tạo mục tiêu" icon="flag" variant="secondary" onPress={() => router.push('/goals/form')} />
            </Card>
          )}

          <Card>
            <AppText weight="bold">🔥 {calculateStreak(all,today)} ngày luyện tập liên tiếp</AppText>
            <AppText tone="muted" size="xs">Tính từ những buổi đã ghi thực tế, không tính lịch dự kiến.</AppText>
          </Card>
          <SectionTitle title="Tuần này" subtitle="Từ Thứ Hai đến Chủ nhật" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard icon="flame" value={String(week.sessions)} label="Buổi tập" />
            <StatCard icon="time" value={formatDuration(week.minutes)} label="Thời gian" />
            <StatCard icon="navigate" value={formatDistance(week.distance)} label="Quãng đường" />
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel="Mở AI Coach" onPress={() => router.push('/coach')}>
            <Card tone="soft" flexDirection="row" alignItems="center" gap="$3">
              <Icon name="bulb-outline" size={24} color={colors.brand} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText weight="semi">Gợi ý hôm nay</AppText>
                <AppText tone="muted" size="sm">{todaySuggestion(analysis)}</AppText>
              </View>
              <Icon name="chevron-forward" size={18} color={colors.muted} />
            </Card>
          </Pressable>

          <SectionTitle title="Buổi tập gần đây" action={<AppButton label="Xem tất cả" variant="ghost" size="sm" onPress={() => router.push('/workouts')} />} />
          {recent.length === 0 ? (
            <EmptyState icon="barbell-outline" title="Chưa có buổi tập" message="Ghi buổi tập đầu tiên để xem thống kê tại đây." actionLabel="Ghi buổi tập" onAction={() => router.push('/workout/form')} />
          ) : (
            <View style={{ gap: 10 }}>
              {recent.map((w, i) => (
                <WorkoutCard key={w.id} workout={w} index={i} onPress={() => router.push({ pathname: '/workout/[id]', params: { id: w.id } })} />
              ))}
            </View>
          )}
        </>
      ) : null}
    </Screen>
  );
}
