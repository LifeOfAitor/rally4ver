import type { LatLon } from './geo';
import type { Path } from './path';

export interface MatchResult {
  /** Distance along the route (m). Kept at the last good value while off route. */
  s: number;
  /** Lateral distance from the route (m). */
  offset: number;
  onRoute: boolean;
}

export interface MatcherConfig {
  maxOffsetM: number;
  /** Search window around the last position, so crossings and loops don't make us jump. */
  backM: number;
  aheadM: number;
}

const DEFAULTS: MatcherConfig = { maxOffsetM: 40, backM: 50, aheadM: 600 };

/** Snaps GPS fixes onto the route and tracks progress along it. */
export function createMatcher(path: Path, config: Partial<MatcherConfig> = {}) {
  const cfg = { ...DEFAULTS, ...config };
  const pts = path.points;
  let lastS: number | null = null;

  function nearest(fix: LatLon, fromS: number, toS: number) {
    const p = path.projector.toXY(fix);
    let best = { s: 0, offset: Infinity };
    const i0 = Math.max(0, Math.floor(fromS / path.step) - 1);
    const i1 = Math.min(pts.length - 1, Math.ceil(toS / path.step) + 1);
    for (let i = i0; i < i1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
      const d = Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
      if (d < best.offset) best = { s: a.s + (b.s - a.s) * t, offset: d };
    }
    return best;
  }

  return {
    update(fix: LatLon): MatchResult {
      let m = lastS === null ? null : nearest(fix, lastS - cfg.backM, lastS + cfg.aheadM);
      if (!m || m.offset > cfg.maxOffsetM) m = nearest(fix, 0, path.length);
      const onRoute = m.offset <= cfg.maxOffsetM;
      if (onRoute) lastS = m.s;
      return { s: onRoute ? m.s : (lastS ?? 0), offset: m.offset, onRoute };
    },
    reset() {
      lastS = null;
    },
  };
}
