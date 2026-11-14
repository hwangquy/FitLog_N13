import TrackingConsentCard from "../../src/components/admin/TrackingConsentCard";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, Switch, View } from "react-native";
import {
  AppButton,
  AppText,
  Card,
  Chip,
  Icon,
  ProgressBar,
  Screen,
  SectionTitle,
  workoutIcon,
} from "../../src/components/ui";
import { PrivateWorkoutImage } from "../../src/components/workouts/PrivateWorkoutImage";
import { uploadWorkoutImage } from "../../src/services/media";
import type { IconName } from "../../src/components/ui";
import { API_BASE_URL } from "../../src/config/env";
import { useAppTheme } from "../../src/hooks/useAppTheme";
import { isAiConfigured } from "../../src/services/ai";
import { pingApi } from "../../src/services/api";
import { getJson, setJson } from "../../src/services/storage";
import { authService, User } from "../../services/authService";
import { useAppDispatch, useAppSelector } from "../../src/store/hooks";
import { resetAccountData } from "../../src/store";
import { setAiConsent, setThemeMode } from "../../src/store/settingsSlice";
import { fetchAllWorkouts } from "../../src/store/workoutsSlice";
import { fetchGoals } from "../../src/store/goalsSlice";
import { useToday } from "../../src/hooks/useToday";
import { goalProgress, metricUnit } from "../../src/features/goals/progress";
import { formatDate } from "../../src/utils/date";
import type { ThemeMode } from "../../src/theme/colors";
import { errorMessage } from "../../src/utils/format";
import { showConfirmDialog } from "../../src/utils/alert";

