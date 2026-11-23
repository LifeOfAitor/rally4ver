import { createProjector, type LatLon, toRad } from '../core/geo';

export const MADRID: LatLon = { latitude: 40.4168, longitude: -3.7038 };

/** Point `meters` away from `origin` towards `bearing` (flat-earth approximation, fine for < 10 km). */
export function offset(origin: LatLon, meters: number, bearing: number): LatLon {
  const p = createProjector(origin);
  return p.toLatLon({ x: meters * Math.sin(toRad(bearing)), y: meters * Math.cos(toRad(bearing)) });
}

export type Segment =
  | { straight: number }
  | { turn: 'L' | 'R'; radius: number; angle: number };

/**
 * Builds a synthetic road as a LatLon polyline: straights and circular arcs,
 * sampled every `sample` meters (like a densely drawn OSM way).
 */
export function buildRoad(segments: Segment[], { start = MADRID, heading = 0, sample = 2 } = {}): LatLon[] {
  const proj = createProjector(start);
  let x = 0;
  let y = 0;
  let h = toRad(heading);
  const out = [proj.toLatLon({ x, y })];
  for (const seg of segments) {
    if ('straight' in seg) {
      const n = Math.max(1, Math.ceil(seg.straight / sample));
      const d = seg.straight / n;
      for (let i = 0; i < n; i++) {
        x += d * Math.sin(h);
        y += d * Math.cos(h);
        out.push(proj.toLatLon({ x, y }));
      }
    } else {
      const sign = seg.turn === 'R' ? 1 : -1;
      const total = toRad(seg.angle);
      const arc = seg.radius * total;
      const n = Math.max(1, Math.ceil(arc / sample));
      const dh = (total / n) * sign;
      const chord = 2 * seg.radius * Math.sin(total / n / 2);
      for (let i = 0; i < n; i++) {
        const mid = h + dh / 2;
        x += chord * Math.sin(mid);
        y += chord * Math.cos(mid);
        h += dh;
        out.push(proj.toLatLon({ x, y }));
      }
    }
  }
  return out;
}
