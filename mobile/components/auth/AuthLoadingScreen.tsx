import { Image, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';

const LOGO = require('@/assets/images/splash-icon.png');

export function AuthLoadingScreen() {
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel="GigLink loading">
      <Image
        source={LOGO}
        style={styles.logo}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <Text variant="headingXl" color="primary" style={styles.wordmark}>
        GigLink
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.primary,
    padding: spacing['2xl'],
  },
  logo: {
    width: 128,
    height: 128,
  },
  wordmark: {
    marginTop: spacing.lg,
  },
});