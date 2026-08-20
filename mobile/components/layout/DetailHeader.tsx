import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from '@/components/icons';
import { IconButton, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';

interface DetailHeaderProps {
  title: string;
  subtitle?: string;
}

export function DetailHeader({ title, subtitle }: DetailHeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <IconButton
        icon={ChevronLeft}
        accessibilityLabel={t('common.goBack')}
        onPress={() => router.back()}
      />
      <View style={styles.textBlock}>
        <Text variant="headingLg" color="primary" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodyMd" color="secondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  textBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  spacer: {
    width: 44,
  },
});
