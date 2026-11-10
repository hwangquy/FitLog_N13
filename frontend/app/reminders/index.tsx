import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { ReminderCard } from '../../src/components/reminders/ReminderCard';
import { AppText, Card, EmptyState, ErrorState, IconButton, LoadingState, Screen, ScreenHeader } from '../../src/components/ui';
import { confirmDestructive, offerOpenSettings, showError } from '../../src/components/ui/dialogs';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { ensureNotificationPermission } from '../../src/services/notifications';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { deleteReminder, fetchReminders, setReminderEnabled } from '../../src/store/remindersSlice';
import type { Reminder } from '../../src/types';
import { errorMessage } from '../../src/utils/format';

export default function RemindersScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useAppTheme();
  const { items, status, error, device } = useAppSelector(s => s.reminders);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(() => void dispatch(fetchReminders()), [dispatch]);

  const onToggle = async (r: Reminder, enabled: boolean) => {
    if (enabled) {
      const permission = await ensureNotificationPermission();
      if (permission === 'denied') {
        offerOpenSettings('Chưa có quyền thông báo', 'Hãy bật quyền thông báo cho FitLog trong cài đặt để nhận nhắc lịch tập.');
        return; // không đổi trạng thái khi không thể lên lịch thật
      }
    }
    setBusyId(r.id);
    try {
      await dispatch(setReminderEnabled({ id: r.id, enabled })).unwrap();
    } catch (e) {
      showError('Không cập nhật được nhắc nhở', errorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = (r: Reminder) =>
    confirmDestructive({
      title: 'Xoá nhắc nhở?',
      message: `Nhắc "${r.title}" lúc ${r.time} sẽ bị xoá và thông báo trên máy cũng bị huỷ.`,
      onConfirm: async () => {
        setBusyId(r.id);
        try {
          await dispatch(deleteReminder(r.id)).unwrap();
        } catch (e) {
          showError('Không xoá được', errorMessage(e));
        } finally {
          setBusyId(null);
        }
      }
    });

  const header = (
    <>
      <ScreenHeader back title="Nhắc lịch tập" subtitle="Thông báo được lên lịch ngay trên thiết bị" right={<IconButton icon="add" tone="brand" label="Thêm nhắc nhở" onPress={() => router.push('/reminders/form')} />} />
      <Card tone="soft">
        <AppText size="sm" tone="muted">Nhắc nhở lưu trên máy chủ, còn thông báo chỉ hoạt động trên máy bạn đã cấp quyền. Huy hiệu dưới mỗi nhắc nhở cho biết trạng thái thật.</AppText>
      </Card>
    </>
  );

  return (
    <Screen scroll={false} padded={false} edges={['top', 'bottom']}>
      <FlatList
        data={items}
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 12, flexGrow: 1 }}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={status === 'loading' && items.length > 0} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        renderItem={({ item }) => (
          <ReminderCard
            reminder={item}
            device={device[item.id]}
            busy={busyId === item.id}
            onToggle={enabled => void onToggle(item, enabled)}
            onEdit={() => router.push({ pathname: '/reminders/form', params: { id: item.id } })}
            onDelete={() => onDelete(item)}
          />
        )}
        ListEmptyComponent={
          status === 'loading' || status === 'idle' ? (
            <LoadingState />
          ) : status === 'failed' ? (
            <ErrorState message={error ?? 'Không kết nối được máy chủ.'} onRetry={refresh} />
          ) : (
            <EmptyState icon="alarm-outline" title="Chưa có nhắc nhở" message="Đặt giờ để FitLog nhắc bạn tập mỗi ngày." actionLabel="Thêm nhắc nhở" onAction={() => router.push('/reminders/form')} />
          )
        }
      />
    </Screen>
  );
}
