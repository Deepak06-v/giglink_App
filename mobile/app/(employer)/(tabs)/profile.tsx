import { useCallback, useState } from 'react';
import { Image, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Building2 } from '@/components/icons';
import { Screen } from '@/components/layout/Screen';
import { Badge, Button, Card, ErrorState, Skeleton, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getEmployerProfile } from '@/lib/api/profiles';
import { translate, type TranslationKey } from '@/lib/i18n';
import { useAuthStore } from '@/store/authStore';
import type { EmployerProfile as EmployerProfileType } from '@/types';
import { employerEditProfileRoute } from '@/utils/routing';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="caption" color="muted">
        {label}
      </Text>
      <Text variant="bodyMd" color="primary">
        {value || '—'}
      </Text>
    </View>
  );
}

const MISSING_FIELD_LABELS: Record<string, TranslationKey> = {
  COMPANY_NAME: 'profile.completion.addCompanyName',
  COMPANY_LOGO: 'profile.completion.addCompanyLogo',
  COMPANY_DESCRIPTION: 'profile.completion.addCompanyDescription',
  PHONE: 'profile.completion.addPhone',
  ADDRESS: 'profile.completion.addAddress',
  LOCATION: 'profile.completion.addLocation',
};

function MissingFieldsList({ missingFields, onEdit }: { missingFields: string[]; onEdit: () => void }) {
  if (missingFields.length === 0) {
    return null;
  }
  return (
    <View style={styles.missingListWrap}>
      <Text variant="bodyMd" color="primary">
        {translate('profile.completion.missingTitle')}
      </Text>
      <View style={styles.missingList}>
        {missingFields.map((field) => {
          const label = MISSING_FIELD_LABELS[field] ?? MISSING_FIELD_LABELS.COMPANY_NAME;
          return (
            <View key={field} style={styles.missingRow}>
              <View style={styles.missingDot} />
              <Text variant="bodyMd" color="secondary" style={styles.missingText}>
                {translate(label)}
              </Text>
            </View>
          );
        })}
      </View>
      <Button label={translate('profile.editProfile')} variant="secondary" size="sm" onPress={onEdit} style={styles.missingAction} />
    </View>
  );
}

export default function EmployerProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [profile, setProfile] = useState<EmployerProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (mode: 'initial' | 'refresh' | 'focus' = 'initial') => {
    if (mode === 'initial') {
      setLoading(true);
    } else if (mode === 'refresh') {
      setRefreshing(true);
    }
    setError(null);

    try {
      const data = await getEmployerProfile();
      setProfile(data);
    } catch (err) {
      setError(getApiErrorMessage(err, translate('profile.unableLoadProfile')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile('focus');
    }, [loadProfile]),
  );

  if (loading) {
    return (
      <Screen scroll contentContainerStyle={styles.skeleton}>
        <Skeleton width={96} height={96} radiusValue={radius.lg} />
        <Skeleton width="50%" height={22} />
        <Skeleton width="30%" height={14} />
        <Skeleton width="100%" height={180} radiusValue={radius.lg} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState message={error} onRetry={() => void loadProfile()} />
      </Screen>
    );
  }

  const companyName = profile?.companyName || user?.name || translate('profile.yourCompany');
  const completion = profile?.completion;

  return (
    <Screen
      scroll
      scrollViewProps={{
        refreshControl: (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadProfile('refresh')}
            tintColor={colors.brand.primary}
          />
        ),
      }}
    >
      <View style={styles.header}>
        {profile?.logo ? (
          <Image source={{ uri: profile.logo }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Building2 size={40} color={colors.surface.card} />
          </View>
        )}
        <Text variant="headingLg" color="primary" align="center">
          {companyName}
        </Text>
        <Badge label={translate('profile.employer')} variant="brand" />
      </View>

      <Text variant="headingMd" color="primary" style={styles.sectionTitle}>
        {translate('profile.profileInformation')}
      </Text>
      <Card style={styles.infoCard}>
        <InfoRow label={translate('profile.email')} value={user?.email ?? '—'} />
        <InfoRow label={translate('profile.phone')} value={profile?.phone ?? '—'} />
        <InfoRow label={translate('profile.address')} value={profile?.address ?? '—'} />
        <InfoRow label={translate('profile.city')} value={profile?.city ?? '—'} />
        <InfoRow label={translate('profile.state')} value={profile?.state ?? '—'} />
        <InfoRow label={translate('profile.pincode')} value={profile?.pincode ?? '—'} />
      </Card>

      {profile?.companyDescription ? (
        <Text variant="headingMd" color="primary" style={styles.sectionTitle}>
          {translate('profile.about')}
        </Text>
      ) : null}
      {profile?.companyDescription ? (
        <Card style={styles.infoCard}>
          <Text variant="bodyMd" color="secondary">
            {profile.companyDescription}
          </Text>
        </Card>
      ) : null}

      {completion ? (
        <Card style={styles.completionCard}>
          <Text variant="bodyMd" color="primary">
            {translate('profile.completion.percentComplete', { percentage: completion.percentage })}
          </Text>
          <MissingFieldsList
            missingFields={completion.missingFields ?? []}
            onEdit={() => router.push(employerEditProfileRoute())}
          />
        </Card>
      ) : null}

      <View style={styles.actions}>
        <Button label={translate('profile.editProfile')} onPress={() => router.push(employerEditProfileRoute())} />
        <Button label={translate('profile.logout')} variant="secondary" onPress={() => void logout()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
    marginTop: spacing.sm,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  infoCard: {
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  infoRow: {
    gap: spacing.xs,
  },
  completionCard: {
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  missingListWrap: {
    gap: spacing.sm,
  },
  missingAction: {
    alignSelf: 'flex-start',
  },
  missingList: {
    gap: spacing.xs,
  },
  missingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  missingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand.primary,
  },
  missingText: {
    flex: 1,
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  skeleton: {
    gap: spacing.lg,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
});
