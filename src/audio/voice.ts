import * as Speech from 'expo-speech';

import type { Pacenote } from '../core/pacenotes';
import { noteSpeech } from '../core/phrase';

/**
 * Speaks with the system Spanish voice for now. Every word is already a
 * separate token (see core/phrase.ts), so pre-recorded AI clips can replace
 * this module later without touching the engine.
 *
 * Utterances queue natively: a new call never cuts the previous one off.
 */
export function say(text: string, rate = 1.1) {
  Speech.speak(text, {
    language: 'es-ES',
    rate,
    volume: 1,
    // iOS: the system ducks music / the GPS voice only while we speak.
    useApplicationAudioSession: false,
  });
}

/** One call = one or more chained notes: "izquierda tres y derecha dos cien". */
export function callNotes(notes: Pacenote[], rate?: number) {
  say(notes.map(noteSpeech).join(', '), rate);
}

export function silence() {
  void Speech.stop();
}
