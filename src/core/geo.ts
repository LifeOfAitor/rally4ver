export interface LatLon {
  latitude: number;
  longitude: number;
}

/** Local planar coordinates in meters (x = east, y = north). */
export interface XY {
  x: number;
  y: number;
}

const EARTH_RADIUS_M = 6_371_000;
export const toRad = (deg: number) => (deg * Math.PI) / 180;
export const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Great-circle distance in meters (haversine). */
export function distanceMeters(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Shortest angular difference between two bearings in degrees (0–180). */
export function angularDiff(a: number, b: number): number {
  return Math.abs(((((a - b + 540) % 360) + 360) % 360) - 180);
}

/** Wraps an angle in radians to (-π, π]. */
export function wrapPi(rad: number): number {
  let r = rad % (2 * Math.PI);
  if (r <= -Math.PI) r += 2 * Math.PI;
  if (r > Math.PI) r -= 2 * Math.PI;
  return r;
}

/**
 * Equirectangular projection around `origin`. Accurate to well under 1 % over a
 * stage-sized area (tens of km), which is all the pacenote maths needs.
 */
export function createProjector(origin: LatLon) {
  const cosLat = Math.cos(toRad(origin.latitude));
  return {
    toXY(p: LatLon): XY {
      return {
        x: toRad(p.longitude - origin.longitude) * EARTH_RADIUS_M * cosLat,
        y: toRad(p.latitude - origin.latitude) * EARTH_RADIUS_M,
      };
    },
    toLatLon(p: XY): LatLon {
      return {
        latitude: origin.latitude + toDeg(p.y / EARTH_RADIUS_M),
        longitude: origin.longitude + toDeg(p.x / (EARTH_RADIUS_M * cosLat)),
      };
    },
  };
}

export type Projector = ReturnType<typeof createProjector>;
