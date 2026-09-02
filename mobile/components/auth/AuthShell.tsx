import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';

interface AuthShellProps extends PropsWithChildren {
  title: string;
  subtitle: string;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.wordmarkRow}>
              <View style={styles.wordmarkDot} />
              <Text variant="headingLg" color="brand">
                GigLink
              </Text>
            </View>
            <Text variant="headingXl" color="primary" style={styles.title}>
              {title}
            </Text>
            <Text variant="bodyLg" color="secondary">
              {subtitle}
            </Text>
          </View>

          <View style={styles.content}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  header: {
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['2xl'],
    gap: spacing.sm,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  wordmarkDot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.accent.opportunity,
  },
  title: {
    marginTop: spacing.md,
  },
  content: {
    gap: spacing.lg,
  },
});
