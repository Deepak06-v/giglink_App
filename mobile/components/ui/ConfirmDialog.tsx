import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const resolvedCancelLabel = cancelLabel ?? t('common.cancel');
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={loading ? undefined : onCancel} accessibilityLabel={t('common.dismiss')} />
        <Card style={styles.dialog}>
          <Text variant="headingMd" color="primary">
            {title}
          </Text>
          {message ? (
            <Text variant="bodyMd" color="secondary">
              {message}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Button
              label={resolvedCancelLabel}
              variant="secondary"
              onPress={onCancel}
              disabled={loading}
              style={styles.actionButton}
            />
            <Button
              label={confirmLabel}
              variant={destructive ? 'destructive' : 'primary'}
              onPress={onConfirm}
              loading={loading}
              style={styles.actionButton}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    gap: spacing.md,
    padding: spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});

export default ConfirmDialog;