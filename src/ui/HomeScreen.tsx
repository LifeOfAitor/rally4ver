import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatKm, formatTime } from '../core/format';
import { deleteStage, listAllRuns, listStages, type RunSummary, type Stage } from '../data/stageStore';
import { Header, SectionTitle, SegmentBar } from './kit';
import { colors, radius } from './theme';

interface Props {
  onNew: () => void;
  onOpen: (stage: Stage) => void;
}

/** "Lunes, 23 de noviembre" */
function today(): string {
  const s = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function HomeScreen({ onNew, onOpen }: Props) {
  const insets = useSafeAreaInsets();
  const [stages, setStages] = useState<Stage[] | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);

  const reload = useCallback(() => {
    listStages()
      .then(setStages)
      .catch(() => setStages([]));
    listAllRuns()
      .then(setRuns)
      .catch(() => setRuns([]));
  }, []);
  useEffect(reload, [reload]);

  function confirmDelete(stage: Stage) {
    Alert.alert(stage.name, '¿Borrar este tramo y sus tiempos?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => deleteStage(stage.id).then(reload) },
    ]);
  }

  const runsOf = (id: number) => runs.filter((r) => r.stageId === id);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 30, gap: 22 }}>
      <Header title="Mis tramos" />
      <Text style={styles.date}>{today()}</Text>

      <View style={styles.grid}>
        {(stages ?? []).map((s) => (
          <Pressable
            key={s.id}
            style={({ pressed }) => [styles.tile, pressed && { opacity: 0.6 }]}
            onPress={() => onOpen(s)}
            onLongPress={() => confirmDelete(s)}
          >
            <Text style={styles.tileName} numberOfLines={2}>
              {s.name}
            </Text>
            <Text style={styles.tileKm}>{formatKm(s.distance)}</Text>
          </Pressable>
        ))}
        <Pressable style={[styles.tile, styles.addTile]} onPress={onNew} accessibilityLabel="Nuevo tramo">
          <Ionicons name="add" size={40} color={colors.onInk} />
        </Pressable>
      </View>

      {stages && stages.length === 0 && (
        <Text style={styles.empty}>
          Crea tu primer tramo con el «+»: márcalo en el mapa o pega un enlace de Google Maps.
        </Text>
      )}

      {stages && stages.length > 0 && (
        <View style={styles.section}>
          <SectionTitle>Tus salidas</SectionTitle>
          {stages.map((s) => {
            const r = runsOf(s.id);
            const best = r.length ? Math.min(...r.map((x) => x.total)) : null;
            return (
              <Pressable key={s.id} style={styles.row} onPress={() => onOpen(s)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {r.length} {r.length === 1 ? 'salida' : 'salidas'}
                    {best !== null ? ` · mejor ${formatTime(best)}` : ''}
                  </Text>
                </View>
                <SegmentBar filled={Math.min(r.length, 7)} total={7} />
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const TILE = 104;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.card },
  date: { textAlign: 'center', color: colors.ink, fontSize: 14, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 20, justifyContent: 'flex-start' },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderStyle: 'dotted',
    borderColor: colors.dots,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 4,
  },
  tileName: { fontSize: 14, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  tileKm: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  addTile: { backgroundColor: colors.ink, borderStyle: 'solid', borderColor: colors.ink },
  empty: { color: colors.muted, textAlign: 'center', paddingHorizontal: 32, lineHeight: 21 },
  section: { paddingHorizontal: 20, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  rowMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
