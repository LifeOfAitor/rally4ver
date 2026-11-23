import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatKm } from '../core/format';
import { deleteStage, listStages, type Stage } from '../data/stageStore';
import { colors, radius } from './theme';

interface Props {
  onNew: () => void;
  onOpen: (stage: Stage) => void;
}

const SOURCE_LABEL: Record<Stage['source'], string> = {
  mapa: 'Mapa',
  google: 'Google Maps',
  waze: 'Waze',
  gpx: 'GPX',
  recce: 'Recce',
};

export function HomeScreen({ onNew, onOpen }: Props) {
  const insets = useSafeAreaInsets();
  const [stages, setStages] = useState<Stage[] | null>(null);

  const reload = useCallback(() => {
    listStages()
      .then(setStages)
      .catch(() => setStages([]));
  }, []);
  useEffect(reload, [reload]);

  function confirmDelete(stage: Stage) {
    Alert.alert(stage.name, '¿Borrar este tramo y sus tiempos?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => deleteStage(stage.id).then(reload) },
    ]);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Text style={styles.brand}>
          RALLY<Text style={styles.brandAccent}>4</Text>VER
        </Text>
        <Text style={styles.subtitle}>Tu copiloto de rally</Text>
      </View>

      <FlatList
        data={stages ?? []}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        ListEmptyComponent={
          stages ? (
            <View style={styles.empty}>
              <Ionicons name="flag-outline" size={40} color={colors.muted} />
              <Text style={styles.emptyText}>
                Aún no tienes tramos. Crea uno en el mapa o importa una ruta de Google Maps.
              </Text>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onOpen(item)} onLongPress={() => confirmDelete(item)}>
            <View style={styles.cardStripe} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.cardMeta}>
                {formatKm(item.distance)} · {SOURCE_LABEL[item.source]}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        )}
      />

      <Pressable style={[styles.fab, { bottom: insets.bottom + 24 }]} onPress={onNew}>
        <Ionicons name="add" size={24} color="#000" />
        <Text style={styles.fabText}>Nuevo tramo</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  brand: { color: colors.text, fontSize: 34, fontWeight: '900', fontStyle: 'italic', letterSpacing: 2 },
  brandAccent: { color: colors.accent },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 2 },
  list: { paddingHorizontal: 16, gap: 10 },
  empty: { alignItems: 'center', gap: 12, paddingTop: 80, paddingHorizontal: 32 },
  emptyText: { color: colors.muted, textAlign: 'center', fontSize: 15, lineHeight: 21 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius,
    overflow: 'hidden',
    paddingRight: 14,
  },
  cardStripe: { width: 6, alignSelf: 'stretch', backgroundColor: colors.note },
  cardBody: { flex: 1, paddingVertical: 14, paddingHorizontal: 14 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  cardMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.note,
    paddingHorizontal: 22,
    height: 54,
    borderRadius: 27,
  },
  fabText: { color: '#000', fontWeight: '900', fontSize: 16 },
});
