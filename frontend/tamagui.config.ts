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
  interface TamaguiCustomConfig extends AppConfig {}
}
