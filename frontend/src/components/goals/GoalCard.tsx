import { View } from 'react-native';
import { goalProgress, metricLabel, metricUnit, periodLabel } from '../../features/goals/progress';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { Goal, Workout } from '../../types';
import { formatNumber } from '../../utils/format';
import { IconButton } from '../ui/AppButton';
import { ProgressBar } from '../ui/ProgressBar';
import { AppText, Badge, Card } from '../ui/primitives';

export function goalSubtitle(goal: Goal): string {
  const scope = goal.workoutType === 'all' ? 'mọi hoạt động' : goal.workoutType;
  return `${metricLabel[goal.metric]} · mỗi ${periodLabel[goal.period]} · ${scope}`;
}

type Props = { goal: Goal; workouts: Workout[]; today: string; onEdit?: () => void; onDelete?: () => void };

export function GoalCard({ goal, workouts, today, onEdit, onDelete }: Props) {
  const { colors } = useAppTheme();
  const p = goalProgress(goal, workouts, today);
  const unit = metricUnit[goal.metric];
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText weight="bold" size="lg">{goal.title}</AppText>
          <AppText tone="muted" size="xs">{goalSubtitle(goal)}</AppText>
        </View>
        {onEdit ? <IconButton icon="create-outline" label={`Sửa mục tiêu ${goal.title}`} onPress={onEdit} /> : null}
        {onDelete ? <IconButton icon="trash-outline" tone="danger" label={`Xoá mục tiêu ${goal.title}`} onPress={onDelete} /> : null}
      </View>
      <ProgressBar ratio={p.ratio} color={p.completed ? colors.success : colors.brand} label={`Tiến độ ${goal.title}`} height={10} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText weight="semi">{formatNumber(p.current)} / {formatNumber(p.target)} {unit}</AppText>
        {p.completed ? <Badge label="Đã hoàn thành" tone="success" icon="checkmark-circle" /> : <Badge label={`${p.percent}%`} />}
      </View>
      {!p.completed ? <AppText tone="muted" size="xs">Còn {formatNumber(p.remaining)} {unit} để đạt mục tiêu trong {periodLabel[goal.period]} này.</AppText> : null}
    </Card>
  );
}
