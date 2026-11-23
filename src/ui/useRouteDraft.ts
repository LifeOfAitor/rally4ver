import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { LatLon } from '../core/geo';
import { generatePacenotes, type Pacenote } from '../core/pacenotes';
import { buildPath, type Path } from '../core/path';
import { mostSimilar } from '../core/routeMatch';
import { fetchRoutes, type RoutedRoute } from '../data/routing';

export interface RouteDraft {
  stops: LatLon[];
  /** Replace the stops; `preferredAlternative` pre-selects one of the router's alternatives. */
  setStops: (stops: LatLon[], preferredAlternative?: number) => void;
  /** All routes the router offered (main first); one is selected. */
  routes: RoutedRoute[];
  selected: number;
  select: (index: number) => void;
  route: RoutedRoute | null;
  path: Path | null;
  notes: Pacenote[];
  loading: boolean;
  error: string | null;
}

/**
 * Stops being edited on the map → routed alternatives → selected route → pacenotes.
 *
 * `initialRoute` is the geometry saved with a stage: when the stage is reopened
 * the router's alternatives are recalculated and the one matching it is selected,
 * so the road the user chose is kept.
 */
export function useRouteDraft(initialStops: LatLon[] = [], initialRoute: LatLon[] | null = null): RouteDraft {
  const [stops, setStopsState] = useState<LatLon[]>(initialStops);
  const [routes, setRoutes] = useState<RoutedRoute[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  /** Explicit choice from an imported link; otherwise we follow `chosen`. */
  const preferred = useRef<number | undefined>(undefined);
  /** Geometry of the route the user had selected, to keep that choice across recalculations. */
  const chosen = useRef<LatLon[] | null>(initialRoute);

  const setStops = useCallback((next: LatLon[], preferredAlternative?: number) => {
    preferred.current = preferredAlternative;
    setStopsState(next);
  }, []);

  useEffect(() => {
    if (stops.length < 2) {
      setRoutes([]);
      setError(null);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    // Small debounce so dragging several stops doesn't spam the server.
    const timer = setTimeout(() => {
      fetchRoutes(stops)
        .then((r) => {
          if (id !== requestId.current) return;
          setRoutes(r);
          // Reversing or moving a stop must not throw away the road the user picked.
          const pick =
            preferred.current !== undefined
              ? Math.min(preferred.current, r.length - 1)
              : chosen.current
                ? mostSimilar(
                    r.map((x) => x.coordinates),
                    chosen.current,
                  )
                : 0;
          preferred.current = undefined;
          setSelected(pick);
        })
        .catch((e: unknown) => id === requestId.current && setError(e instanceof Error ? e.message : String(e)))
        .finally(() => id === requestId.current && setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [stops]);

  const route = routes[selected] ?? null;
  useEffect(() => {
    if (route) chosen.current = route.coordinates;
  }, [route]);
  const path = useMemo(() => (route && route.coordinates.length > 1 ? buildPath(route.coordinates) : null), [route]);
  const notes = useMemo(() => (path ? generatePacenotes(path) : []), [path]);

  return { stops, setStops, routes, selected, select: setSelected, route, path, notes, loading, error };
}
