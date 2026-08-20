import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { colors, radius } from '@/constants/theme';

export interface JobMapPreviewProps {
  latitude: number;
  longitude: number;
  height?: number;
}

export function JobMapPreview({ latitude, longitude, height = 180 }: JobMapPreviewProps) {
  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        scrollEnabled
        zoomEnabled
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <Marker coordinate={{ latitude, longitude }} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  map: {
    flex: 1,
  },
});
