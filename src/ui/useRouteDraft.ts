import { useEffect, useMemo, useRef, useState } from 'react';

import type { LatLon } from '../core/geo';
import { generatePacenotes, type Pacenote } from '../core/pacenotes';
import { buildPath, type Path } from '../core/path';
import { fetchRoute, type RoutedRoute } from '../data/routing';

export interface RouteDraft {
  stops: LatLon[];
  setStops: (stops: LatLon[]) => void;
  route: RoutedRoute | null;
  path: Path | null;
  notes: Pacenote[];
  loading: boolean;
  error: string | null;
}

/** Stops being edited on the map → routed geometry → pacenotes. */
export function useRouteDraft(initialStops: LatLon[] = []): RouteDraft {
  const [stops, setStops] = useState<LatLon[]>(initialStops);
  const [route, setRoute] = useState<RoutedRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (stops.length < 2) {
      setRoute(null);
      setError(null);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    // Small debounce so dragging several stops doesn't spam the server.
    const timer = setTimeout(() => {
      fetchRoute(stops)
        .then((r) => id === requestId.current && setRoute(r))
        .catch((e: unknown) => id === requestId.current && setError(e instanceof Error ? e.message : String(e)))
        .finally(() => id === requestId.current && setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [stops]);

  const path = useMemo(() => (route && route.coordinates.length > 1 ? buildPath(route.coordinates) : null), [route]);
  const notes = useMemo(() => (path ? generatePacenotes(path) : []), [path]);

  return { stops, setStops, route, path, notes, loading, error };
}

/** Inserts a new stop between the last waypoint and the destination. */
export function addStop(stops: LatLon[], p: LatLon): LatLon[] {
  if (stops.length < 2) return [...stops, p];
  return [...stops.slice(0, -1), p, stops[stops.length - 1]];
}
