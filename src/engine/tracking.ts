import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Alert, Platform } from 'react-native';

import { handleLocations } from './drive';

export const LOCATION_TASK = 'rally4ver-location';

// Must run at module load (imported from index.ts) so the OS can deliver
// background updates even before any screen mounts.
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[tracking] task error', error.message);
    return;
  }
  if (data?.locations) handleLocations(data.locations);
});

/** Pacenotes need frequent, precise fixes: best accuracy, every second, no distance filter. */
const LOCATION_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  distanceInterval: 0,
  timeInterval: 1000,
};

let foregroundWatcher: Location.LocationSubscription | null = null;
let askedBackgroundThisLaunch = false;

export type TrackingMode = 'denied' | 'foreground' | 'background';

/**
 * Starts location updates for a stage: in the background when "Siempre" is
 * granted (notes keep coming with the screen off / another app in front),
 * otherwise only while Rally4ver is open.
 */
export async function startTracking(): Promise<TrackingMode> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) {
    await stopTracking();
    return 'denied';
  }

  let background = await Location.getBackgroundPermissionsAsync();
  if (!background.granted && background.canAskAgain && !askedBackgroundThisLaunch) {
    askedBackgroundThisLaunch = true;
    await explainBackgroundPermission();
    background = await Location.requestBackgroundPermissionsAsync();
  }

  if (background.granted) {
    await stopForegroundWatcher();
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      ...LOCATION_OPTIONS,
      activityType: Location.ActivityType.AutomotiveNavigation,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Rally4ver en tramo',
        notificationBody: 'Cantando notas',
        notificationColor: '#E10600',
        killServiceOnDestroy: true,
      },
    });
    return 'background';
  }
  await stopBackgroundUpdates();
  foregroundWatcher ??= await Location.watchPositionAsync(LOCATION_OPTIONS, (location) => handleLocations([location]));
  return 'foreground';
}

export async function stopTracking() {
  await stopForegroundWatcher();
  await stopBackgroundUpdates();
}

async function stopForegroundWatcher() {
  foregroundWatcher?.remove();
  foregroundWatcher = null;
}

async function stopBackgroundUpdates() {
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}

function explainBackgroundPermission(): Promise<void> {
  const option = Platform.OS === 'android' ? '«Permitir todo el tiempo»' : '«Permitir siempre»';
  return new Promise((resolve) =>
    Alert.alert(
      'Notas con el móvil bloqueado',
      `Para cantarte las notas con la pantalla apagada o con Google Maps / Waze delante, Rally4ver necesita tu ubicación en segundo plano. En la siguiente pantalla elige ${option}.`,
      [{ text: 'Continuar', onPress: () => resolve() }],
      { cancelable: false },
    ),
  );
}
