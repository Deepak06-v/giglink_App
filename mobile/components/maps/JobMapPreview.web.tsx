import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';

export interface JobMapPreviewProps {
  latitude: number;
  longitude: number;
  height?: number;
}

export function JobMapPreview({ height = 180 }: JobMapPreviewProps) {
  const { t } = useTranslation();
  return (
    <View style={[styles.fallback, { height }]}>
      <Text variant="bodyMd" color="secondary" align="center">
        {t('maps.previewOnNative')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
});
