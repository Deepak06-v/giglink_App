import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius, shadows, spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';

export type AuthMode = 'signin' | 'signup';

interface AuthModeTabsProps {
  value: AuthMode;
  onChange: (mode: AuthMode) => void;
  disabled?: boolean;
}

const TABS: Array<{ value: AuthMode; labelKey: 'auth.signIn' | 'auth.signUp' }> = [
  { value: 'signin', labelKey: 'auth.signIn' },
  { value: 'signup', labelKey: 'auth.signUp' },
];

export function AuthModeTabs({ value, onChange, disabled = false }: AuthModeTabsProps) {
  const { t } = useTranslation();

  return (
    <View
      accessibilityRole="tablist"
      style={styles.track}
    >
      {TABS.map((tab) => {
        const selected = value === tab.value;
        return (
          <Pressable
            key={tab.value}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={t(tab.labelKey)}
            disabled={disabled}
            onPress={() => onChange(tab.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && !selected && styles.segmentPressed,
              disabled && styles.segmentDisabled,
            ]}
          >
            <Text variant="label" color={selected ? 'brand' : 'secondary'}>
              {t(tab.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radius.full,
    backgroundColor: colors.background.secondary,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: colors.surface.card,
    ...shadows.elevated,
  },
  segmentPressed: {
    opacity: 0.7,
  },
  segmentDisabled: {
    opacity: 0.6,
  },
});