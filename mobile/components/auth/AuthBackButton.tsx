import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { ChevronLeft } from '@/components/icons';
import { IconButton } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';

/**
 * Consistent circular back button for auth sub-screens (mirrors the
 * DetailHeader back affordance used across the app).
 */
export function AuthBackButton() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <IconButton
      icon={ChevronLeft}
      accessibilityLabel={t('common.goBack')}
      onPress={() => router.back()}
      style={styles.button}
      color={colors.text.primary}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.full,
  },
});