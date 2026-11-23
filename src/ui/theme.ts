/**
 * Monochrome line-art style: light grey page, white cards with dotted borders,
 * black pills for titles and primary actions. Red is reserved for danger
 * (very tight bends, off route). The drive screen uses the inverted palette
 * so it doesn't dazzle at night.
 */
export const colors = {
  page: '#ECECEC',
  card: '#FFFFFF',
  soft: '#F4F4F4',
  ink: '#151515',
  inkSoft: '#4A4A4A',
  muted: '#8C8C8C',
  dots: '#A8A8A8',
  onInk: '#FFFFFF',
  danger: '#D7261E',
} as const;

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

/** Light OpenStreetMap vector tiles that match the monochrome look. */
export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

export const type = {
  pill: { fontSize: 13, fontWeight: '800' as const, letterSpacing: 0.6 },
  h1: { fontSize: 30, fontWeight: '800' as const },
  h2: { fontSize: 19, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  small: { fontSize: 12, fontWeight: '600' as const },
};
