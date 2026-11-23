import { createCaller } from '../caller';
import { createMatcher } from '../matcher';
import { generatePacenotes } from '../pacenotes';
import { buildPath } from '../path';
import { bestRun, createRunRecorder, deltaVs, formatDelta, timeAt } from '../timer';
import { buildRoad, offset } from '../../test/helpers';

const road = buildRoad([
  { straight: 300 },
  { turn: 'R', radius: 50, angle: 90 },
  { straight: 10 },
  { turn: 'L', radius: 30, angle: 90 },
  { straight: 400 },
  { turn: 'L', radius: 100, angle: 60 },
  { straight: 300 },
]);
const path = buildPath(road);
const notes = generatePacenotes(path);
const at = (s: number) => path.projector.toLatLon(path.points[Math.round(s / path.step)]);

describe('matcher', () => {
  it('tracks progress along the route', () => {
    const m = createMatcher(path);
    expect(m.update(at(100)).s).toBeCloseTo(100, -1);
    expect(m.update(at(450)).s).toBeCloseTo(450, -1);
  });

  it('tolerates lateral GPS error and flags leaving the route', () => {
    const m = createMatcher(path);
    m.update(at(100));
    const near = m.update(offset(at(150), 15, 90));
    expect(near).toMatchObject({ onRoute: true });
    expect(near.offset).toBeCloseTo(15, 0);

    const away = m.update(offset(at(200), 200, 90));
    expect(away.onRoute).toBe(false);
    expect(away.s).toBeCloseTo(150, -1); // keeps the last good position
  });
});

describe('caller', () => {
  it('produces the expected notes for the test road', () => {
    expect(notes.map((n) => [n.direction, n.grade, n.link])).toEqual([
      ['derecha', 3, { kind: 'y' }],
      ['izquierda', 2, { kind: 'distance', meters: 400 }],
      ['izquierda', 5, null],
    ]);
  });

  it('calls chained notes together, ahead of time based on speed', () => {
    const c = createCaller(notes, { leadSeconds: 6, minLeadM: 80 });
    expect(c.step(0, 25)).toEqual([]); // 300 m away, lead 150 m
    const call = c.step(notes[0].start - 140, 25);
    expect(call.map((n) => n.id)).toEqual([0, 1]);
    expect(c.step(notes[0].start - 100, 25)).toEqual([]); // not repeated
    expect(c.upcoming()?.id).toBe(2);
  });

  it('uses the minimum lead when slow', () => {
    const c = createCaller(notes, { minLeadM: 80 });
    expect(c.step(notes[0].start - 90, 3)).toEqual([]);
    expect(c.step(notes[0].start - 75, 3)).toHaveLength(2);
  });

  it('skips notes already behind when joining mid-stage', () => {
    const c = createCaller(notes);
    expect(c.step(notes[1].end + 5, 20)).toEqual([]);
    expect(c.upcoming()?.id).toBe(2);
    expect(c.step(notes[2].start - 100, 20).map((n) => n.id)).toEqual([2]);
  });
});

describe('timer', () => {
  const run = (pace: number, total: number) => {
    const r = createRunRecorder();
    for (let s = 0; s <= 1000; s += 100) r.add(s, s / pace);
    return r.finish(total);
  };

  it('interpolates time at a distance', () => {
    expect(timeAt(run(20, 50), 250)).toBeCloseTo(12.5);
    expect(timeAt(run(20, 50), 2000)).toBeNull();
  });

  it('computes the live delta against the best run', () => {
    const best = bestRun([run(20, 50), run(25, 40), { samples: [], total: null }])!;
    expect(best.total).toBe(40);
    expect(deltaVs(best, 500, 22)).toBeCloseTo(2); // best was at 500 m in 20 s
    expect(formatDelta(-1.25)).toBe('−1,3');
    expect(formatDelta(2)).toBe('+2,0');
  });
});
