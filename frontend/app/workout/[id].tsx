import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { RoutePreview } from '../../src/components/workouts/RoutePreview';
import { PrivateWorkoutImage } from '../../src/components/workouts/PrivateWorkoutImage';
import { AppButton, AppText, Card, ErrorState, Icon, LoadingState, Screen, ScreenHeader, StatCard, workoutIcon } from '../../src/components/ui';
import { confirmDestructive, showError } from '../../src/components/ui/dialogs';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { workoutsApi } from '../../src/services/api';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { deleteWorkout } from '../../src/store/workoutsSlice';
import type { Workout } from '../../src/types';
import { formatDateLong } from '../../src/utils/date';
import { errorMessage, formatDistance, formatDuration } from '../../src/utils/format';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { colors } = useAppTheme();
  const stored = useAppSelector(s => s.workouts.all.find(w => w.id === id));
  const [fetched, setFetched] = useState<Workout | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const workout = stored ?? fetched;

  // Mở trực tiếp bằng deep link khi store chưa có: lấy đúng bản ghi từ GET /workouts/:id.
  useEffect(() => {
    if (stored || !id) return;
    let cancelled = false;
    workoutsApi.get(id).then(w => !cancelled && setFetched(w)).catch(e => !cancelled && setLoadError(errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [id, stored, attempt]);

  const onDelete = () => {
    if (!workout) return;
    confirmDestructive({
      title: 'Xoá buổi tập?',
      message: `"${workout.title}" sẽ bị xoá khỏi nhật ký và không thể khôi phục.`,
      onConfirm: async () => {
        setDeleting(true);
        try {
          await dispatch(deleteWorkout(workout.id)).unwrap();
          router.back();
        } catch (e) {
          showError('Không xoá được', errorMessage(e));
        } finally {
          setDeleting(false);
        }
      }
    });
  };

  const openMap = () => {
    if (!workout?.coords) return;
    const { latitude, longitude } = workout.coords;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`).catch(() => showError('Không mở được bản đồ', 'Thiết bị không có ứng dụng bản đồ phù hợp.'));
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader back title="Chi tiết buổi tập" />
      {!workout && !loadError ? <LoadingState /> : null}
      {loadError ? <ErrorState message={loadError} onRetry={() => { setLoadError(null); setAttempt(a => a + 1); }} /> : null}
      {workout ? (
        <>
          <Card tone="brand" gap="$2">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={workoutIcon[workout.type]} size={26} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText tone="onBrand" size="xl" weight="bold">{workout.title}</AppText>
                <AppText tone="onBrand" size="sm">{workout.type} · {formatDateLong(workout.date)}</AppText>
              </View>
            </View>
          </Card>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard icon="time" value={formatDuration(workout.duration)} label="Thời lượng" />
            <StatCard icon="navigate" value={workout.distance > 0 ? formatDistance(workout.distance) : '—'} label="Quãng đường" />
            <StatCard icon="flame" value={workout.calories !== undefined ? `${workout.calories}` : '—'} label="Calories (kcal)" />
          </View>

          {workout.note ? (
            <Card>
              <AppText weight="bold">Ghi chú</AppText>
              <AppText tone="muted">{workout.note}</AppText>
            </Card>
          ) : null}

          {workout.location ? (
            <Card>
              <AppText weight="bold">Địa điểm</AppText>
              <AppText tone="muted">{workout.location}</AppText>
              {workout.coords ? <AppButton label="Mở bản đồ" icon="map-outline" variant="secondary" size="sm" onPress={openMap} /> : null}
            </Card>
          ) : null}

          {(workout.route && workout.route.length > 1) || (Platform.OS !== 'web' && workout.coords) ? (
            <Card>
              <AppText weight="bold">{workout.route && workout.route.length > 1 ? 'Tuyến đường đã ghi' : 'Vị trí buổi tập'}</AppText>
              <RoutePreview route={workout.route ?? []} currentLocation={workout.coords} />
            </Card>
          ) : null}

          {workout.image ? (
            <Card>
              <AppText weight="bold">Ảnh</AppText>
              {imageFailed ? (
                <AppText tone="muted" size="sm">Không tải được ảnh riêng tư. Kiểm tra kết nối và quyền truy cập.</AppText>
              ) : (
                <PrivateWorkoutImage image={workout.image} label={`Ảnh buổi tập ${workout.title}`} onError={() => setImageFailed(true)} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14, backgroundColor: colors.borderColor }} />
              )}
            </Card>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppButton label="Sửa" icon="create-outline" variant="secondary" fullWidth disabled={deleting} onPress={() => router.push({ pathname: '/workout/form', params: { id: workout.id } })} />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton label="Xoá" icon="trash-outline" variant="danger" fullWidth loading={deleting} onPress={onDelete} />
            </View>
          </View>
        </>
      ) : null}
    </Screen>
  );
}
