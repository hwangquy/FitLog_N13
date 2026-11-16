
import { View, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useAppTheme } from '../../hooks/useAppTheme';
import type { Workout } from '../../types';
import { formatDate } from '../../utils/date';
import { formatDistance, formatDuration } from '../../utils/format';
import { Icon, workoutIcon } from '../ui/Icon';
import { AppText, Card } from '../ui/primitives';

export function WorkoutCard({
  workout,
  onPress,
  onEdit,
  onDelete,
  index = 0,
}: {
  workout: Workout;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  index?: number;
}) {
  const { colors } = useAppTheme();
  const offset = useSharedValue(0);

  const meta = [
    formatDuration(workout.duration),
    workout.distance > 0
      ? formatDistance(workout.distance)
      : null,
    workout.calories !== undefined
      ? `${workout.calories} kcal`
      : null,
  ].filter(Boolean).join(' · ');

  const pan = Gesture.Pan()
    .enabled(Boolean(onEdit || onDelete))
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      offset.value = Math.max(
        -126,
        Math.min(0, e.translationX)
      );
    })
    .onEnd(() => {
      offset.value = withSpring(
        offset.value < -55 ? -126 : 0,
        { damping: 18, stiffness: 220 }
      );
    });

  // Chạm vào thẻ để mở chi tiết buổi tập.
  const tap = Gesture.Tap()
    .maxDistance(12)
    .onEnd((_event, success) => {
      if (success) {
        runOnJS(onPress)();
      }
    });

  // Một lần chạm hoặc vuốt: chỉ một thao tác thắng.
  const gesture = Gesture.Race(pan, tap);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const close = () => {
    offset.value = withSpring(0);
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(220)}
      style={{ overflow: 'hidden', borderRadius: 16 }}
    >
      {(onEdit || onDelete) && (
        <View
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 126,
            flexDirection: 'row',
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sửa ${workout.title}`}
            onPress={() => {
              close();
              onEdit?.();
            }}
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#306C90',
            }}
          >
            <Icon name="create-outline" size={21} color="#FFF" />
            <AppText size="xs" style={{ color: '#FFF' }}>
              Sửa
            </AppText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xóa ${workout.title}`}
            onPress={() => {
              close();
              onDelete?.();
            }}
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#B74343',
            }}
          >
            <Icon name="trash-outline" size={21} color="#FFF" />
            <AppText size="xs" style={{ color: '#FFF' }}>
              Xóa
            </AppText>
          </Pressable>
        </View>
      )}

      <GestureDetector gesture={gesture}>
        <Animated.View
          style={animated}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Xem chi tiết ${workout.title}`}
          accessibilityActions={[{ name: 'activate' }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'activate') {
              onPress();
            }
          }}
        >
          <Card
            flexDirection="row"
            alignItems="center"
            gap="$3"
            padding="$3"
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: colors.brandSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon
                name={workoutIcon[workout.type]}
                size={24}
                color={colors.brand}
              />
            </View>

            <View style={{ flex: 1, gap: 2 }}>
              <AppText weight="bold" numberOfLines={1}>
                {workout.title}
              </AppText>

              <AppText tone="muted" size="xs">
                {workout.type} · {formatDate(workout.date)}
              </AppText>

              <AppText tone="muted" size="sm" numberOfLines={1}>
                {meta}
              </AppText>
            </View>

            <Icon
              name="chevron-forward"
              size={18}
              color={colors.muted}
            />
          </Card>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
