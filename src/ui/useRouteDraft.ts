import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { LatLon } from '../core/geo';
import { generatePacenotes, type Pacenote } from '../core/pacenotes';
import { buildPath, type Path } from '../core/path';
import { mostSimilar, overlap } from '../core/routeMatch';
import { fetchRoutes, findMoreRoutes, type RoutedRoute } from '../data/routing';

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
  /** Still looking for other roads between A and B. */
  searching: boolean;
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
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  /** Explicit choice from an imported link; otherwise we follow `chosen`. */
  const preferred = useRef<number | undefined>(undefined);
  /** Geometry of the route the user had selected, to keep that choice across recalculations. */
  const chosen = useRef<LatLon[] | null>(initialRoute);
  /** The saved route still has to be matched (first calculation after opening a stage). */
  const savedPending = useRef<LatLon[] | null>(initialRoute);
  /** The user tapped a route during this calculation: don't move the selection under their finger. */
  const userPicked = useRef(false);

  const setStops = useCallback((next: LatLon[], preferredAlternative?: number) => {
    preferred.current = preferredAlternative;
    savedPending.current = null; // they changed the stops: the saved road no longer applies
    setStopsState(next);
  }, []);

  const select = useCallback((index: number) => {
    userPicked.current = true;
    setSelected(index);
  }, []);

  useEffect(() => {
    if (stops.length < 2) {
      setRoutes([]);
      setError(null);
      return;
    }
    const id = ++requestId.current;
    const cancelled = () => id !== requestId.current;
    userPicked.current = false;
    setLoading(true);
    setSearching(false);
    setError(null);

    /** Best match for the road the user had, among `list`. */
    const follow = (list: RoutedRoute[]) =>
      chosen.current
        ? mostSimilar(
            list.map((x) => x.coordinates),
            chosen.current,
          )
        : 0;

    // Small debounce so dragging several stops doesn't spam the server.
    const timer = setTimeout(async () => {
      let list: RoutedRoute[];
      try {
        list = await fetchRoutes(stops);
      } catch (e) {
        if (!cancelled()) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
        return;
      }
      if (cancelled()) return;
      setRoutes(list);
      // Reversing or moving a stop must not throw away the road the user picked.
      setSelected(preferred.current !== undefined ? Math.min(preferred.current, list.length - 1) : follow(list));
      const fromLink = preferred.current !== undefined;
      preferred.current = undefined;
      setLoading(false);

      // With only start and finish, look for the other roads too (the mountain one…).
      if (stops.length === 2) {
        setSearching(true);
        await findMoreRoutes(
          stops[0],
          stops[1],
          list,
          (found) => {
            if (cancelled()) return;
            list = [...list, found];
            setRoutes(list);
            if (!userPicked.current && !fromLink) setSelected(follow(list));
          },
          cancelled,
        );
        if (cancelled()) return;
        setSearching(false);
      }

      // Reopened stage whose saved road the router no longer offers: keep it as an option.
      const saved = savedPending.current;
      savedPending.current = null;
      if (saved && !userPicked.current) {
        const best = list[follow(list)];
        if (!best || overlap(saved, best.coordinates) < 0.85) {
          const path = buildPath(saved);
          const savedRoute: RoutedRoute = {
            summary: 'Tu ruta guardada',
            coordinates: saved,
            distance: path.length,
            duration: NaN,
            maneuvers: [],
          };
          list = [savedRoute, ...list];
          setRoutes(list);
          setSelected(0);
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [stops]);

  const route = routes[selected] ?? null;
  useEffect(() => {
    if (route) chosen.current = route.coordinates;
  }, [route]);
  const path = useMemo(() => (route && route.coordinates.length > 1 ? buildPath(route.coordinates) : null), [route]);
  const notes = useMemo(() => (path ? generatePacenotes(path) : []), [path]);

  return { stops, setStops, routes, selected, select, route, path, notes, loading, searching, error };
}
