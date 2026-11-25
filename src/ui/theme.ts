/**
 * Monochrome line-art style (from the user's reference image), in two palettes.
 * `ink` is the foreground colour (text, pills, primary buttons) and `onInk`
 * the text drawn on it. Red is reserved for danger (very tight bends, off
 * route), with `onDanger` for text on it.
 */
const DARK = {
  page: '#000000',
  card: '#0E0E0E',
  soft: '#181818',
  ink: '#F2F2F2',
  inkSoft: '#C4C4C4',
  muted: '#8A8A8A',
  dots: '#4A4A4A',
  onInk: '#0E0E0E',
  danger: '#E5372E',
  onDanger: '#FFFFFF',
};

const LIGHT: typeof DARK = {
  page: '#ECECEC',
  card: '#FFFFFF',
  soft: '#F4F4F4',
  ink: '#151515',
  inkSoft: '#4A4A4A',
  muted: '#8C8C8C',
  dots: '#A8A8A8',
  onInk: '#FFFFFF',
  danger: '#D7261E',
  onDanger: '#FFFFFF',
};

export type Scheme = 'dark' | 'light';
export type ThemeMode = Scheme | 'system';

/**
 * Current palette. Mutated in place by `applyTheme`, so read it at render
 * time (JSX, or styles built with `themed`), never copy values at load time.
 */
export const colors: typeof DARK = { ...DARK };

let scheme: Scheme = 'dark';
let version = 0;

export function currentScheme(): Scheme {
  return scheme;
}

/** Switches the palette. The caller must re-render the tree (App keys it by scheme). */
export function applyTheme(next: Scheme) {
  if (next === scheme) return;
  scheme = next;
  Object.assign(colors, next === 'dark' ? DARK : LIGHT);
  version++;
}

/**
 * Styles that follow the theme: `const styles = themed(() => StyleSheet.create({...}))`.
 * They are rebuilt on first access after a theme change.
 */
export function themed<T extends object>(make: () => T): T {
  let cache: T | null = null;
  let builtFor = -1;
  return new Proxy({} as T, {
    get(_, key) {
      if (builtFor !== version || !cache) {
        cache = make();
        builtFor = version;
      }
      return (cache as Record<string | symbol, unknown>)[key];
    },
  });
}

/** Inverted palette for the drive screen. */
export const night = {
  page: '#0E0E0E',
  card: '#FFFFFF',
  ink: '#FFFFFF',
  muted: '#9A9A9A',
  dots: '#4A4A4A',
  panel: '#1B1B1B',
  danger: '#E5372E',
} as const;

export const radius = { card: 22, pill: 999, button: 18 } as const;

/** OpenStreetMap vector tiles (OpenFreeMap) matching the current theme. */
export function mapStyle(): string {
  return scheme === 'dark'
    ? 'https://tiles.openfreemap.org/styles/dark'
    : 'https://tiles.openfreemap.org/styles/positron';
}

export const type = {
  pill: { fontSize: 13, fontWeight: '800' as const, letterSpacing: 0.6 },
  h1: { fontSize: 30, fontWeight: '800' as const },
  h2: { fontSize: 19, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  small: { fontSize: 12, fontWeight: '600' as const },
};
