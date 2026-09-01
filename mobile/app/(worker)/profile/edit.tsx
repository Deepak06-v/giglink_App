import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from '@/components/icons';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { Button, ErrorState, ImagePickerField, Input, Text } from '@/components/ui';
import { colors, radius, sizes, spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getWorkerProfile, updateWorkerProfile } from '@/lib/api/profiles';
import { translate, type TranslationKey } from '@/lib/i18n';
import { availabilitySummary } from '@/utils/availability';
import type { WorkerProfile } from '@/types';

const AVAILABILITY_OPTIONS = ['AVAILABLE', 'LIMITED', 'UNAVAILABLE'] as const;
const AVAILABILITY_LABEL_KEYS = {
  AVAILABLE: 'profile.availabilityAvailable',
  LIMITED: 'profile.availabilityLimited',
  UNAVAILABLE: 'profile.availabilityUnavailable',
} as const;

function SectionTitle({ value }: { value: TranslationKey }) {
  return (
    <Text variant="label" color="accent">
      {translate(value)}
    </Text>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [experience, setExperience] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [availability, setAvailability] = useState<WorkerProfile['availability']>('AVAILABLE');
  const [skillsText, setSkillsText] = useState('');
  const [languagesText, setLanguagesText] = useState('');
  const [weeklyAvailability, setWeeklyAvailability] = useState<
    WorkerProfile['weeklyAvailability']
  >([]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await getWorkerProfile();
      setPhone(profile.phone ?? '');
      setBio(profile.bio ?? '');
      setCity(profile.location?.city ?? '');
      setState(profile.location?.state ?? '');
      setPincode(profile.location?.pincode ?? '');
      setExperience(profile.experience ?? '');
      setProfileImage(profile.profileImage ?? '');
      setAvailability(profile.availability ?? 'AVAILABLE');
      setSkillsText(profile.skills?.join(', ') ?? '');
      setLanguagesText(profile.languages?.join(', ') ?? '');
      setWeeklyAvailability(profile.weeklyAvailability ?? []);
    } catch (err) {
      setError(getApiErrorMessage(err, translate('profile.unableLoadProfile')));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await updateWorkerProfile({
        phone: phone || undefined,
        bio: bio || undefined,
        profileImage: profileImage || undefined,
        experience: experience || undefined,
        availability,
        location: {
          city: city || undefined,
          state: state || undefined,
          pincode: pincode || undefined,
        },
        skills: skillsText
          ? skillsText.split(',').map((item) => item.trim()).filter(Boolean)
          : undefined,
        languages: languagesText
          ? languagesText.split(',').map((item) => item.trim()).filter(Boolean)
          : undefined,
      });
      router.back();
    } catch (err) {
      setSaveError(getApiErrorMessage(err, translate('profile.unableSaveProfile')));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen scroll keyboardAvoiding>
        <DetailHeader title={translate('profile.editProfile')} />
        <Text variant="bodyMd" color="secondary">
          {translate('profile.loadingProfile')}
        </Text>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <DetailHeader title={translate('profile.editProfile')} />
        <ErrorState message={error} onRetry={() => void loadProfile()} />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      keyboardAvoiding
      footer={
        <View style={styles.footer}>
          {saveError ? (
            <Text variant="caption" color="error" align="center">
              {saveError}
            </Text>
          ) : null}
          <Button
            label={saving ? translate('profile.saving') : translate('profile.saveChanges')}
            onPress={() => void handleSave()}
            loading={saving}
            fullWidth
          />
        </View>
      }
      contentContainerStyle={styles.content}
    >
      <DetailHeader title={translate('profile.editProfile')} />

      <SectionTitle value="profile.sections.aboutYou" />
      <ImagePickerField label={translate('profile.photo')} value={profileImage} type="worker_profile" onChange={setProfileImage} />
      <Input label={translate('profile.bio')} value={bio} onChangeText={setBio} multiline numberOfLines={4} />

      <SectionTitle value="profile.sections.contact" />
      <Input label={translate('profile.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Input label={translate('profile.city')} value={city} onChangeText={setCity} />
      <Input label={translate('profile.state')} value={state} onChangeText={setState} />
      <Input label={translate('profile.pincode')} value={pincode} onChangeText={setPincode} keyboardType="numeric" />

      <SectionTitle value="profile.sections.skillsExperience" />
      <Input label={translate('profile.experience')} value={experience} onChangeText={setExperience} multiline numberOfLines={3} />
      <Input
        label={translate('profile.skillsCommaSeparated')}
        value={skillsText}
        onChangeText={setSkillsText}
        placeholder={translate('profile.skillsPlaceholder')}
      />
      <Input
        label={translate('profile.languagesCommaSeparated')}
        value={languagesText}
        onChangeText={setLanguagesText}
        placeholder={translate('profile.languagesPlaceholder')}
      />

      <SectionTitle value="profile.sections.workingHours" />
      <View style={styles.availabilityRow}>
        {AVAILABILITY_OPTIONS.map((option) => {
          const selected = availability === option;
          return (
            <Button
              key={option}
              label={translate(AVAILABILITY_LABEL_KEYS[option])}
              size="sm"
              variant={selected ? 'primary' : 'secondary'}
              onPress={() => setAvailability(option)}
              style={styles.availabilityButton}
            />
          );
        })}
      </View>

      <Pressable
        onPress={() => router.push('/profile/availability')}
        style={styles.hoursEntry}
        accessibilityRole="button"
      >
        <View style={styles.hoursEntryText}>
          <Text variant="bodyMd" color="primary">
            {translate('workingHours.title')}
          </Text>
          <Text variant="caption" color="secondary" numberOfLines={2}>
            {availabilitySummary(weeklyAvailability)}
          </Text>
        </View>
        <View style={styles.hoursEntryAction}>
          <Text variant="bodyMd" color="brand">
            {translate('common.edit')}
          </Text>
          <ChevronRight size={sizes.iconSm} color={colors.brand.primary} />
        </View>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  footer: {
    gap: spacing.sm,
  },
  availabilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  availabilityButton: {
    flexGrow: 1,
  },
  hoursEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  hoursEntryText: {
    flex: 1,
    gap: spacing.xs,
  },
  hoursEntryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
