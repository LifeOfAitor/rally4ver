/** Progress samples of one run: elapsed seconds at each distance along the stage. */
export interface Run {
  samples: { s: number; t: number }[];
  total: number | null; // seconds, null if not finished
}

/** Builds a run as it progresses; ignores backwards jitter. */
export function createRunRecorder() {
  const samples: Run['samples'] = [];
  return {
    add(s: number, t: number) {
      const last = samples[samples.length - 1];
      if (!last || s > last.s) samples.push({ s, t });
    },
    finish(t: number): Run {
      return { samples: [...samples], total: t };
    },
  };
}

/** Elapsed time a run had at distance `s`, linearly interpolated. */
export function timeAt(run: Run, s: number): number | null {
  const pts = run.samples;
  if (pts.length === 0 || s < pts[0].s || s > pts[pts.length - 1].s) return null;
  let lo = 0;
  let hi = pts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].s <= s) lo = mid;
    else hi = mid;
  }
  const a = pts[lo];
  const b = pts[hi];
  if (b.s === a.s) return a.t;
  return a.t + ((s - a.s) / (b.s - a.s)) * (b.t - a.t);
}

/** Live delta vs the reference run: negative = ahead (faster), positive = behind. */
export function deltaVs(reference: Run, s: number, elapsed: number): number | null {
  const ref = timeAt(reference, s);
  return ref === null ? null : elapsed - ref;
}

/** Best finished run, or null. */
export function bestRun(runs: Run[]): Run | null {
  return runs.filter((r) => r.total !== null).sort((a, b) => a.total! - b.total!)[0] ?? null;
}

export function formatDelta(delta: number): string {
  const sign = delta < 0 ? '−' : '+';
  return `${sign}${Math.abs(delta).toFixed(1).replace('.', ',')}`;
}
