<<<<<<< HEAD
import { createTamagui } from 'tamagui';
import { config } from '@tamagui/config/v3';
import { palette } from './src/theme/colors';

// Token màu riêng của FitLog (bổ sung vào token mặc định của Tamagui).
const appTokens = {
  ...config.tokens,
  color: {
    ...config.tokens.color,
    brand: palette.light.brand,
    brandSoft: palette.light.brandSoft,
    lime: palette.light.lime,
    danger: palette.light.danger
  }
};

// Hai theme light/dark: các key (brand, panel, muted...) đổi theo theme.
export const tamaguiConfig = createTamagui({
  ...config,
  tokens: appTokens,
  themes: {
    ...config.themes,
    light: { ...config.themes.light, ...palette.light },
    dark: { ...config.themes.dark, ...palette.dark }
  }
});

export default tamaguiConfig;
export type AppConfig = typeof tamaguiConfig;
declare module 'tamagui' {
=======
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
>>>>>>> origin/main
  interface TamaguiCustomConfig extends AppConfig {}
}
