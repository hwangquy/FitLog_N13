import { useCallback, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppButton, AppText, Badge, Card, Chip, ErrorState, LoadingState, Screen, ScreenHeader, SectionTitle } from '../../src/components/ui';
import { coachGoalLabel, coachLevelLabel, analyzeHistory, buildPlan, buildAiPayload } from '../../src/features/coach/rules';
import type { CoachGoal, CoachLevel, AiPlan, PlanItem } from '../../src/features/coach/rules';
import { coachChatApi } from '../../src/services/coachChat';
import { PlanConflictResolver } from '../../src/components/coach/PlanConflictResolver';
import type { PlanBatchChoice } from '../../src/services/api';
import type { CoachDashboard, CoachProfile } from '../../src/services/coachChat';
import { workoutsApi, plannerApi } from '../../src/services/api';
import { requestAiPlan } from '../../src/services/ai';
import type { Workout, WorkoutPlanInput, WorkoutType } from '../../src/types';
import { useToday } from '../../src/hooks/useToday';
import { addDays } from '../../src/utils/date';
import { showError } from '../../src/components/ui/dialogs';
import { showConfirmDialog } from '../../src/utils/alert';
import { errorMessage } from '../../src/utils/format';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useCoachChatLauncher } from '../../src/components/coach/CoachChatLauncher';

type AiResult = { status: 'idle' | 'loading' | 'done' | 'error'; plan?: AiPlan; error?: string };
const sessionChoices = [1, 2, 3, 4, 5];
const durationChoices = [20, 30, 40, 45, 60, 90];

const formatDiff = (difference: number) =>
  difference > 0 ? `+${difference}` : String(difference);

function WeeklyBars({ previous, current }: { previous: number; current: number }) {
  const { colors } = useAppTheme();
  const max = Math.max(1, previous, current);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', height: 160, gap: 36, paddingTop: 8 }}>
      {([['Tuần trước đó', previous, colors.muted], ['7 ngày gần đây', current, colors.brand]] as const).map(([label, value, color]) => (
        <View key={label} style={{ width: 130, alignItems: 'center', gap: 5 }}>
          <AppText weight="semi" size="sm">{value} buổi</AppText>
          <View style={{ height: 112, justifyContent: 'flex-end', width: 62, backgroundColor: colors.brandSoft,
            borderRadius: 10, overflow: 'hidden' }}>
            <View style={{ height: Math.max(value === 0 ? 0 : 5, 112 * value / max), backgroundColor: color, borderRadius: 10 }} />
          </View>
          <AppText size="xs" tone="muted">{label}</AppText>
        </View>
      ))}
    </View>
  );
}

