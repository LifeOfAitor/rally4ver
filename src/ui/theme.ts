/** "Rally clásico": dark background, yellow notes, red accents. */
export const colors = {
  bg: '#0B0B0D',
  surface: '#17171B',
  surfaceHigh: '#222228',
  border: '#2E2E36',
  note: '#FFD400',
  accent: '#E10600',
  text: '#F2F2F2',
  muted: '#8A8A93',
  danger: '#FF5A4F',
} as const;

export const radius = 14;

/** Free OpenStreetMap vector tiles, no API key. */
export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';

export const font = {
  /** Condensed heavy look for notes; system font until a custom one is bundled. */
  note: { fontWeight: '900' as const, letterSpacing: 1 },
};
