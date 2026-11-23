import type { Pacenote } from './pacenotes';

export interface CallerConfig {
  /** Seconds of warning before a curve at the current speed. */
  leadSeconds: number;
  /** Never call later than this distance before a curve (m). */
  minLeadM: number;
  /** Max notes chained into one call ("izquierda tres y derecha dos y…"). */
  maxChain: number;
}

const DEFAULTS: CallerConfig = { leadSeconds: 6, minLeadM: 80, maxChain: 3 };

/**
 * Decides which notes to speak as we progress along the stage. Notes linked
 * with "y" are called together, like a real co-driver reading ahead.
 */
export function createCaller(notes: Pacenote[], config: Partial<CallerConfig> = {}) {
  const cfg = { ...DEFAULTS, ...config };
  let next = 0;

  return {
    /** Notes to speak now, given distance along the route (m) and speed (m/s). */
    step(s: number, speedMps: number): Pacenote[] {
      // Skip silently anything already behind us (joined mid-stage, GPS gap).
      while (next < notes.length && notes[next].end < s) next++;
      if (next >= notes.length) return [];
      const lead = Math.max(cfg.minLeadM, Math.max(0, speedMps) * cfg.leadSeconds);
      if (notes[next].start - s > lead) return [];
      const call = [notes[next]];
      while (call.length < cfg.maxChain && call[call.length - 1].link?.kind === 'y' && notes[next + call.length]) {
        call.push(notes[next + call.length]);
      }
      next += call.length;
      return call;
    },
    /** The next note not yet called (for the big on-screen display). */
    upcoming(): Pacenote | undefined {
      return notes[next];
    },
    reset(s = 0) {
      next = 0;
      while (next < notes.length && notes[next].end < s) next++;
    },
  };
}
