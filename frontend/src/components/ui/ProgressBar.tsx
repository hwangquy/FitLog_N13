import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useAppTheme } from '../../hooks/useAppTheme';

export function ProgressBar({ ratio, color, trackColor, height = 8, label }: { ratio: number; color?: string; trackColor?: string; height?: number; label?: string }) {
  const { colors } = useAppTheme();
  const r = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  const progress = useSharedValue(0);
  useEffect(() => { progress.value = withTiming(r, { duration: 600, easing: Easing.out(Easing.cubic) }); }, [r, progress]);
  const style = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` as `${number}%` }));
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(r * 100) }}
      style={{ height, borderRadius: height / 2, overflow: 'hidden', backgroundColor: trackColor ?? colors.borderColor }}>
      <Animated.View style={[style, { height: '100%', borderRadius: height / 2, backgroundColor: color ?? colors.brand }]} />
    </View>
  );
}
