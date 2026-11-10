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

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // Trạng thái ẩn/hiện mật khẩu
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showError("Thông báo", "Vui lòng nhập đầy đủ Email và Mật khẩu!");
      return;
    }

    try {
      setLoading(true);
      const user = await authService.login(email.trim(), password);
      // Bootstrap observes the verified session and navigates into the app.
    } catch (error: any) {
      showError("Lỗi đăng nhập", error.message || "Đã có lỗi xảy ra.");
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
          {/* Các quầng sáng Background Gradient hiệu ứng Neon */}
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

          {/* Container chính */}
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
                  Chinh phục mục tiêu <Text color="#60A5FA">luyện tập</Text> mỗi
                  ngày
                </Heading>
                <Text fontSize="$3" color="#94A3B8" lineHeight={22}>
                  Theo dõi chỉ số calo, nhật ký tập luyện và nhận lộ trình tối
                  ưu từ AI Coach ngay trên thiết bị của bạn.
                </Text>
              </YStack>

              <XStack gap="$4" alignItems="center">
                <YStack>
                  <Text color="white" fontWeight="bold" fontSize="$5">
                    100%
                  </Text>
                  <Text color="#64748B" fontSize="$1">
                    Miễn phí
                  </Text>
                </YStack>
                <View
                  width={1}
                  height={24}
                  backgroundColor="rgba(255, 255, 255, 0.1)"
                />
                <YStack>
                  <Text color="white" fontWeight="bold" fontSize="$5">
                    AI Coach
                  </Text>
                  <Text color="#64748B" fontSize="$1">
                    Tự động hóa
                  </Text>
                </YStack>
              </XStack>
            </YStack>

            {/* Cột Phải: Form Đăng Nhập */}
            <YStack
              width={420}
              padding="$8"
              justifyContent="center"
              gap="$4"
              $sm={{ width: "100%", padding: "$5" }}
            >
              <YStack gap="$1">
                <Heading size="$7" fontWeight="bold" color="white">
                  Đăng Nhập
                </Heading>
                <Text fontSize="$2" color="#94A3B8">
                  Nhập tài khoản FitLog của bạn để tiếp tục
                </Text>
              </YStack>

              <YStack gap="$3.5" marginTop="$2">
                {/* Email Input */}
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

                {/* Password Input có Con Mắt */}
                <YStack gap="$1.5">
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="$2" fontWeight="600" color="#E2E8F0">
                      Mật khẩu
                    </Text>
                    <Text
                      fontSize="$2"
                      color="#60A5FA"
                      fontWeight="600"
                      cursor="pointer"
                      onPress={() =>
                        showError("Thông báo", "Tính năng đang phát triển!")
                      }
                    >
                      Quên?
                    </Text>
                  </XStack>

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

                {/* Nút Đăng Nhập */}
                <Button
                  marginTop="$3"
                  size="$4.5"
                  borderRadius={10}
                  backgroundColor="#2563EB"
                  pressStyle={{ backgroundColor: "#1D4ED8", opacity: 0.9 }}
                  hoverStyle={{ backgroundColor: "#3B82F6" }}
                  onPress={handleLogin}
                  disabled={loading}
                  icon={loading ? <Spinner color="white" /> : undefined}
                  cursor="pointer"
                >
                  <Text color="white" fontWeight="bold" fontSize="$3">
                    {loading ? "Đang xác thực..." : "Đăng Nhập"}
                  </Text>
                </Button>
              </YStack>

              <XStack
                justifyContent="center"
                alignItems="center"
                marginTop="$2"
                gap="$1.5"
              >
                <Text fontSize="$2" color="#64748B">
                  Chưa có tài khoản?
                </Text>
                <Text
                  fontSize="$2"
                  color="#60A5FA"
                  fontWeight="bold"
                  cursor="pointer"
                  onPress={() => router.push("/auth/register" as any)}
                >
                  Tạo tài khoản
                </Text>
              </XStack>
            </YStack>
          </XStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
