import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Text } from '@/components/ui';
import { spacing } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Screen>
        <View style={styles.content}>
          <Text variant="headingLg">Page not found</Text>
          <Link href="/">
            <Text variant="bodyLg" color="brand" style={styles.link}>
              Go to home
            </Text>
          </Link>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  link: {
    marginTop: spacing.md,
  },
});
