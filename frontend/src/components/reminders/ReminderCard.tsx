import { Switch, View } from 'react-native';
import { formatDays } from '../../features/reminders/schedule';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { DeviceStatus } from '../../services/notifications';
import type { Reminder } from '../../types';
import { IconButton } from '../ui/AppButton';
import { AppText, Badge, Card } from '../ui/primitives';

const statusView: Record<DeviceStatus, { label: string; tone: 'neutral' | 'success' | 'danger' | 'warning' } | null> = {
  scheduled: { label: 'Đã lên lịch trên máy', tone: 'success' },
  off: null,
  permission_denied: { label: 'Chưa cấp quyền thông báo', tone: 'warning' },
  unsupported: { label: 'Web không hỗ trợ thông báo', tone: 'warning' },
  error: { label: 'Lỗi khi lên lịch', tone: 'danger' }
};

type Props = { reminder: Reminder; device?: DeviceStatus; busy?: boolean; onToggle: (enabled: boolean) => void; onEdit: () => void; onDelete: () => void };

export function ReminderCard({ reminder, device, busy = false, onToggle, onEdit, onDelete }: Props) {
  const { colors } = useAppTheme();
  const status = reminder.enabled && device ? statusView[device] : null;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText size="hero" weight="bold" tone={reminder.enabled ? 'default' : 'muted'}>{reminder.time}</AppText>
          <AppText weight="semi" numberOfLines={1}>{reminder.title}</AppText>
          <AppText tone="muted" size="xs">{formatDays(reminder.days)}</AppText>
        </View>
        <Switch
          accessibilityLabel={`Bật nhắc ${reminder.title} lúc ${reminder.time}`}
          value={reminder.enabled}
          disabled={busy}
          onValueChange={onToggle}
          trackColor={{ true: colors.brand, false: colors.borderColor }}
          thumbColor="#FFFFFF"
        />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1 }}>{status ? <Badge label={status.label} tone={status.tone} /> : <Badge label={reminder.enabled ? 'Đang kiểm tra...' : 'Đang tắt'} />}</View>
        <IconButton icon="create-outline" label={`Sửa nhắc ${reminder.title}`} onPress={onEdit} />
        <IconButton icon="trash-outline" tone="danger" label={`Xoá nhắc ${reminder.title}`} onPress={onDelete} />
      </View>
    </Card>
  );
}
