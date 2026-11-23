import { distanceMeters, type LatLon } from './geo';

/**
 * Adds a stop where it belongs: the first two taps are start and finish; after
 * that a tap becomes a via point in the leg where it adds the least detour, so
 * "pass through here" works anywhere along the route.
 */
export function insertStop(stops: LatLon[], p: LatLon): LatLon[] {
  if (stops.length < 2) return [...stops, p];
  let best = 1;
  let bestCost = Infinity;
  for (let i = 1; i < stops.length; i++) {
    const cost = distanceMeters(stops[i - 1], p) + distanceMeters(p, stops[i]) - distanceMeters(stops[i - 1], stops[i]);
    if (cost < bestCost) {
      bestCost = cost;
      best = i;
    }
  }
  return [...stops.slice(0, best), p, ...stops.slice(best)];
}

/** Drive the stage the other way round. */
export function reverseStops(stops: LatLon[]): LatLon[] {
  return [...stops].reverse();
}
