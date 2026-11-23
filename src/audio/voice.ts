import { Asset } from 'expo-asset';
import { type AudioPlaylist, type AudioSource, createAudioPlaylist, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';

import type { Pacenote } from '../core/pacenotes';
import { noteTokens } from '../core/phrase';
import { CLIPS } from './clips';

/**
 * Co-driver voice: pre-generated AI clips (scripts/generate_voice.py), one per
 * word, chained in a native playlist so they keep playing in the background.
 * Other audio (music, the GPS voice) is ducked only while we speak.
 * Tokens without a clip fall back to the system voice.
 */

let playlist: AudioPlaylist | null = null;

/**
 * `AudioPlaylist.add()` doesn't resolve bundled `require()` module ids like the
 * player constructor does (expo-audio SDK 58), so resolve them to URIs here.
 */
const resolved = new Map<number, AudioSource>();
function clipSource(token: string): AudioSource {
  const id = CLIPS[token];
  let src = resolved.get(id);
  if (!src) {
    const asset = Asset.fromModule(id);
    src = { uri: asset.localUri ?? asset.uri };
    resolved.set(id, src);
  }
  return src;
}
let setup: Promise<void> | null = null;

function ensureSetup(): Promise<void> {
  setup ??= setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'duckOthers',
  })
    .catch(() => {})
    .then(() => {
      playlist = createAudioPlaylist({ loop: 'none' });
    });
  return setup;
}

/** Plays tokens in order; if something is already being said, they are queued after it. */
export async function sayTokens(tokens: string[], rate = 1) {
  const missing = tokens.filter((t) => !(t in CLIPS));
  if (missing.length) {
    Speech.speak(tokens.filter((t) => t !== ',').join(' '), { language: 'es-ES', rate });
    return;
  }
  try {
    await ensureSetup();
    const p = playlist!;
    const busy = p.playing && p.currentIndex < p.trackCount - 1;
    if (!busy) p.clear();
    for (const t of tokens) p.add(clipSource(t));
    p.playbackRate = rate;
    if (!busy) p.play();
  } catch (e) {
    // Never leave the driver without notes: fall back to the system voice.
    console.warn('[voice] clip playback failed, using system voice', e);
    Speech.speak(tokens.filter((t) => t !== ',').join(' '), { language: 'es-ES', rate });
  }
}

/** Tokens for one call: chained notes separated by a short pause. */
export function callTokens(notes: Pacenote[]): string[] {
  return notes.flatMap((n, i) => (i === 0 ? noteTokens(n) : [',', ...noteTokens(n)]));
}

export function callNotes(notes: Pacenote[], rate?: number) {
  void sayTokens(callTokens(notes), rate);
}

export function sayPhrase(phrase: 'fuera de ruta' | 'de vuelta en ruta' | 'tiempo anulado', rate?: number) {
  void sayTokens([phrase], rate);
}

export function sayFinish(record: boolean, rate?: number) {
  void sayTokens(record ? ['meta', ',', 'mejor tiempo'] : ['meta'], rate);
}

export function previewVoice(rate?: number) {
  void sayTokens(
    [
      'cuidado',
      ',',
      'izquierda',
      'tres',
      'larga',
      ',',
      'cien',
      ',',
      'derecha',
      'dos',
      'cierra',
      'y',
      'horquilla',
      'izquierda',
    ],
    rate,
  );
}

export function silence() {
  playlist?.pause();
  playlist?.clear();
  void Speech.stop();
}
