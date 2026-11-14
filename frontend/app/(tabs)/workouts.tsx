import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { AppButton, AppInput, AppText, Chip, EmptyState, ErrorState, IconButton, LoadingState, Screen, ScreenHeader } from '../../src/components/ui';
import { WorkoutCard } from '../../src/components/workouts/WorkoutCard';
import { confirmDestructive } from '../../src/components/ui/dialogs';
import { showError } from '../../src/components/ui/dialogs';
import { errorMessage } from '../../src/utils/format';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useDebounce } from '../../src/hooks/useDebounce';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { deleteWorkout, fetchAllWorkouts, fetchWorkoutPage, setListFilters } from '../../src/store/workoutsSlice';
import type { WorkoutFilter } from '../../src/store/workoutsSlice';
import { workoutTypes } from '../../src/types';

const FILTERS: WorkoutFilter[] = ['all', ...workoutTypes];

export default function WorkoutsScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useAppTheme();
  const list = useAppSelector(s => s.workouts.list);
  const [text, setText] = useState('');
  const [type, setType] = useState<WorkoutFilter>('all');
  const debounced = useDebounce(text, 400);

  // Tìm kiếm (đã debounce) và lọc chạy ở Spring Boot (?q=, ?type=).
  useEffect(() => {
    dispatch(setListFilters({ query: debounced.trim(), type }));
    void dispatch(fetchWorkoutPage({ reset: true }));
  }, [debounced, type, dispatch]);

  const loadMore = useCallback(() => {
    if (list.status === 'succeeded' && list.hasMore) void dispatch(fetchWorkoutPage({ reset: false }));
  }, [dispatch, list.status, list.hasMore]);

  const refresh = useCallback(() => {
    void dispatch(fetchWorkoutPage({ reset: true, refreshing: true }));
    void dispatch(fetchAllWorkouts());
  }, [dispatch]);

  const filtering = debounced.trim() !== '' || type !== 'all';
  const header = (
    <View style={{ gap: 14, paddingBottom: 8 }}>
      <ScreenHeader
        eyebrow="Nhật ký"
        title="Buổi tập"
        subtitle={list.total !== null ? `${list.total} buổi${filtering ? ' phù hợp' : ''}` : undefined}
        right={<IconButton icon="add" tone="brand" label="Thêm buổi tập" onPress={() => router.push('/workout/form')} />}
      />
      <AppInput label="Tìm kiếm" value={text} onChangeText={setText} placeholder="Tên, ghi chú, địa điểm..." returnKeyType="search" autoCorrect={false} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
        {FILTERS.map(f => (
          <Chip key={f} label={f === 'all' ? 'Tất cả' : f} selected={type === f} onPress={() => setType(f)} />
        ))}
      </ScrollView>
    </View>
  );

  const loading = list.status === 'loading';
  const failedEmpty = list.status === 'failed' && list.items.length === 0;

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={list.items}
        keyExtractor={w => w.id}
        contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 10, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={header}
        renderItem={({ item, index }) => <WorkoutCard workout={item} index={index}
          onPress={() => router.push({ pathname: '/workout/[id]', params: { id: item.id } })}
          onEdit={() => router.push({ pathname: '/workout/form', params: { id: item.id } })}
          onDelete={() => confirmDestructive({ title: 'Xóa buổi tập', message: `Xóa ${item.title}?`, onConfirm: () => {
            void dispatch(deleteWorkout(item.id)).unwrap().catch(e => showError('Không xóa được', errorMessage(e)));
          } })} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={list.status === 'refreshing'} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        ListEmptyComponent={
          loading ? (
            <LoadingState />
          ) : failedEmpty ? (
            <ErrorState message={list.error ?? 'Không kết nối được máy chủ.'} onRetry={refresh} />
          ) : (
            <EmptyState
              icon={filtering ? 'search-outline' : 'barbell-outline'}
              title={filtering ? 'Không tìm thấy buổi tập' : 'Chưa có buổi tập nào'}
              message={filtering ? 'Thử đổi từ khoá hoặc bộ lọc.' : 'Bắt đầu bằng việc ghi buổi tập đầu tiên.'}
              actionLabel={filtering ? undefined : 'Ghi buổi tập'}
              onAction={filtering ? undefined : () => router.push('/workout/form')}
            />
          )
        }
       
ListFooterComponent={
  list.status === 'loadingMore' ? (
    <ActivityIndicator
      style={{ marginTop: 12 }}
      color={colors.brand}
    />
  ) : list.status === 'failed' && list.items.length > 0 ? (
    <View
      style={{
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
      }}
    >
      <AppText tone="danger" size="sm">
        {list.error}
      </AppText>

      <AppButton
        label="Tải lại"
        variant="secondary"
        size="sm"
        icon="refresh"
        onPress={() =>
          void dispatch(fetchWorkoutPage({ reset: false }))
        }
      />
    </View>
  ) : undefined
}

      />
    </Screen>
  );
}
