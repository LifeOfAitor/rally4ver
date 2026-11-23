import type { LatLon } from './geo';

export interface GpxTrack {
  name: string | null;
  points: LatLon[];
}

/**
 * Minimal GPX reader: track points (`trkpt`) and, if there are none, route
 * points (`rtept`). Regex based so it needs no XML dependency.
 */
export function parseGpx(xml: string): GpxTrack {
  const read = (tag: string) => {
    const out: LatLon[] = [];
    const re = new RegExp(`<${tag}\\b([^>]*)>`, 'g');
    for (const m of xml.matchAll(re)) {
      const lat = m[1].match(/\blat\s*=\s*["']([^"']+)["']/);
      const lon = m[1].match(/\blon\s*=\s*["']([^"']+)["']/);
      if (lat && lon) {
        const p = { latitude: Number(lat[1]), longitude: Number(lon[1]) };
        if (Number.isFinite(p.latitude) && Number.isFinite(p.longitude)) out.push(p);
      }
    }
    return out;
  };
  let points = read('trkpt');
  if (points.length === 0) points = read('rtept');
  const name = xml.match(/<name>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/name>/)?.[1]?.trim() || null;
  return { name, points };
}
