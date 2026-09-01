import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Inbox, CheckCircle2, SearchX, CalendarDays, UserRound } from '@/components/icons';
import { colors, radius } from '@/constants/theme';

export type StateVariant =
  | 'none'
  | 'empty'
  | 'noResults'
  | 'noReviews'
  | 'incomplete'
  | 'success';

interface StateMeta {
  icon: LucideIcon;
  background: string;
  color: string;
}

const STATE_META: Record<StateVariant, StateMeta> = {
  empty: { icon: Inbox, background: colors.surface.elevated, color: colors.text.muted },
  noResults: { icon: SearchX, background: colors.surface.elevated, color: colors.text.muted },
  noReviews: { icon: CalendarDays, background: colors.accent.tint, color: colors.accent.opportunity },
  incomplete: { icon: UserRound, background: colors.brand.tint, color: colors.brand.primary },
  success: { icon: CheckCircle2, background: colors.semanticTint.success, color: colors.semantic.success },
  none: { icon: Inbox, background: colors.surface.elevated, color: colors.text.muted },
};

export interface StateIllustrationProps {
  state?: StateVariant;
  icon?: LucideIcon;
  iconColor?: string;
  size?: number;
}

/**
 * Lightweight visual anchor for empty / informational states. Uses existing
 * icon infrastructure only — no illustration dependencies. Establishes a
 * consistent visual language for later empty states.
 */
export function StateIllustration({
  state = 'empty',
  icon,
  iconColor,
  size = 56,
}: StateIllustrationProps) {
  const meta = STATE_META[state] ?? STATE_META.none;
  const Icon = icon ?? meta.icon;
  const color = iconColor ?? meta.color;

  return (
    <View
      style={[
        styles.circle,
        { width: size + 16, height: size + 16, borderRadius: size, backgroundColor: meta.background },
      ]}
      accessibilityRole="image"
      accessibilityLabel={state}
    >
      <Icon size={size} color={color} strokeWidth={1.75} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
});
