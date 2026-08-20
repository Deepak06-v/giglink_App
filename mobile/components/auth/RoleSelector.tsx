import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { useTranslation, type TranslationKey } from '@/lib/i18n';
import type { UserRole } from '@/types';

interface RoleSelectorProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
}

const OPTIONS: Array<{
  value: UserRole;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
}> = [
  { value: 'worker', labelKey: 'auth.findJob', descriptionKey: 'auth.findJobDesc' },
  { value: 'employer', labelKey: 'auth.hireWorker', descriptionKey: 'auth.hireWorkerDesc' },
];

export function RoleSelector({ value, onChange, disabled = false }: RoleSelectorProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text variant="label" color="secondary">
        {t('auth.iWantTo')}
      </Text>
      <View style={styles.row}>
        {OPTIONS.map((option) => {
          const selected = value === option.value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={t(option.labelKey)}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && !disabled && styles.optionPressed,
                disabled && styles.optionDisabled,
              ]}
            >
              <Text variant="headingMd" color={selected ? 'brand' : 'primary'}>
                {t(option.labelKey)}
              </Text>
              <Text variant="caption" color="secondary" style={styles.description}>
                {t(option.descriptionKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  option: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  optionSelected: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.semanticTint.brand,
  },
  optionPressed: {
    opacity: 0.92,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  description: {
    marginTop: spacing.xs,
  },
});
