import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { CalendarDays, ChevronRight } from '@/components/icons';
import { Text } from '@/components/ui/Text';
import { colors, radius, sizes, spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import { formatDateLabel, toIsoDateOnly } from '@/utils/formatJob';

function toLocalDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return new Date();
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export interface DatePickerFieldProps {
  label: string;
  value: string;
  minimumDate?: string;
  error?: string;
  onChange: (value: string) => void;
}

export function DatePickerField({
  label,
  value,
  minimumDate,
  error,
  onChange,
}: DatePickerFieldProps) {
  const { t } = useTranslation();
  const [showIos, setShowIos] = useState(false);
  const [pending, setPending] = useState<Date | null>(null);

  const current = value ? toLocalDate(value) : new Date();
  const minDate = minimumDate ? toLocalDate(minimumDate) : undefined;
  const effectiveCurrent =
    minDate && current.getTime() < minDate.getTime() ? minDate : current;

  const openAndroid = () => {
    DateTimePickerAndroid.open({
      value: effectiveCurrent,
      mode: 'date',
      minimumDate: minDate,
      onChange: (event: DateTimePickerEvent, date?: Date) => {
        if (event.type === 'set' && date) {
          onChange(toIsoDateOnly(date));
        }
      },
    });
  };

  const openIos = () => {
    setPending(effectiveCurrent);
    setShowIos(true);
  };

  const confirmIos = () => {
    if (pending) {
      onChange(toIsoDateOnly(pending));
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
        <CalendarDays size={sizes.iconMd} color={colors.brand.primary} />
        <Text
          variant="bodyMd"
          color={value ? 'primary' : 'muted'}
          numberOfLines={1}
          style={styles.value}
        >
          {value ? formatDateLabel(value) : t('common.selectDate')}
        </Text>
        <ChevronRight size={sizes.iconSm} color={colors.text.muted} />

        {Platform.OS === 'web' ? (
          <input
            type="date"
            value={value}
            min={minDate ? toIsoDateOnly(minDate) : undefined}
            onChange={(event) => onChange(event.target.value)}
            style={styles.webInput}
            aria-label={label}
          />
        ) : null}
      </Pressable>

      {showIos ? (
        <View style={styles.iosBox}>
          <DateTimePicker
            value={pending ?? effectiveCurrent}
            mode="date"
            minimumDate={minDate}
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

export default DatePickerField;