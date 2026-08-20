import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';

export interface DividerProps {
  vertical?: boolean;
}

export function Divider({ vertical = false }: DividerProps) {
  return <View style={vertical ? styles.vertical : styles.horizontal} />;
}

const styles = StyleSheet.create({
  horizontal: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.default,
    marginVertical: spacing.md,
  },
  vertical: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.default,
    marginHorizontal: spacing.md,
  },
});
