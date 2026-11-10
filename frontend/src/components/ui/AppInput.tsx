import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';

type Props = Omit<TextInputProps, 'style'> & { label: string; error?: string; hint?: string; required?: boolean };

export function AppInput({ label, error, hint, required, multiline, ...rest }: Props) {
  const { colors } = useAppTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.color, fontWeight: '700', fontSize: 14 }}>
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        {...rest}
        style={[
          styles.input,
          multiline && styles.multiline,
          { backgroundColor: colors.panel, color: colors.color, borderColor: error ? colors.danger : colors.borderColor }
        ]}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.danger, fontSize: 12 }}>{error}</Text>
      ) : hint ? (
        <Text style={{ color: colors.muted, fontSize: 12 }}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15 },
  multiline: { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' }
});
