import * as SQLite from 'expo-sqlite';

import type { LatLon } from '../core/geo';
import type { Run } from '../core/timer';

export type StageSource = 'mapa' | 'google' | 'waze' | 'gpx' | 'recce';

export interface Stage {
  id: number;
  name: string;
  source: StageSource;
  createdAt: number; // ms epoch
  /** Stops used for routing (origin, waypoints, destination); empty for GPX / recce. */
  stops: LatLon[];
  /** Full route geometry. */
  route: LatLon[];
  distance: number; // m
}

export type NewStage = Omit<Stage, 'id' | 'createdAt'>;

interface StageRow {
  id: number;
  name: string;
  source: StageSource;
  created_at: number;
  stops: string;
  route: string;
  distance: number;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function db(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= (async () => {
    const database = await SQLite.openDatabaseAsync('rally4ver.db');
    await database.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS stages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        source TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        stops TEXT NOT NULL,
        route TEXT NOT NULL,
        distance REAL NOT NULL
      );
      CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stage_id INTEGER NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
        finished_at INTEGER NOT NULL,
        total REAL,
        samples TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS runs_stage ON runs (stage_id);
    `);
    return database;
  })().catch((error) => {
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

/** Compact [lat, lon] pairs at ~1 m precision. */
const encode = (pts: LatLon[]) => JSON.stringify(pts.map((p) => [+p.latitude.toFixed(6), +p.longitude.toFixed(6)]));
const decode = (json: string): LatLon[] =>
  (JSON.parse(json) as [number, number][]).map(([latitude, longitude]) => ({ latitude, longitude }));

const fromRow = (r: StageRow): Stage => ({
  id: r.id,
  name: r.name,
  source: r.source,
  createdAt: r.created_at,
  stops: decode(r.stops),
  route: decode(r.route),
  distance: r.distance,
});

export async function saveStage(stage: NewStage): Promise<Stage> {
  const createdAt = Date.now();
  const res = await (
    await db()
  ).runAsync(
    'INSERT INTO stages (name, source, created_at, stops, route, distance) VALUES (?, ?, ?, ?, ?, ?)',
    stage.name,
    stage.source,
    createdAt,
    encode(stage.stops),
    encode(stage.route),
    stage.distance,
  );
  return { ...stage, id: res.lastInsertRowId, createdAt };
}

export async function updateStage(id: number, stage: NewStage): Promise<void> {
  await (
    await db()
  ).runAsync(
    'UPDATE stages SET name = ?, source = ?, stops = ?, route = ?, distance = ? WHERE id = ?',
    stage.name,
    stage.source,
    encode(stage.stops),
    encode(stage.route),
    stage.distance,
    id,
  );
}

export async function listStages(): Promise<Stage[]> {
  const rows = await (await db()).getAllAsync<StageRow>('SELECT * FROM stages ORDER BY created_at DESC');
  return rows.map(fromRow);
}

export async function renameStage(id: number, name: string): Promise<void> {
  await (await db()).runAsync('UPDATE stages SET name = ? WHERE id = ?', name, id);
}

export async function deleteStage(id: number): Promise<void> {
  await (await db()).runAsync('DELETE FROM stages WHERE id = ?', id);
}

export async function saveRun(stageId: number, run: Run): Promise<void> {
  await (
    await db()
  ).runAsync(
    'INSERT INTO runs (stage_id, finished_at, total, samples) VALUES (?, ?, ?, ?)',
    stageId,
    Date.now(),
    run.total,
    JSON.stringify(run.samples.map((p) => [Math.round(p.s), +p.t.toFixed(2)])),
  );
}

export async function listRuns(stageId: number): Promise<(Run & { finishedAt: number })[]> {
  const rows = await (
    await db()
  ).getAllAsync<{ finished_at: number; total: number | null; samples: string }>(
    'SELECT finished_at, total, samples FROM runs WHERE stage_id = ? ORDER BY finished_at DESC',
    stageId,
  );
  return rows.map((r) => ({
    finishedAt: r.finished_at,
    total: r.total,
    samples: (JSON.parse(r.samples) as [number, number][]).map(([s, t]) => ({ s, t })),
  }));
}
