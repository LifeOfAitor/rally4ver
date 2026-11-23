import { createProjector, type LatLon, type XY } from './geo';
import { resample } from './path';

/**
 * Finding "the other roads" between A and B. The public router only offers
 * alternatives very similar to the fastest one, so we also route through
 * points on either side of the A→B line, keep the part of each result that
 * leaves the known routes, and route again through a point on it. These
 * helpers are the pure geometry behind that (see data/routing.ts).
 */

/** Through-points at 1/3, 1/2 and 2/3 of A→B, offset `±offset` × |AB| to each side. */
export function viaCandidates(a: LatLon, b: LatLon, offset = 0.12): LatLon[] {
  const proj = createProjector(a);
  const B = proj.toXY(b);
  const len = Math.hypot(B.x, B.y);
  if (len < 1) return [];
  const n = { x: -B.y / len, y: B.x / len }; // left normal
  const out: LatLon[] = [];
  for (const t of [0.5, 0.33, 0.67]) {
    for (const side of [-1, 1]) {
      out.push(proj.toLatLon({ x: B.x * t + n.x * side * offset * len, y: B.y * t + n.y * side * offset * len }));
    }
  }
  return out;
}

/** Points every `step` meters along a polyline, in local XY. */
export function densify(route: LatLon[], step: number, proj = createProjector(route[0])): XY[] {
  return resample(
    route.map((p) => proj.toXY(p)),
    step,
  );
}

const d = (a: XY, b: XY) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * True if the route drives down a road and comes back along the same road
 * (what happens when a through-point snaps to a dead end). Hairpins and
 * roundabouts don't count: there the way back runs beside, not on top.
 */
export function hasRetrace(route: LatLon[], minLengthM = 120, toleranceM = 12): boolean {
  if (route.length < 2) return false;
  const p = densify(route, 10);
  const span = Math.round(minLengthM / 10);
  for (let i = span; i < p.length - span; i++) {
    // Out-and-back: the path `span` before i and `span` after i lie on top of each other, mirrored.
    let same = 0;
    for (let k = 1; k <= span; k++) if (d(p[i - k], p[i + k]) < toleranceM) same++;
    if (same >= span * 0.8 && d(p[i], p[i - span]) > minLengthM * 0.6) return true;
  }
  return false;
}

/** Distance (m) from `p` to the nearest of `pts`. */
function nearest(p: XY, pts: XY[]): number {
  let m = Infinity;
  for (const q of pts) {
    const dist = d(p, q);
    if (dist < m) m = dist;
  }
  return m;
}

/**
 * The point of `route` farthest from every route in `known`: a good place to
 * route through to get that road and nothing else. Returns its distance too.
 */
export function farthestPoint(route: LatLon[], known: LatLon[][]): { point: LatLon; distance: number } {
  const proj = createProjector(route[0]);
  const ref = known.flatMap((k) => densify(k, 40, proj));
  const pts = densify(route, 40, proj);
  let best = { p: pts[0], dist: -1 };
  // Skip the first/last 15 %: near A and B every route is close to the others.
  const from = Math.floor(pts.length * 0.15);
  const to = Math.ceil(pts.length * 0.85);
  for (let i = from; i < to; i++) {
    const dist = ref.length ? nearest(pts[i], ref) : Infinity;
    if (dist > best.dist) best = { p: pts[i], dist };
  }
  return { point: proj.toLatLon(best.p), distance: best.dist };
}

/** Shortened version of a route's geometry without out-and-back detours. */
export function withoutDetours(route: LatLon[]): LatLon[] {
  const proj = createProjector(route[0]);
  const p = densify(route, 15, proj);
  const out: XY[] = [];
  let i = 0;
  while (i < p.length) {
    out.push(p[i]);
    // Jump over a stretch that leaves and comes back to (almost) the same spot.
    let jump = i + 1;
    for (let j = Math.min(p.length - 1, i + 400); j > i + 8; j--) {
      if (d(p[i], p[j]) < 20) {
        jump = j;
        break;
      }
    }
    i = jump;
  }
  return out.map((q) => proj.toLatLon(q));
}
