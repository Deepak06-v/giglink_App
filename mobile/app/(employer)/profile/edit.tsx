import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { Button, ErrorState, Input, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getEmployerProfile, updateEmployerProfile } from '@/lib/api/profiles';

export default function EditEmployerProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [logo, setLogo] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await getEmployerProfile();
      setCompanyName(profile.companyName ?? '');
      setCompanyDescription(profile.companyDescription ?? '');
      setPhone(profile.phone ?? '');
      setLogo(profile.logo ?? '');
      setAddress(profile.address ?? '');
      setCity(profile.city ?? '');
      setState(profile.state ?? '');
      setPincode(profile.pincode ?? '');
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
      await updateEmployerProfile({
        companyName: companyName || undefined,
        companyDescription: companyDescription || undefined,
        phone: phone || undefined,
        logo: logo || undefined,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        pincode: pincode || undefined,
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
          <Button
            label={saving ? 'Saving...' : 'Save Changes'}
            onPress={() => void handleSave()}
            loading={saving}
            fullWidth
          />
        </View>
      }
      contentContainerStyle={styles.content}
    >
      <DetailHeader title="Edit Profile" />

      <Input label="Company name" value={companyName} onChangeText={setCompanyName} />
      <Input
        label="Company description"
        value={companyDescription}
        onChangeText={setCompanyDescription}
        multiline
        numberOfLines={4}
        placeholder="Tell workers about your company"
      />
      <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Input
        label="Logo URL"
        value={logo}
        onChangeText={setLogo}
        autoCapitalize="none"
        placeholder="https://..."
      />
      <Input label="Address" value={address} onChangeText={setAddress} />
      <Input label="City" value={city} onChangeText={setCity} />
      <Input label="State" value={state} onChangeText={setState} />
      <Input label="Pincode" value={pincode} onChangeText={setPincode} keyboardType="numeric" />
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
});