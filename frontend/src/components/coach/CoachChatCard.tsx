// frontend/src/components/coach/CoachChatCard.tsx
// Giao diện dành cho người dùng: Gemini trả lời bằng lời, còn action JSON chỉ dùng nội bộ.
import { useEffect, useMemo, useRef, useState } from 'react';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { coachGoalLabel, coachLevelLabel } from '../../features/coach/rules';
import { useCoachChatLauncher } from './CoachChatLauncher';
import { PlanConflictResolver } from './PlanConflictResolver';
import type { PlanBatchChoice } from '../../services/api';
import type { WorkoutPlanInput, WorkoutType } from '../../types';
import {
  ActivityIndicator, Animated, KeyboardAvoidingView, Modal, PanResponder, Platform,
  Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View
} from 'react-native';
import { AppButton, AppText, Chip, Icon } from '../ui';
import { useAppTheme } from '../../hooks/useAppTheme';
import { coachChatApi } from '../../services/coachChat';
import type { AiAction, AiMessage, CoachProfile } from '../../services/coachChat';
import { showError } from '../ui/dialogs';
import { errorMessage } from '../../utils/format';
import { showConfirmDialog } from '../../utils/alert';
import { useAppDispatch } from '../../store/hooks';
import { setAiConsent } from '../../store/settingsSlice';

type ChatTab = 'chat' | 'profile' | 'report';
type Dict = Record<string, unknown>;

const initialProfile: CoachProfile = {
  goal: 'habit', level: 'beginner', daysPerWeek: 3, minutesPerSession: 40,
  equipment: 'Không có', preferences: ''
};

function objectOf(v: unknown): Dict {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Dict : {};
}
function stringOf(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}
function numberOf(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}
function shortDate(v: unknown): string {
  const raw = stringOf(v);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : (raw || 'Chưa xác định');
}
function actionLabel(type: AiAction['type']): string {
  switch (type) {
    case 'CREATE_PLAN': return 'Lịch tập AI đề xuất';
    case 'RESCHEDULE': return 'Đề xuất dời lịch tập';
    case 'SKIP_PLAN': return 'Đề xuất bỏ buổi tập';
    case 'LOG_WORKOUT': return 'Nhật ký tập luyện đề xuất';
  }
}

// Nút AI nổi toàn cục cho các màn hình trong nhóm (tabs).
// Không lưu nội dung chat ở state này: chat và action vẫn đọc/ghi qua API MariaDB.
const FLOAT_SIZE = 58;
const EDGE_SPACE = 14;
const TOP_GAP = 65;        // Tránh status bar/header điện thoại.
const BOTTOM_GAP = 98;     // Chừa chỗ cho thanh điều hướng Tabs.
const DRAG_THRESHOLD = 8; // Phân biệt chạm mở chat và kéo icon.

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function FloatingAiButton({ onOpen }: { onOpen: () => void }) {
  const { colors } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const initial = useRef({
    x: Math.max(EDGE_SPACE, width - FLOAT_SIZE - EDGE_SPACE),
    y: Math.max(TOP_GAP, height - FLOAT_SIZE - BOTTOM_GAP),
  }).current;
  const pos = useRef(initial);
  const start = useRef(initial);
  const bounds = useRef({ width, height });
  bounds.current = { width, height };
  const openRef = useRef(onOpen);
  openRef.current = onOpen;
  const pan = useRef(new Animated.ValueXY(initial)).current;

  // Khi xoay điện thoại hoặc resize cửa sổ, icon không trôi ra ngoài màn hình.
  useEffect(() => {
    const maxX = Math.max(EDGE_SPACE, width - FLOAT_SIZE - EDGE_SPACE);
    const maxY = Math.max(TOP_GAP, height - FLOAT_SIZE - BOTTOM_GAP);
    pos.current = {
      x: clamp(pos.current.x, EDGE_SPACE, maxX),
      y: clamp(pos.current.y, TOP_GAP, maxY),
    };
    pan.setValue(pos.current);
  }, [width, height, pan]);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { start.current = { ...pos.current }; },
    onPanResponderMove: (_, gesture) => {
      const maxX = Math.max(EDGE_SPACE, bounds.current.width - FLOAT_SIZE - EDGE_SPACE);
      const maxY = Math.max(TOP_GAP, bounds.current.height - FLOAT_SIZE - BOTTOM_GAP);
      pan.setValue({
        x: clamp(start.current.x + gesture.dx, EDGE_SPACE, maxX),
        y: clamp(start.current.y + gesture.dy, TOP_GAP, maxY),
      });
    },
    onPanResponderRelease: (_, gesture) => {
      if (Math.hypot(gesture.dx, gesture.dy) < DRAG_THRESHOLD) {
        pan.setValue(pos.current);
        openRef.current();
        return;
      }
      const { width: w, height: h } = bounds.current;
      const maxX = Math.max(EDGE_SPACE, w - FLOAT_SIZE - EDGE_SPACE);
      const maxY = Math.max(TOP_GAP, h - FLOAT_SIZE - BOTTOM_GAP);
      const x = clamp(start.current.x + gesture.dx, EDGE_SPACE, maxX);
      const y = clamp(start.current.y + gesture.dy, TOP_GAP, maxY);
      // Tự hút về cạnh gần nhất, tránh che phần giữa trang.
      pos.current = { x: x + FLOAT_SIZE / 2 < w / 2 ? EDGE_SPACE : maxX, y };
      Animated.spring(pan, {
        toValue: pos.current, useNativeDriver: false, bounciness: 3,
      }).start();
    },
    onPanResponderTerminate: () => pan.setValue(pos.current),
  }), [pan]);

  return (
    <Animated.View
      {...responder.panHandlers}
      accessible accessibilityRole="button" accessibilityLabel="Mở FitLog AI Chatbox"
      accessibilityHint="Chạm để trò chuyện, kéo để di chuyển biểu tượng"
      onAccessibilityTap={onOpen}
      style={{
        position: 'absolute', left: pan.x, top: pan.y,
        width: FLOAT_SIZE, height: FLOAT_SIZE, borderRadius: FLOAT_SIZE / 2,
        backgroundColor: colors.brand, borderWidth: 2, borderColor: colors.panel,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOpacity: 0.23, shadowRadius: 9,
        shadowOffset: { width: 0, height: 4 }, elevation: 11, zIndex: 100,
      }}
    >
      <View pointerEvents="none" style={{ alignItems: 'center', gap: 0 }}>
        <Icon name="sparkles" size={25} color={colors.brandText} />
        <AppText size="xs" weight="bold" style={{ color: colors.brandText, fontSize: 10 }}>AI</AppText>
      </View>
    </Animated.View>
  );
}

