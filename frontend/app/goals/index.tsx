import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { GoalCard } from '../../src/components/goals/GoalCard';
import { EmptyState, ErrorState, IconButton, LoadingState, Screen, ScreenHeader } from '../../src/components/ui';
import { confirmDestructive, showError } from '../../src/components/ui/dialogs';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useToday } from '../../src/hooks/useToday';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { deleteGoal, fetchGoals } from '../../src/store/goalsSlice';
import { fetchAllWorkouts } from '../../src/store/workoutsSlice';
import type { Goal } from '../../src/types';
import { errorMessage } from '../../src/utils/format';

export default function GoalsScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useAppTheme();
  const today = useToday();
  const { items, status, error } = useAppSelector(s => s.goals);
  const workouts = useAppSelector(s => s.workouts.all);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void dispatch(fetchGoals());
    void dispatch(fetchAllWorkouts());
  }, [dispatch]);

  const onDelete = (g: Goal) =>
    confirmDestructive({
      title: 'Xoá mục tiêu?',
      message: `Mục tiêu "${g.title}" sẽ bị xoá. Các buổi tập của bạn không bị ảnh hưởng.`,
      onConfirm: async () => {
        setDeletingId(g.id);
        try {
          await dispatch(deleteGoal(g.id)).unwrap();
        } catch (e) {
          showError('Không xoá được', errorMessage(e));
        } finally {
          setDeletingId(null);
        }
      }
    });

  const header = (
    <ScreenHeader back title="Mục tiêu" subtitle="Tiến độ tính từ các buổi tập thật" right={<IconButton icon="add" tone="brand" label="Thêm mục tiêu" onPress={() => router.push('/goals/form')} />} />
  );

  return (
    <Screen scroll={false} padded={false} edges={['top', 'bottom']}>
      <FlatList
        data={items.filter(g => g.id !== deletingId)}
        keyExtractor={g => g.id}
        contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 12, flexGrow: 1 }}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={status === 'loading' && items.length > 0} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        renderItem={({ item }) => (
          <GoalCard goal={item} workouts={workouts} today={today} onEdit={() => router.push({ pathname: '/goals/form', params: { id: item.id } })} onDelete={() => onDelete(item)} />
        )}
        ListEmptyComponent={
          status === 'loading' || status === 'idle' ? (
            <LoadingState />
          ) : status === 'failed' ? (
            <ErrorState message={error ?? 'Không kết nối được máy chủ.'} onRetry={refresh} />
          ) : (
            <EmptyState icon="flag-outline" title="Chưa có mục tiêu" message="Ví dụ: 5 buổi mỗi tuần hoặc 20 km mỗi tháng." actionLabel="Tạo mục tiêu" onAction={() => router.push('/goals/form')} />
          )
        }
      />
    </Screen>
  );
}
