import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Input, Text } from '@/components/ui';
import {
  COMPENSATION_TYPES,
  JOB_CATEGORIES,
  JOB_SORT_OPTIONS,
} from '@/constants/jobs';
import { colors, radius, spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import type { JobFilters } from '@/types';

interface JobFiltersSheetProps {
  visible: boolean;
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
}

export function JobFiltersSheet({
  visible,
  filters,
  onChange,
  onApply,
  onClear,
  onClose,
}: JobFiltersSheetProps) {
  const { t } = useTranslation();

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('home.closeFilters')} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text variant="headingLg" color="primary">
          {t('home.filters')}
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text variant="label" color="secondary">
            {t('home.category')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {JOB_CATEGORIES.map((category) => {
              const selected = filters.category === category.value;
              return (
                <Pressable
                  key={category.value}
                  onPress={() =>
                    onChange({
                      ...filters,
                      category: selected ? undefined : category.value,
                    })
                  }
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text variant="caption" color={selected ? 'brand' : 'secondary'}>
                    {t(category.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Input
            label={t('home.city')}
            value={filters.city ?? ''}
            onChangeText={(city) => onChange({ ...filters, city: city || undefined })}
            placeholder={t('home.cityPlaceholder')}
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label={t('home.minPay')}
                value={filters.minPay?.toString() ?? ''}
                onChangeText={(value) =>
                  onChange({
                    ...filters,
                    minPay: value ? Number(value) : undefined,
                  })
                }
                keyboardType="numeric"
                placeholder="500"
              />
            </View>
            <View style={styles.half}>
              <Input
                label={t('home.maxPay')}
                value={filters.maxPay?.toString() ?? ''}
                onChangeText={(value) =>
                  onChange({
                    ...filters,
                    maxPay: value ? Number(value) : undefined,
                  })
                }
                keyboardType="numeric"
                placeholder="5000"
              />
            </View>
          </View>

          <Text variant="label" color="secondary">
            {t('home.compensation')}
          </Text>
          <View style={styles.chipRowWrap}>
            {COMPENSATION_TYPES.map((type) => {
              const selected = filters.compensationType === type.value;
              return (
                <Pressable
                  key={type.value}
                  onPress={() =>
                    onChange({
                      ...filters,
                      compensationType: selected ? undefined : type.value,
                    })
                  }
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text variant="caption" color={selected ? 'brand' : 'secondary'}>
                    {t(type.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Input
            label={t('home.date')}
            value={filters.date ?? ''}
            onChangeText={(date) => onChange({ ...filters, date: date || undefined })}
            placeholder={t('home.datePlaceholder')}
          />

          <Text variant="label" color="secondary">
            {t('home.sort')}
          </Text>
          <View style={styles.chipRowWrap}>
            {JOB_SORT_OPTIONS.map((option) => {
              const selected = (filters.sort ?? 'newest') === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => onChange({ ...filters, sort: option.value })}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text variant="caption" color={selected ? 'brand' : 'secondary'}>
                    {t(option.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <Button label={t('common.clear')} variant="secondary" onPress={onClear} />
          <Button label={t('home.applyFilters')} onPress={onApply} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay.default,
  },
  sheet: {
    backgroundColor: colors.surface.higher,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['2xl'],
    maxHeight: '85%',
    gap: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border.default,
    marginBottom: spacing.sm,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  chipRow: {
    flexGrow: 0,
  },
  chipRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  chipSelected: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.semanticTint.brand,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
