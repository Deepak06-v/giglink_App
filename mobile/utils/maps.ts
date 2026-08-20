import { Linking, Platform } from 'react-native';

import { translate } from '@/lib/i18n';

interface OpenMapsOptions {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
}

export async function openInMaps({ latitude, longitude, address, city }: OpenMapsOptions): Promise<void> {
  const label = encodeURIComponent(address || city || translate('maps.jobLocation'));
  const coords = `${latitude},${longitude}`;

  const candidates = Platform.select({
    ios: [
      `maps:0,0?q=${label}@${coords}`,
      `http://maps.apple.com/?ll=${coords}&q=${label}`,
    ],
    android: [
      `geo:${coords}?q=${coords}(${label})`,
      `https://www.google.com/maps/search/?api=1&query=${coords}`,
    ],
    default: [`https://www.google.com/maps/search/?api=1&query=${coords}`],
  }) ?? [`https://www.google.com/maps/search/?api=1&query=${coords}`];

  for (const url of candidates) {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return;
    }
  }

  await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${coords}`);
}
