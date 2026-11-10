import { Alert, Platform } from "react-native";

interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

export const showConfirmDialog = (
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText = "Đồng ý",
  cancelText = "Hủy",
) => {
  if (Platform.OS === "web") {
    // Trên Trình duyệt Web
    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed) {
      onConfirm();
    }
  } else {
    // Trên Điện thoại Android / iOS
    Alert.alert(title, message, [
      { text: cancelText, style: "cancel" },
      {
        text: confirmText,
        style: "destructive",
        onPress: onConfirm,
      },
    ]);
  }
};