export default function PlanScreen() {
  const { colors } = useAppTheme();
  const { openChat } = useCoachChatLauncher();
  const today = useToday();
  const [dashboard, setDashboard] = useState<CoachDashboard | null>(null);
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fatigue, setFatigue] = useState(2);
  const [soreness, setSoreness] = useState(1);
  const [notice, setNotice] = useState('');
  const [rulePreview, setRulePreview] = useState(false);
  const [ai, setAi] = useState<AiResult>({ status: 'idle' });
  const [aiPreview, setAiPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [proposal, setProposal] = useState<{ items: WorkoutPlanInput[]; source: string } | null>(null);

  const refresh = useCallback(async (updateProfile = true) => {
    const [state, all] = await Promise.all([coachChatApi.dashboard(), workoutsApi.all()]);
    setDashboard(state);
    if (updateProfile) {
      setProfile(state.profile);
      setFatigue(state.latestCheckin?.fatigue ?? 2);
      setSoreness(state.latestCheckin?.soreness ?? 1);
    }
    setWorkouts(all);
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void Promise.all([coachChatApi.dashboard(), workoutsApi.all()]).then(([state, all]) => {
      if (!active) return;
      setDashboard(state);
      setProfile(state.profile);
      setWorkouts(all);
      setFatigue(state.latestCheckin?.fatigue ?? 2);
      setSoreness(state.latestCheckin?.soreness ?? 1);
      setRulePreview(false);
      setAi({ status: 'idle' });
      setLoading(false);
    }).catch(e => {
      if (!active) return;
      setError(errorMessage(e));
      setLoading(false);
    });
    return () => { active = false; };
  }, []));

  const analysis = useMemo(() => analyzeHistory(workouts, today), [workouts, today]);
  const prefs = profile ? { goal: profile.goal, level: profile.level, daysPerWeek: profile.daysPerWeek } : null;
  const rules = useMemo(() => {
    if (!prefs || !profile) return [];
    const checkin = dashboard?.latestCheckin;
    const checkinToday = !!checkin && new Date(checkin.createdAt).toDateString() === new Date().toDateString();
    const needsRecovery = checkinToday && (checkin!.fatigue >= 4 || checkin!.soreness >= 4);
    return buildPlan(analysis, prefs).map(item => needsRecovery ? ({
      ...item, type: 'Đi bộ' as const, title: 'Đi bộ / giãn cơ phục hồi',
      minutes: Math.min(20, profile.minutesPerSession), intensity: 'nhẹ' as const,
      note: 'Tình trạng hôm nay cho thấy bạn cần giảm cường độ và ưu tiên phục hồi.',
    }) : ({ ...item, minutes: Math.min(item.minutes, profile.minutesPerSession) }));
  }, [analysis, profile, dashboard?.latestCheckin]);

  const saveProfile = async () => {
    if (!profile || saving) return;
    if (profile.daysPerWeek < 1 || profile.daysPerWeek > 5 || profile.minutesPerSession < 15 || profile.minutesPerSession > 90 || !profile.equipment.trim()) {
      showError('Thông tin chưa hợp lệ', 'Số buổi từ 1–5, thời lượng 15–90 phút và dụng cụ không được để trống.');
      return;
    }
    setSaving(true);
    try {
      const saved = await coachChatApi.updateProfile(profile);
      setProfile(saved);
      await refresh(false);
      setRulePreview(false);
      setAi({ status: 'idle' });
      setNotice('Đã cập nhật mục tiêu. Các đề xuất tiếp theo sẽ sử dụng thông tin mới.');
    } catch (e) { showError('Không lưu được hồ sơ', errorMessage(e)); }
    finally { setSaving(false); }
  };

  const saveCheckin = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await coachChatApi.checkin(fatigue, soreness);
      await refresh(false);
      setNotice('Đã ghi nhận tình trạng hôm nay! FitLog AI sẽ dùng thông tin này khi tư vấn.');
    } catch (e) { showError('Không ghi nhận được tình trạng', errorMessage(e)); }
    finally { setSaving(false); }
  };

  const requestAi = async () => {
    if (!profile || applying || saving || ai.status === 'loading') return;
    const invoke = async () => {
      setAi({ status: 'loading' });
      setAiPreview(false);
      try {
        const result = await requestAiPlan(buildAiPayload(workouts, {
          goal: profile.goal, level: profile.level, daysPerWeek: profile.daysPerWeek,
        }, today));
        setAi({ status: 'done', plan: result });
        setAiPreview(true);
      } catch (e) { setAi({ status: 'error', error: errorMessage(e) }); }
    };
    if (dashboard?.profile.consentEnabled) { await invoke(); return; }
    showConfirmDialog(
      'Cho phép Gemini tư vấn?',
      'FitLog sẽ gửi mục tiêu, thống kê luyện tập và tình trạng thể lực của bạn tới Gemini. Bạn có thể rút lại quyền đồng ý trong AI Chatbox.',
      () => { void coachChatApi.setConsent(true).then(() => refresh(false)).then(invoke)
        .catch(e => showError('Không thể bật AI', errorMessage(e))); },
      'Đồng ý', 'Hủy'
    );
  };

  const applyToPlanner = (items: { title: string; minutes: number; notes: string; type?: WorkoutType; intensity?: 'nhẹ' | 'vừa' }[], source: 'quy tắc' | 'AI') => {
    if (!items.length || applying) return;
    const inputs: WorkoutPlanInput[] = items.map((item, i) => {
      const type: WorkoutType = item.type ?? (
        /yoga|giãn cơ/i.test(item.title) ? 'Yoga' :
        /gym|sức mạnh|tạ/i.test(item.title) ? 'Gym' :
        /đạp xe/i.test(item.title) ? 'Đạp xe' :
        /chạy/i.test(item.title) ? 'Chạy bộ' : 'Đi bộ'
      );
      return { date: addDays(today, 1 + Math.floor(i * 7 / items.length)),
        title: item.title, type, minutes: item.minutes,
        intensity: item.intensity ?? 'nhẹ', note: item.notes };
    });
    setProposal({ items: inputs, source: source === 'AI' ? 'Gemini AI' : 'Gợi ý theo quy tắc' });
  };

  const confirmProposal = async (choices: PlanBatchChoice[]) => {
    setApplying(true);
    try {
      const result = await plannerApi.resolveBatch(choices);
      setNotice(`Đã tạo ${result.created} buổi, thay thế ${result.replaced} buổi và giữ nguyên ${result.kept} buổi.`);
      setRulePreview(false); setAiPreview(false);
      router.push('/planner');
    } finally { setApplying(false); }
  };

  if (loading) return <Screen><LoadingState message="Đang tải kế hoạch từ FitLog..." /></Screen>;
  if (error || !dashboard || !profile) return (
    <Screen><ErrorState message={error ?? 'Không tải được dữ liệu Kế hoạch.'} onRetry={() => {
      setLoading(true); setError(null);
      void refresh().catch(e => setError(errorMessage(e))).finally(() => setLoading(false));
    }} /></Screen>
  );

  const current = dashboard.last7Days.sessions;
  const previous = dashboard.previous7Days.sessions;
  const difference = current - previous;
  const completion = Math.min(100, Math.round(100 * current / Math.max(1, profile.daysPerWeek)));
  const latest = dashboard.latestCheckin;
  const todayCheckin = latest && new Date(latest.createdAt).toDateString() === new Date().toDateString();
  const whyRule = todayCheckin && (latest.fatigue >= 4 || latest.soreness >= 4)
    ? `Hôm nay bạn báo mức mệt ${latest.fatigue}/5 và đau cơ ${latest.soreness}/5; lịch quy tắc được giảm về vận động phục hồi nhẹ.`
    : !analysis.hasData
      ? 'Bạn chưa có lịch sử tập. Đây là gợi ý khởi đầu nhẹ nhàng theo mục tiêu đã chọn.'
      : `7 ngày gần đây bạn tập ${current} buổi (${dashboard.last7Days.minutes} phút), thường tập ${analysis.favoriteTypes.join(', ') || 'các bài cơ bản'}; lịch được sắp xen kẽ để có thời gian nghỉ.`;
  const review = difference > 0 ? `Bạn tập nhiều hơn 7 ngày trước đó ${difference} buổi.` :
    difference < 0 ? `Bạn tập ít hơn 7 ngày trước đó ${Math.abs(difference)} buổi.` :
      'Số buổi tập của bạn đang giữ ổn định so với 7 ngày trước đó.';

  return (
    <Screen>
      <ScreenHeader eyebrow="LUYỆN TẬP CÁ NHÂN" title="Kế hoạch" subtitle="Quản lý mục tiêu, theo dõi tiến độ và duyệt lịch tập" />

      <Card>
        <SectionTitle title="1. Mục tiêu & hồ sơ" action={<Badge label="Lưu trong FitLog" icon="person-outline" />} />
        <AppText weight="semi" size="sm">Mục tiêu</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(Object.keys(coachGoalLabel) as CoachGoal[]).map(goal => (
            <Chip key={goal} label={coachGoalLabel[goal]} selected={profile.goal === goal}
              onPress={() => setProfile(p => p && ({ ...p, goal }))} />
          ))}
        </View>
        <AppText weight="semi" size="sm">Số buổi mỗi tuần</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {sessionChoices.map(days => <Chip key={days} label={`${days}`} selected={profile.daysPerWeek === days}
            onPress={() => setProfile(p => p && ({ ...p, daysPerWeek: days }))} />)}
        </View>
        <AppText weight="semi" size="sm">Trình độ</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(Object.keys(coachLevelLabel) as CoachLevel[]).map(level => (
            <Chip key={level} label={coachLevelLabel[level]} selected={profile.level === level}
              onPress={() => setProfile(p => p && ({ ...p, level }))} />
          ))}
        </View>
        <AppText weight="semi" size="sm">Thời lượng mỗi buổi</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {durationChoices.map(minutes => <Chip key={minutes} label={`${minutes} phút`}
            selected={profile.minutesPerSession === minutes}
            onPress={() => setProfile(p => p && ({ ...p, minutesPerSession: minutes }))} />)}
        </View>
        <AppText weight="semi" size="sm">Dụng cụ tập luyện</AppText>
        <TextInput value={profile.equipment} onChangeText={equipment => setProfile(p => p && ({ ...p, equipment }))}
          placeholder="Ví dụ: không có, tạ đơn, thảm yoga" placeholderTextColor={colors.muted}
          maxLength={300} style={{ minHeight: 48, color: colors.color, padding: 12, borderRadius: 12,
            borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.background }} />
        <AppText weight="semi" size="sm">Sở thích hoặc lưu ý (không bắt buộc)</AppText>
        <TextInput value={profile.preferences} onChangeText={preferences => setProfile(p => p && ({ ...p, preferences }))}
          placeholder="Ví dụ: ưu tiên đi bộ, chỉ tập buổi sáng" placeholderTextColor={colors.muted}
          maxLength={500} multiline style={{ minHeight: 54, color: colors.color, padding: 12, borderRadius: 12,
            borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.background }} />
        <AppText tone="muted" size="xs">Thay đổi sẽ ảnh hưởng đến các đề xuất tiếp theo. Hồ sơ chỉ chỉnh tại trang này.</AppText>
        <AppButton label="Lưu hồ sơ luyện tập" icon="save-outline" loading={saving} disabled={saving}
          onPress={() => void saveProfile()} />
      </Card>

      <Card>
        <SectionTitle title="2. Tình trạng hôm nay" />
        <AppText weight="semi" size="sm">Mức mệt mỏi: {fatigue}/5</AppText>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {sessionChoices.map(n => <Chip key={n} label={`${n}`} selected={fatigue === n} onPress={() => setFatigue(n)} />)}
        </View>
        <AppText weight="semi" size="sm">Mức đau mỏi cơ: {soreness}/5</AppText>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {sessionChoices.map(n => <Chip key={n} label={`${n}`} selected={soreness === n} onPress={() => setSoreness(n)} />)}
        </View>
        {dashboard.latestCheckin ? <AppText tone="muted" size="xs">Lần ghi nhận gần nhất: {new Date(dashboard.latestCheckin.createdAt).toLocaleString('vi-VN')}</AppText> : null}
        <AppButton label="Lưu tình trạng hôm nay" variant="secondary" icon="heart-outline"
          loading={saving} disabled={saving} onPress={() => void saveCheckin()} />
      </Card>

      <Card>
        <SectionTitle title="3. Tiến độ luyện tập" action={<Badge label="Dữ liệu thực" icon="stats-chart-outline" />} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {([
            ['7 ngày gần đây', `${current} buổi`],
            ['Tổng thời lượng', `${dashboard.last7Days.minutes} phút`],
            ['So với trước', `${formatDiff(difference)} buổi`],
            ['Đạt mục tiêu', `${completion}%`],
          ] as const).map(([label, value]) => (
            <View key={label} style={{ minWidth: 130, flex: 1, borderRadius: 14, backgroundColor: colors.brandSoft, padding: 12, gap: 4 }}>
              <AppText size="xs" tone="muted">{label}</AppText><AppText weight="bold" size="lg">{value}</AppText>
            </View>
          ))}
        </View>
        <WeeklyBars previous={previous} current={current} />
        <AppText size="sm" tone="muted">{review} Mục tiêu hiện tại: {profile.daysPerWeek} buổi/tuần.</AppText>
      </Card>

      <Card>
        <SectionTitle title="4. Gợi ý theo quy tắc" action={<Badge label="Theo quy tắc" tone="warning" />} />
        <AppText size="sm">Vì sao? {whyRule}</AppText>
        <AppButton label={rulePreview ? 'Ẩn xem trước' : 'Xem trước lịch quy tắc'} variant="secondary"
          icon="calendar-outline" onPress={() => setRulePreview(p => !p)} />
        {rulePreview ? <View style={{ gap: 12 }}>
          {rules.map((item: PlanItem, index) => <View key={item.label} style={{ paddingVertical: 5, gap: 3 }}>
            <AppText weight="semi">{item.label} · {addDays(today, 1 + Math.floor(index * 7 / Math.max(1, rules.length)))} · {item.title} · {item.minutes} phút</AppText>
            <AppText tone="muted" size="sm">{item.type} · {item.intensity} · {item.note}</AppText>
          </View>)}
          <AppButton label="Xác nhận áp dụng vào Planner" loading={applying} disabled={applying}
            icon="checkmark-circle-outline" onPress={() => applyToPlanner(rules.map(item => ({
              title: item.title, minutes: item.minutes, notes: item.note,
              type: item.type, intensity: item.intensity,
            })), 'quy tắc')} />
        </View> : null}
      </Card>

      <Card>
        <SectionTitle title="5. Đề xuất từ AI" action={<Badge label="Gemini" icon="sparkles" />} />
        <AppText tone="muted" size="sm">Gemini đọc hồ sơ, tiến độ và tình trạng từ MariaDB để đề xuất; không tự lưu lịch.</AppText>
        {ai.status === 'loading' ? <LoadingState message="Gemini đang xây dựng đề xuất..." /> : null}
        {ai.status === 'error' ? <ErrorState message={ai.error ?? 'Không tạo được lịch AI.'} onRetry={() => void requestAi()} /> : null}
        <AppButton label={ai.status === 'done' ? 'Tạo đề xuất AI khác' : 'Tạo đề xuất từ Gemini'}
          icon="sparkles" loading={ai.status === 'loading'} disabled={saving || applying || ai.status === 'loading'}
          onPress={() => void requestAi()} />
        {ai.status === 'done' && ai.plan ? <View style={{ gap: 10 }}>
          <AppText weight="semi" size="sm">Vì sao? {ai.plan.summary}</AppText>
          <AppButton variant="secondary" icon="eye-outline"
            label={aiPreview ? 'Ẩn xem trước AI' : 'Xem trước lịch AI'} onPress={() => setAiPreview(x => !x)} />
          {aiPreview ? <View style={{ gap: 12 }}>
            {ai.plan.plan.map((item, index) => <View key={`${index}-${item.title}`} style={{ gap: 3 }}>
              <AppText weight="semi">Buổi {index + 1} · {addDays(today, 1 + Math.floor(index * 7 / Math.max(1, ai.plan!.plan.length)))} · {item.title} · {item.minutes} phút</AppText>
              {item.notes ? <AppText size="sm" tone="muted">{item.notes}</AppText> : null}
            </View>)}
            <AppButton label="Xác nhận áp dụng lịch AI" loading={applying} disabled={applying}
              icon="checkmark-circle-outline" onPress={() => applyToPlanner(ai.plan!.plan, 'AI')} />
          </View> : null}
        </View> : null}
      </Card>

      <Card>
        <AppButton label="Hỏi AI về kế hoạch này" icon="chatbubbles-outline" fullWidth onPress={() => openChat(
          'Dựa trên hồ sơ, tình trạng hôm nay và kế hoạch tập của tôi đang lưu trong FitLog, hãy đánh giá và đề xuất điều chỉnh tuần này. Giải thích lý do, chưa thay đổi lịch khi tôi chưa xác nhận.'
        )} />
      </Card>
      {proposal ? <PlanConflictResolver visible items={proposal.items} source={proposal.source}
        onClose={() => setProposal(null)} onApply={confirmProposal} /> : null}
      {notice ? <AppText tone="success" size="sm">{notice}</AppText> : null}
      <AppText tone="muted" size="xs">Gợi ý chỉ có tính tham khảo. Hãy dừng tập và liên hệ chuyên gia y tế khi đau dữ dội, khó thở hoặc chóng mặt.</AppText>
    </Screen>
  );
}
