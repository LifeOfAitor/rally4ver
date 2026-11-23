import { createCaller } from './caller';
import { distanceMeters, type LatLon } from './geo';
import { createMatcher } from './matcher';
import type { Pacenote } from './pacenotes';
import type { Path } from './path';
import { createRunRecorder, deltaVs, type Run } from './timer';

export interface Fix extends LatLon {
  accuracy: number | null; // m
  speed: number | null; // m/s, null/negative = unknown
  timestamp: number; // ms epoch
}

export type DriveStatus =
  | 'approach' // heading to the start line
  | 'running' // on the stage
  | 'offroute' // left the route; notes paused
  | 'finished';

export interface SessionState {
  status: DriveStatus;
  /** Distance along the stage (m). */
  s: number;
  speed: number; // m/s
  /** Straight-line distance to the start while approaching (m). */
  toStart: number | null;
  /** Next note not yet passed, and the one after it. */
  upcoming: Pacenote | null;
  following: Pacenote | null;
  /** Distance from current position to the start of `upcoming` (m). */
  toUpcoming: number | null;
  /** Timed only if the stage was started from the start line. */
  timed: boolean;
  elapsed: number | null; // s
  /** Live delta vs best run (s); negative = faster. */
  delta: number | null;
  finishTime: number | null; // s
}

export type SessionEvent =
  | { type: 'call'; notes: Pacenote[] }
  | { type: 'start' }
  | { type: 'offroute' }
  | { type: 'backOnRoute' }
  | { type: 'timeVoided' }
  | { type: 'finish'; run: Run | null };

export interface SessionConfig {
  leadSeconds: number;
  /** Within this distance of the start line the stage is "at the start" (m). */
  startRadiusM: number;
  /** Fixes worse than this are ignored (m). */
  maxAccuracyM: number;
  /**
   * Within this distance of the end the stage is finished (m). Google's
   * destination is often a door or car park a bit past where you stop.
   */
  finishRadiusM: number;
  /** Progress along the route faster than this voids the time (m/s, ≈ 250 km/h). */
  maxPlausibleSpeed: number;
}

const DEFAULTS: SessionConfig = {
  leadSeconds: 6,
  startRadiusM: 80,
  maxAccuracyM: 50,
  maxPlausibleSpeed: 70,
  finishRadiusM: 50,
};

/** Pure drive logic: GPS fixes in, state + events (what to say, start/finish) out. */
export function createSession(path: Path, notes: Pacenote[], best: Run | null, config: Partial<SessionConfig> = {}) {
  const cfg = { ...DEFAULTS, ...config };
  const matcher = createMatcher(path);
  const caller = createCaller(notes, { leadSeconds: cfg.leadSeconds });
  const recorder = createRunRecorder();
  const start = path.projector.toLatLon(path.points[0]);

  let state: SessionState = {
    status: 'approach',
    s: 0,
    speed: 0,
    toStart: null,
    upcoming: notes[0] ?? null,
    following: notes[1] ?? null,
    toUpcoming: null,
    timed: false,
    elapsed: null,
    delta: null,
    finishTime: null,
  };
  let startedAt: number | null = null;
  let last: { s: number; t: number } | null = null;
  let firstMatch = true;

  function upcomingFrom(s: number) {
    const i = notes.findIndex((n) => n.end >= s);
    return i === -1 ? { upcoming: null, following: null } : { upcoming: notes[i], following: notes[i + 1] ?? null };
  }

  return {
    get state() {
      return state;
    },

    update(fix: Fix): SessionEvent[] {
      const events: SessionEvent[] = [];
      if (state.status === 'finished') return events;
      if (fix.accuracy !== null && fix.accuracy > cfg.maxAccuracyM) return events;

      const m = matcher.update(fix);
      const toStart = distanceMeters(fix, start);
      // Speed: GPS when valid, otherwise from progress along the route.
      let speed = fix.speed !== null && fix.speed >= 0 ? fix.speed : state.speed;
      if ((fix.speed === null || fix.speed < 0) && last && fix.timestamp > last.t) {
        speed = Math.max(0, (m.s - last.s) / ((fix.timestamp - last.t) / 1000));
      }
      // Progress faster than any car (GPS gap, simulator jump, shortcut while off route): no valid time.
      const jumped =
        !!last && fix.timestamp > last.t && (m.s - last.s) / ((fix.timestamp - last.t) / 1000) > cfg.maxPlausibleSpeed;
      last = { s: m.s, t: fix.timestamp };
      const next: SessionState = { ...state, s: m.s, speed, toStart: null };
      if (jumped && state.timed) {
        next.timed = false;
        next.elapsed = null;
        next.delta = null;
        startedAt = null;
        events.push({ type: 'timeVoided' });
      }

      if (state.status === 'approach') {
        next.toStart = toStart;
        // Joining mid-stage: notes yes, timer no.
        if (firstMatch && m.onRoute && m.s > cfg.startRadiusM * 2) {
          next.status = 'running';
          caller.reset(m.s);
          events.push({ type: 'start' });
        } else if (m.onRoute && toStart <= cfg.startRadiusM && m.s >= 10) {
          // Crossed the start line moving forward.
          next.status = 'running';
          next.timed = true;
          startedAt = fix.timestamp;
          events.push({ type: 'start' });
        }
        if (m.onRoute) firstMatch = false;
      } else if (state.status === 'running' && !m.onRoute) {
        next.status = 'offroute';
        events.push({ type: 'offroute' });
      } else if (state.status === 'offroute' && m.onRoute) {
        next.status = 'running';
        caller.reset(m.s); // don't fire a burst of notes we drove past
        events.push({ type: 'backOnRoute' });
      }

      // Notes: from the start line on (also while approaching, for the first bends).
      const calling = next.status === 'running' || (next.status === 'approach' && toStart <= cfg.startRadiusM);
      if (calling && m.onRoute) {
        const due = caller.step(m.s, speed);
        if (due.length) events.push({ type: 'call', notes: due });
      }

      if (next.timed && startedAt !== null) {
        next.elapsed = (fix.timestamp - startedAt) / 1000;
        if (m.onRoute) recorder.add(m.s, next.elapsed);
        next.delta = best ? deltaVs(best, m.s, next.elapsed) : null;
      }

      if (next.status === 'running' && m.s >= path.length - cfg.finishRadiusM) {
        next.status = 'finished';
        next.finishTime = next.elapsed;
        const run = next.timed && next.elapsed !== null ? recorder.finish(next.elapsed) : null;
        events.push({ type: 'finish', run });
      }

      const up = upcomingFrom(m.s);
      next.upcoming = up.upcoming;
      next.following = up.following;
      next.toUpcoming = up.upcoming ? Math.max(0, up.upcoming.start - m.s) : null;
      state = next;
      return events;
    },
  };
}
