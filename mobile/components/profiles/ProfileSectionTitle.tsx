import { Text } from '@/components/ui';
import { translate, type TranslationKey } from '@/lib/i18n';

interface ProfileSectionTitleProps {
  value: TranslationKey;
}

export function ProfileSectionTitle({ value }: ProfileSectionTitleProps) {
  return (
    <Text variant="label" color="accent">
      {translate(value)}
    </Text>
  );
}