import { Text, XStack, YStack, styled } from 'tamagui';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Icon } from './Icon';
import type { IconName } from './Icon';

// Các component Tamagui dùng chung (styled + variants + token/theme).
export const AppText = styled(Text, {
  name: 'AppText',
  color: '$color',
  fontSize: 15,
  variants: {
    tone: {
      default: { color: '$color' },
      muted: { color: '$muted' },
      brand: { color: '$brand' },
      danger: { color: '$danger' },
      success: { color: '$success' },
      warning: { color: '$warning' },
      onBrand: { color: '$brandText' }
    },
    size: { xs: { fontSize: 12 }, sm: { fontSize: 13 }, md: { fontSize: 15 }, lg: { fontSize: 18 }, xl: { fontSize: 24 }, hero: { fontSize: 30 } },
    weight: { regular: { fontWeight: '400' }, semi: { fontWeight: '600' }, bold: { fontWeight: '800' } }
  } as const,
  defaultVariants: { tone: 'default', size: 'md', weight: 'regular' }
});

export const Card = styled(YStack, {
  name: 'Card',
  backgroundColor: '$panel',
  borderRadius: '$6',
  borderWidth: 1,
  borderColor: '$borderColor',
  padding: '$4',
  gap: '$3',
  variants: {
    tone: {
      default: {},
      brand: { backgroundColor: '$brand', borderColor: '$brand' },
      soft: { backgroundColor: '$brandSoft', borderColor: '$brandSoft' },
      danger: { backgroundColor: '$dangerSoft', borderColor: '$dangerSoft' }
    },
    pressable: { true: { pressStyle: { opacity: 0.92, scale: 0.985 } } }
  } as const,
  defaultVariants: { tone: 'default' }
});

const BadgeBox = styled(XStack, {
  name: 'BadgeBox',
  alignItems: 'center',
  gap: '$1.5',
  paddingHorizontal: '$2.5',
  paddingVertical: '$1',
  borderRadius: '$10',
  alignSelf: 'flex-start',
  variants: {
    tone: {
      neutral: { backgroundColor: '$brandSoft' },
      success: { backgroundColor: '$successSoft' },
      danger: { backgroundColor: '$dangerSoft' },
      warning: { backgroundColor: '$warningSoft' }
    }
  } as const,
  defaultVariants: { tone: 'neutral' }
});

const badgeTextTone = { neutral: 'brand', success: 'success', danger: 'danger', warning: 'warning' } as const;
const badgeIconColor = (tone: keyof typeof badgeTextTone, c: ReturnType<typeof useAppTheme>['colors']) =>
  ({ neutral: c.brand, success: c.success, danger: c.danger, warning: c.warning })[tone];

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: keyof typeof badgeTextTone; icon?: IconName }) {
  const { colors } = useAppTheme();
  return (
    <BadgeBox tone={tone}>
      {icon ? <Icon name={icon} size={13} color={badgeIconColor(tone, colors)} /> : null}
      <AppText size="xs" weight="semi" tone={badgeTextTone[tone]}>{label}</AppText>
    </BadgeBox>
  );
}

export { XStack, YStack };
