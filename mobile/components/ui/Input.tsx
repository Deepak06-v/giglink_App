import type { TextInputProps } from 'react-native';
import { StyleSheet, TextInput, View } from 'react-native';

import { useFontFamily } from '@/constants/fonts';
import { Text } from '@/components/ui/Text';
import { colors, radius, sizes, spacing } from '@/constants/theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const fontFamily = useFontFamily(400);
  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text variant="label" color="secondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.text.muted}
        style={[styles.input, { fontFamily }, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? (
        <Text variant="caption" color="error" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: sizes.inputHeight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.lg,
    color: colors.text.primary,
    fontSize: 15,
  },
  inputError: {
    borderColor: colors.semantic.error,
  },
  error: {
    marginTop: spacing.xs,
  },
});
