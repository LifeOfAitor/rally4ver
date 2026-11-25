import Storage from 'expo-sqlite/kv-store';

import { DEFAULT_VOICE, VOICES, type VoiceId } from '../audio/clips';
import { createStore } from '../lib/createStore';

export interface Settings {
  voiceEnabled: boolean;
  /** Which pre-generated co-driver voice to use (see scripts/voices.json). */
  voiceId: VoiceId;
  /** Seconds of warning before each bend at the current speed. */
  leadSeconds: number;
  /** Speech rate: 1 = normal, faster sounds more like a real co-driver. */
  voiceRate: number;
  /** Live time difference vs your best run while driving. Off by default. */
  liveDelta: boolean;
  /** The welcome screen was already shown. */
  welcomed: boolean;
  /** The "how to read the notes" guide was already shown. */
  guideSeen: boolean;
}

export const LEAD_OPTIONS = [4, 6, 8];
export const RATE_OPTIONS = [1, 1.15, 1.3];

const DEFAULTS: Settings = {
  voiceEnabled: true,
  voiceId: DEFAULT_VOICE,
  leadSeconds: 6,
  voiceRate: 1,
  liveDelta: false,
  welcomed: false,
  guideSeen: false,
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

function load(): Settings {
  const s = { ...DEFAULTS, ...read() };
  if (!(s.voiceId in VOICES)) s.voiceId = DEFAULT_VOICE; // voice removed in an update
  return s;
}

export const settingsStore = createStore<Settings>(load());

export function updateSettings(patch: Partial<Settings>) {
  settingsStore.set(patch);
  Storage.setItemSync(KEY, JSON.stringify(settingsStore.get()));
}
