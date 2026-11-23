import { offset } from '../../test/helpers';
import { buildRoad } from '../../test/helpers';
import { generatePacenotes } from '../pacenotes';
import { buildPath } from '../path';
import { createSession, type Fix, type SessionEvent } from '../session';

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
const at = (s: number) =>
  path.projector.toLatLon(path.points[Math.min(path.points.length - 1, Math.round(s / path.step))]);

/** Drives the stage from `from` to `to` at constant speed, one fix per second. */
function drive(session: ReturnType<typeof createSession>, from: number, to: number, speed = 20, t0 = 0) {
  const events: SessionEvent[] = [];
  let t = t0;
  for (let s = from; s <= to; s += speed) {
    const fix: Fix = { ...at(s), accuracy: 5, speed, timestamp: t * 1000 };
    events.push(...session.update(fix));
    t++;
  }
  return { events, t };
}

describe('session', () => {
  it('starts at the start line, calls every note once and finishes with a time', () => {
    const session = createSession(path, notes, null);
    const { events } = drive(session, 0, path.length + 20);
    const types = events.map((e) => e.type);
    expect(types[0]).toBe('start');
    expect(types[types.length - 1]).toBe('finish');
    const called = events.flatMap((e) => (e.type === 'call' ? e.notes.map((n) => n.id) : []));
    expect(called).toEqual(notes.map((n) => n.id));
    const finish = events.find((e) => e.type === 'finish');
    expect(finish && finish.type === 'finish' && finish.run?.total).toBeGreaterThan(0);
    expect(session.state.status).toBe('finished');
  });

  it('calls each note before reaching it', () => {
    const session = createSession(path, notes, null);
    let s = 0;
    const calledAt = new Map<number, number>();
    for (let t = 0; s <= path.length; t++, s += 20) {
      for (const e of session.update({ ...at(s), accuracy: 5, speed: 20, timestamp: t * 1000 })) {
        if (e.type === 'call') e.notes.forEach((n) => calledAt.set(n.id, s));
      }
    }
    for (const n of notes) expect(calledAt.get(n.id)!).toBeLessThan(n.start);
  });

  it('shows the distance to the start while approaching', () => {
    const session = createSession(path, notes, null);
    session.update({ ...offset(at(0), 1000, 180), accuracy: 5, speed: 10, timestamp: 0 });
    expect(session.state.status).toBe('approach');
    expect(session.state.toStart).toBeCloseTo(1000, -1);
  });

  it('joining mid-stage calls notes but does not time the run', () => {
    const session = createSession(path, notes, null);
    const { events } = drive(session, notes[1].end + 20, path.length + 20);
    expect(events[0].type).toBe('start');
    expect(session.state.timed).toBe(false);
    const finish = events.find((e) => e.type === 'finish');
    expect(finish && finish.type === 'finish' && finish.run).toBeNull();
  });

  it('pauses when leaving the route and resumes without a burst of old notes', () => {
    const session = createSession(path, notes, null);
    let { t } = drive(session, 0, 100);
    const off = session.update({ ...offset(at(150), 300, 270), accuracy: 5, speed: 20, timestamp: t++ * 1000 });
    expect(off.map((e) => e.type)).toContain('offroute');
    const back = session.update({ ...at(notes[1].end + 50), accuracy: 5, speed: 20, timestamp: t++ * 1000 });
    expect(back.map((e) => e.type)).toContain('backOnRoute');
    const calls = back.filter((e) => e.type === 'call');
    expect(calls.flatMap((e) => (e.type === 'call' ? e.notes : [])).map((n) => n.id)).not.toContain(0);
  });

  it('voids the time when the position jumps impossibly far ahead', () => {
    const session = createSession(path, notes, null);
    const { t } = drive(session, 0, 100);
    const events = session.update({ ...at(path.length - 100), accuracy: 5, speed: 20, timestamp: t * 1000 });
    expect(events.map((e) => e.type)).toContain('timeVoided');
    expect(session.state.timed).toBe(false);
    const { events: end } = drive(session, path.length - 80, path.length + 20, 20, t + 1);
    const finish = end.find((e) => e.type === 'finish');
    expect(finish && finish.type === 'finish' && finish.run).toBeNull();
  });

  it('finishes when stopping a little before the exact end point', () => {
    const session = createSession(path, notes, null);
    drive(session, 0, path.length - 40);
    expect(session.state.status).toBe('finished');
  });

  it('ignores inaccurate fixes', () => {
    const session = createSession(path, notes, null);
    expect(session.update({ ...at(50), accuracy: 200, speed: 10, timestamp: 0 })).toEqual([]);
    expect(session.state.s).toBe(0);
  });

  it('gives a live delta against the best run', () => {
    const best = { samples: [0, 200, 400, 600, 800, 1000, 1200].map((s) => ({ s, t: s / 25 })), total: 48 };
    const session = createSession(path, notes, best);
    drive(session, 0, 400, 20);
    expect(session.state.delta).toBeGreaterThan(0); // 20 m/s is slower than the 25 m/s best
  });
});
