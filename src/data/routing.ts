import type { LatLon } from '../core/geo';
import { extractUrl, isShortLink, parseRouteLink, type RouteRequest, type Stop } from '../core/importLink';

/**
 * Free OSM services run by FOSSGIS / OSMF. Fine for a hobby app with light use;
 * swap for a self-hosted OSRM/Valhalla or GraphHopper key if usage grows.
 */
const OSRM_URL = 'https://routing.openstreetmap.de/routed-car/route/v1/driving/';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const HEADERS = { 'User-Agent': 'Rally4ver/0.1 (hobby rally pacenote app)', Accept: 'application/json' };

export interface Maneuver {
  location: LatLon;
  type: string; // OSRM maneuver type: turn, roundabout, fork, ...
  modifier: string | null; // left, slight right, ...
  name: string;
}

export interface RoutedRoute {
  coordinates: LatLon[];
  distance: number; // m
  duration: number; // s
  maneuvers: Maneuver[];
}

interface OsrmResponse {
  code: string;
  message?: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
    legs: { steps: { name: string; maneuver: { location: [number, number]; type: string; modifier?: string } }[] }[];
  }[];
}

/** Pure parser for an OSRM `route` response (geojson geometry, steps). */
export function parseOsrm(json: OsrmResponse): RoutedRoute {
  const route = json.routes?.[0];
  if (json.code !== 'Ok' || !route) throw new Error(json.message ?? 'No se encontró ruta');
  const toLatLon = ([lon, lat]: [number, number]): LatLon => ({ latitude: lat, longitude: lon });
  return {
    coordinates: route.geometry.coordinates.map(toLatLon),
    distance: route.distance,
    duration: route.duration,
    maneuvers: route.legs
      .flatMap((leg) => leg.steps)
      .filter((step) => !['depart', 'arrive', 'new name', 'continue'].includes(step.maneuver.type))
      .map((step) => ({
        location: toLatLon(step.maneuver.location),
        type: step.maneuver.type,
        modifier: step.maneuver.modifier ?? null,
        name: step.name,
      })),
  };
}

/** Driving route through `stops` (≥ 2). */
export async function fetchRoute(stops: LatLon[]): Promise<RoutedRoute> {
  if (stops.length < 2) throw new Error('Hacen falta al menos salida y llegada');
  const coords = stops.map((p) => `${p.longitude.toFixed(6)},${p.latitude.toFixed(6)}`).join(';');
  const res = await fetch(`${OSRM_URL}${coords}?overview=full&geometries=geojson&steps=true`, { headers: HEADERS });
  if (!res.ok && res.status !== 400) throw new Error(`Error del servidor de rutas (${res.status})`);
  return parseOsrm((await res.json()) as OsrmResponse);
}

/** Place name → coordinates (first match), biased to Spain. */
export async function geocode(query: string): Promise<LatLon> {
  const url = `${NOMINATIM_URL}?format=jsonv2&limit=1&accept-language=es&countrycodes=es,pt,fr,ad&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Error buscando «${query}» (${res.status})`);
  const [hit] = (await res.json()) as { lat: string; lon: string }[];
  if (!hit) throw new Error(`No se encontró «${query}»`);
  return { latitude: Number(hit.lat), longitude: Number(hit.lon) };
}

/** Follows a maps.app.goo.gl short link to the full Google Maps URL. */
export async function resolveShortLink(url: string): Promise<string> {
  const res = await fetch(url, { redirect: 'follow' });
  if (parseRouteLink(res.url)) return res.url;
  // Some redirects land on an HTML page that embeds the real link.
  const body = await res.text();
  const embedded = body.match(/https:\/\/www\.google\.[a-z.]+\/maps\/dir\/[^"'\s<>\\]+/)?.[0];
  return embedded ?? res.url;
}

/** Shared text or URL → route request, resolving short links. */
export async function requestFromSharedText(text: string): Promise<RouteRequest> {
  const url = extractUrl(text);
  if (!url) throw new Error('No hay ningún enlace en el texto');
  const full = isShortLink(url) ? await resolveShortLink(url) : url;
  const request = parseRouteLink(full);
  if (!request) throw new Error('El enlace no es una ruta de Google Maps o Waze');
  return request;
}

async function resolveStop(stop: Stop): Promise<LatLon> {
  return stop.kind === 'point' ? stop.point : geocode(stop.query);
}

/** Turns a route request into concrete stops, using `here` when there is no origin. */
export async function resolveStops(request: RouteRequest, here: LatLon | null): Promise<LatLon[]> {
  const origin = request.origin ? await resolveStop(request.origin) : here;
  if (!origin) throw new Error('El enlace no tiene salida y no conozco tu ubicación');
  const rest: LatLon[] = [];
  // Sequential on purpose: Nominatim allows 1 request per second.
  for (const stop of [...request.waypoints, request.destination]) rest.push(await resolveStop(stop));
  return [origin, ...rest];
}