export default function CoachChatCard() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { request } = useCoachChatLauncher();
  const { height: screenHeight } = useWindowDimensions();
  const dispatch = useAppDispatch();
  const scroll = useRef<ScrollView>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ChatTab>('chat');
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [sessions, setSessions] = useState<{ id: string; title: string }[]>([]);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [actions, setActions] = useState<AiAction[]>([]);
  const [resolvingAction, setResolvingAction] = useState<AiAction | null>(null);
  const [text, setText] = useState('');
  const [sendingText, setSendingText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [profile, setProfile] = useState<CoachProfile>(initialProfile);
  const [report, setReport] = useState('');
  const [consent, setConsent] = useState(false);
  const quickPrompts = useMemo(() => [
    `Lập lịch ${profile.daysPerWeek} buổi/tuần, mỗi buổi ${profile.minutesPerSession} phút cho mục tiêu ${coachGoalLabel[profile.goal]}.`,
    `Tư vấn bài tập phù hợp với dụng cụ: ${profile.equipment}.`,
    'Phân tích lịch sử tập luyện gần đây và gợi ý cải thiện.',
    'Tôi muốn điều chỉnh kế hoạch tuần này, hãy kiểm tra lịch hiện tại.',
  ], [profile]);

  // Mở chat từ nút "Hỏi AI về kế hoạch này"; chỉ điền nháp, chưa tự gửi.
  useEffect(() => {
    if (!request) return;
    setTab('chat');
    setText(request.draft);
    setOpen(true);
  }, [request]);

  // Khi người dùng vừa lưu hồ sơ ở trang Kế hoạch, mở chat sẽ đọc dữ liệu mới từ DB.
  useEffect(() => {
    if (!open) return;
    void Promise.all([coachChatApi.profile(), coachChatApi.consent()]).then(([storedProfile, storedConsent]) => {
      setProfile(storedProfile);
      setConsent(storedConsent.enabled);
      dispatch(setAiConsent(storedConsent.enabled));
    }).catch(e => showError('Không cập nhật được hồ sơ AI', errorMessage(e)));
  }, [open, dispatch]);

  const refreshSessions = async () => setSessions(await coachChatApi.sessions());
  const load = async (id: string) => {
    const history = await coachChatApi.history(id);
    setSessionId(id);
    setMessages(history.messages);
    setActions(history.pendingActions);
    setNotice('');
  };

  useEffect(() => {
    void (async () => {
      try {
        await refreshSessions();
        setProfile(await coachChatApi.profile());
        const enabled = (await coachChatApi.consent()).enabled;
        setConsent(enabled);
        dispatch(setAiConsent(enabled));
      } catch (e) {
        showError('Không tải được dữ liệu AI Coach', errorMessage(e));
      }
    })();
  }, [dispatch]);

  const withConsent = (action: () => Promise<void>) => {
    if (consent) { void action(); return; }
    showConfirmDialog(
      'Cho phép FitLog AI tư vấn?',
      'Khi đồng ý, FitLog có thể gửi mục tiêu, lịch tập, lịch sử luyện tập, dữ liệu tự báo cáo và nội dung chat tới AI. Hội thoại được lưu trong MariaDB. Bạn có thể rút lại đồng ý.',
      () => { void (async () => {
        try {
          await coachChatApi.setConsent(true);
          setConsent(true);
          dispatch(setAiConsent(true));
          await action();
        } catch (e) { showError('Không lưu được sự đồng ý', errorMessage(e)); }
      })(); },
      'Tôi đồng ý'
    );
  };

  const doSend = async (message: string) => {
    const content = message.trim();
    if (!content || busy) return;
    setBusy(true);
    setSendingText(content); // Tin nhắn được thấy ngay trong khung chat.
    setText('');
    setNotice('');
    try {
      const result = await coachChatApi.send(content, sessionId);
      await load(result.sessionId);
      await refreshSessions();
    } catch (e) {
      setText(content); // Không mất nội dung người dùng khi gửi thất bại.
      showError('Không gửi được tin nhắn', errorMessage(e));
    } finally {
      setSendingText(null);
      setBusy(false);
    }
  };
  const send = (message = text) => withConsent(() => doSend(message));
  const newChat = () => {
    if (busy) return;
    setSessionId(undefined); setMessages([]); setActions([]);
    setText(''); setNotice(''); setTab('chat');
  };
  const deleteChat = () => {
    if (!sessionId || busy) return;
    showConfirmDialog('Xóa cuộc trò chuyện?', 'Xóa vĩnh viễn tin nhắn và đề xuất chưa áp dụng trong cuộc trò chuyện này?', () => {
      void (async () => {
        try {
          await coachChatApi.deleteSession(sessionId);
          newChat();
          await refreshSessions();
        } catch (e) { showError('Không xóa được cuộc trò chuyện', errorMessage(e)); }
      })();
    }, 'Xóa');
  };
  const actionPlans = (action: AiAction): WorkoutPlanInput[] => {
    const raw = objectOf(action.payload).items;
    if (!Array.isArray(raw)) return [];
    return raw.map(x => {
      const p = objectOf(x);
      return {
        date: stringOf(p.date), title: stringOf(p.title),
        type: stringOf(p.type) as WorkoutType, minutes: numberOf(p.minutes) ?? 0,
        intensity: stringOf(p.intensity) as 'nhẹ' | 'vừa', note: stringOf(p.note)
      };
    });
  };

  const applyActionPlan = async (choices: PlanBatchChoice[]) => {
    if (!resolvingAction || busy) return;
    setBusy(true);
    try {
      await coachChatApi.apply(resolvingAction.id, choices);
      if (sessionId) await load(sessionId);
      setNotice('Lịch đã được cập nhật theo các lựa chọn bạn xác nhận.');
      setResolvingAction(null);
    } finally { setBusy(false); }
  };

  const processAction = async (action: AiAction, accept: boolean) => {
    if (busy) return;
    if (accept && action.type === 'CREATE_PLAN') {
      setResolvingAction(action);
      return;
    }
    setBusy(true);
    try {
      if (accept) await coachChatApi.apply(action.id);
      else await coachChatApi.cancel(action.id);
      if (sessionId) await load(sessionId);
      setNotice(accept ? 'Đã lưu thành công vào FitLog. Bạn có thể kiểm tra trong Lịch tập hoặc Nhật ký.' : 'Đã từ chối đề xuất. Lịch tập hiện tại không thay đổi.');
    } catch (e) { showError('Không xử lý được đề xuất', errorMessage(e)); }
    finally { setBusy(false); }
  };
  const makeReport = async () => {
    if (busy) return;
    setBusy(true);
    try { setReport((await coachChatApi.report()).report); }
    catch (e) { showError('Không tạo được báo cáo', errorMessage(e)); }
    finally { setBusy(false); }
  };

  const renderAction = (action: AiAction) => {
    const payload = objectOf(action.payload);
    const items = action.type === 'CREATE_PLAN' && Array.isArray(payload.items) ? payload.items : [];
    const confirmLabel = action.type === 'CREATE_PLAN' ? 'Áp dụng lịch này' :
      action.type === 'LOG_WORKOUT' ? 'Lưu vào nhật ký' :
      action.type === 'RESCHEDULE' ? 'Xác nhận dời lịch' : 'Xác nhận bỏ buổi';
    return (
      <View key={action.id} style={{ padding: 16, borderRadius: 16, borderWidth: 1,
        borderColor: colors.brand, backgroundColor: colors.panel, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="calendar-outline" size={21} color={colors.brand} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText weight="bold">{actionLabel(action.type)}</AppText>
            <AppText tone="muted" size="xs">Xem lại trước khi lưu vào ứng dụng</AppText>
          </View>
        </View>
        {action.type === 'CREATE_PLAN' ? (
          <View style={{ gap: 10 }}>
            <AppText tone="muted" size="sm">{items.length} buổi tập được đề xuất</AppText>
            {items.map((raw, index) => {
              const item = objectOf(raw);
              return (
                <View key={`${action.id}-${index}`} style={{ backgroundColor: colors.background,
                  borderRadius: 12, padding: 12, gap: 4 }}>
                  <AppText weight="semi">{shortDate(item.date)} · {stringOf(item.title, 'Buổi tập')}</AppText>
                  <AppText size="sm" tone="muted">
                    {stringOf(item.type, 'Tập luyện')} · {numberOf(item.minutes) ?? '—'} phút · Cường độ {stringOf(item.intensity, 'vừa')}
                  </AppText>
                  {stringOf(item.note) ? <AppText size="sm">{stringOf(item.note)}</AppText> : null}
                </View>
              );
            })}
          </View>
        ) : action.type === 'RESCHEDULE' ? (
          <AppText>Chuyển buổi tập bạn vừa yêu cầu sang ngày <AppText weight="bold">{shortDate(payload.date)}</AppText>.</AppText>
        ) : action.type === 'SKIP_PLAN' ? (
          <AppText>Bỏ buổi tập vừa được nhắc đến trong cuộc trò chuyện. Buổi đó sẽ được đánh dấu là đã bỏ, không bị xóa khỏi dữ liệu.</AppText>
        ) : (
          <View style={{ backgroundColor: colors.background, padding: 12, borderRadius: 12, gap: 5 }}>
            <AppText weight="semi">{stringOf(payload.title, 'Buổi tập')}</AppText>
            <AppText size="sm">Ngày {shortDate(payload.date)} · {numberOf(payload.minutes) ?? '—'} phút</AppText>
            <AppText size="sm" tone="muted">
              {stringOf(payload.type, 'Tập luyện')}
              {numberOf(payload.distanceKm) ? ` · ${numberOf(payload.distanceKm)} km` : ''}
            </AppText>
            {stringOf(payload.note) ? <AppText size="sm">{stringOf(payload.note)}</AppText> : null}
          </View>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 160 }}>
            <AppButton label={confirmLabel} icon="checkmark-circle-outline" disabled={busy}
              onPress={() => void processAction(action, true)} />
          </View>
          <AppButton label="Không áp dụng" variant="secondary" disabled={busy}
            onPress={() => void processAction(action, false)} />
        </View>
      </View>
    );
  };

  const renderChat = () => (
    <>
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor, paddingVertical: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 14, alignItems: 'center' }}>
          <AppButton label="+ Hội thoại mới" variant="secondary" size="sm" disabled={busy} onPress={newChat} />
          {sessions.slice(0, 12).map(s => (
            <Pressable key={s.id} disabled={busy} onPress={() => void load(s.id).catch(e => showError('Không mở được hội thoại', errorMessage(e)))}
              style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 18, borderWidth: 1,
                borderColor: sessionId === s.id ? colors.brand : colors.borderColor,
                backgroundColor: sessionId === s.id ? colors.brandSoft : colors.panel }}>
              <AppText size="xs" tone={sessionId === s.id ? 'brand' : 'default'}>
                {s.title.length > 27 ? `${s.title.slice(0, 27)}…` : s.title}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <ScrollView ref={scroll} style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 14, flexGrow: 1 }}>
        {messages.length === 0 && !sendingText ? (
          <View style={{ flex: 1, justifyContent: 'center', gap: 16, paddingVertical: 18 }}>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: colors.brandSoft,
                alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="sparkles" color={colors.brand} size={30} />
              </View>
              <AppText size="xl" weight="bold">Xin chào! Mình là FitLog AI</AppText>
              <AppText tone="muted" style={{ textAlign: 'center' }}>
                Bạn muốn lên lịch tập, xem tiến độ hay hỏi về bài tập nào hôm nay?
              </AppText>
            </View>
            <View style={{ gap: 8 }}>
              {quickPrompts.map(p => (
                <Pressable key={p} disabled={busy} onPress={() => send(p)}
                  style={{ padding: 13, borderRadius: 12, borderWidth: 1,
                    borderColor: colors.borderColor, backgroundColor: colors.panel }}>
                  <AppText size="sm">{p}</AppText>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        {messages.map(m => {
          const mine = m.role === 'user';
          return (
            <View key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '88%', gap: 4 }}>
              <AppText tone="muted" size="xs" style={{ marginLeft: 7 }}>{mine ? 'Bạn' : 'FitLog AI'}</AppText>
              <View style={{ paddingVertical: 11, paddingHorizontal: 14, borderRadius: 16,
                backgroundColor: mine ? colors.brandSoft : colors.panel,
                borderWidth: mine ? 0 : 1, borderColor: colors.borderColor }}>
                <AppText>{m.content}</AppText>
              </View>
            </View>
          );
        })}
        {sendingText ? (
          <View style={{ gap: 12 }}>
            <View style={{ alignSelf: 'flex-end', maxWidth: '88%', padding: 12,
              borderRadius: 16, backgroundColor: colors.brandSoft }}>
              <AppText>{sendingText}</AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={colors.brand} />
              <AppText tone="muted" size="sm">FitLog AI đang trả lời...</AppText>
            </View>
          </View>
        ) : null}
        {actions.map(renderAction)}
        {notice ? (
          <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.successSoft }}>
            <AppText tone="success" size="sm">{notice}</AppText>
          </View>
        ) : null}
      </ScrollView>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.borderColor, padding: 12,
        backgroundColor: colors.panel, gap: 7 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <TextInput value={text} onChangeText={setText} editable={!busy}
            placeholder="Nhắn cho FitLog AI..." placeholderTextColor={colors.muted}
            multiline maxLength={1200}
            accessibilityLabel="Nhập tin nhắn cho FitLog AI"
            style={{ flex: 1, maxHeight: 110, minHeight: 48, borderWidth: 1,
              borderColor: colors.borderColor, backgroundColor: colors.background,
              color: colors.color, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 16 }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Gửi tin nhắn"
            accessibilityState={{ disabled: busy || !text.trim() }}
            disabled={busy || !text.trim()} onPress={() => send()}
            style={{ height: 48, width: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
              backgroundColor: colors.brand, opacity: busy || !text.trim() ? 0.45 : 1 }}>
            <Icon name="send" size={21} color={colors.brandText} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText size="xs" tone="muted">AI chỉ thay đổi lịch khi bạn xác nhận.</AppText>
          {sessionId ? <Pressable disabled={busy} onPress={deleteChat}>
            <AppText size="xs" tone="danger">Xóa hội thoại</AppText>
          </Pressable> : null}
        </View>
      </View>
    </>
  );

  const renderProfile = () => (
    <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }}>
      <AppText size="lg" weight="bold">Hồ sơ luyện tập</AppText>
      <AppText tone="muted" size="sm">Hồ sơ lấy trực tiếp từ FitLog. Bạn chỉ chỉnh tại trang Kế hoạch.</AppText>
      <View style={{ padding: 14, borderWidth: 1, borderColor: colors.borderColor, borderRadius: 14, gap: 8 }}>
        <AppText size="sm">Mục tiêu: <AppText weight="semi">{coachGoalLabel[profile.goal]}</AppText></AppText>
        <AppText size="sm">Trình độ: <AppText weight="semi">{coachLevelLabel[profile.level]}</AppText></AppText>
        <AppText size="sm">Tần suất: <AppText weight="semi">{profile.daysPerWeek} buổi/tuần</AppText></AppText>
        <AppText size="sm">Thời lượng: <AppText weight="semi">{profile.minutesPerSession} phút/buổi</AppText></AppText>
        <AppText size="sm">Dụng cụ: <AppText weight="semi">{profile.equipment}</AppText></AppText>
        {profile.preferences ? <AppText size="sm">Lưu ý: {profile.preferences}</AppText> : null}
      </View>
      <AppButton label="Chỉnh sửa trong Kế hoạch" icon="create-outline" onPress={() => {
        setOpen(false);
        router.push('/coach');
      }} />
    </ScrollView>
  );

  const renderReport = () => (
    <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
      <AppText size="lg" weight="bold">Báo cáo từ AI</AppText>
      <AppText size="sm" tone="muted">Mức mệt mỏi và đau cơ được ghi tại trang Kế hoạch, không nhập lại ở đây.</AppText>
      <AppButton label="Đến trang Kế hoạch" variant="secondary" icon="calendar-outline" onPress={() => {
        setOpen(false);
        router.push('/coach');
      }} />
      <AppButton label="Xem báo cáo từ AI" variant="secondary" disabled={busy}
        onPress={() => withConsent(makeReport)} />
      {report ? <View style={{ backgroundColor: colors.background, padding: 14, borderRadius: 12 }}>
        <AppText>{report}</AppText>
      </View> : null}
      {consent ? <AppButton label="Rút lại đồng ý chia sẻ với AI" variant="ghost" size="sm"
        onPress={() => { void coachChatApi.setConsent(false).then(() => {
          setConsent(false); dispatch(setAiConsent(false));
        }).catch(e => showError('Không thay đổi được sự đồng ý', errorMessage(e))); }} /> : null}
    </ScrollView>
  );

  return (
    <>
      {/* Trang Kế hoạch có nút "Hỏi AI" riêng; tránh icon nổi che nội dung. */}
      {pathname !== '/coach' ? <FloatingAiButton onOpen={() => {
        setTab('chat'); setOpen(true);
      }} /> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => { setResolvingAction(null); setOpen(false); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: 'rgba(10, 15, 33, 0.25)',
            paddingHorizontal: Platform.OS === 'web' ? 18 : 0,
            paddingTop: Platform.OS === 'web' ? 18 : insets.top,
            paddingBottom: Platform.OS === 'web' ? 85 : insets.bottom,
            justifyContent: Platform.OS === 'web' ? 'flex-end' : 'center',
            alignItems: Platform.OS === 'web' ? 'flex-end' : 'stretch' }}>
          <Pressable accessibilityLabel="Đóng chatbox khi chạm ngoài cửa sổ"
            onPress={() => setOpen(false)} style={StyleSheet.absoluteFill} />
          <View style={{ flex: Platform.OS === 'web' ? undefined : 1,
            height: Platform.OS === 'web' ? Math.max(260, Math.min(690, screenHeight - 125)) : undefined,
            width: '100%', maxWidth: Platform.OS === 'web' ? 430 : undefined,
            borderRadius: Platform.OS === 'web' ? 20 : 0, overflow: 'hidden',
            backgroundColor: colors.background, borderWidth: Platform.OS === 'web' ? 1 : 0,
            borderColor: colors.borderColor }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14,
              backgroundColor: colors.panel, borderBottomWidth: 1, borderBottomColor: colors.borderColor, gap: 10 }}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.brandSoft,
                alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="sparkles" size={21} color={colors.brand} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText weight="bold">FitLog AI Coach</AppText>
                <AppText tone="muted" size="xs">Trợ lý luyện tập cá nhân</AppText>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Đóng chatbox"
                onPress={() => setOpen(false)} style={{ padding: 7 }}>
                <Icon name="close" size={25} color={colors.color} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', backgroundColor: colors.panel,
              borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
              {([['chat', 'Trò chuyện'], ['profile', 'Hồ sơ'], ['report', 'Báo cáo AI']] as const)
                .map(([value, label]) => (
                  <Pressable key={value} onPress={() => setTab(value)}
                    accessibilityRole="button" accessibilityState={{ selected: tab === value }}
                    style={{ flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2,
                      borderBottomColor: tab === value ? colors.brand : 'transparent' }}>
                    <AppText size="sm" weight={tab === value ? 'bold' : 'regular'}
                      tone={tab === value ? 'brand' : 'muted'}>{label}</AppText>
                  </Pressable>
                ))}
            </View>
            {tab === 'chat' && resolvingAction ? (
              <PlanConflictResolver inline visible items={actionPlans(resolvingAction)} source="Gemini AI"
                onClose={() => setResolvingAction(null)} onApply={applyActionPlan} />
            ) : tab === 'chat' ? renderChat() : tab === 'profile' ? renderProfile() : renderReport()}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
