import type { LatLon } from './geo';

/** A stop of a route request: coordinates when known, otherwise a place name to geocode. */
export type Stop = { kind: 'point'; point: LatLon } | { kind: 'place'; query: string };

export interface RouteRequest {
  source: 'google' | 'waze';
  /** null = start from the current location. */
  origin: Stop | null;
  destination: Stop;
  waypoints: Stop[];
  /**
   * Which of Google's alternative routes was selected (`!5i<n>` in the data
   * blob, 0 = the default one). Only a hint: our router's alternatives differ.
   */
  preferredAlternative?: number;
}

/** First http(s) URL inside shared text ("Ruta a X https://maps.app.goo.gl/abc"). */
export function extractUrl(text: string): string | null {
  return text.match(/https?:\/\/[^\s<>"']+/)?.[0] ?? null;
}

/** Short links must be resolved over the network (follow redirects) before parsing. */
export function isShortLink(url: string): boolean {
  return /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//.test(url);
}

/** Google's EU cookie wall wraps the real URL: consent.google.com/...?continue=<url>. */
export function unwrapConsent(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.startsWith('consent.')) return u.searchParams.get('continue') ?? url;
  } catch {
    // not a URL, leave it
  }
  return url;
}

const COORD = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

function parseStop(raw: string): Stop | null {
  const text = decodeURIComponent(raw.replace(/\+/g, ' ')).trim();
  if (!text) return null;
  const m = text.match(COORD);
  if (m) {
    const point = { latitude: Number(m[1]), longitude: Number(m[2]) };
    if (Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180) return { kind: 'point', point };
  }
  return { kind: 'place', query: text };
}

/**
 * Coordinates Google embeds for named stops in the `data=` blob, in order:
 * `!1d<lon>!2d<lat>` pairs.
 */
function dataCoordinates(url: string): LatLon[] {
  const out: LatLon[] = [];
  for (const m of url.matchAll(/!1d(-?\d+(?:\.\d+)?)!2d(-?\d+(?:\.\d+)?)/g)) {
    out.push({ latitude: Number(m[2]), longitude: Number(m[1]) });
  }
  return out;
}

/** Parses a (resolved) Google Maps or Waze directions URL. */
export function parseRouteLink(input: string): RouteRequest | null {
  const url = unwrapConsent(input.trim());
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }

  if (/(^|\.)waze\.com$/.test(u.hostname)) {
    const ll = u.searchParams.get('ll');
    const q = u.searchParams.get('q');
    const destination = ll ? parseStop(ll) : q ? parseStop(q) : null;
    return destination ? { source: 'waze', origin: null, destination, waypoints: [] } : null;
  }

  if (!/(^|\.)google\.[a-z.]+$/.test(u.hostname) || !u.pathname.startsWith('/maps')) return null;

  // https://www.google.com/maps/dir/?api=1&origin=..&destination=..&waypoints=a|b
  if (u.searchParams.has('destination')) {
    const destination = parseStop(u.searchParams.get('destination')!);
    if (!destination) return null;
    const originRaw = u.searchParams.get('origin');
    const waypoints = (u.searchParams.get('waypoints') ?? '')
      .split('|')
      .map(parseStop)
      .filter((s): s is Stop => s !== null);
    return { source: 'google', origin: originRaw ? parseStop(originRaw) : null, destination, waypoints };
  }

  // https://www.google.com/maps/dir/<stop>/<stop>/.../@lat,lon,zoom/data=...
  const parts = u.pathname.split('/');
  const dir = parts.indexOf('dir');
  if (dir === -1) return null;
  const stops: (Stop | null)[] = [];
  for (const part of parts.slice(dir + 1)) {
    if (part.startsWith('@') || part.startsWith('data=') || part.startsWith('am=')) break;
    stops.push(part ? parseStop(part) : null); // empty segment = "your location"
  }
  // Fill named places with the coordinates Google embedded for them.
  const coords = dataCoordinates(url);
  const named = stops.filter((s) => s?.kind === 'place').length;
  if (coords.length >= named) {
    let c = 0;
    for (let i = 0; i < stops.length; i++) {
      if (stops[i]?.kind === 'place') stops[i] = { kind: 'point', point: coords[c++] };
    }
  }
  while (stops.length && stops[stops.length - 1] === null) stops.pop();
  if (stops.length < 1) return null;
  const destination = stops[stops.length - 1]!;
  const alt = url.match(/!5i(\d+)/);
  const extra = alt ? { preferredAlternative: Number(alt[1]) } : {};
  if (stops.length === 1) return { source: 'google', origin: null, destination, waypoints: [], ...extra };
  return {
    source: 'google',
    origin: stops[0],
    destination,
    waypoints: stops.slice(1, -1).filter((s): s is Stop => s !== null),
    ...extra,
  };
}
