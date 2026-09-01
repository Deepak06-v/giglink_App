import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { Button, ErrorState, ImagePickerField, Input, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getEmployerProfile, updateEmployerProfile } from '@/lib/api/profiles';
import { translate, type TranslationKey } from '@/lib/i18n';

function SectionTitle({ value }: { value: TranslationKey }) {
  return (
    <Text variant="label" color="accent">
      {translate(value)}
    </Text>
  );
}

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

      <SectionTitle value="profile.about" />
      <ImagePickerField label={translate('profile.companyLogo')} value={logo} type="employer_logo" onChange={setLogo} />
      <Input label={translate('profile.companyName')} value={companyName} onChangeText={setCompanyName} />
      <Input
        label={translate('profile.companyDescription')}
        value={companyDescription}
        onChangeText={setCompanyDescription}
        multiline
        numberOfLines={4}
        placeholder={translate('profile.companyDescriptionPlaceholder')}
      />

      <SectionTitle value="profile.sections.contact" />
      <Input label={translate('profile.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Input label={translate('profile.address')} value={address} onChangeText={setAddress} />
      <Input label={translate('profile.city')} value={city} onChangeText={setCity} />
      <Input label={translate('profile.state')} value={state} onChangeText={setState} />
      <Input label={translate('profile.pincode')} value={pincode} onChangeText={setPincode} keyboardType="numeric" />
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
});