const MODES: { mode: ThemeMode; label: string }[] = [
  { mode: "system", label: "Theo hệ thống" },
  { mode: "light", label: "Sáng" },
  { mode: "dark", label: "Tối" },
];

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const { colors, mode } = useAppTheme();
  const consent = useAppSelector((s) => s.settings.aiConsent);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const today = useToday();
  const workouts = useAppSelector((s) => s.workouts.all);
  const goals = useAppSelector((s) => s.goals.items);

  // Thống kê nhanh
  const totalSessions = workouts.length;
  const totalMinutes = workouts.reduce((acc, w) => acc + (w.duration || 0), 0);
  const totalHours = Math.round(totalMinutes / 60);
  const totalCalories = workouts.reduce((acc, w) => acc + (w.calories || 0), 0);
  const formattedCalories =
    totalCalories >= 1000
      ? `${(totalCalories / 1000).toFixed(1)}k`
      : `${totalCalories}`;

  // Mục tiêu hiện tại và tiến độ
  const currentGoal = goals[0] ?? null;
  const goalP = currentGoal ? goalProgress(currentGoal, workouts, today) : null;

  // Hoạt động gần đây nhất
  const recentWorkout = workouts[0] ?? null;

  const [check, setCheck] = useState<{
    status: "idle" | "loading" | "ok" | "error";
    text?: string;
  }>({ status: "idle" });

  useEffect(() => {
    const loadUser = async () => {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
      if (user?.avatar) {
        setAvatarUri(user.avatar);
      } else if (user?.id) {
        const savedAvatar = await getJson<string | null>(`@fitlog/avatar-${user.id}`, null);
        if (savedAvatar) setAvatarUri(savedAvatar);
      }
    };
    void loadUser();
    void dispatch(fetchAllWorkouts());
    void dispatch(fetchGoals());
  }, [dispatch]);

  const pickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showConfirmDialog(
          "Cần quyền truy cập ảnh",
          "Hãy cho phép FitLog truy cập thư viện ảnh để đổi ảnh đại diện.",
          () => { },
          "Đã hiểu",
          "Đóng"
        );
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!res.canceled && res.assets[0]?.uri) {
        const localUri = res.assets[0].uri;
        setUploadingAvatar(true);
        try {
          // 1. Tải ảnh lên máy chủ backend (/api/media) - Lưu file vật lý và metadata
          const serverImagePath = await uploadWorkoutImage(localUri);
          // 2. Lưu trực tiếp đường dẫn /media/<id> vào Database MySQL bảng users (/api/auth/avatar)
          const updatedUser = await authService.updateAvatar(serverImagePath);
          setCurrentUser(updatedUser);
          setAvatarUri(serverImagePath);
          if (currentUser?.id) {
            await setJson(`@fitlog/avatar-${currentUser.id}`, serverImagePath);
          }
        } catch (err) {
          console.error("Lỗi upload ảnh lên server:", err);
          // Fallback lưu local nếu server lỗi tạm thời
          setAvatarUri(localUri);
          if (currentUser?.id) {
            await setJson(`@fitlog/avatar-${currentUser.id}`, localUri);
          }
        } finally {
          setUploadingAvatar(false);
        }
      }
    } catch (e) {
      console.warn("Lỗi chọn ảnh:", e);
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    try {
      setUploadingAvatar(true);
      const updatedUser = await authService.updateAvatar(null);
      setCurrentUser(updatedUser);
      setAvatarUri(null);
      if (currentUser?.id) {
        await setJson(`@fitlog/avatar-${currentUser.id}`, null);
      }
    } catch (e) {
      console.error("Lỗi xóa avatar:", e);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarPress = () => {
    if (avatarUri) {
      showConfirmDialog(
        "Đổi ảnh đại diện",
        "Bạn muốn chọn ảnh mới hay xóa ảnh hiện tại?",
        () => {
          void pickAvatar();
        },
        "Chọn ảnh mới",
        "Hủy"
      );
    } else {
      void pickAvatar();
    }
  };

  const testConnection = async () => {
    setCheck({ status: "loading" });
    try {
      const ms = await pingApi();
      setCheck({ status: "ok", text: `Kết nối thành công (${ms} ms).` });
    } catch (e) {
      setCheck({ status: "error", text: errorMessage(e) });
    }
  };

  const handleLogout = () => {
    showConfirmDialog(
      "Xác nhận đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng FitLog?",
      async () => {
        try {
          await authService.logout();
          dispatch(resetAccountData());
          router.replace("/auth/login" as any);
        } catch (e) {
          console.error("Lỗi khi đăng xuất:", e);
        }
      },
      "Đăng xuất",
      "Hủy",
    );
  };

  const menuItem = (
    icon: IconName,
    title: string,
    iconColor: string,
    onPress: () => void,
    subtitle?: string,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 12,
        opacity: pressed ? 0.75 : 1,
        gap: 12,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText weight="semi" size="md">
          {title}
        </AppText>
        {subtitle ? (
          <AppText tone="muted" size="xs">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Icon name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );

  return (
    <Screen>
      {/* 1. Profile Header & Avatar (Lấy cảm hứng từ ảnh mẫu) */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 6,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
          {/* Avatar viền tròn neon có thể bấm để đổi ảnh */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đổi ảnh đại diện"
            onPress={handleAvatarPress}
            style={({ pressed }) => ({
              position: "relative",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 34,
                backgroundColor: colors.brandSoft,
                borderWidth: 2.5,
                borderColor: colors.brand,
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
              }}
            >
              {uploadingAvatar ? (
                <ActivityIndicator color={colors.brand} size="small" />
              ) : avatarUri?.startsWith("/media/") ? (
                <PrivateWorkoutImage
                  image={avatarUri}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <AppText weight="bold" style={{ color: colors.brand, fontSize: 26 }}>
                  {currentUser?.name
                    ? currentUser.name.charAt(0).toUpperCase()
                    : "U"}
                </AppText>
              )}
            </View>
            <View
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                backgroundColor: colors.brand,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: colors.panel,
                padding: 4,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Icon name="camera" size={12} color="#FFFFFF" />
            </View>
          </Pressable>

          {/* Tên & Status / Email */}
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <AppText weight="bold" size="lg" numberOfLines={1}>
                {currentUser?.name || "Người dùng FitLog"}
              </AppText>
              {currentUser?.role === "admin" && (
                <View
                  style={{
                    backgroundColor: "#2563EB",
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: 6,
                  }}
                >
                  <AppText weight="bold" size="xs" style={{ color: "#FFF" }}>
                    ADMIN
                  </AppText>
                </View>
              )}
            </View>
            <AppText tone="muted" size="xs">
              Không ngừng cố gắng 💪
            </AppText>
            <AppText tone="muted" size="xs" numberOfLines={1}>
              {currentUser?.email}
            </AppText>
          </View>
        </View>
      </View>

      {/* 2. Quick Stats 3 Ô (Buổi tập | Tổng thời gian | Lượng calo) */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Card style={{ flex: 1, padding: 12, alignItems: "center", gap: 3 }}>
          <Icon name="calendar" size={18} color={colors.brand} />
          <AppText weight="bold" size="lg" style={{ color: colors.color }}>
            {totalSessions}
          </AppText>
          <AppText tone="muted" size="xs">
            Buổi tập
          </AppText>
        </Card>

        <Card style={{ flex: 1, padding: 12, alignItems: "center", gap: 3 }}>
          <Icon name="timer-outline" size={18} color={colors.brand} />
          <AppText weight="bold" size="lg" style={{ color: colors.color }}>
            {totalHours} giờ
          </AppText>
          <AppText tone="muted" size="xs">
            Tổng thời gian
          </AppText>
        </Card>

        <Card style={{ flex: 1, padding: 12, alignItems: "center", gap: 3 }}>
          <Icon name="flame" size={18} color="#F59E0B" />
          <AppText weight="bold" size="lg" style={{ color: colors.color }}>
            {formattedCalories}
          </AppText>
          <AppText tone="muted" size="xs">
            Lượng calo
          </AppText>
        </Card>
      </View>

      {/* 3. Mục tiêu hiện tại (Showcase tiến độ) */}
      <Card>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name="flag" size={18} color={colors.brand} />
            <AppText weight="bold" size="md">
              Mục tiêu hiện tại
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/goals")}
            hitSlop={8}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              <AppText tone="brand" size="xs" weight="semi">
                {currentGoal ? "Chỉnh sửa" : "Tạo mới"}
              </AppText>
              <Icon name="chevron-forward" size={14} color={colors.brand} />
            </View>
          </Pressable>
        </View>

        {currentGoal && goalP ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 4 }}>
            {/* Vòng tròn tiến độ % */}
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 29,
                borderWidth: 3,
                borderColor: goalP.completed ? colors.success : colors.brand,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: colors.brandSoft,
              }}
            >
              <AppText weight="bold" size="sm" style={{ color: colors.color }}>
                {goalP.percent}%
              </AppText>
            </View>

            {/* Chi tiết mục tiêu và progress bar */}
            <View style={{ flex: 1, gap: 6 }}>
              <AppText weight="bold" size="md" numberOfLines={1}>
                {currentGoal.title}
              </AppText>
              <AppText tone="muted" size="xs">
                {goalP.current} / {goalP.target} {metricUnit[currentGoal.metric]}
              </AppText>
              <ProgressBar
                ratio={goalP.ratio}
                color={goalP.completed ? colors.success : colors.brand}
                height={6}
              />
            </View>
          </View>
        ) : (
          <View style={{ paddingVertical: 8, alignItems: "center", gap: 8 }}>
            <AppText tone="muted" size="sm">
              Bạn chưa đặt mục tiêu luyện tập nào.
            </AppText>
            <AppButton
              label="Đặt mục tiêu ngay"
              icon="flag"
              size="sm"
              variant="secondary"
              onPress={() => router.push("/goals/form")}
            />
          </View>
        )}
      </Card>

      {/* 4. Hoạt động gần đây (Showcase bài tập mới nhất) */}
      <Card>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name="barbell" size={18} color={colors.brand} />
            <AppText weight="bold" size="md">
              Hoạt động gần đây
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/workouts")}
            hitSlop={8}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              <AppText tone="brand" size="xs" weight="semi">
                Xem tất cả
              </AppText>
              <Icon name="chevron-forward" size={14} color={colors.brand} />
            </View>
          </Pressable>
        </View>

        {recentWorkout ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/workouts")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              backgroundColor: colors.background,
              padding: 10,
              borderRadius: 12,
              marginTop: 4,
            }}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                backgroundColor: colors.brandSoft,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Icon
                name={workoutIcon[recentWorkout.type] ?? "fitness"}
                size={22}
                color={colors.brand}
              />
            </View>

            <View style={{ flex: 1, gap: 2 }}>
              <AppText weight="bold" numberOfLines={1}>
                {recentWorkout.title}
              </AppText>
              <AppText tone="muted" size="xs">
                📅 {formatDate(recentWorkout.date)}
              </AppText>
              <AppText tone="muted" size="xs">
                ⏱️ {recentWorkout.duration} phút
                {recentWorkout.calories ? ` · 🔥 ${recentWorkout.calories} kcal` : ""}
                {recentWorkout.distance > 0 ? ` · 📍 ${recentWorkout.distance} km` : ""}
              </AppText>
            </View>

            <Icon name="trending-up" size={20} color={colors.brand} />
          </Pressable>
        ) : (
          <View style={{ paddingVertical: 8, alignItems: "center", gap: 8 }}>
            <AppText tone="muted" size="sm">
              Chưa có buổi tập nào được ghi nhận.
            </AppText>
            <AppButton
              label="Ghi buổi tập đầu tiên"
              icon="add-circle"
              size="sm"
              variant="lime"
              onPress={() => router.push("/workout/form")}
            />
          </View>
        )}
      </Card>

      {/* 5. Menu Danh sách chức năng & Điều hướng */}
      <Card style={{ padding: 4 }}>
        {menuItem(
          "stats-chart",
          "Thống kê chi tiết",
          colors.brand,
          () => router.push("/progress"),
          "Biểu đồ số phút, calo và phân bổ bài tập",
        )}
        <View style={{ height: 1, backgroundColor: colors.borderColor, marginHorizontal: 12 }} />
        {menuItem(
          "calendar-outline",
          "Kế hoạch & Lịch tập tuần",
          "#F59E0B",
          () => router.push("/planner"),
          "Lên kế hoạch tập luyện và phân bổ ngày nghỉ",
        )}
        <View style={{ height: 1, backgroundColor: colors.borderColor, marginHorizontal: 12 }} />
        {menuItem(
          "alarm-outline",
          "Nhắc lịch tập",
          "#3B82F6",
          () => router.push("/reminders"),
          "Thông báo hằng ngày hoặc theo thứ",
        )}
        {currentUser?.role === "admin" && (
          <>
            <View style={{ height: 1, backgroundColor: colors.borderColor, marginHorizontal: 12 }} />
            {menuItem(
              "shield-checkmark-outline",
              "Bảng điều khiển Quản trị (Admin)",
              "#8B5CF6",
              () => router.push("/admin/dashboard" as any),
              "KPI hệ thống, quản lý người dùng và audit logs",
            )}
          </>
        )}
      </Card>

      {/* 6. Cài đặt giao diện */}
      <Card>
        <SectionTitle title="Giao diện" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {MODES.map((m) => (
            <Chip
              key={m.mode}
              label={m.label}
              selected={mode === m.mode}
              onPress={() => dispatch(setThemeMode(m.mode))}
            />
          ))}
        </View>
      </Card>

      {/* 7. Cài đặt Quyền riêng tư & AI */}
      <Card>
        <SectionTitle title="AI Coach" />
        <AppText tone="muted" size="sm">
          Trạng thái:{" "}
          {isAiConfigured()
            ? "đã cấu hình backend AI"
            : "chưa cấu hình backend AI"}
          .
        </AppText>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <AppText weight="semi">
              Cho phép gửi số liệu tổng hợp tới AI
            </AppText>
            <AppText tone="muted" size="xs">
              Không gồm tên buổi tập, ghi chú, vị trí, ảnh.
            </AppText>
          </View>
          <Switch
            accessibilityLabel="Cho phép gửi số liệu tới AI"
            value={consent}
            onValueChange={(v) => {
              dispatch(setAiConsent(v));
            }}
            trackColor={{ true: colors.brand, false: colors.borderColor }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      {/* Thống kê sử dụng ứng dụng (Tracking) */}
      <TrackingConsentCard />

      {/* 8. Kết nối máy chủ & Hệ thống */}
      {/* <Card>
        <SectionTitle title="Kết nối máy chủ" />
        <AppText tone="muted" size="sm" selectable>
          API: {API_BASE_URL}
        </AppText>
        <AppButton
          label="Kiểm tra kết nối"
          icon="pulse"
          variant="secondary"
          size="sm"
          loading={check.status === "loading"}
          onPress={testConnection}
        />
        {check.text ? (
          <AppText
            tone={check.status === "ok" ? "success" : "danger"}
            size="sm"
            accessibilityLiveRegion="polite"
          >
            {check.text}
          </AppText>
        ) : null}
      </Card> */}

      {/* 9. Nút Đăng xuất */}
      <Card style={{ marginTop: 4 }}>
        <AppButton
          label="Đăng xuất tài khoản"
          icon="log-out-outline"
          variant="danger"
          onPress={handleLogout}
        />
      </Card>

      <AppText
        tone="muted"
        size="xs"
        style={{ textAlign: "center", marginTop: 4, marginBottom: 8 }}
      >
        FitLog {Constants.expoConfig?.version ?? "v1.0"}
      </AppText>
    </Screen>
  );
}
