import { createProjector, type LatLon, type Projector, type XY, wrapPi } from './geo';

/** A point of a resampled path: planar position plus distance along the path (m). */
export interface PathPoint extends XY {
  s: number;
}

export interface Path {
  projector: Projector;
  /** Evenly spaced points, `step` meters apart (the last gap may be shorter). */
  points: PathPoint[];
  step: number;
  length: number;
}

/** Builds an evenly resampled planar path from a route polyline. */
export function buildPath(route: LatLon[], step = 5): Path {
  if (route.length === 0) throw new Error('Empty route');
  const projector = createProjector(route[0]);
  const raw = route.map((p) => projector.toXY(p));
  const points = resample(raw, step);
  return { projector, points, step, length: points[points.length - 1].s };
}

/** Walks the polyline and emits a point every `step` meters of arc length. */
export function resample(raw: XY[], step: number): PathPoint[] {
  const pts = raw.filter((p, i) => i === 0 || Math.hypot(p.x - raw[i - 1].x, p.y - raw[i - 1].y) > 1e-6);
  const out: PathPoint[] = [{ x: pts[0].x, y: pts[0].y, s: 0 }];
  let travelled = 0; // arc length at pts[i]
  let nextS = step;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    while (nextS <= travelled + len) {
      const t = (nextS - travelled) / len;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, s: nextS });
      nextS += step;
    }
    travelled += len;
  }
  const last = pts[pts.length - 1];
  if (travelled - out[out.length - 1].s > 0.5) out.push({ x: last.x, y: last.y, s: travelled });
  return out;
}

/**
 * Unwrapped heading (radians, clockwise from north) of each segment i → i+1.
 * Unwrapping makes "total turn between two segments" a simple subtraction.
 */
export function unwrappedHeadings(points: XY[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const h = Math.atan2(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    out.push(i === 0 ? h : out[i - 1] + wrapPi(h - out[i - 1]));
  }
  return out;
}

/**
 * Signed curvature (1/m) at each point, positive = turning right.
 *
 * Measured as the heading change across a window of ±`halfWindowM`, which
 * smooths OSM polylines where a whole bend is often drawn as one sharp node.
 */
export function curvatures(path: Path, halfWindowM = 12): number[] {
  const { points, step } = path;
  const h = unwrappedHeadings(points);
  const w = Math.max(1, Math.round(halfWindowM / step));
  const n = points.length;
  const k = new Array<number>(n).fill(0);
  if (h.length < 2) return k;
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - w);
    const b = Math.min(h.length - 1, i + w - 1);
    if (b <= a) continue;
    const span =
      points[b].s + (points[b + 1].s - points[b].s) / 2 - (points[a].s + (points[a + 1].s - points[a].s) / 2);
    k[i] = (h[b] - h[a]) / span;
  }
  return k;
}
