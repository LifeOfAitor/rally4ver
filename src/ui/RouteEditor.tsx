import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatKm } from "../core/format";
import { noteLabel } from "../core/phrase";
import { currentLocation } from "../data/location";
import {
  saveStage,
  type Stage,
  type StageSource,
  updateStage,
} from "../data/stageStore";
import { ImportLinkSheet } from "./ImportLinkSheet";
import { StageMap } from "./StageMap";
import { colors, radius } from "./theme";
import { addStop, useRouteDraft } from "./useRouteDraft";

interface Props {
  stage?: Stage;
  onDone: () => void;
}

const SHEET_HEIGHT = 230;

export function RouteEditor({ stage, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const draft = useRouteDraft(stage?.stops ?? []);
  const { stops, setStops, route, path, notes, loading, error } = draft;
  const [name, setName] = useState(stage?.name ?? "");
  const [source, setSource] = useState<StageSource>(stage?.source ?? "mapa");
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);

  const hint =
    stops.length === 0
      ? "Toca el mapa para marcar la salida (A)"
      : stops.length === 1
        ? "Toca el mapa para marcar la llegada (B)"
        : "Toca para añadir paradas · arrastra para moverlas · toca una parada para quitarla";

  async function useMyLocation() {
    const here = await currentLocation();
    if (!here) {
      Alert.alert(
        "Sin ubicación",
        "Activa el permiso de ubicación para usar tu posición como salida.",
      );
      return;
    }
    setStops(stops.length === 0 ? [here] : [here, ...stops.slice(1)]);
  }

  function removeStop(index: number) {
    Alert.alert("Parada", "¿Quitar esta parada?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Quitar",
        style: "destructive",
        onPress: () => setStops(stops.filter((_, i) => i !== index)),
      },
    ]);
  }

  async function save() {
    if (!route) return;
    setSaving(true);
    try {
      const data = {
        name: name.trim() || "Tramo sin nombre",
        source,
        stops,
        route: route.coordinates,
        distance: route.distance,
      };
      if (stage) await updateStage(stage.id, data);
      else await saveStage(data);
      onDone();
    } catch (e) {
      Alert.alert(
        "No se pudo guardar",
        e instanceof Error ? e.message : String(e),
      );
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
        onPress={(p) => setStops(addStop(stops, p))}
        onMoveStop={(i, p) => setStops(stops.map((s, j) => (j === i ? p : s)))}
        onLongPressStop={removeStop}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={styles.iconButton}
          onPress={onDone}
          accessibilityLabel="Volver"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>
          {stage ? "Editar tramo" : "Nuevo tramo"}
        </Text>
        <Pressable
          style={styles.iconButton}
          onPress={useMyLocation}
          accessibilityLabel="Salir desde mi ubicación"
        >
          <Ionicons name="locate" size={22} color={colors.text} />
        </Pressable>
        <Pressable
          style={styles.iconButton}
          onPress={() => setImporting(true)}
          accessibilityLabel="Importar enlace"
        >
          <Ionicons name="link" size={22} color={colors.note} />
        </Pressable>
      </View>

      <View
        style={[styles.hint, { top: insets.top + 64 }]}
        pointerEvents="none"
      >
        <Text style={styles.hintText}>{hint}</Text>
      </View>

      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        pointerEvents="box-none"
      >
        <View style={styles.sheetSpacer} pointerEvents="none" />
        <View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 16, minHeight: SHEET_HEIGHT },
          ]}
        >
          <View style={styles.statsRow}>
            <Stat
              label="Distancia"
              value={route ? formatKm(route.distance) : "—"}
            />
            <Stat label="Notas" value={route ? String(notes.length) : "—"} />
            <Stat
              label="Muy cerradas"
              value={
                route
                  ? String(
                      notes.filter((n) => n.hairpin || n.grade <= 2).length,
                    )
                  : "—"
              }
            />
            {loading && <ActivityIndicator color={colors.note} />}
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.notes}
          >
            {notes.slice(0, 60).map((n) => (
              <View
                key={n.id}
                style={[
                  styles.chip,
                  (n.hairpin || n.grade <= 2) && styles.chipTight,
                ]}
              >
                <Text style={styles.chipText}>{noteLabel(n)}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.saveRow}>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Nombre del tramo"
              placeholderTextColor={colors.muted}
            />
            <Pressable
              style={[styles.saveButton, (!route || saving) && styles.disabled]}
              disabled={!route || saving}
              onPress={save}
            >
              <Text style={styles.saveText}>Guardar</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ImportLinkSheet
        visible={importing}
        onClose={() => setImporting(false)}
        onImported={(imported, src) => {
          setStops(imported);
          setSource(src);
        }}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    textShadowColor: "#000",
    textShadowRadius: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderColor: colors.border,
    borderWidth: 1,
  },
  hint: { position: "absolute", left: 16, right: 16, alignItems: "center" },
  hintText: {
    color: colors.text,
    backgroundColor: "rgba(11,11,13,0.85)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    fontSize: 13,
    overflow: "hidden",
    textAlign: "center",
  },
  sheetSpacer: { flex: 1 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius,
    borderTopRightRadius: radius,
    paddingTop: 16,
    gap: 12,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 20,
  },
  stat: {},
  statValue: { color: colors.text, fontSize: 22, fontWeight: "900" },
  statLabel: { color: colors.muted, fontSize: 12 },
  error: { color: colors.danger, paddingHorizontal: 16 },
  notes: { paddingHorizontal: 16, gap: 8, alignItems: "flex-start" },
  chip: {
    backgroundColor: colors.note,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipTight: { backgroundColor: colors.accent },
  chipText: { color: "#000", fontWeight: "900", fontSize: 13 },
  saveRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16 },
  nameInput: {
    flex: 1,
    height: 48,
    color: colors.text,
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  saveButton: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: colors.note,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#000", fontWeight: "900", fontSize: 16 },
  disabled: { opacity: 0.4 },
});
