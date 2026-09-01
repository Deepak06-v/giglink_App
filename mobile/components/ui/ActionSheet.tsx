import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { colors, radius, sizes, spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';

export interface ActionSheetItem {
  label: string;
  icon?: LucideIcon;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface ActionSheetProps {
  visible: boolean;
  title?: string;
  items: ActionSheetItem[];
  cancelLabel?: string;
  onClose: () => void;
}

/**
 * Bottom-sheet action menu foundation (no dependency). Replaces future
 * stacked action buttons with a Primary action plus an overflow sheet.
 */
export function ActionSheet({ visible, title, items, cancelLabel, onClose }: ActionSheetProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const resolvedCancel = cancelLabel ?? t('common.cancel');

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel={t('common.dismiss')}
        />
        <View
          style={[
            styles.sheet,
            { paddingBottom: spacing.lg + insets.bottom },
          ]}
          accessibilityViewIsModal
        >
          {title ? (
            <Text variant="caption" color="muted" style={styles.title}>
              {title}
            </Text>
          ) : null}
          <View style={styles.items}>
            {items.map((item, index) => (
              <SheetButton key={index} item={item} />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={resolvedCancel}
            style={({ pressed }) => [styles.cancel, pressed && styles.cancelPressed]}
            onPress={onClose}
          >
            <Text variant="bodyLg" color="primary" style={styles.cancelText}>
              {resolvedCancel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function SheetButton({ item }: { item: ActionSheetItem }) {
  const Icon = item.icon;
  const isDisabled = !!item.disabled;
  const color = item.destructive ? colors.semantic.error : colors.text.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.item,
        pressed && !isDisabled && styles.itemPressed,
        isDisabled && styles.itemDisabled,
      ]}
      onPress={item.onPress}
    >
      <View style={styles.itemContent}>
        {Icon ? <Icon size={sizes.iconMd} color={color} strokeWidth={2} /> : null}
        <Text variant="bodyLg" color={item.destructive ? 'error' : 'primary'}>
          {item.label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay.default,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface.higher,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
  items: {
    gap: spacing.xs,
  },
  item: {
    minHeight: sizes.touchTarget,
    borderRadius: radius.md,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  itemPressed: {
    backgroundColor: colors.surface.elevated,
  },
  itemDisabled: {
    opacity: 0.4,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cancel: {
    minHeight: sizes.touchTarget,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.elevated,
    marginTop: spacing.sm,
  },
  cancelPressed: {
    backgroundColor: colors.surface.card,
  },
  cancelText: {
    fontWeight: '600',
  },
});
