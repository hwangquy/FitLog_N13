import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from "react-native";
import {
  Button,
  Input,
  YStack,
  XStack,
  Text,
  Heading,
  Spinner,
  View,
} from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { showError } from "../../src/components/ui/dialogs";
import { authService } from "../../services/authService";
import { useRouter } from "expo-router";

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const router = useRouter();

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Bước 1: Gửi mã OTP về Email
  const handleSendOtp = async () => {
    if (!email.trim()) {
      showError("Thông báo", "Vui lòng nhập email đã đăng ký!");
      return;
    }

    try {
      setLoading(true);
      await authService.forgotPassword(email.trim());
      setStep(2);
      setCountdown(60);
    } catch (error: any) {
      showError("Lỗi gửi OTP", error.message || "Không thể gửi mã OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Bước 2: Xác thực mã OTP 6 chữ số
  const handleVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otp.trim())) {
      showError("Lỗi", "Vui lòng nhập đúng mã OTP gồm 6 chữ số!");
      return;
    }

    try {
      setLoading(true);
      await authService.verifyOtp(email.trim(), otp.trim());
      setStep(3);
    } catch (error: any) {
      showError("Mã OTP không hợp lệ", error.message || "Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // Bước 3: Đặt lại mật khẩu mới
  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      showError("Thông báo", "Vui lòng nhập đầy đủ mật khẩu mới!");
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("Lỗi", "Mật khẩu xác nhận không trùng khớp!");
      return;
    }

    if (newPassword.length < 10) {
      showError("Lỗi", "Mật khẩu phải chứa ít nhất 10 ký tự!");
      return;
    }

    try {
      setLoading(true);
      await authService.resetPassword(email.trim(), otp.trim(), newPassword);

      if (Platform.OS === "web") {
        window.alert("Đặt lại mật khẩu thành công! Vui lòng đăng nhập.");
        router.replace("/auth/login" as any);
      } else {
        Alert.alert(
          "Thành công",
          "Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.",
          [
            {
              text: "Đăng nhập ngay",
              onPress: () => router.replace("/auth/login" as any),
            },
          ],
          { cancelable: false },
        );
      }
    } catch (error: any) {
      showError("Lỗi đặt lại mật khẩu", error.message || "Đã có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#090D16" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack
          flex={1}
          justifyContent="center"
          alignItems="center"
          padding="$4"
          position="relative"
          overflow="hidden"
        >
          {/* Background Neon Glow Effects */}
          <View
            position="absolute"
            top={-100}
            left={-100}
            width={400}
            height={400}
            borderRadius={200}
            backgroundColor="#2563EB"
            opacity={0.25}
            style={{ filter: "blur(100px)" }}
          />
          <View
            position="absolute"
            bottom={-100}
            right={-100}
            width={400}
            height={400}
            borderRadius={200}
            backgroundColor="#7C3AED"
            opacity={0.25}
            style={{ filter: "blur(100px)" }}
          />

          {/* Main Container (2 cột đồng bộ với login.tsx và register.tsx) */}
          <XStack
            width="100%"
            maxWidth={900}
            borderRadius={24}
            borderWidth={1}
            borderColor="rgba(255, 255, 255, 0.1)"
            backgroundColor="rgba(15, 23, 42, 0.75)"
            overflow="hidden"
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 20 }}
            shadowOpacity={0.4}
            shadowRadius={30}
            elevation={15}
            $sm={{ flexDirection: "column" }}
            style={{ backdropFilter: "blur(16px)" }}
          >
            {/* Cột Trái: Banner thương hiệu */}
            <YStack
              flex={1}
              padding="$8"
              justifyContent="space-between"
              backgroundColor="rgba(37, 99, 235, 0.15)"
              borderRightWidth={1}
              borderRightColor="rgba(255, 255, 255, 0.08)"
              $sm={{ padding: "$5" }}
            >
              <XStack alignItems="center" gap="$2">
                <YStack
                  width={42}
                  height={42}
                  borderRadius={12}
                  backgroundColor="#2563EB"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Text fontSize={22}>🏋️</Text>
                </YStack>
                <Heading fontSize="$7" fontWeight="bold" color="white">
                  FitLog
                </Heading>
              </XStack>

              <YStack gap="$3" marginVertical="$6">
                <Heading
                  fontSize="$9"
                  fontWeight="800"
                  color="white"
                  lineHeight={44}
                >
                  Khôi phục quyền truy cập <Text color="#60A5FA">an toàn</Text>
                </Heading>
                <Text fontSize="$3" color="#94A3B8" lineHeight={22}>
                  Xác thực qua mã OTP 6 chữ số gửi về email đã đăng ký để thiết
                  lập lại mật khẩu mới cho tài khoản FitLog của bạn.
                </Text>
              </YStack>

              <XStack gap="$4" alignItems="center">
                <YStack>
                  <Text color="white" fontWeight="bold" fontSize="$5">
                    OTP 6 số
                  </Text>
                  <Text color="#64748B" fontSize="$1">
                    Hiệu lực 5 phút
                  </Text>
                </YStack>
                <View
                  width={1}
                  height={24}
                  backgroundColor="rgba(255, 255, 255, 0.1)"
                />
                <YStack>
                  <Text color="white" fontWeight="bold" fontSize="$5">
                    Bảo mật
                  </Text>
                  <Text color="#64748B" fontSize="$1">
                    Mã hóa mật khẩu
                  </Text>
                </YStack>
              </XStack>
            </YStack>

            {/* Cột Phải: Form Quên Mật Khẩu 3 Bước */}
            <YStack
              width={420}
              padding="$8"
              justifyContent="center"
              gap="$4"
              $sm={{ width: "100%", padding: "$5" }}
            >
              <XStack justifyContent="space-between" alignItems="center">
                <Heading size="$7" fontWeight="bold" color="white">
                  {step === 1 && "Quên Mật Khẩu"}
                  {step === 2 && "Nhập Mã OTP"}
                  {step === 3 && "Mật Khẩu Mới"}
                </Heading>
                <Text fontSize="$2" color="#60A5FA" fontWeight="bold">
                  Bước {step}/3
                </Text>
              </XStack>

              <Text fontSize="$2" color="#94A3B8">
                {step === 1 &&
                  "Nhập email tài khoản của bạn để nhận mã xác thực OTP"}
                {step === 2 &&
                  `Đã gửi mã OTP 6 chữ số tới ${email.trim().toLowerCase()}`}
                {step === 3 &&
                  `Nhập mật khẩu mới cho ${email.trim().toLowerCase()}`}
              </Text>

              {/* BƯỚC 1: NHẬP EMAIL */}
              {step === 1 && (
                <YStack gap="$3.5" marginTop="$2">
                  <YStack gap="$1.5">
                    <Text fontSize="$2" fontWeight="600" color="#E2E8F0">
                      Email đã đăng ký
                    </Text>
                    <Input
                      size="$4"
                      borderRadius={10}
                      placeholder="email@example.com"
                      placeholderTextColor="#475569"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      backgroundColor="rgba(15, 23, 42, 0.6)"
                      borderColor="rgba(255, 255, 255, 0.15)"
                      color="white"
                      focusStyle={{ borderColor: "#60A5FA" }}
                    />
                  </YStack>

                  <Button
                    marginTop="$2"
                    size="$4.5"
                    borderRadius={10}
                    backgroundColor="#2563EB"
                    pressStyle={{ backgroundColor: "#1D4ED8", opacity: 0.9 }}
                    hoverStyle={{ backgroundColor: "#3B82F6" }}
                    onPress={handleSendOtp}
                    disabled={loading}
                    icon={loading ? <Spinner color="white" /> : undefined}
                    cursor="pointer"
                  >
                    <Text color="white" fontWeight="bold" fontSize="$3">
                      {loading ? "Đang gửi mã OTP..." : "Gửi Mã OTP"}
                    </Text>
                  </Button>
                </YStack>
              )}

              {/* BƯỚC 2: NHẬP MÃ OTP */}
              {step === 2 && (
                <YStack gap="$3.5" marginTop="$2">
                  <YStack gap="$1.5">
                    <Text fontSize="$2" fontWeight="600" color="#E2E8F0">
                      Mã OTP (6 chữ số)
                    </Text>
                    <Input
                      size="$4"
                      borderRadius={10}
                      placeholder="000000"
                      placeholderTextColor="#475569"
                      value={otp}
                      onChangeText={(text) =>
                        setOtp(text.replace(/[^0-9]/g, ""))
                      }
                      keyboardType="number-pad"
                      maxLength={6}
                      textAlign="center"
                      letterSpacing={8}
                      fontSize="$6"
                      fontWeight="bold"
                      backgroundColor="rgba(15, 23, 42, 0.6)"
                      borderColor="rgba(255, 255, 255, 0.15)"
                      color="white"
                      focusStyle={{ borderColor: "#60A5FA" }}
                    />
                  </YStack>

                  <XStack justifyContent="space-between" alignItems="center">
                    <Text
                      fontSize="$2"
                      color="#94A3B8"
                      cursor="pointer"
                      onPress={() => {
                        setOtp("");
                        setStep(1);
                      }}
                    >
                      ← Đổi email khác
                    </Text>

                    <Text
                      fontSize="$2"
                      color={countdown > 0 ? "#64748B" : "#60A5FA"}
                      fontWeight="600"
                      cursor={countdown > 0 ? "default" : "pointer"}
                      onPress={() => {
                        if (countdown === 0 && !loading) handleSendOtp();
                      }}
                    >
                      {countdown > 0
                        ? `Gửi lại (${countdown}s)`
                        : "Gửi lại mã OTP"}
                    </Text>
                  </XStack>

                  <Button
                    marginTop="$2"
                    size="$4.5"
                    borderRadius={10}
                    backgroundColor="#2563EB"
                    pressStyle={{ backgroundColor: "#1D4ED8", opacity: 0.9 }}
                    hoverStyle={{ backgroundColor: "#3B82F6" }}
                    onPress={handleVerifyOtp}
                    disabled={loading}
                    icon={loading ? <Spinner color="white" /> : undefined}
                    cursor="pointer"
                  >
                    <Text color="white" fontWeight="bold" fontSize="$3">
                      {loading ? "Đang kiểm tra..." : "Xác Nhận Mã OTP"}
                    </Text>
                  </Button>
                </YStack>
              )}

              {/* BƯỚC 3: ĐẶT MẬT KHẨU MỚI */}
              {step === 3 && (
                <YStack gap="$3.5" marginTop="$2">
                  <YStack gap="$1.5">
                    <Text fontSize="$2" fontWeight="600" color="#E2E8F0">
                      Mật khẩu mới
                    </Text>
                    <XStack position="relative" alignItems="center">
                      <Input
                        flex={1}
                        size="$4"
                        borderRadius={10}
                        paddingRight={44}
                        placeholder="Ít nhất 10 ký tự"
                        placeholderTextColor="#475569"
                        secureTextEntry={!showPassword}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        backgroundColor="rgba(15, 23, 42, 0.6)"
                        borderColor="rgba(255, 255, 255, 0.15)"
                        color="white"
                        focusStyle={{ borderColor: "#60A5FA" }}
                      />
                      <Pressable
                        onPress={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: 12,
                          padding: 4,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons
                          name={
                            showPassword ? "eye-outline" : "eye-off-outline"
                          }
                          size={20}
                          color="#94A3B8"
                        />
                      </Pressable>
                    </XStack>
                  </YStack>

                  <YStack gap="$1.5">
                    <Text fontSize="$2" fontWeight="600" color="#E2E8F0">
                      Xác nhận mật khẩu mới
                    </Text>
                    <XStack position="relative" alignItems="center">
                      <Input
                        flex={1}
                        size="$4"
                        borderRadius={10}
                        paddingRight={44}
                        placeholder="••••••••"
                        placeholderTextColor="#475569"
                        secureTextEntry={!showConfirmPassword}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        backgroundColor="rgba(15, 23, 42, 0.6)"
                        borderColor="rgba(255, 255, 255, 0.15)"
                        color="white"
                        focusStyle={{ borderColor: "#60A5FA" }}
                      />
                      <Pressable
                        onPress={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        style={{
                          position: "absolute",
                          right: 12,
                          padding: 4,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons
                          name={
                            showConfirmPassword
                              ? "eye-outline"
                              : "eye-off-outline"
                          }
                          size={20}
                          color="#94A3B8"
                        />
                      </Pressable>
                    </XStack>
                  </YStack>

                  <Button
                    marginTop="$2"
                    size="$4.5"
                    borderRadius={10}
                    backgroundColor="#2563EB"
                    pressStyle={{ backgroundColor: "#1D4ED8", opacity: 0.9 }}
                    hoverStyle={{ backgroundColor: "#3B82F6" }}
                    onPress={handleResetPassword}
                    disabled={loading}
                    icon={loading ? <Spinner color="white" /> : undefined}
                    cursor="pointer"
                  >
                    <Text color="white" fontWeight="bold" fontSize="$3">
                      {loading ? "Đang lưu mật khẩu..." : "Đặt Lại Mật Khẩu"}
                    </Text>
                  </Button>
                </YStack>
              )}

              {/* Quay lại Đăng nhập */}
              <XStack
                justifyContent="center"
                alignItems="center"
                marginTop="$2"
                gap="$1.5"
              >
                <Text fontSize="$2" color="#64748B">
                  Nhớ lại mật khẩu?
                </Text>
                <Text
                  fontSize="$2"
                  color="#60A5FA"
                  fontWeight="bold"
                  cursor="pointer"
                  onPress={() => router.replace("/auth/login" as any)}
                >
                  Đăng nhập
                </Text>
              </XStack>
            </YStack>
          </XStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
