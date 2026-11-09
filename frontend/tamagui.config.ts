import { createTamagui } from "tamagui";
import { defaultConfig } from "@tamagui/config/v5";
import { palette } from "./src/theme/colors";

// Tokens màu riêng của FitLog.
const appTokens = {
  ...defaultConfig.tokens,

  // V5 không có sẵn tokens.color nên tự khai báo.
  color: {
    brand: palette.light.brand,
    brandSoft: palette.light.brandSoft,
    lime: palette.light.lime,
    danger: palette.light.danger,
  },
};

// Tạo cấu hình Tamagui cho FitLog.
export const tamaguiConfig = createTamagui({
  ...defaultConfig,

  // Bổ sung token màu riêng.
  tokens: appTokens,

  // Hai theme Light và Dark.
  themes: {
    ...defaultConfig.themes,

    light: {
      ...defaultConfig.themes.light,
      ...palette.light,
    },

    dark: {
      ...defaultConfig.themes.dark,
      ...palette.dark,
    },
  },
}) as any;

export default tamaguiConfig;

// Khai báo kiểu cấu hình riêng cho ứng dụng.
export type AppConfig = typeof tamaguiConfig;

declare module "tamagui" {
  interface TamaguiCustomConfig extends AppConfig {}
}
