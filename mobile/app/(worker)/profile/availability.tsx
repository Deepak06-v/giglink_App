import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { Button, ErrorState, Text, TimePickerField } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getWorkerProfile, updateWorkerProfile } from '@/lib/api/profiles';
import { translate } from '@/lib/i18n';
import type { WeekdayIndex, WeeklyAvailabilityWindow } from '@/types';
import {
  formatWeekday,
} from '@/utils/availability';

const ALL_DAYS: WeekdayIndex[] = [0, 1, 2, 3, 4, 5, 6];
const DEFAULT_START = '09:00';
const DEFAULT_END = '18:00';

// Must match MAX_WINDOWS_PER_DAY in backend/src/validators/profile.validator.js.
const MAX_WINDOWS_PER_DAY = 3;

const windowsForDay = (
  schedule: WeeklyAvailabilityWindow[],
  day: WeekdayIndex,
): WeeklyAvailabilityWindow[] =>
  schedule.filter((window) => window.day === day);

export default function AvailabilityScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<WeeklyAvailabilityWindow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await getWorkerProfile();
      setSchedule(profile.weeklyAvailability ?? []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load profile'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isOn = (day: WeekdayIndex) => windowsForDay(schedule, day).length > 0;

  const toggleDay = (day: WeekdayIndex) => {
    if (isOn(day)) {
      setSchedule(schedule.filter((window) => window.day !== day));
    } else {
      setSchedule([
        ...schedule,
        { day, startTime: DEFAULT_START, endTime: DEFAULT_END },
      ]);
    }
  };

  const addWindow = (day: WeekdayIndex) => {
    if (windowsForDay(schedule, day).length >= MAX_WINDOWS_PER_DAY) {
      return;
    }
    setSchedule([
      ...schedule,
      { day, startTime: DEFAULT_START, endTime: DEFAULT_END },
    ]);
  };

  const removeWindow = (day: WeekdayIndex, index: number) => {
    const others = schedule.filter(
      (window) => !(window.day === day),
    );
    const current = windowsForDay(schedule, day);
    const remaining = current.filter((_, i) => i !== index);
    // Remove the day entirely when its last window is removed.
    if (remaining.length === 0) {
      setSchedule(others);
    } else {
      setSchedule([...others, ...remaining]);
    }
  };

  const updateWindow = (
    day: WeekdayIndex,
    index: number,
    patch: Partial<Omit<WeeklyAvailabilityWindow, 'day'>>,
  ) => {
    setSchedule(
      schedule.map((window, i) => {
        if (window.day === day) {
          const localIndex = windowsForDay(schedule, day).indexOf(window);
          if (localIndex === index) {
            return { ...window, ...patch };
          }
        }
        return window;
      }),
    );
  };

  const copyToWeekdays = () => {
    const monday = windowsForDay(schedule, 1);
    if (monday.length === 0) {
      return;
    }
    const template = { ...monday[0], day: 1 as WeekdayIndex };
    setSchedule([
      ...schedule.filter(
        (window) => !(window.day >= 1 && window.day <= 5),
      ),
      ...ALL_DAYS.filter((d) => d >= 1 && d <= 5).map((d) => ({
        ...template,
        day: d,
      })),
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await updateWorkerProfile({ weeklyAvailability: schedule });
      router.back();
    } catch (err) {
      setSaveError(getApiErrorMessage(err, 'Unable to save profile'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen scroll>
        <DetailHeader title={translate('workingHours.title')} />
        <Text variant="bodyMd" color="secondary">
          {translate('common.loading')}
        </Text>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <DetailHeader title={translate('workingHours.title')} />
        <ErrorState message={error} onRetry={() => void load()} />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      footer={
        <View style={styles.footer}>
          {saveError ? (
            <Text variant="caption" color="error" align="center">
              {saveError}
            </Text>
          ) : null}
          <Button
            label={saving ? translate('profile.saving') : translate('common.save')}
            onPress={() => void handleSave()}
            loading={saving}
            fullWidth
          />
        </View>
      }
      contentContainerStyle={styles.content}
    >
      <DetailHeader title={translate('workingHours.title')} />
      <Text variant="bodyMd" color="secondary">
        {translate('workingHours.subtitle')}
      </Text>

      {ALL_DAYS.map((day) => {
        const on = isOn(day);
        const windows = windowsForDay(schedule, day);
        return (
          <View key={day} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text variant="bodyLg">{formatWeekday(day)}</Text>
              <Button
                label={on ? translate('workingHours.off') : translate('workingHours.on')}
                size="sm"
                variant={on ? 'primary' : 'secondary'}
                onPress={() => toggleDay(day)}
              />
            </View>

            {on ? (
              <View style={styles.windows}>
                {windows.map((window, index) => (
                  <View key={index} style={styles.windowRow}>
                    <View style={styles.pickers}>
                      <TimePickerField
                        label={translate('workingHours.start')}
                        value={window.startTime}
                        onChange={(value) => updateWindow(day, index, { startTime: value })}
                      />
                      <TimePickerField
                        label={translate('workingHours.end')}
                        value={window.endTime}
                        onChange={(value) => updateWindow(day, index, { endTime: value })}
                      />
                    </View>
                    <Button
                      label={translate('workingHours.removeWindow')}
                      size="sm"
                      variant="secondary"
                      onPress={() => removeWindow(day, index)}
                      accessibilityLabel={translate('workingHours.removeWindowAccessibility', {
                        day: formatWeekday(day),
                      })}
                    />
                  </View>
                ))}
                {windows.length < MAX_WINDOWS_PER_DAY ? (
                  <Button
                    label={translate('workingHours.addWindow')}
                    size="sm"
                    variant="secondary"
                    onPress={() => addWindow(day)}
                  />
                ) : (
                  <Text variant="caption" color="secondary">
                    {translate('workingHours.maxWindows', { count: MAX_WINDOWS_PER_DAY })}
                  </Text>
                )}
              </View>
            ) : null}
          </View>
        );
      })}

      <Button
        label={translate('workingHours.copyToWeekdays')}
        variant="secondary"
        onPress={copyToWeekdays}
        fullWidth
      />
      <Text variant="caption" color="secondary" align="center">
        {translate('workingHours.copyToWeekdaysHint')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing['2xl'],
  },
  footer: {
    gap: spacing.sm,
  },
  dayCard: {
    gap: spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  windows: {
    gap: spacing.md,
  },
  windowRow: {
    gap: spacing.sm,
  },
  pickers: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
