import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { uploadImage, type UploadableImage } from '@/lib/api/upload';
import type { UploadAssetType } from '@/types';

export interface ImagePickerFieldProps {
  label: string;
  value?: string;
  type: UploadAssetType;
  onChange: (url: string) => void;
}

/**
 * Reusable profile photo / logo picker: requests media permission, opens the
 * image picker, uploads the selection through the GigLink backend-signed
 * Cloudinary flow, and reports the resulting URL via `onChange`.
 *
 * While uploading the button is disabled so repeated taps cannot start
 * concurrent uploads. All failures surface as user-friendly inline text.
 */
export function ImagePickerField({ label, value, type, onChange }: ImagePickerFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasImage = Boolean(value);
  const noun = type === 'employer_logo' ? 'Logo' : 'Photo';

  const handlePick = async () => {
    if (uploading) {
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        const message =
          permission.canAskAgain === false
            ? 'Photo access is denied. Please enable photo access for GigLink in your device settings.'
            : 'Photo access is required to set your photo. Please allow access when prompted.';
        setError(message);
        return;
      }
    } catch {
      setError('Unable to check photo access. Please try again.');
      return;
    }

    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    } catch {
      setError('Unable to open the photo picker. Please try again.');
      return;
    }

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    const image: UploadableImage = {
      uri: asset.uri,
      fileName: asset.fileName ?? null,
      mimeType: asset.mimeType ?? null,
      fileSize: asset.fileSize ?? null,
    };

    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(type, image);
      onChange(url);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Upload failed. Please try again.';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="label" color="secondary">
        {label}
      </Text>

      <Pressable onPress={() => void handlePick()} disabled={uploading} style={styles.previewWrap}>
        {hasImage ? (
          <Image source={{ uri: value }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text variant="caption" color="muted">
              No {noun.toLowerCase()} set
            </Text>
          </View>
        )}
      </Pressable>

      <Button
        label={uploading ? 'Uploading...' : hasImage ? `Change ${noun}` : `Choose ${noun}`}
        onPress={() => void handlePick()}
        loading={uploading}
        variant="secondary"
      />

      {error ? (
        <Text variant="caption" color="error" align="center">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  previewWrap: {
    alignSelf: 'flex-start',
  },
  preview: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  placeholder: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
});
