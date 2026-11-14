import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton, AppText, Chip } from '../ui';
import { useAppTheme } from '../../hooks/useAppTheme';
import { addDays } from '../../utils/date';
import { useToday } from '../../hooks/useToday';
import { plannerApi } from '../../services/api';
import type { PlanBatchChoice, PlanBatchPreview } from '../../services/api';
import type { WorkoutPlanInput } from '../../types';
import { errorMessage } from '../../utils/format';

type Row = {
  originalDate: string;
  plan: WorkoutPlanInput;
  decision: 'CREATE' | 'KEEP' | 'REPLACE';
  chosen: boolean;
  moving: boolean;
};

type Props = {
  visible: boolean;
  items: WorkoutPlanInput[];
  source: string;
  onClose: () => void;
  onApply: (choices: PlanBatchChoice[]) => Promise<void>;
  /** For rendering inside the already-open AI chat modal on iOS. */
  inline?: boolean;
};

const readableDate = (day: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : day;
};

export function PlanConflictResolver({ visible, items, source, onClose, onApply, inline = false }: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const [rows, setRows] = useState<Row[]>([]);
  const [preview, setPreview] = useState<PlanBatchPreview | null>(null);
  const [previewKey, setPreviewKey] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const sourceKey = JSON.stringify(items);
  const dateKey = rows.map(r => r.plan.date).join('|');

  useEffect(() => {
    if (!visible) return;
    setRows(items.map(p => ({ originalDate: p.date, plan: { ...p }, decision: 'CREATE', chosen: false, moving: false })));
    setPreview(null); setPreviewKey(''); setError('');
  }, [visible, sourceKey]);

  useEffect(() => {
    if (!visible || rows.length !== items.length || !rows.length) return;
    let active = true;
    setChecking(true); setError(''); setPreview(null);
    const proposed = rows.map(r => r.plan);
    void plannerApi.previewBatch(proposed).then(result => {
      if (!active) return;
      setPreview(result); setPreviewKey(dateKey);
    }).catch(e => {
      if (!active) return;
      setError(errorMessage(e));
    }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [visible, dateKey, sourceKey, items.length]);

  const select = (index: number, action: 'KEEP' | 'REPLACE' | 'MOVE') => {
    setRows(old => old.map((r, i) => i !== index ? r : action === 'MOVE'
      ? { ...r, decision: 'CREATE', chosen: false, moving: true }
      : { ...r, decision: action, chosen: true, moving: false }));
  };
  const moveDate = (index: number, date: string) => {
    setRows(old => old.map((r, i) => i !== index ? r : {
      ...r, plan: { ...r.plan, date }, decision: 'CREATE', chosen: false, moving: true
    }));
  };
  const ready = useMemo(() => {
    if (checking || !preview || previewKey !== dateKey || preview.rows.length !== rows.length) return false;
    return rows.every((r, i) => {
      const existing = preview.rows[i].existing;
      if (existing.length > 1) return false;
      if (r.moving && r.plan.date === r.originalDate) return false;
      if (existing.length) return r.chosen && (r.decision === 'KEEP' || r.decision === 'REPLACE');
      return r.decision === 'CREATE';
    });
  }, [checking, preview, previewKey, dateKey, rows]);

  const submit = async () => {
    if (!ready || !preview || saving) return;
    const choices: PlanBatchChoice[] = rows.map((r, i) => ({
      plan: r.plan,
      decision: preview.rows[i].existing.length ? r.decision : 'CREATE',
      expectedExistingId: preview.rows[i].existing[0]?.id,
    }));
    setSaving(true); setError('');
    try {
      await onApply(choices);
      onClose();
    } catch (e) {
      setError(`${errorMessage(e)}. Hãy xem lại lịch hiện tại rồi thử lại.`);
      setPreview(null); setPreviewKey('');
      try {
        const fresh = await plannerApi.previewBatch(rows.map(r => r.plan));
        setPreview(fresh); setPreviewKey(dateKey);
      } catch { /* retain actionable error */ }
    } finally { setSaving(false); }
  };

  if (!visible) return null;
  const content = (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, gap: 12 }}>
      <AppText size="lg" weight="bold">Xem trước lịch tập</AppText>
      <AppText tone="muted" size="sm">Nguồn: {source}. FitLog sẽ không sửa lịch của bạn khi chưa xác nhận.</AppText>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
        {rows.map((r, i) => {
          const existing = preview?.rows[i]?.existing ?? [];
          return (
            <View key={i} style={{ borderWidth: 1, borderColor: colors.borderColor, borderRadius: 14, padding: 12, gap: 9 }}>
              <AppText weight="bold">{readableDate(r.plan.date)} · {r.plan.title}</AppText>
              <AppText tone="muted" size="sm">{r.plan.type} · {r.plan.minutes} phút · {r.plan.intensity}</AppText>
              {checking ? <AppText tone="muted" size="xs">Đang kiểm tra lịch trong Planner...</AppText> :
                !preview ? <AppText tone="muted" size="xs">Chưa kiểm tra được ngày này. Chọn ngày khác nếu đang trùng.</AppText> :
                existing.length === 0 ? <AppText tone="success" size="sm">Ngày này chưa có lịch tập đang chờ.</AppText> :
                <View style={{ padding: 10, borderRadius: 10, backgroundColor: colors.brandSoft, gap: 6 }}>
                  <AppText weight="semi">Đã có {existing.length} buổi tập ngày này</AppText>
                  {existing.map(p => <AppText key={p.id} size="sm">• {p.title} · {p.minutes} phút</AppText>)}
                  {existing.length === 1 ? <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    <Chip label="Giữ lịch cũ" selected={r.chosen && r.decision === 'KEEP'} onPress={() => select(i, 'KEEP')} />
                    <Chip label="Thay thế lịch cũ" selected={r.chosen && r.decision === 'REPLACE'} onPress={() => select(i, 'REPLACE')} />
                  </View> : <AppText tone="danger" size="sm">Nhiều lịch đang chờ cùng ngày. Hãy xử lý riêng trong Planner.</AppText>}
                </View>}
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Chip label="Chọn ngày khác" selected={r.moving} onPress={() => select(i, 'MOVE')} />
              </View>
              {r.moving ? <View style={{ gap: 7 }}>
                <AppText size="sm" weight="semi">Chọn ngày mới (hôm nay đến 28 ngày tới)</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingVertical: 5 }}>
                  {Array.from({ length: 29 }, (_, offset) => addDays(today, offset)).map(date => (
                    <Chip key={date} label={readableDate(date)} selected={date === r.plan.date}
                      onPress={() => moveDate(i, date)} />
                  ))}
                </ScrollView>
              </View> : null}
              {r.moving && r.plan.date === r.originalDate ?
                <AppText size="xs" tone="danger">Bạn cần chọn một ngày khác ngày ban đầu.</AppText> : null}
            </View>
          );
        })}
        {error ? <AppText tone="danger" size="sm">{error}</AppText> : null}
        {preview && !checking ? <AppText tone="muted" size="sm">
          Phát hiện {preview.conflictDays} ngày trùng lịch. Chọn cách xử lý cho từng ngày, hoặc giữ nguyên các ngày không trùng.
        </AppText> : null}
      </ScrollView>
      {checking ? <ActivityIndicator color={colors.brand} /> : null}
      <View style={{ gap: 8 }}>
        <AppButton label="Xác nhận áp dụng vào Planner" icon="checkmark-circle-outline"
          loading={saving} disabled={!ready || saving} onPress={() => void submit()} />
        <AppButton label="Hủy, không thay đổi lịch" variant="secondary" disabled={saving} onPress={onClose} />
      </View>
    </View>
  );

  if (inline) return content;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: colors.background }}>
        {content}
      </View>
    </Modal>
  );
}
