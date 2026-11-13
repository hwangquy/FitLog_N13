import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';
import type { Coords } from '../../types';
import { useAppTheme } from '../../hooks/useAppTheme';
import { routeDistanceKm } from '../../features/location/route';
import { AppText } from '../ui/primitives';
import type { RoutePreviewProps } from './RoutePreview';

const DEFAULT_DELTA = 0.008;

function getRegion(points: Coords[]): Region {
  if (!points.length) {
    return {
      latitude: 0,
      longitude: 0,
      latitudeDelta: DEFAULT_DELTA,
      longitudeDelta: DEFAULT_DELTA
    };
  }

  const latitudes = points.map(point => point.latitude);
  const longitudes = points.map(point => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max((maxLatitude - minLatitude) * 1.5, DEFAULT_DELTA),
    longitudeDelta: Math.max((maxLongitude - minLongitude) * 1.5, DEFAULT_DELTA)
  };
}

export function RoutePreview({ route, currentLocation, tracking }: RoutePreviewProps) {
  const { colors } = useAppTheme();
  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const lastRoutePoint = route[route.length - 1];
  const marker = currentLocation ?? lastRoutePoint;
  const initialRegion = useMemo(
    () => getRegion(currentLocation ? [...route, currentLocation] : route),
    [currentLocation, route]
  );

  useEffect(() => {
    if (!mapReady || !currentLocation) return;
    mapRef.current?.animateToRegion({
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: DEFAULT_DELTA,
      longitudeDelta: DEFAULT_DELTA
    }, 500);
  }, [currentLocation, mapReady]);

  if (!marker) return null;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onMapReady={() => setMapReady(true)}
        showsCompass
        showsMyLocationButton={false}
        showsUserLocation={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {route.length > 1 ? (
          <Polyline coordinates={route} strokeColor={colors.brand} strokeWidth={5} />
        ) : null}
        <Marker
          coordinate={marker}
          pinColor={colors.brand}
          title={tracking ? 'Vị trí hiện tại' : 'Điểm cuối tuyến'}
          description={tracking ? 'Đang ghi tuyến GPS' : undefined}
        />
      </MapView>
      <AppText tone="muted" size="xs">
        {route.length > 1
          ? `Tuyến GPS · ${routeDistanceKm(route).toFixed(2)} km · ${route.length} điểm`
          : tracking ? 'Đang theo dõi vị trí GPS' : 'Vị trí trên bản đồ'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  map: { width: '100%', height: 230, borderRadius: 14 }
});
