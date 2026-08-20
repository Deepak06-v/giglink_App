import type { PropsWithChildren, ReactNode } from 'react';
import type { ScrollViewProps, StyleProp, ViewStyle } from 'react-native';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, sizes, spacing } from '@/constants/theme';

export interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  padded?: boolean;
  keyboardAvoiding?: boolean;
  footer?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollViewProps?: Omit<ScrollViewProps, 'contentContainerStyle' | 'children'>;
  style?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  keyboardAvoiding = false,
  footer,
  contentContainerStyle,
  scrollViewProps,
  style,
}: ScreenProps) {
  const paddingStyle = padded ? styles.padded : undefined;

  const content = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, paddingStyle, contentContainerStyle]}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, paddingStyle, contentContainerStyle]}>{children}</View>
  );

  const body = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  return (
    <SafeAreaView style={[styles.safeArea, style]} edges={['top', 'left', 'right']}>
      <View style={styles.flex}>{body}</View>
      {footer ? <View style={[styles.footer, padded && styles.padded]}>{footer}</View> : null}
      <SafeAreaView edges={['bottom']} style={styles.bottomInset} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing['2xl'],
  },
  padded: {
    paddingHorizontal: sizes.screenPaddingHorizontal,
  },
  footer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
    backgroundColor: colors.background.primary,
  },
  bottomInset: {
    backgroundColor: colors.background.primary,
  },
});
