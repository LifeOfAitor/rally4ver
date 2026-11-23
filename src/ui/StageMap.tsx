import { Camera, type CameraRef, GeoJSONSource, Layer, Map, NativeUserLocation, ViewAnnotation } from '@maplibre/maplibre-react-native';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LatLon } from '../core/geo';
import type { Pacenote } from '../core/pacenotes';
import type { Path } from '../core/path';
import { colors, MAP_STYLE } from './theme';

interface Props {
  stops: LatLon[];
  route: LatLon[] | null;
  path: Path | null;
  notes: Pacenote[];
  onPress?: (p: LatLon) => void;
  onMoveStop?: (index: number, p: LatLon) => void;
  onLongPressStop?: (index: number) => void;
  /** Extra bottom padding when fitting the route (space taken by a sheet). */
  bottomInset?: number;
}

const toLatLon = ([longitude, latitude]: [number, number]): LatLon => ({ latitude, longitude });

function stopLabel(i: number, count: number) {
  if (i === 0) return 'A';
  if (i === count - 1 && count > 1) return 'B';
  return String(i);
}

export function StageMap({ stops, route, path, notes, onPress, onMoveStop, onLongPressStop, bottomInset = 0 }: Props) {
  const camera = useRef<CameraRef>(null);

  const line = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: route
        ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.map((p) => [p.longitude, p.latitude]) } }]
        : [],
    }),
    [route],
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

  // Fit the whole route whenever a new one arrives.
  useEffect(() => {
    if (!route || route.length < 2) return;
    let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const p of route) {
      w = Math.min(w, p.longitude);
      e = Math.max(e, p.longitude);
      s = Math.min(s, p.latitude);
      n = Math.max(n, p.latitude);
    }
    camera.current?.fitBounds([w, s, e, n], { padding: { top: 80, right: 40, bottom: 40 + bottomInset, left: 40 }, duration: 600 });
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
      <Camera ref={camera} initialViewState={{ center: [-3.7038, 40.4168], zoom: 6 }} />
      <NativeUserLocation />
      <GeoJSONSource id="route" data={line}>
        <Layer id="route-casing" type="line" layout={{ 'line-join': 'round', 'line-cap': 'round' }} paint={{ 'line-color': '#000000', 'line-width': 8 }} />
        <Layer id="route-line" type="line" layout={{ 'line-join': 'round', 'line-cap': 'round' }} paint={{ 'line-color': colors.accent, 'line-width': 5 }} />
      </GeoJSONSource>
      <GeoJSONSource id="notes" data={notePoints}>
        <Layer
          id="note-dots"
          type="circle"
          minzoom={12}
          paint={{
            'circle-radius': 11,
            'circle-color': ['case', ['==', ['get', 'tight'], 1], colors.accent, colors.note],
            'circle-stroke-color': '#000000',
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
          paint={{ 'text-color': ['case', ['==', ['get', 'tight'], 1], '#FFFFFF', '#000000'] }}
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
            <Text style={styles.stopText}>{stopLabel(i, stops.length)}</Text>
          </View>
        </ViewAnnotation>
      ))}
    </Map>
  );
}

const styles = StyleSheet.create({
  stop: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceHigh,
    borderColor: colors.text,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopStart: { backgroundColor: '#1E8E3E' },
  stopEnd: { backgroundColor: colors.accent },
  stopText: { color: colors.text, fontWeight: '900', fontSize: 13 },
});
