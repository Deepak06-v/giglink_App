import { Image, StyleSheet, View } from 'react-native';

import { User } from '@/components/icons';
import { Text } from '@/components/ui';
import { colors, radius } from '@/constants/theme';

interface ProfileAvatarProps {
  source?: string;
  name?: string;
  size?: number;
  square?: boolean;
}

export function ProfileAvatar({ source, name, size = 64, square = false }: ProfileAvatarProps) {
  const borderRadius = square ? radius.lg : radius.full;

  const initials = name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={{ width: size, height: size, borderRadius }}>
      {source ? (
        <Image source={{ uri: source }} style={[styles.image, { width: size, height: size, borderRadius }]} />
      ) : (
        <View style={[styles.fallback, { width: size, height: size, borderRadius }]}>
          {initials ? (
            <Text variant="headingMd" color="primary" style={{ fontSize: size * 0.34 }}>
              {initials}
            </Text>
          ) : (
            <User size={size * 0.4} color={colors.text.secondary} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surface.elevated,
  },
  fallback: {
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
