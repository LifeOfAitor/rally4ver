import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatKm, formatTime } from '../core/format';
import { listAllRuns, listStages, type RunSummary, type Stage } from '../data/stageStore';
import { DottedCard, Header, SectionTitle } from './kit';
import { colors, themed } from './theme';

function shortDate(ms: number): string {
  return new Date(ms).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function TimesScreen() {
  const insets = useSafeAreaInsets();
  const [stages, setStages] = useState<Stage[]>([]);
  const [runs, setRuns] = useState<RunSummary[]>([]);

  const reload = useCallback(() => {
    listStages()
      .then(setStages)
      .catch(() => {});
    listAllRuns()
      .then(setRuns)
      .catch(() => {});
  }, []);
  useEffect(reload, [reload]);

  const byId = new Map(stages.map((s) => [s.id, s]));
  const km = runs.reduce((sum, r) => sum + (byId.get(r.stageId)?.distance ?? 0), 0);
  const bestOf = (id: number) => {
    const times = runs.filter((r) => r.stageId === id).map((r) => r.total);
    return times.length ? Math.min(...times) : null;
  };
  const withRuns = stages.filter((s) => runs.some((r) => r.stageId === s.id));

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 30, gap: 22 }}>
      <Header title="Tiempos" />

      <View style={styles.pad}>
        <SectionTitle>Estadísticas</SectionTitle>
      </View>
      <View style={styles.statsRow}>
        <Stat value={String(runs.length)} label="salidas" />
        <Stat value={formatKm(km)} label="recorridos" />
        <Stat value={String(withRuns.length)} label="tramos" />
      </View>

      {withRuns.length > 0 && (
        <View style={styles.circles}>
          {withRuns.map((s) => (
            <View key={s.id} style={styles.circleItem}>
              <Text style={styles.circleLabel} numberOfLines={1}>
                {s.name}
              </Text>
              <View style={styles.circle}>
                <Text style={styles.circleValue}>{formatTime(bestOf(s.id)!)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.pad}>
        <SectionTitle>Historial</SectionTitle>
      </View>
      {runs.length === 0 ? (
        <Text style={styles.empty}>Cuando completes un tramo desde la salida, tus tiempos aparecerán aquí.</Text>
      ) : (
        <View style={[styles.pad, { gap: 10 }]}>
          {runs.slice(0, 30).map((r, i) => {
            const best = bestOf(r.stageId);
            const isBest = best !== null && r.total === best;
            return (
              <DottedCard key={i} style={styles.runRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.runName} numberOfLines={1}>
                    {byId.get(r.stageId)?.name ?? 'Tramo borrado'}
                  </Text>
                  <Text style={styles.runDate}>{shortDate(r.finishedAt)}</Text>
                </View>
                <Text style={[styles.runTime, isBest && styles.runBest]}>{formatTime(r.total)}</Text>
              </DottedCard>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.card },
    pad: { paddingHorizontal: 20 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20 },
    stat: { alignItems: 'center' },
    statValue: { fontSize: 24, fontWeight: '800', color: colors.ink },
    statLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
    circles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 18, paddingHorizontal: 20 },
    circleItem: { alignItems: 'center', gap: 8, width: 100 },
    circleLabel: { fontSize: 12, fontWeight: '600', color: colors.ink },
    circle: {
      width: 92,
      height: 92,
      borderRadius: 46,
      borderWidth: 1.5,
      borderStyle: 'dotted',
      borderColor: colors.dots,
      backgroundColor: colors.soft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circleValue: { fontSize: 15, fontWeight: '800', color: colors.ink },
    empty: { color: colors.muted, textAlign: 'center', paddingHorizontal: 32, lineHeight: 21 },
    runRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    runName: { fontSize: 15, fontWeight: '700', color: colors.ink },
    runDate: { fontSize: 12, color: colors.muted, marginTop: 2 },
    runTime: { fontSize: 18, fontWeight: '800', color: colors.inkSoft },
    runBest: { color: colors.ink, textDecorationLine: 'underline' },
  }),
);
