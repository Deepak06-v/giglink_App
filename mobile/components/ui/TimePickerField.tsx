import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { ChevronRight, Clock } from '@/components/icons';
import { Text } from '@/components/ui/Text';
import { colors, radius, sizes, spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import { formatTime12h } from '@/utils/formatJob';

function toTimeDate(value: string): Date {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  const now = new Date();
  if (!match) {
    return now;
  }
  const hours = Number(match[1]) % 24;
  const minutes = Number(match[2]) % 60;
  now.setHours(hours, minutes, 0, 0);
  return now;
}

function to24h(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export interface TimePickerFieldProps {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export function TimePickerField({
  label,
  value,
  error,
  onChange,
}: TimePickerFieldProps) {
  const { t } = useTranslation();
  const [showIos, setShowIos] = useState(false);
  const [pending, setPending] = useState<Date | null>(null);

  const current = value ? toTimeDate(value) : new Date();

  const openAndroid = () => {
    DateTimePickerAndroid.open({
      value: current,
      mode: 'time',
      is24Hour: false,
      onChange: (event: DateTimePickerEvent, date?: Date) => {
        if (event.type === 'set' && date) {
          onChange(to24h(date));
        }
      },
    });
  };

  const openIos = () => {
    setPending(current);
    setShowIos(true);
  };

  const confirmIos = () => {
    if (pending) {
      onChange(to24h(pending));
    }
    setShowIos(false);
    setPending(null);
  };

  const cancelIos = () => {
    setShowIos(false);
    setPending(null);
  };

  const handlePress = () => {
    if (Platform.OS === 'android') {
      openAndroid();
    } else if (Platform.OS === 'ios') {
      openIos();
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text variant="label" color="secondary" style={styles.label}>
        {label}
      </Text>
      <Pressable
        onPress={handlePress}
        style={[styles.trigger, error ? styles.triggerError : null]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Clock size={sizes.iconMd} color={colors.brand.primary} />
        <Text
          variant="bodyMd"
          color={value ? 'primary' : 'muted'}
          numberOfLines={1}
          style={styles.value}
        >
          {value ? formatTime12h(value) : t('common.selectTime')}
        </Text>
        <ChevronRight size={sizes.iconSm} color={colors.text.muted} />

        {Platform.OS === 'web' ? (
          <input
            type="time"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            style={styles.webInput}
            aria-label={label}
          />
        ) : null}
      </Pressable>

      {showIos ? (
        <View style={styles.iosBox}>
          <DateTimePicker
            value={pending ?? current}
            mode="time"
            is24Hour={false}
            display="spinner"
            themeVariant="dark"
            onChange={(_event: DateTimePickerEvent, date?: Date) => {
              if (date) {
                setPending(date);
              }
            }}
          />
          <View style={styles.iosActions}>
            <Pressable style={styles.iosButton} onPress={cancelIos}>
              <Text variant="bodyMd" color="secondary">
                {t('common.cancel')}
              </Text>
            </Pressable>
            <Pressable style={styles.iosButton} onPress={confirmIos}>
              <Text variant="bodyMd" color="brand">
                {t('common.done')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {error ? (
        <Text variant="caption" color="error" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    marginBottom: spacing.xs,
  },
  trigger: {
    minHeight: sizes.inputHeight,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  triggerError: {
    borderColor: colors.semantic.error,
  },
  value: {
    flex: 1,
  },
  webInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    width: '100%',
    height: '100%',
    zIndex: 2,
    cursor: 'pointer',
  },
  iosBox: {
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.elevated,
    padding: spacing.md,
  },
  iosActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
  },
  iosButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  error: {
    marginTop: spacing.xs,
  },
});

export default TimePickerField;