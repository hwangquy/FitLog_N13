import TrackingConsentCard from "../../src/components/admin/TrackingConsentCard";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Switch, View } from "react-native";
import {
  AppButton,
  AppText,
  Card,
  Chip,
  Icon,
  Screen,
  ScreenHeader,
  SectionTitle,
} from "../../src/components/ui";
import { API_BASE_URL } from "../../src/config/env";
import { useAppTheme } from "../../src/hooks/useAppTheme";
import { isAiConfigured } from "../../src/services/ai";
import { pingApi } from "../../src/services/api";
import { authService, User } from "../../services/authService";
import { useAppDispatch, useAppSelector } from "../../src/store/hooks";
import { resetAccountData } from '../../src/store';
import { setAiConsent, setThemeMode } from "../../src/store/settingsSlice";
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
  const [check, setCheck] = useState<{
    status: "idle" | "loading" | "ok" | "error";
    text?: string;
  }>({ status: "idle" });

  useEffect(() => {
    const loadUser = async () => {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
    };
    void loadUser();
  }, []);

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

  const link = (
    icon: "flag-outline" | "alarm-outline",
    title: string,
    subtitle: string,
    path: "/goals" | "/reminders",
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => router.push(path)}
    >
      <Card pressable flexDirection="row" alignItems="center" gap="$3">
        <Icon name={icon} size={24} color={colors.brand} />
        <View style={{ flex: 1 }}>
          <AppText weight="bold">{title}</AppText>
          <AppText tone="muted" size="xs">
            {subtitle}
          </AppText>
        </View>
        <Icon name="chevron-forward" size={18} color={colors.muted} />
      </Card>
    </Pressable>
  );

  return (
    <Screen>
      <ScreenHeader eyebrow="Tài khoản" title="Cá nhân" />
      <TrackingConsentCard />

      {/* Thông tin User & Badge Phân Quyền */}
      {currentUser && (
        <Card style={{ marginBottom: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.brand,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <AppText weight="bold" style={{ color: "#FFF", fontSize: 20 }}>
                {currentUser.name
                  ? currentUser.name.charAt(0).toUpperCase()
                  : "U"}
              </AppText>
            </View>
            <View style={{ flex: 1 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <AppText weight="bold" size="lg">
                  {currentUser.name || "Người dùng FitLog"}
                </AppText>
                {currentUser.role === "admin" && (
                  <View
                    style={{
                      backgroundColor: "#2563EB",
                      paddingHorizontal: 8,
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
                {currentUser.email}
              </AppText>
            </View>
          </View>
        </Card>
      )}

      {/* Thẻ Quản Trị Hệ Thống dành riêng cho ADMIN */}
      {currentUser?.role === "admin" && (
        <Card style={{ borderColor: "#2563EB", borderWidth: 1 }}>
          <SectionTitle title="Quyền Quản Trị" />
          <AppText tone="muted" size="sm">
            Bạn có quyền truy cập vào bảng điều khiển thống kê và quản lý toàn
            bộ người dùng.
          </AppText>
          <AppButton
            label="Vào trang Admin Dashboard"
            icon="analytics-outline"
            variant="secondary"
            onPress={() => router.push("/admin/dashboard" as any)}
          />
        </Card>
      )}

      {link(
        "flag-outline",
        "Mục tiêu",
        "Tạo, sửa, xoá và theo dõi mục tiêu",
        "/goals",
      )}
      <AppButton label="Lịch tập tuần" icon="calendar-outline" fullWidth variant="secondary" onPress={() => router.push('/planner')} />
      {link(
        "alarm-outline",
        "Nhắc lịch tập",
        "Thông báo hằng ngày hoặc theo thứ",
        "/reminders",
      )}

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

      <Card>
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
      </Card>

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

      {/* Nút Đăng xuất Cross-Platform */}
      <Card style={{ marginTop: 8 }}>
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
        style={{ textAlign: "center", marginTop: 8 }}
      >
        FitLog {Constants.expoConfig?.version ?? ""}
      </AppText>
    </Screen>
  );
}
