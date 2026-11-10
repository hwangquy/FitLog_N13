import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { showConfirmDialog } from '../../src/utils/alert';
import { AppButton, AppText, Badge, Card, Chip, ErrorState, LoadingState, Screen, ScreenHeader, SectionTitle } from '../../src/components/ui';
import { analyzeHistory, buildAiPayload, buildInsights, buildPlan, coachGoalLabel, coachLevelLabel } from '../../src/features/coach/rules';
import type { AiPlan, CoachGoal, CoachLevel, CoachPrefs } from '../../src/features/coach/rules';
import { useToday } from '../../src/hooks/useToday';
import { isAiConfigured, requestAiPlan } from '../../src/services/ai';
import { plannerApi } from '../../src/services/api';
import { addDays } from '../../src/utils/date';
import { showError } from '../../src/components/ui/dialogs';
import type { WorkoutType, WorkoutPlanInput } from '../../src/types';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { setAiConsent } from '../../src/store/settingsSlice';
import { errorMessage } from '../../src/utils/format';
import { useAppTheme } from '../../src/hooks/useAppTheme';

type AiState = { status: 'idle' | 'loading' | 'done' | 'error'; plan?: AiPlan; error?: string };

export default function CoachScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useAppTheme();
  const today = useToday();
  const all = useAppSelector(s => s.workouts.all);
  const consent = useAppSelector(s => s.settings.aiConsent);
  const [prefs, setPrefs] = useState<CoachPrefs>({ goal: 'habit', daysPerWeek: 3, level: 'beginner' });
  const [ai, setAi] = useState<AiState>({ status: 'idle' });
  const [applying, setApplying] = useState(false);

  const analysis = useMemo(() => analyzeHistory(all, today), [all, today]);
  const insights = useMemo(() => buildInsights(analysis, prefs), [analysis, prefs]);
  const plan = useMemo(() => buildPlan(analysis, prefs), [analysis, prefs]);
  const aiReady = isAiConfigured();

  const runAi = async () => {
    setAi({ status: 'loading' });
    try {
      setAi({ status: 'done', plan: await requestAiPlan(buildAiPayload(all, prefs, today)) });
    } catch (e) {
      setAi({ status: 'error', error: errorMessage(e) });
    }
  };

  const applyToPlanner = async (items: { title: string; minutes: number; notes: string; type?: WorkoutType }[]) => {
    if (applying || !items.length) return;
    setApplying(true);
    let saved = 0;
    try {
      const start = addDays(today, 1);
      for (const [i, item] of items.entries()) {
        const type: WorkoutType = item.type ?? (
          /yoga|giãn cơ/i.test(item.title) ? 'Yoga' :
          /gym|sức mạnh|tạ/i.test(item.title) ? 'Gym' :
          /đạp xe/i.test(item.title) ? 'Đạp xe' :
          /chạy/i.test(item.title) ? 'Chạy bộ' : 'Đi bộ'
        );
        const plan: WorkoutPlanInput = {
          date: addDays(start, Math.floor(i * 7 / items.length)),
          title: item.title, type, minutes: item.minutes,
          intensity: 'nhẹ', note: item.notes
        };
        await plannerApi.create(plan);
        saved += 1;
      }
      router.push('/planner');
    } catch (e) {
      showError('Không áp dụng được toàn bộ lịch', `Đã lưu ${saved}/${items.length} buổi. ${errorMessage(e)}`);
    } finally { setApplying(false); }
  };

  const askAi = () => {
    if (consent) {
      void runAi();
      return;
    }
    showConfirmDialog(
      'Gửi số liệu tới AI?',
      'FitLog chỉ gửi thống kê tổng hợp và mục tiêu. Không gửi tên, ghi chú, vị trí, ảnh hay tuyến GPS. Bạn có thể rút lại sự đồng ý ở Cá nhân.',
      () => { dispatch(setAiConsent(true)); void runAi(); },
      'Đồng ý', 'Không'
    );
  };

  return (
    <Screen>
      <ScreenHeader eyebrow="Huấn luyện" title="AI Coach" subtitle="Gợi ý dựa trên lịch sử luyện tập thật của bạn" />

      <Card>
        <SectionTitle title="Mục tiêu của bạn" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(Object.keys(coachGoalLabel) as CoachGoal[]).map(g => <Chip key={g} label={coachGoalLabel[g]} selected={prefs.goal === g} onPress={() => setPrefs(p => ({ ...p, goal: g }))} />)}
        </View>
        <AppText weight="semi" size="sm">Số buổi mỗi tuần</AppText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[2, 3, 4, 5].map(n => <Chip key={n} label={String(n)} selected={prefs.daysPerWeek === n} onPress={() => setPrefs(p => ({ ...p, daysPerWeek: n }))} />)}
        </View>
        <AppText weight="semi" size="sm">Trình độ</AppText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(Object.keys(coachLevelLabel) as CoachLevel[]).map(l => <Chip key={l} label={coachLevelLabel[l]} selected={prefs.level === l} onPress={() => setPrefs(p => ({ ...p, level: l }))} />)}
        </View>
      </Card>

      <Card>
        <SectionTitle title="Phân tích lịch sử" action={<Badge label="Từ dữ liệu của bạn" icon="analytics" />} />
        {insights.map((t, i) => <AppText key={i} tone="muted" size="sm">• {t}</AppText>)}
      </Card>

      <Card>
        <SectionTitle title="Lịch gợi ý theo quy tắc" action={<Badge label="Không phải AI" tone="warning" />} />
        <AppText tone="muted" size="xs">Tạo bằng các quy tắc cố định từ lịch sử tập của bạn (thời lượng gần đây, hoạt động ưa thích, thời gian nghỉ).</AppText>
        {plan.map(p => (
          <View key={p.label} style={{ gap: 2, paddingTop: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText weight="bold">{p.label}: {p.title}</AppText>
              <AppText weight="semi">{p.minutes} phút</AppText>
            </View>
            <AppText tone="muted" size="xs">{p.type} · cường độ {p.intensity}. {p.note}</AppText>
          </View>
        ))}
      </Card>

      <AppButton label="Áp dụng lịch theo quy tắc" icon="calendar-outline" variant="secondary" fullWidth loading={applying} onPress={() => void applyToPlanner(plan.map(p => ({ title: p.title, minutes: p.minutes, notes: p.note, type: p.type })))} />

    
<Card
  style={{
    backgroundColor: colors.brandSoft,
    borderColor: colors.borderColor,
  }}
>
  <View
    style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    }}
  >
    <AppText
      size="lg"
      weight="bold"
      style={{ color: colors.color }}
    >
      Nhờ AI điều chỉnh
    </AppText>

    <Badge label="AI" icon="sparkles" />
  </View>

  {!aiReady ? (
    <>
      <AppText
        size="sm"
        style={{ color: colors.muted }}
      >
        AI chưa được cấu hình. Hãy kiểm tra kết nối Gemini
        trên Spring Boot.
      </AppText>

      <AppButton
        label="Nhờ AI điều chỉnh"
        icon="sparkles"
        disabled
        onPress={askAi}
      />
    </>
  ) : (
    <>
      {ai.status === 'idle' ? (
        <>
          <AppText
            size="sm"
            style={{ color: colors.muted }}
          >
            Gemini sẽ phân tích lịch sử luyện tập và
            đề xuất lịch tập phù hợp với mục tiêu của bạn.
          </AppText>

          <AppButton
            label="Nhờ AI điều chỉnh"
            icon="sparkles"
            fullWidth
            onPress={askAi}
          />
        </>
      ) : null}

      {ai.status === 'loading' ? (
        <LoadingState message="Gemini đang tạo lịch tập..." />
      ) : null}

      {ai.status === 'error' ? (
        <>
          <ErrorState
            message={ai.error ?? 'Không gọi được Gemini.'}
            onRetry={askAi}
          />

          <AppButton
            label="Thử lại với AI"
            icon="refresh-outline"
            fullWidth
            onPress={askAi}
          />
        </>
      ) : null}

      {ai.status === 'done' && ai.plan ? (
        <View style={{ gap: 14 }}>
          <AppText
            style={{
              color: colors.color,
              lineHeight: 23,
            }}
          >
            {ai.plan.summary}
          </AppText>

          {ai.plan.plan.map((p, i) => (
            <View key={i} style={{ gap: 4 }}>
              <AppText
                weight="bold"
                style={{ color: colors.color }}
              >
                {p.title} · {p.minutes} phút
              </AppText>

              {p.notes ? (
                <AppText
                  size="xs"
                  style={{
                    color: colors.muted,
                    lineHeight: 20,
                  }}
                >
                  {p.notes}
                </AppText>
              ) : null}
            </View>
          ))}

          <AppButton
            label="Áp dụng lịch AI vào kế hoạch"
            icon="calendar-outline"
            fullWidth
            loading={applying}
            onPress={() =>
              void applyToPlanner(ai.plan!.plan)
            }
          />

          <AppButton
            label="Hỏi lại AI"
            icon="sparkles"
            variant="secondary"
            fullWidth
            onPress={askAi}
          />
        </View>
      ) : null}
    </>
  )}
</Card>


      <AppText tone="muted" size="xs">Gợi ý chỉ mang tính tham khảo chung, không thay thế tư vấn của bác sĩ hoặc huấn luyện viên. Hãy dừng tập và hỏi chuyên gia nếu bạn thấy đau, chóng mặt hoặc khó thở.</AppText>
    </Screen>
  );
}
