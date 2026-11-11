export type ThemeMode = 'system' | 'light' | 'dark';
export type Scheme = 'light' | 'dark';

// Nguồn màu duy nhất: Tamagui themes (tamagui.config.ts) và các phần React Native
// thuần (tab bar, biểu đồ SVG, StatusBar) đều đọc từ đây.
export const palette = {
  light: {
    background: '#F6F7FB',
    panel: '#FFFFFF',
    color: '#172033',
    muted: '#5F6881',
    borderColor: '#E1E4EE',
    brand: '#6D5EF5',
    brandText: '#FFFFFF',
    brandSoft: '#EEEAFE',
    lime: '#C8F169',
    limeText: '#222A13',
    danger: '#C93A55',
    dangerSoft: '#FDECEF',
    success: '#16875B',
    successSoft: '#E1F5EC',
    warning: '#9A6200',
    warningSoft: '#FFF3DB'
  },
  dark: {
    background: '#111522',
    panel: '#1C2232',
    color: '#F5F6FA',
    muted: '#A3ABC2',
    borderColor: '#2D3550',
    brand: '#A69CFF',
    brandText: '#12142A',
    brandSoft: '#2A2750',
    lime: '#C8F169',
    limeText: '#222A13',
    danger: '#FF8FA3',
    dangerSoft: '#3B1D28',
    success: '#5FD3A1',
    successSoft: '#16372B',
    warning: '#F2C46D',
    warningSoft: '#3A2E14'
  }
} as const;

export type AppColors = { [K in keyof (typeof palette)['light']]: string };

export function resolveScheme(mode: ThemeMode, system: Scheme | null | undefined): Scheme {
  if (mode === 'light' || mode === 'dark') return mode;
  return system === 'dark' ? 'dark' : 'light';
}
