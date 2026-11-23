import { createProjector, type LatLon } from './geo';

/**
 * Share of `reference` (sampled) that lies within `toleranceM` of `candidate`.
 * Direction-agnostic, so it also recognises the same road driven the other way.
 */
export function overlap(reference: LatLon[], candidate: LatLon[], toleranceM = 40, samples = 60): number {
  if (reference.length === 0 || candidate.length === 0) return 0;
  const proj = createProjector(reference[0]);
  const cand = candidate.map((p) => proj.toXY(p));
  const step = Math.max(1, Math.floor(reference.length / samples));
  let hits = 0;
  let total = 0;
  for (let i = 0; i < reference.length; i += step) {
    const p = proj.toXY(reference[i]);
    total++;
    for (let j = 0; j < cand.length - 1; j++) {
      const a = cand[j];
      const b = cand[j + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
      if (Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)) <= toleranceM) {
        hits++;
        break;
      }
    }
  }
  return hits / total;
}

/** Index of the candidate route that best follows `previous` (the route the user had chosen). */
export function mostSimilar(candidates: LatLon[][], previous: LatLon[]): number {
  let best = 0;
  let bestScore = -1;
  candidates.forEach((c, i) => {
    const score = overlap(previous, c);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}
