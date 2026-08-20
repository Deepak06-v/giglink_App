import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Region } from 'react-native-maps';

import { Button, Card, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { translate, useTranslation } from '@/lib/i18n';

export interface SelectedLocation {
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  initialLocation?: SelectedLocation | null;
  onLocationSelected: (location: SelectedLocation) => void;
  height?: number;
}

const DEFAULT_REGION: Region = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 20,
  longitudeDelta: 20,
};

export function LocationPicker({
  initialLocation,
  onLocationSelected,
  height = 320,
}: LocationPickerProps) {
  const { t } = useTranslation();
  const [region, setRegion] = useState<Region>(() =>
    initialLocation
      ? {
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }
      : DEFAULT_REGION,
  );

  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const centerLocation = useMemo(
    () => ({
      latitude: region.latitude,
      longitude: region.longitude,
    }),
    [region.latitude, region.longitude],
  );

  useEffect(() => {
    if (initialLocation) {
      return;
    }

    void locateUser();
  }, [initialLocation]);

  const locateUser = async () => {
    try {
      setLoading(true);
      setLocationError(null);

      const permission = await Location.getForegroundPermissionsAsync();

      let permissionStatus = permission.status;

      if (permissionStatus !== Location.PermissionStatus.GRANTED) {
        const requested = await Location.requestForegroundPermissionsAsync();
        permissionStatus = requested.status;
      }

      if (permissionStatus !== Location.PermissionStatus.GRANTED) {
        setLocationError(translate('maps.permissionDenied'));
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        setLocationError(translate('maps.servicesOff'));
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setRegion({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch {
      setLocationError(translate('maps.unableToDetermine'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegionChangeComplete = (nextRegion: Region) => {
    setRegion(nextRegion);
  };

  const handleConfirm = () => {
    onLocationSelected(centerLocation);
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.mapContainer, { height }]}>
        <MapView
          style={styles.map}
          region={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
          rotateEnabled={false}
          pitchEnabled={false}
        />

        <View pointerEvents="none" style={styles.centerPin}>
          <View style={styles.pin}>
            <View style={styles.pinDot} />
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator />
            <Text variant="caption" color="primary">
              {t('maps.findingLocation')}
            </Text>
          </View>
        ) : null}
      </View>

      {locationError ? (
        <Card style={styles.errorCard}>
          <Text variant="caption" color="error">
            {locationError}
          </Text>
        </Card>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={t('maps.useMyLocation')}
          variant="secondary"
          onPress={locateUser}
          disabled={loading}
          loading={loading}
          style={styles.actionButton}
        />

        <Button
          label={t('maps.confirmLocation')}
          onPress={handleConfirm}
          disabled={loading}
          style={styles.actionButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
  },
  mapContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  map: {
    flex: 1,
  },
  centerPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -16,
    marginTop: -32,
  },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background.primary,
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background.primary,
  },
  loadingOverlay: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    top: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorCard: {
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});