import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { TamaguiProvider, Theme } from 'tamagui';
import tamaguiConfig from '../tamagui.config';
import { AppButton, AppText, LoadingState } from '../src/components/ui';
import { useAppTheme } from '../src/hooks/useAppTheme';
import { initNotifications, reconcileReminderNotifications } from '../src/services/notifications';
import { onSessionChange } from '../src/services/session';
import { loadTrackingConsent,resetTrackingConsent,routeToScreen,track } from '../src/services/tracking';
import { authService } from '../services/authService';
import type { User } from '../services/authService';
import { store, resetAccountData } from '../src/store';
import { useAppDispatch, useAppSelector } from '../src/store/hooks';
import { fetchGoals } from '../src/store/goalsSlice';
import { useSettingsPersistence } from '../src/store/persist';
import { fetchReminders, syncNotifications } from '../src/store/remindersSlice';
import { fetchAllWorkouts } from '../src/store/workoutsSlice';

function Bootstrap() {
  const dispatch = useAppDispatch();
  const { colors } = useAppTheme();
  const hydrated = useSettingsPersistence();
  const reminders = useAppSelector(s => s.reminders.items);
  const remindersLoaded = useAppSelector(s => s.reminders.loaded);
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastId = useRef<string | null>(null);
  const verificationRun = useRef(0);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => { void initNotifications(); }, []);
  const verifySession = useCallback(async () => {
    const run = ++verificationRun.current;
    setError(null);
    try {
      const result = await authService.getCurrentUser();
      if (run !== verificationRun.current) return; // an older session lookup finished too late
      const newId = result?.id ?? null;
      if (lastId.current !== newId) {
        lastId.current = newId;
        dispatch(resetAccountData());
        resetTrackingConsent();
        // Old account's local reminder schedules must not survive logout or switch.
        void reconcileReminderNotifications([]);
      }
      setUser(result);
    } catch (e) {
      // Network failure must NOT be treated as invalid credentials.
      if (run === verificationRun.current) setError(e instanceof Error ? e.message : 'Không thể xác minh phiên đăng nhập.');
    } finally { if (run === verificationRun.current) setChecked(true); }
  }, [dispatch]);

  useEffect(() => {
    if (!hydrated) return;
    void verifySession();
    return onSessionChange(() => { void verifySession(); });
  }, [hydrated, verifySession]);

  useEffect(() => {
    if (!hydrated || !checked || error) return;
    const authRoute = segments[0] === 'auth';
    const adminRoute = segments[0] === 'admin';
    if (!user && !authRoute) router.replace('/auth/login');
    else if (user?.role === 'admin' && !adminRoute) router.replace('/admin');
    else if (user?.role === 'user' && (authRoute || adminRoute)) router.replace('/(tabs)');
  }, [hydrated, checked, error, segments, user?.id, user?.role, router]);

  useEffect(() => {
    if (!hydrated || !checked || !user || error || user.role === 'admin') return;
    void dispatch(fetchAllWorkouts());
    void dispatch(fetchGoals());
    void dispatch(fetchReminders());
  }, [hydrated, checked, user?.id, error, dispatch]);

  useEffect(() => {
    if (user && remindersLoaded) void dispatch(syncNotifications(reminders));
  }, [user?.id, reminders, remindersLoaded, dispatch]);

  useEffect(() => {
    if (!user || user.role === 'admin' || error) return;
    let active = true;
    void loadTrackingConsent().then(() => {
      if (active) void track('screen_view', routeToScreen(segments));
    }).catch(() => {});
    return () => { active = false; };
  }, [user?.id, error]);

  useEffect(() => {
    if (!user || user.role === 'admin' || error || segments[0] === 'auth') return;
    const screen = routeToScreen(segments);
    void track('screen_view', screen);
    if (screen === 'coach') void track('coach_opened', screen);
    if (screen === 'planner') void track('planner_opened', screen);
  }, [user?.id, user?.role, segments.join('/'), error]);

  if (!hydrated || !checked) return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
      <LoadingState message="Đang kiểm tra phiên đăng nhập..." />
    </View>
  );
  if (error) return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 18, backgroundColor: colors.background }}>
      <AppText weight="bold">Chưa kết nối được backend</AppText>
      <AppText>{error}</AppText>
      <AppButton label="Thử kết nối lại" icon="refresh" onPress={() => void verifySession()} />
    </View>
  );
  return <AppNavigation />;
}
function AppNavigation() {
  const { scheme, colors } = useAppTheme();
  return <>
    <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/register" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="workout/[id]" />
      <Stack.Screen name="workout/form" />
      <Stack.Screen name="goals/index" />
      <Stack.Screen name="goals/form" />
      <Stack.Screen name="reminders/index" />
      <Stack.Screen name="reminders/form" />
      <Stack.Screen name="planner/index" />
      <Stack.Screen name="planner/form" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="onboarding/index" />
    </Stack>
  </>;
}
function AppShell() {
  const { scheme } = useAppTheme();
  return <TamaguiProvider config={tamaguiConfig} defaultTheme={scheme}>
    <Theme name={scheme}><Bootstrap /></Theme>
  </TamaguiProvider>;
}
export default function RootLayout() {
  return <Provider store={store}><GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider><AppShell /></SafeAreaProvider>
  </GestureHandlerRootView></Provider>;
}
