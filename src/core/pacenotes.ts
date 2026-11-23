import { toDeg } from './geo';
import { curvatures, type Path } from './path';

export type Direction = 'izquierda' | 'derecha';
export type Grade = 1 | 2 | 3 | 4 | 5 | 6;
export type Modifier = 'cuidado' | 'larga' | 'cierra' | 'abre';

export interface Pacenote {
  id: number;
  /** Distance along the route where the curve starts / ends (m). */
  start: number;
  end: number;
  direction: Direction;
  /** 1 = tightest … 6 = almost flat. */
  grade: Grade;
  hairpin: boolean;
  modifiers: Modifier[];
  /** Total heading change (degrees, always positive). */
  angle: number;
  minRadius: number;
  /** Radius of the racing line within the lane, used for the grade. */
  lineRadius: number;
  /** What links this note to the next one: "y" (straight into it) or a rounded distance. */
  link: { kind: 'y' } | { kind: 'distance'; meters: number } | null;
}

export interface PacenoteConfig {
  /** Upper radius bound (m) for grades 1..6; anything wider is not called. */
  gradeRadii: [number, number, number, number, number, number];
  /** Bends that turn less than this in total are ignored (kinks). */
  minAngleDeg: number;
  /** Same-direction bends closer than this are merged into one. */
  mergeGapM: number;
  /** Gaps shorter than this are called "y" (into) instead of a distance. */
  linkGapM: number;
  halfWindowM: number;
  /**
   * Usable width to straighten the line inside your own lane (m). Short bends
   * can be driven much straighter than the road, so they get a faster grade.
   */
  laneWidthM: number;
  /** Bends whose line radius is wider than this are flat out and not called. */
  maxLineRadiusM: number;
}

export const DEFAULT_CONFIG: PacenoteConfig = {
  gradeRadii: [20, 35, 55, 85, 130, 200],
  minAngleDeg: 20,
  mergeGapM: 10,
  linkGapM: 25,
  halfWindowM: 12,
  laneWidthM: 2.5,
  maxLineRadiusM: 250,
};

/** Classic racing-line radius: R' = R + w / (1 − cos(θ/2)). */
export function lineRadiusFor(radius: number, angleDeg: number, laneWidthM: number): number {
  const half = Math.min(angleDeg, 180) * (Math.PI / 360);
  return radius + laneWidthM / Math.max(1e-6, 1 - Math.cos(half));
}

interface Bend {
  from: number; // point index, inclusive
  to: number; // point index, inclusive
  sign: 1 | -1;
}

/** Turns a resampled route into rally pacenotes. */
export function generatePacenotes(path: Path, config: PacenoteConfig = DEFAULT_CONFIG): Pacenote[] {
  const k = curvatures(path, config.halfWindowM);
  const { points, step } = path;
  const kMin = 1 / config.gradeRadii[5];

  // 1. Runs of points curving the same way tighter than the widest grade.
  const bends: Bend[] = [];
  for (let i = 0; i < k.length; i++) {
    if (Math.abs(k[i]) < kMin) continue;
    const sign = k[i] > 0 ? 1 : -1;
    const prev = bends[bends.length - 1];
    if (prev && prev.sign === sign && points[i].s - points[prev.to].s <= config.mergeGapM + step) prev.to = i;
    else bends.push({ from: i, to: i, sign });
  }

  // 2. Describe each bend and drop the kinks.
  const notes: Pacenote[] = [];
  for (const bend of bends) {
    let angle = 0;
    let maxK = 0;
    for (let i = bend.from; i <= bend.to; i++) {
      angle += k[i] * segmentLength(path, i);
      maxK = Math.max(maxK, Math.abs(k[i]));
    }
    const angleDeg = Math.abs(toDeg(angle));
    if (angleDeg < config.minAngleDeg) continue;
    const minRadius = 1 / maxK;
    const lineRadius = lineRadiusFor(minRadius, angleDeg, config.laneWidthM);
    if (lineRadius > config.maxLineRadiusM) continue;
    const start = points[bend.from].s;
    const end = points[bend.to].s;
    const grade = gradeFor(lineRadius, config);
    const hairpin = angleDeg >= 140 && minRadius < 25;
    const modifiers: Modifier[] = [];
    if (!hairpin && end - start >= 100 && angleDeg >= 60) modifiers.push('larga');
    const shape = hairpin ? null : tightening(k, bend);
    if (shape) modifiers.push(shape);
    notes.push({
      id: notes.length,
      start,
      end,
      direction: bend.sign > 0 ? 'derecha' : 'izquierda',
      grade,
      hairpin,
      modifiers,
      angle: angleDeg,
      minRadius,
      lineRadius,
      link: null,
    });
  }

  // 3. Links between notes and warnings after long straights.
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const next = notes[i + 1];
    if (next) {
      const gap = next.start - note.end;
      note.link = gap < config.linkGapM ? { kind: 'y' } : { kind: 'distance', meters: roundCallDistance(gap) };
    }
    const approach = i === 0 ? note.start : note.start - notes[i - 1].end;
    if ((note.hairpin || note.grade <= 2) && approach >= 250) note.modifiers.unshift('cuidado');
  }
  return notes;
}

function segmentLength(path: Path, i: number): number {
  const pts = path.points;
  const back = i > 0 ? pts[i].s - pts[i - 1].s : 0;
  const fwd = i < pts.length - 1 ? pts[i + 1].s - pts[i].s : 0;
  return (back + fwd) / 2;
}

export function gradeFor(radius: number, config: PacenoteConfig = DEFAULT_CONFIG): Grade {
  const idx = config.gradeRadii.findIndex((bound) => radius < bound);
  return (idx === -1 ? 6 : idx + 1) as Grade;
}

/** "cierra" if the bend clearly tightens towards the exit, "abre" if it opens. */
function tightening(k: number[], bend: Bend): 'cierra' | 'abre' | null {
  const n = bend.to - bend.from + 1;
  if (n < 9) return null; // too short to have a shape worth calling (~40 m)
  const third = Math.floor(n / 3);
  const peak = (from: number, to: number) => {
    let m = 0;
    for (let i = from; i <= to; i++) m = Math.max(m, Math.abs(k[i]));
    return m;
  };
  const entry = peak(bend.from, bend.from + third - 1);
  const exit = peak(bend.to - third + 1, bend.to);
  if (exit > entry * 1.5) return 'cierra';
  if (entry > exit * 1.5) return 'abre';
  return null;
}

const SHORT_DISTANCES = [30, 50, 70, 100, 150, 200, 250, 300];

/** Rounds a gap to the distances a co-driver would actually call. */
export function roundCallDistance(meters: number): number {
  if (meters <= 300) {
    return SHORT_DISTANCES.reduce((best, d) => (Math.abs(d - meters) < Math.abs(best - meters) ? d : best));
  }
  return Math.round(meters / 100) * 100;
}
