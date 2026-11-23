import Storage from 'expo-sqlite/kv-store';

import { createStore } from '../lib/createStore';

export interface Settings {
  voiceEnabled: boolean;
  /** Seconds of warning before each bend at the current speed. */
  leadSeconds: number;
  /** Speech rate: 1 = normal, faster sounds more like a real co-driver. */
  voiceRate: number;
  /** Live time difference vs your best run while driving. Off by default. */
  liveDelta: boolean;
}

export const LEAD_OPTIONS = [4, 6, 8];
export const RATE_OPTIONS = [1, 1.15, 1.3];

const DEFAULTS: Settings = {
  voiceEnabled: true,
  leadSeconds: 6,
  voiceRate: 1.15,
  liveDelta: false,
};

const KEY = 'settings';

function read(): Partial<Settings> {
  try {
    const raw = Storage.getItemSync(KEY);
    return raw ? (JSON.parse(raw) as Partial<Settings>) : {};
  } catch {
    return {};
  }
}

export const settingsStore = createStore<Settings>({ ...DEFAULTS, ...read() });

export function updateSettings(patch: Partial<Settings>) {
  settingsStore.set(patch);
  Storage.setItemSync(KEY, JSON.stringify(settingsStore.get()));
}
