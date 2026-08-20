import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LocationPicker } from '@/components/maps/LocationPicker.native';
import { Button, Card, DatePickerField, Input, Text, TimePickerField } from '@/components/ui';
import { COMPENSATION_TYPES, JOB_CATEGORIES } from '@/constants/jobs';
import { colors, radius, spacing } from '@/constants/theme';
import { useTranslation, type TranslationKey } from '@/lib/i18n';
import {
  buildJobPayload,
  emptyJobFormState,
  getSchedulePreview,
  jobFormStateFromJob,
  parseCoordinates,
  validateStep,
  type JobFormPayload,
  type JobFormState,
} from '@/lib/jobForm';
import type { Job } from '@/types';
import { formatDateLabel, formatTime12h, toIsoDateOnly } from '@/utils/formatJob';

const STEPS: TranslationKey[] = [
  'jobForm.stepBasic',
  'jobForm.stepSchedule',
  'jobForm.stepCompensation',
  'jobForm.stepRequirements',
  'jobForm.stepLocation',
  'jobForm.stepReview',
];

interface JobFormProps {
  initial?: Job;
  submitLabel: string;
  onSubmit: (payload: JobFormPayload) => Promise<void>;
}

interface FormErrors {
  [key: string]: string | undefined;
}

export function JobForm({ initial, submitLabel, onSubmit }: JobFormProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<JobFormState>(() =>
    initial ? jobFormStateFromJob(initial) : emptyJobFormState(),
  );
  const [step, setStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm(jobFormStateFromJob(initial));
    }
  }, [initial]);

  const setField = <K extends keyof JobFormState>(key: K, value: JobFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleStartDateChange = (value: string) => {
    setForm((current) => {
      const end = current.scheduleEndDate;
      let endDate = end;
      if (end && value && value > end) {
        endDate = '';
      }
      return { ...current, scheduleStartDate: value, scheduleEndDate: endDate };
    });
    setFieldErrors((current) => ({
      ...current,
      scheduleStartDate: undefined,
      scheduleEndDate: undefined,
    }));
  };

  const handleEndDateChange = (value: string) => {
    setForm((current) => ({ ...current, scheduleEndDate: value }));
    setFieldErrors((current) => ({ ...current, scheduleEndDate: undefined }));
  };

  const handleNext = () => {
    const validation = validateStep(form, step);
    if (!validation.valid) {
      setStepErrors(validation.errors);
      return;
    }
    setStepErrors([]);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setStepErrors([]);
    setSubmitError(null);
    setStep((current) => Math.max(current - 1, 0));
  };

  const handleSubmit = () => {
    void (async () => {
      setSubmitting(true);
      setSubmitError(null);
      try {
        await onSubmit(buildJobPayload(form));
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : t('jobForm.unableSaveJob'));
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const isLastStep = step === STEPS.length - 1;
  const schedulePreview = useMemo(() => getSchedulePreview(form), [form]);
  const coordinates = useMemo(() => parseCoordinates(form), [form]);
  const today = toIsoDateOnly(new Date());

  return (
    <View style={styles.container}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text variant="label" color="secondary">
              {t('jobForm.stepOf', { current: step + 1, total: STEPS.length })}
            </Text>
            <Text variant="label" color="brand">
              {t(STEPS[step])}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${((step + 1) / STEPS.length) * 100}%` },
              ]}
            />
          </View>
        </View>

        {step === 0 ? (
          <View style={styles.stepBlock}>
            <Input
              label={t('jobForm.jobTitle')}
              value={form.title}
              onChangeText={(value) => setField('title', value)}
              placeholder={t('jobForm.titlePlaceholder')}
              error={fieldErrors.title}
            />
            <Input
              label={t('jobForm.description')}
              value={form.description}
              onChangeText={(value) => setField('description', value)}
              placeholder={t('jobForm.descriptionPlaceholder')}
              multiline
              numberOfLines={5}
              error={fieldErrors.description}
            />
            <Text variant="label" color="secondary">
              {t('jobForm.category')}
            </Text>
            <View style={styles.chipWrap}>
              {JOB_CATEGORIES.map((category) => {
                const selected = form.category === category.value;
                return (
                  <PressableChip
                    key={category.value}
                    label={t(category.labelKey)}
                    selected={selected}
                    onPress={() => setField('category', selected ? '' : category.value)}
                  />
                );
              })}
            </View>
            <Input
              label={t('jobForm.workersRequired')}
              value={form.workersRequired}
              onChangeText={(value) => setField('workersRequired', value.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder={t('jobForm.workersRequiredPlaceholder')}
              error={fieldErrors.workersRequired}
            />
            <DatePickerField
              label={t('jobForm.hiringDeadlineOptional')}
              value={form.hiringDeadline}
              minimumDate={today}
              error={fieldErrors.hiringDeadline}
              onChange={(value) => setField('hiringDeadline', value)}
            />
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.stepBlock}>
            <DatePickerField
              label={t('jobForm.startDate')}
              value={form.scheduleStartDate}
              error={fieldErrors.scheduleStartDate}
              onChange={handleStartDateChange}
            />
            <DatePickerField
              label={t('jobForm.endDate')}
              value={form.scheduleEndDate}
              minimumDate={form.scheduleStartDate || undefined}
              error={fieldErrors.scheduleEndDate}
              onChange={handleEndDateChange}
            />
            <View style={styles.row}>
              <View style={styles.half}>
                <TimePickerField
                  label={t('jobForm.startTime')}
                  value={form.scheduleStartTime}
                  error={fieldErrors.scheduleStartTime}
                  onChange={(value) => setField('scheduleStartTime', value)}
                />
              </View>
              <View style={styles.half}>
                <TimePickerField
                  label={t('jobForm.endTime')}
                  value={form.scheduleEndTime}
                  error={fieldErrors.scheduleEndTime}
                  onChange={(value) => setField('scheduleEndTime', value)}
                />
              </View>
            </View>
            <Text variant="caption" color="muted">
              {t('jobForm.overnightHint')}
            </Text>

            {schedulePreview && form.scheduleStartDate && form.scheduleEndDate ? (
              <Card variant="elevated" style={styles.previewCard}>
                <Text variant="label" color="secondary">
                  {t('jobForm.scheduleSummary')}
                </Text>
                <Text variant="bodyLg" color="primary">
                  {formatDateLabel(form.scheduleStartDate)} → {formatDateLabel(form.scheduleEndDate)}
                </Text>
                <Text variant="bodyMd" color="secondary">
                  {formatTime12h(form.scheduleStartTime)} → {formatTime12h(form.scheduleEndTime)}
                </Text>
                <View style={styles.previewStats}>
                  <View style={styles.previewStat}>
                    <Text variant="headingMd" color="primary">
                      {schedulePreview.numberOfDays}
                    </Text>
                    <Text variant="caption" color="muted">
                      {t(schedulePreview.numberOfDays === 1 ? 'jobForm.day' : 'jobForm.days')}
                    </Text>
                  </View>
                  <View style={styles.previewStat}>
                    <Text variant="headingMd" color="primary">
                      {schedulePreview.hoursPerDay}
                    </Text>
                    <Text variant="caption" color="muted">
                      {t('jobForm.hoursPerDay')}
                    </Text>
                  </View>
                  <View style={styles.previewStat}>
                    <Text variant="headingMd" color="primary">
                      {schedulePreview.totalHours}
                    </Text>
                    <Text variant="caption" color="muted">
                      {t('jobForm.totalHours')}
                    </Text>
                  </View>
                </View>
              </Card>
            ) : null}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.stepBlock}>
            <Text variant="label" color="secondary">
              {t('jobForm.payType')}
            </Text>
            <View style={styles.chipRow}>
              {COMPENSATION_TYPES.map((type) => {
                const selected = form.compensationType === type.value;
                return (
                  <PressableChip
                    key={type.value}
                    label={t(type.labelKey)}
                    selected={selected}
                    onPress={() => setField('compensationType', type.value)}
                    style={styles.chipFlex}
                  />
                );
              })}
            </View>
            <Input
              label={form.compensationType === 'hourly' ? t('jobForm.hourlyRate') : t('jobForm.totalPay')}
              value={form.compensationAmount}
              onChangeText={(value) => setField('compensationAmount', value.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder={t('jobForm.payPlaceholder')}
              error={fieldErrors.compensationAmount}
            />
            <Text variant="caption" color="muted">
              {t('jobForm.inrNote')}
            </Text>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.stepBlock}>
            <Input
              label={t('jobForm.skillsCommaSeparated')}
              value={form.skills}
              onChangeText={(value) => setField('skills', value)}
              placeholder={t('jobForm.skillsPlaceholder')}
            />
            <Input
              label={t('jobForm.experienceOptional')}
              value={form.experience}
              onChangeText={(value) => setField('experience', value)}
              placeholder={t('jobForm.experiencePlaceholder')}
              multiline
              numberOfLines={3}
            />
            <Input
              label={t('jobForm.dressCodeOptional')}
              value={form.dressCode}
              onChangeText={(value) => setField('dressCode', value)}
              placeholder={t('jobForm.dressCodePlaceholder')}
            />
            <Input
              label={t('jobForm.languagesCommaSeparated')}
              value={form.languages}
              onChangeText={(value) => setField('languages', value)}
              placeholder={t('jobForm.languagesPlaceholder')}
            />
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.stepBlock}>
            <Input
              label={t('jobForm.address')}
              value={form.address}
              onChangeText={(value) => setField('address', value)}
              placeholder={t('jobForm.addressPlaceholder')}
              error={fieldErrors.address}
            />
            <View style={styles.row}>
              <View style={styles.half}>
                <Input
                  label={t('jobForm.city')}
                  value={form.city}
                  onChangeText={(value) => setField('city', value)}
                  placeholder={t('jobForm.cityPlaceholder')}
                  error={fieldErrors.city}
                />
              </View>
              <View style={styles.half}>
                <Input
                  label={t('jobForm.state')}
                  value={form.state}
                  onChangeText={(value) => setField('state', value)}
                  placeholder={t('jobForm.statePlaceholder')}
                  error={fieldErrors.state}
                />
              </View>
            </View>
            <Input
              label={t('jobForm.pincode')}
              value={form.pincode}
              onChangeText={(value) => setField('pincode', value)}
              keyboardType="number-pad"
              placeholder={t('jobForm.pincodePlaceholder')}
              error={fieldErrors.pincode}
            />
            <LocationPicker
  initialLocation={coordinates}
  onLocationSelected={({ latitude, longitude }) => {
    setField('latitude', String(latitude));
    setField('longitude', String(longitude));
  }}
/>

            
          </View>
        ) : null}

        {step === 5 ? (
          <View style={styles.stepBlock}>
            <ReviewSection label={t('jobForm.job')} value={form.title} />
            <ReviewSection label={t('jobForm.category')} value={categoryLabel(form.category, t)} />
            <ReviewSection label={t('jobForm.workersRequiredLabel')} value={form.workersRequired} />
            {form.hiringDeadline ? (
              <ReviewSection label={t('jobForm.hiringDeadlineOptional')} value={formatDateLabel(form.hiringDeadline)} />
            ) : null}
            <ReviewSection
              label={t('jobForm.schedule')}
              value={`${formatDateLabel(form.scheduleStartDate)} → ${formatDateLabel(form.scheduleEndDate)}\n${formatTime12h(form.scheduleStartTime)} → ${formatTime12h(form.scheduleEndTime)}`}
            />
            {schedulePreview ? (
              <ReviewSection
                label={t('jobForm.duration')}
                value={`${schedulePreview.numberOfDays} ${t(schedulePreview.numberOfDays === 1 ? 'jobForm.day' : 'jobForm.days')} · ${schedulePreview.hoursPerDay} ${t('jobForm.hoursPerDay')} · ${schedulePreview.totalHours} ${t('jobForm.totalHours')}`}
              />
            ) : null}
            <ReviewSection
              label={t('jobForm.pay')}
              value={`${form.compensationType === 'hourly' ? t('compensationType.hourly') : t('compensationType.fixed')} · ₹${form.compensationAmount}`}
            />
            {form.skills.trim() ? <ReviewSection label={t('jobForm.skills')} value={form.skills} /> : null}
            {form.experience.trim() ? <ReviewSection label={t('jobForm.experience')} value={form.experience} /> : null}
            {form.dressCode.trim() ? <ReviewSection label={t('jobForm.dressCode')} value={form.dressCode} /> : null}
            {form.languages.trim() ? <ReviewSection label={t('jobForm.languages')} value={form.languages} /> : null}
            <ReviewSection
              label={t('jobForm.location')}
              value={`${form.address}, ${form.city}, ${form.state} ${form.pincode}`}
            />
            <ReviewSection
              label={t('jobForm.coordinates')}
              value={`${form.latitude}, ${form.longitude}`}
            />
            <Text variant="caption" color="muted" style={styles.reviewNote}>
              {t('jobForm.reviewNote')}
            </Text>
          </View>
        ) : null}

        {stepErrors.length > 0 ? (
          <Card style={styles.errorCard}>
            {stepErrors.map((message) => (
              <Text key={message} variant="caption" color="error">
                {message}
              </Text>
            ))}
          </Card>
        ) : null}

        {submitError ? (
          <Text variant="caption" color="error" align="center" style={styles.submitError}>
            {submitError}
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          {step > 0 ? (
            <Button
              label={t('jobForm.back')}
              variant="secondary"
              onPress={handleBack}
              disabled={submitting}
              style={styles.footerHalf}
            />
          ) : null}
          {isLastStep ? (
            <Button
              label={submitting ? t('jobForm.saving') : submitLabel}
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
              fullWidth={step === 0}
              style={step > 0 ? styles.footerHalf : undefined}
            />
          ) : (
            <Button
              label={t('jobForm.next')}
              onPress={handleNext}
              fullWidth={step === 0}
              style={step > 0 ? styles.footerHalf : undefined}
            />
          )}
        </View>
      </View>
    </View>
  );
}

function categoryLabel(category: string, t: ReturnType<typeof useTranslation>['t']): string {
  const match = JOB_CATEGORIES.find((item) => item.value === category);
  return match ? t(match.labelKey) : category;
}

function PressableChip({
  label,
  selected,
  onPress,
  style,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: object;
}) {
  return (
    <Button
      label={label}
      size="sm"
      variant={selected ? 'primary' : 'secondary'}
      onPress={onPress}
      style={style}
      accessibilityState={{ selected }}
    />
  );
}

function ReviewSection({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.reviewRow}>
      <Text variant="caption" color="muted">
        {label}
      </Text>
      <Text variant="bodyMd" color="primary">
        {value}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  progressBlock: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTrack: {
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surface.elevated,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
  },
  stepBlock: {
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chipFlex: {
    flexGrow: 1,
  },
  previewCard: {
    gap: spacing.sm,
  },
  previewStats: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  previewStat: {
    flex: 1,
    gap: spacing.xs,
  },
  mapBlock: {
    gap: spacing.sm,
  },
  mapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reviewRow: {
    gap: spacing.xs,
  },
  reviewNote: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  errorCard: {
    gap: spacing.xs,
    backgroundColor: colors.semanticTint.error,
    borderColor: colors.semantic.error,
  },
  submitError: {
    marginTop: spacing.xs,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  footerHalf: {
    flex: 1,
  },
});