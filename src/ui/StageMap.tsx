import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  NativeUserLocation,
  ViewAnnotation,
} from '@maplibre/maplibre-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LatLon } from '../core/geo';
import type { Pacenote } from '../core/pacenotes';
import type { Path } from '../core/path';
import { colors, MAP_STYLE } from './theme';

interface Props {
  stops: LatLon[];
  route: LatLon[] | null;
  /** Other routes the user can pick, drawn in grey under the selected one. */
  alternatives?: { index: number; coordinates: LatLon[] }[];
  onSelectAlternative?: (index: number) => void;
  path: Path | null;
  notes: Pacenote[];
  onPress?: (p: LatLon) => void;
  onMoveStop?: (index: number, p: LatLon) => void;
  onLongPressStop?: (index: number) => void;
  /** Extra bottom padding when fitting the route (space taken by a sheet). */
  bottomInset?: number;
  /** Point to center on when there's no route yet (e.g. the user's position). */
  focus?: LatLon | null;
}

function boundsOf(route: LatLon[]): [number, number, number, number] | null {
  if (route.length < 2) return null;
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of route) {
    w = Math.min(w, p.longitude);
    e = Math.max(e, p.longitude);
    s = Math.min(s, p.latitude);
    n = Math.max(n, p.latitude);
  }
  return [w, s, e, n];
}

const toLatLon = ([longitude, latitude]: [number, number]): LatLon => ({ latitude, longitude });

function stopLabel(i: number, count: number) {
  if (i === 0) return 'A';
  if (i === count - 1 && count > 1) return 'B';
  return String(i);
}

export function StageMap({
  stops,
  route,
  alternatives = [],
  onSelectAlternative,
  path,
  notes,
  onPress,
  onMoveStop,
  onLongPressStop,
  bottomInset = 0,
  focus = null,
}: Props) {
  const camera = useRef<CameraRef>(null);

  const line = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: route
        ? [
            {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: route.map((p) => [p.longitude, p.latitude]) },
            },
          ]
        : [],
    }),
    [route],
  );

  const altLines = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: alternatives.map((alt) => ({
        type: 'Feature',
        properties: { index: alt.index },
        geometry: { type: 'LineString', coordinates: alt.coordinates.map((p) => [p.longitude, p.latitude]) },
      })),
    }),
    [alternatives],
  );

  const notePoints = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!path) return { type: 'FeatureCollection', features: [] };
    return {
      type: 'FeatureCollection',
      features: notes.map((n) => {
        const pt = path.points[Math.min(path.points.length - 1, Math.round((n.start + n.end) / 2 / path.step))];
        const p = path.projector.toLatLon(pt);
        const side = n.direction === 'izquierda' ? 'I' : 'D';
        return {
          type: 'Feature',
          properties: { label: n.hairpin ? `H${side}` : `${side}${n.grade}`, tight: n.hairpin || n.grade <= 2 ? 1 : 0 },
          geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
        };
      }),
    };
  }, [notes, path]);

  const padding = { top: 80, right: 40, bottom: 40 + bottomInset, left: 40 };
  // Frame the route from the first render (the camera may not be ready for fitBounds yet)…
  const [initialView] = useState(() => {
    const b = route ? boundsOf(route) : null;
    if (b) return { bounds: b, padding };
    if (focus) return { center: [focus.longitude, focus.latitude] as [number, number], zoom: 11 };
    return { center: [-3.7038, 40.4168] as [number, number], zoom: 6 };
  });
  // Center on the user (or the first stop) while there's no route to frame.
  useEffect(() => {
    if (focus && !route)
      camera.current?.flyTo({ center: [focus.longitude, focus.latitude], zoom: 12.5, duration: 800 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);
  // …and re-fit whenever a new route arrives.
  useEffect(() => {
    const b = route ? boundsOf(route) : null;
    if (b) camera.current?.fitBounds(b, { padding, duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, bottomInset]);

  return (
    <Map
      style={StyleSheet.absoluteFill}
      mapStyle={MAP_STYLE}
      compass={false}
      logo={false}
      touchPitch={false}
      onPress={(e) => onPress?.(toLatLon(e.nativeEvent.lngLat))}
    >
      <Camera ref={camera} initialViewState={initialView} />
      <NativeUserLocation />
      <GeoJSONSource
        id="alternatives"
        data={altLines}
        hitbox={{ top: 14, right: 14, bottom: 14, left: 14 }}
        onPress={(e) => {
          const index = e.nativeEvent.features[0]?.properties?.index;
          if (typeof index === 'number') {
            e.stopPropagation(); // a tap on a grey line selects it instead of adding a stop
            onSelectAlternative?.(index);
          }
        }}
      >
        <Layer
          id="alt-casing"
          type="line"
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{ 'line-color': colors.card, 'line-width': 8 }}
        />
        <Layer
          id="alt-line"
          type="line"
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{ 'line-color': '#6E6E6E', 'line-width': 5 }}
        />
      </GeoJSONSource>
      <GeoJSONSource id="route" data={line}>
        <Layer
          id="route-casing"
          type="line"
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{ 'line-color': colors.card, 'line-width': 9 }}
        />
        <Layer
          id="route-line"
          type="line"
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{ 'line-color': colors.ink, 'line-width': 5 }}
        />
      </GeoJSONSource>
      <GeoJSONSource id="notes" data={notePoints}>
        <Layer
          id="note-dots"
          type="circle"
          minzoom={12}
          paint={{
            'circle-radius': 11,
            'circle-color': ['case', ['==', ['get', 'tight'], 1], colors.danger, colors.card],
            'circle-stroke-color': colors.ink,
            'circle-stroke-width': 1.5,
          }}
        />
        <Layer
          id="note-labels"
          type="symbol"
          minzoom={12}
          layout={{
            'text-field': ['get', 'label'],
            'text-font': ['Noto Sans Bold'],
            'text-size': 10,
            'text-allow-overlap': true,
            'text-ignore-placement': true,
          }}
          paint={{ 'text-color': ['case', ['==', ['get', 'tight'], 1], colors.onDanger, colors.ink] }}
        />
      </GeoJSONSource>
      {stops.map((p, i) => (
        <ViewAnnotation
          key={`stop-${i}`}
          id={`stop-${i}`}
          lngLat={[p.longitude, p.latitude]}
          draggable={!!onMoveStop}
          onDragEnd={(e) => onMoveStop?.(i, toLatLon(e.nativeEvent.lngLat))}
          onPress={() => onLongPressStop?.(i)}
        >
          <View style={[styles.stop, i === 0 && styles.stopStart, i === stops.length - 1 && i > 0 && styles.stopEnd]}>
            <Text style={[styles.stopText, (i === 0 || (i === stops.length - 1 && i > 0)) && styles.stopTextInk]}>
              {stopLabel(i, stops.length)}
            </Text>
          </View>
        </ViewAnnotation>
      ))}
    </Map>
  );
}

const styles = StyleSheet.create({
  stop: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderColor: colors.ink,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopStart: { backgroundColor: colors.ink },
  stopEnd: { backgroundColor: colors.ink },
  stopText: { color: colors.ink, fontWeight: '900', fontSize: 13 },
  stopTextInk: { color: colors.onInk },
});
