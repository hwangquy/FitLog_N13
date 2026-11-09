import React, { useState } from "react";
import {
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
import { showError } from '../../src/components/ui/dialogs';
import { authService } from "../../services/authService";
import { useRouter } from "expo-router";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Quản lý trạng thái con mắt riêng cho từng ô mật khẩu
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (
      !fullName.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      showError("Thông báo", "Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    if (password !== confirmPassword) {
      showError("Lỗi", "Mật khẩu xác nhận không trùng khớp!");
      return;
    }

    if (password.length < 10) {
      showError("Lỗi", "Mật khẩu phải chứa ít nhất 10 ký tự!");
      return;
    }

    try {
      setLoading(true);
      await authService.register(fullName.trim(), email.trim(), password);
      // Backend cấp phiên ngay khi tạo tài khoản; Bootstrap tự chuyển về màn chính.
    } catch (error: any) {
      showError("Lỗi đăng ký", error.message || "Đã có lỗi xảy ra.");
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

          {/* Main Container */}
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
                  Tham gia cộng đồng <Text color="#60A5FA">FitLog</Text> hôm nay
                </Heading>
                <Text fontSize="$3" color="#94A3B8" lineHeight={22}>
                  Tạo tài khoản cá nhân để bắt đầu theo dõi sức khỏe, lịch trình
                  tập luyện và đồng bộ dữ liệu thông minh.
                </Text>
              </YStack>

              <XStack gap="$4" alignItems="center">
                <YStack>
                  <Text color="white" fontWeight="bold" fontSize="$5">
                    Nhanh chóng
                  </Text>
                  <Text color="#64748B" fontSize="$1">
                    Bảo mật dữ liệu
                  </Text>
                </YStack>
                <View
                  width={1}
                  height={24}
                  backgroundColor="rgba(255, 255, 255, 0.1)"
                />
                <YStack>
                  <Text color="white" fontWeight="bold" fontSize="$5">
                    Đồng bộ
                  </Text>
                  <Text color="#64748B" fontSize="$1">
                    Trên mọi thiết bị
                  </Text>
                </YStack>
              </XStack>
            </YStack>

            {/* Cột Phải: Form Đăng Ký */}
            <YStack
              width={420}
              padding="$8"
              justifyContent="center"
              gap="$3.5"
              $sm={{ width: "100%", padding: "$5" }}
            >
              <YStack gap="$1">
                <Heading size="$7" fontWeight="bold" color="white">
                  Đăng Ký
                </Heading>
                <Text fontSize="$2" color="#94A3B8">
                  Điền thông tin bên dưới để tạo tài khoản mới
                </Text>
              </YStack>

              <YStack gap="$3" marginTop="$2">
                {/* Họ và tên */}
                <YStack gap="$1.5">
                  <Text fontSize="$2" fontWeight="600" color="#E2E8F0">
                    Họ và tên
                  </Text>
                  <Input
                    size="$4"
                    borderRadius={10}
                    placeholder="Nguyễn Văn A"
                    placeholderTextColor="#475569"
                    value={fullName}
                    onChangeText={setFullName}
                    backgroundColor="rgba(15, 23, 42, 0.6)"
                    borderColor="rgba(255, 255, 255, 0.15)"
                    color="white"
                    focusStyle={{ borderColor: "#60A5FA" }}
                  />
                </YStack>

                {/* Email */}
                <YStack gap="$1.5">
                  <Text fontSize="$2" fontWeight="600" color="#E2E8F0">
                    Email
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

                {/* Mật khẩu */}
                <YStack gap="$1.5">
                  <Text fontSize="$2" fontWeight="600" color="#E2E8F0">
                    Mật khẩu
                  </Text>
                  <XStack position="relative" alignItems="center">
                    <Input
                      flex={1}
                      size="$4"
                      borderRadius={10}
                      paddingRight={44}
                      placeholder="••••••••"
                      placeholderTextColor="#475569"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
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
                        name={showPassword ? "eye-outline" : "eye-off-outline"}
                        size={20}
                        color="#94A3B8"
                      />
                    </Pressable>
                  </XStack>
                </YStack>

                {/* Xác nhận mật khẩu */}
                <YStack gap="$1.5">
                  <Text fontSize="$2" fontWeight="600" color="#E2E8F0">
                    Xác nhận mật khẩu
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

                {/* Nút Đăng ký */}
                <Button
                  marginTop="$2"
                  size="$4.5"
                  borderRadius={10}
                  backgroundColor="#2563EB"
                  pressStyle={{ backgroundColor: "#1D4ED8", opacity: 0.9 }}
                  hoverStyle={{ backgroundColor: "#3B82F6" }}
                  onPress={handleRegister}
                  disabled={loading}
                  icon={loading ? <Spinner color="white" /> : undefined}
                  cursor="pointer"
                >
                  <Text color="white" fontWeight="bold" fontSize="$3">
                    {loading ? "Đang khởi tạo..." : "Tạo Tài Khoản"}
                  </Text>
                </Button>
              </YStack>

              {/* Chuyển qua màn hình Đăng nhập */}
              <XStack
                justifyContent="center"
                alignItems="center"
                marginTop="$2"
                gap="$1.5"
              >
                <Text fontSize="$2" color="#64748B">
                  Đã có tài khoản?
                </Text>
                <Text
                  fontSize="$2"
                  color="#60A5FA"
                  fontWeight="bold"
                  cursor="pointer"
                  onPress={() => router.push("/auth/login" as any)}
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
