import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatKm } from '../core/format';
import { noteLabel } from '../core/phrase';
import { currentLocation } from '../data/location';
import { saveStage, type Stage, type StageSource, updateStage } from '../data/stageStore';
import { ImportLinkSheet } from './ImportLinkSheet';
import { StageMap } from './StageMap';
import { Header, PrimaryButton, RoundButton } from './kit';
import { colors, radius } from './theme';
import { insertStop, reverseStops } from '../core/stops';
import { useRouteDraft } from './useRouteDraft';

interface Props {
  stage?: Stage;
  /** Called with the saved stage, or nothing when leaving without saving. */
  onDone: (saved?: Stage) => void;
}

const SHEET_HEIGHT = 230;

export function RouteEditor({ stage, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const draft = useRouteDraft(stage?.stops ?? [], stage?.route ?? null);
  const { stops, setStops, routes, selected, select, route, path, notes, loading, error } = draft;
  const [name, setName] = useState(stage?.name ?? '');
  const [source, setSource] = useState<StageSource>(stage?.source ?? 'mapa');
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);

  const hint =
    stops.length === 0
      ? 'Toca el mapa para marcar la salida (A)'
      : stops.length === 1
        ? 'Toca el mapa para marcar la llegada (B)'
        : routes.length > 1
          ? 'Toca una ruta gris para elegirla · toca una carretera para pasar por ella'
          : 'Toca una carretera para pasar por ella · arrastra las paradas · tócalas para quitarlas';

  async function useMyLocation() {
    const here = await currentLocation();
    if (!here) {
      Alert.alert('Sin ubicación', 'Activa el permiso de ubicación para usar tu posición como salida.');
      return;
    }
    setStops(stops.length === 0 ? [here] : [here, ...stops.slice(1)]);
  }

  function removeStop(index: number) {
    Alert.alert('Parada', '¿Quitar esta parada?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => setStops(stops.filter((_, i) => i !== index)),
      },
    ]);
  }

  async function save() {
    if (!route) return;
    setSaving(true);
    try {
      const data = {
        name: name.trim() || 'Tramo sin nombre',
        source,
        stops,
        route: route.coordinates,
        distance: route.distance,
      };
      if (stage) {
        await updateStage(stage.id, data);
        onDone({ ...stage, ...data });
      } else {
        onDone(await saveStage(data));
      }
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <StageMap
        stops={stops}
        route={route?.coordinates ?? null}
        path={path}
        notes={notes}
        bottomInset={SHEET_HEIGHT}
        alternatives={routes
          .map((r, index) => ({ index, coordinates: r.coordinates }))
          .filter((a) => a.index !== selected)}
        onSelectAlternative={select}
        onPress={(p) => setStops(insertStop(stops, p))}
        onMoveStop={(i, p) => setStops(stops.map((s, j) => (j === i ? p : s)))}
        onLongPressStop={removeStop}
      />

      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <Header
          title={stage ? 'Editar tramo' : 'Nuevo tramo'}
          left={<RoundButton icon="chevron-back" label="Volver" onPress={() => onDone()} />}
          right={
            <RoundButton icon="link" label="Importar enlace de Google Maps o Waze" onPress={() => setImporting(true)} />
          }
        />
        <View style={styles.hintWrap} pointerEvents="none">
          <Text style={styles.hintText}>{hint}</Text>
        </View>
        <View style={styles.tools} pointerEvents="box-none">
          <RoundButton icon="locate" label="Salir desde mi ubicación" onPress={useMyLocation} />
          {stops.length >= 2 && (
            <RoundButton
              icon="swap-vertical"
              label="Invertir salida y llegada"
              onPress={() => setStops(reverseStops(stops))}
            />
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <View style={{ flex: 1 }} pointerEvents="none" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16, minHeight: SHEET_HEIGHT }]}>
          <View style={styles.statsRow}>
            <Stat label="distancia" value={route ? formatKm(route.distance) : '—'} />
            <Stat label="notas" value={route ? String(notes.length) : '—'} />
            <Stat
              label="muy cerradas"
              value={route ? String(notes.filter((n) => n.hairpin || n.grade <= 2).length) : '—'}
            />
            {loading && <ActivityIndicator color={colors.ink} />}
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          {routes.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {routes.map((r, i) => (
                <Pressable key={i} style={[styles.alt, i === selected && styles.altOn]} onPress={() => select(i)}>
                  <Text style={[styles.altTitle, i === selected && styles.altTextOn]}>
                    {formatKm(r.distance)} · {Math.round(r.duration / 60)} min
                  </Text>
                  <Text style={[styles.altSummary, i === selected && styles.altTextOn]} numberOfLines={1}>
                    {r.summary || `Ruta ${i + 1}`}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {notes.slice(0, 60).map((n) => {
              const tight = n.hairpin || n.grade <= 2;
              return (
                <View key={n.id} style={[styles.chip, tight && styles.chipTight]}>
                  <Text style={[styles.chipText, tight && styles.chipTextTight]}>{noteLabel(n)}</Text>
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.saveRow}>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Nombre del tramo"
              placeholderTextColor={colors.muted}
            />
            <PrimaryButton title="Guardar" onPress={save} disabled={!route || saving} style={styles.saveButton} />
          </View>
        </View>
      </KeyboardAvoidingView>

      <ImportLinkSheet
        visible={importing}
        onClose={() => setImporting(false)}
        onImported={(imported, src, preferredAlternative) => {
          setStops(imported, preferredAlternative);
          setSource(src);
        }}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.page },
  top: { position: 'absolute', left: 0, right: 0, gap: 10 },
  hintWrap: { alignItems: 'center', paddingHorizontal: 20 },
  hintText: {
    color: colors.ink,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderStyle: 'dotted',
    borderColor: colors.dots,
    paddingHorizontal: 14,
    paddingVertical: 7,
    fontSize: 13,
    fontWeight: '600',
    overflow: 'hidden',
    textAlign: 'center',
  },
  tools: { alignItems: 'flex-end', paddingHorizontal: 20, gap: 10 },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 26 },
  statValue: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  error: { color: colors.danger, paddingHorizontal: 20 },
  chips: { paddingHorizontal: 20, gap: 8, alignItems: 'flex-start' },
  alt: {
    maxWidth: 230,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderStyle: 'dotted',
    borderColor: colors.dots,
    backgroundColor: colors.card,
  },
  altOn: { backgroundColor: colors.ink, borderStyle: 'solid', borderColor: colors.ink },
  altTitle: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  altSummary: { color: colors.muted, fontSize: 12, marginTop: 2 },
  altTextOn: { color: colors.onInk },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderStyle: 'dotted',
    borderColor: colors.dots,
  },
  chipTight: { backgroundColor: colors.danger, borderStyle: 'solid', borderColor: colors.danger },
  chipText: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  chipTextTight: { color: colors.onInk },
  saveRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20 },
  nameInput: {
    flex: 1,
    height: 54,
    color: colors.ink,
    backgroundColor: colors.card,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderStyle: 'dotted',
    borderColor: colors.dots,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  saveButton: { height: 54, paddingHorizontal: 22 },
});
