import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { Button, ErrorState, Input, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getWorkerProfile, updateWorkerProfile } from '@/lib/api/profiles';
import type { WorkerProfile } from '@/types';

const AVAILABILITY_OPTIONS = ['AVAILABLE', 'LIMITED', 'UNAVAILABLE'] as const;

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
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load profile'));
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
      setSaveError(getApiErrorMessage(err, 'Unable to save profile'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen scroll keyboardAvoiding>
        <DetailHeader title="Edit Profile" />
        <Text variant="bodyMd" color="secondary">
          Loading profile...
        </Text>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <DetailHeader title="Edit Profile" />
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
          <Button label={saving ? 'Saving...' : 'Save Changes'} onPress={() => void handleSave()} loading={saving} fullWidth />
        </View>
      }
      contentContainerStyle={styles.content}
    >
      <DetailHeader title="Edit Profile" />

      <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Input label="City" value={city} onChangeText={setCity} />
      <Input label="State" value={state} onChangeText={setState} />
      <Input label="Pincode" value={pincode} onChangeText={setPincode} keyboardType="numeric" />
      <Input label="Bio" value={bio} onChangeText={setBio} multiline numberOfLines={4} />
      <Input label="Experience" value={experience} onChangeText={setExperience} multiline numberOfLines={3} />
      <Input
        label="Profile image URL"
        value={profileImage}
        onChangeText={setProfileImage}
        autoCapitalize="none"
        placeholder="https://..."
      />
      <Input
        label="Skills (comma separated)"
        value={skillsText}
        onChangeText={setSkillsText}
        placeholder="Events, Customer service"
      />
      <Input
        label="Languages (comma separated)"
        value={languagesText}
        onChangeText={setLanguagesText}
        placeholder="English, Hindi"
      />

      <Text variant="label" color="secondary">
        Availability
      </Text>
      <View style={styles.availabilityRow}>
        {AVAILABILITY_OPTIONS.map((option) => {
          const selected = availability === option;
          return (
            <Button
              key={option}
              label={option}
              size="sm"
              variant={selected ? 'primary' : 'secondary'}
              onPress={() => setAvailability(option)}
              style={styles.availabilityButton}
            />
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
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
});
