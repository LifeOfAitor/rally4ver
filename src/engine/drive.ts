import type { LocationObject } from 'expo-location';

import { callNotes, say, silence } from '../audio/voice';
import { generatePacenotes } from '../core/pacenotes';
import { buildPath } from '../core/path';
import { createSession, type SessionState } from '../core/session';
import { bestRun } from '../core/timer';
import { listRuns, saveRun, type Stage } from '../data/stageStore';
import { settingsStore } from '../data/settings';
import { createStore } from '../lib/createStore';

export interface DriveState {
  stage: Stage | null;
  session: SessionState | null;
  bestTime: number | null;
  /** Total notes on the stage. */
  noteCount: number;
  stageLength: number;
  gpsAccuracy: number | null;
  /** Set when the stage was finished and the run saved; true if it beat the best time. */
  newRecord: boolean;
}

export const driveStore = createStore<DriveState>({
  stage: null,
  session: null,
  bestTime: null,
  noteCount: 0,
  stageLength: 0,
  gpsAccuracy: null,
  newRecord: false,
});

let session: ReturnType<typeof createSession> | null = null;

/** Prepares a stage: notes, best time. Location updates are started separately (tracking.ts). */
export async function loadStage(stage: Stage) {
  const path = buildPath(stage.route);
  const notes = generatePacenotes(path);
  const runs = await listRuns(stage.id).catch(() => []);
  const best = bestRun(runs);
  session = createSession(path, notes, best, { leadSeconds: settingsStore.get().leadSeconds });
  driveStore.set({
    stage,
    session: session.state,
    bestTime: best?.total ?? null,
    noteCount: notes.length,
    stageLength: path.length,
    gpsAccuracy: null,
    newRecord: false,
  });
}

export function unloadStage() {
  session = null;
  silence();
  driveStore.set({ stage: null, session: null });
}

/** Entry point for location updates (background task or foreground watcher). */
export function handleLocations(locations: LocationObject[]) {
  if (!session) return;
  const { voiceEnabled, voiceRate } = settingsStore.get();
  for (const loc of locations) {
    const events = session.update({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      speed: loc.coords.speed,
      timestamp: loc.timestamp,
    });
    for (const e of events) {
      if (!voiceEnabled && e.type !== 'finish') continue;
      switch (e.type) {
        case 'call':
          callNotes(e.notes, voiceRate);
          break;
        case 'offroute':
          say('Fuera de ruta', voiceRate);
          break;
        case 'timeVoided':
          say('Tiempo anulado', voiceRate);
          break;
        case 'backOnRoute':
          say('De vuelta en ruta', voiceRate);
          break;
        case 'finish':
          void onFinish(e.run, voiceEnabled, voiceRate);
          break;
      }
    }
    driveStore.set({ session: session.state, gpsAccuracy: loc.coords.accuracy });
  }
}

async function onFinish(run: Parameters<typeof saveRun>[1] | null, voice: boolean, rate: number) {
  const { stage, bestTime } = driveStore.get();
  const record = !!run?.total && (bestTime === null || run.total < bestTime);
  if (voice) say(run?.total ? `Meta. ${spokenTime(run.total)}${record ? '. Mejor tiempo' : ''}` : 'Meta', rate);
  if (stage && run) await saveRun(stage.id, run).catch(() => {});
  driveStore.set({ newRecord: record, bestTime: record && run?.total ? run.total : bestTime });
}

function spokenTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m} minutos ${s} segundos` : `${s} segundos`;
}
