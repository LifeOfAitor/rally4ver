import * as Location from 'expo-location';

import type { LatLon } from '../core/geo';

/** One foreground fix, or null if permission is denied / no fix. */
export async function currentLocation(): Promise<LatLon | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
  const fix = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return fix ? { latitude: fix.coords.latitude, longitude: fix.coords.longitude } : null;
}
