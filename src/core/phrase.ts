import type { Pacenote } from './pacenotes';

const NUMBERS = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis'];

/**
 * Spoken tokens for a note, in co-driver order:
 * [cuidado] dirección grado|horquilla [larga] [cierra|abre] [y | distancia].
 * Each token maps to one pre-recorded audio clip (see src/audio).
 */
export function noteTokens(note: Pacenote): string[] {
  const t: string[] = [];
  if (note.modifiers.includes('cuidado')) t.push('cuidado');
  if (note.hairpin) t.push('horquilla', note.direction);
  else t.push(note.direction, NUMBERS[note.grade]);
  for (const m of note.modifiers) if (m !== 'cuidado') t.push(m);
  if (note.link?.kind === 'y') t.push('y');
  else if (note.link?.kind === 'distance') t.push(distanceWord(note.link.meters));
  return t;
}

export function noteSpeech(note: Pacenote): string {
  return noteTokens(note).join(' ');
}

/** Short label for the big on-screen note, e.g. "◀ IZQ 4 CIERRA". */
export function noteLabel(note: Pacenote): string {
  const arrowL = note.direction === 'izquierda' ? '◀ ' : '';
  const arrowR = note.direction === 'derecha' ? ' ▶' : '';
  const dir = note.direction === 'izquierda' ? 'IZQ' : 'DER';
  const core = note.hairpin ? `HORQ ${dir}` : `${dir} ${note.grade}`;
  const mods = note.modifiers.filter((m) => m !== 'cuidado').map((m) => m.toUpperCase());
  const warn = note.modifiers.includes('cuidado') ? '! ' : '';
  return `${warn}${arrowL}${[core, ...mods].join(' ')}${arrowR}`;
}

const WORDS: Record<number, string> = {
  30: 'treinta',
  50: 'cincuenta',
  70: 'setenta',
  100: 'cien',
  150: 'ciento cincuenta',
  200: 'doscientos',
  250: 'doscientos cincuenta',
  300: 'trescientos',
  400: 'cuatrocientos',
  500: 'quinientos',
  600: 'seiscientos',
  700: 'setecientos',
  800: 'ochocientos',
  900: 'novecientos',
  1000: 'mil',
};

/** Distances above 1 km are just "larga recta" — nobody counts them. */
export function distanceWord(meters: number): string {
  return WORDS[meters] ?? 'larga recta';
}
