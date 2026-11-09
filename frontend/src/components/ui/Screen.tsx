import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';
import { useAppTheme } from '../../hooks/useAppTheme';

type Props = {
  children: ReactNode;
  /** false: khung tĩnh để màn hình tự dùng FlatList. */
  scroll?: boolean;
  padded?: boolean;
  /** Màn hình tab có tab bar phía dưới nên chỉ cần inset phía trên. */
  edges?: Edge[];
  refreshing?: boolean;
  onRefresh?: () => void;
  keyboard?: boolean;
};

export function Screen({ children, scroll = true, padded = true, edges = ['top'], refreshing = false, onRefresh, keyboard = false }: Props) {
  const { colors } = useAppTheme();
  const pad = padded ? 18 : 0;
  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: pad, paddingBottom: pad + 24, gap: 16 }}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, padding: pad, gap: 16 }}>{children}</View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={edges}>
      {keyboard ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{body}</KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}
