import Ionicons from '@expo/vector-icons/Ionicons';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatKm, formatTime } from '../core/format';
import type { Pacenote } from '../core/pacenotes';
import { noteLabel } from '../core/phrase';
import { formatDelta } from '../core/timer';
import { settingsStore, updateSettings } from '../data/settings';
import type { Stage } from '../data/stageStore';
import { driveStore, loadStage, unloadStage } from '../engine/drive';
import { startTracking, stopTracking } from '../engine/tracking';
import { SettingsSheet } from './SettingsSheet';
import { colors, radius } from './theme';

/** Same as the session's default start radius. */
const START_RADIUS_M = 80;

interface Props {
  stage: Stage;
  onEdit: () => void;
  onClose: () => void;
}

export function DriveScreen({ stage, onEdit, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [driving, setDriving] = useState(false);
  const [disclaimer, setDisclaimer] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { session, bestTime, noteCount, stageLength, newRecord } = driveStore.use((s) => s);
  const voiceEnabled = settingsStore.use((s) => s.voiceEnabled);

  useEffect(() => {
    void loadStage(stage);
    return () => {
      void stopTracking();
      unloadStage();
    };
  }, [stage]);

  async function begin() {
    setDisclaimer(false);
    await loadStage(stage); // fresh session (and settings) every time
    const mode = await startTracking();
    if (mode === 'denied') {
      Alert.alert('Sin ubicación', 'Rally4ver necesita tu ubicación para saber en qué punto del tramo estás.');
      return;
    }
    setDriving(true);
  }

  async function stop() {
    await stopTracking();
    setDriving(false);
    await loadStage(stage);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.topBar}>
        <Pressable
          style={styles.iconButton}
          onPress={driving ? stop : onClose}
          accessibilityLabel={driving ? 'Parar' : 'Volver'}
        >
          <Ionicons name={driving ? 'close' : 'chevron-back'} size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {stage.name}
        </Text>
        <Pressable
          style={styles.iconButton}
          onPress={() => updateSettings({ voiceEnabled: !voiceEnabled })}
          accessibilityLabel={voiceEnabled ? 'Silenciar' : 'Activar voz'}
        >
          <Ionicons name={voiceEnabled ? 'volume-high' : 'volume-mute'} size={22} color={colors.text} />
        </Pressable>
        <Pressable style={styles.iconButton} onPress={() => setSettingsOpen(true)} accessibilityLabel="Ajustes">
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      {driving && session ? (
        <Driving session={session} stageLength={stageLength} bestTime={bestTime} newRecord={newRecord} onDone={stop} />
      ) : (
        <Ready
          distance={stageLength}
          noteCount={noteCount}
          bestTime={bestTime}
          onEdit={onEdit}
          onStart={() => setDisclaimer(true)}
        />
      )}

      <Disclaimer visible={disclaimer} onAccept={begin} onCancel={() => setDisclaimer(false)} />
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

function Ready({
  distance,
  noteCount,
  bestTime,
  onEdit,
  onStart,
}: {
  distance: number;
  noteCount: number;
  bestTime: number | null;
  onEdit: () => void;
  onStart: () => void;
}) {
  return (
    <View style={styles.ready}>
      <View style={styles.statsCard}>
        <Stat label="Distancia" value={formatKm(distance)} />
        <Stat label="Notas" value={String(noteCount)} />
        <Stat label="Mejor tiempo" value={bestTime ? formatTime(bestTime) : '—'} />
      </View>
      <Text style={styles.readyHelp}>
        Pon la navegación que quieras (Google Maps, Waze…) y deja Rally4ver en segundo plano: las notas se cantan solas
        desde la salida. Si empiezas a mitad de tramo también funciona, pero sin cronómetro.
      </Text>
      <View style={{ flex: 1 }} />
      <Pressable style={styles.secondaryButton} onPress={onEdit}>
        <Ionicons name="map-outline" size={20} color={colors.text} />
        <Text style={styles.secondaryText}>Editar ruta</Text>
      </Pressable>
      <Pressable style={styles.startButton} onPress={onStart}>
        <Ionicons name="flag" size={22} color="#000" />
        <Text style={styles.startText}>EMPEZAR TRAMO</Text>
      </Pressable>
    </View>
  );
}

function Driving({
  session,
  stageLength,
  bestTime,
  newRecord,
  onDone,
}: {
  session: NonNullable<ReturnType<typeof driveStore.get>['session']>;
  stageLength: number;
  bestTime: number | null;
  newRecord: boolean;
  onDone: () => void;
}) {
  useKeepAwake();
  const liveDelta = settingsStore.use((s) => s.liveDelta);
  const { status, upcoming, following, toUpcoming, s, speed, toStart, elapsed, delta, finishTime, timed } = session;

  if (status === 'finished') {
    return (
      <View style={styles.finish}>
        <Text style={styles.finishTitle}>META</Text>
        {finishTime !== null ? (
          <Text style={styles.finishTime}>{formatTime(finishTime)}</Text>
        ) : (
          <Text style={styles.readyHelp}>Sin tiempo: empezaste a mitad de tramo.</Text>
        )}
        {newRecord && <Text style={styles.record}>¡Mejor tiempo!</Text>}
        {!newRecord && bestTime !== null && finishTime !== null && (
          <Text style={styles.readyHelp}>Mejor: {formatTime(bestTime)}</Text>
        )}
        <Pressable style={[styles.startButton, { alignSelf: 'stretch' }]} onPress={onDone}>
          <Text style={styles.startText}>VOLVER</Text>
        </Pressable>
      </View>
    );
  }

  const tight = !!upcoming && (upcoming.hairpin || upcoming.grade <= 2);
  return (
    <View style={styles.driving}>
      <StatusStrip status={status} s={s} stageLength={stageLength} toStart={toStart} />

      {upcoming ? (
        <View style={[styles.noteCard, tight && styles.noteCardTight]}>
          <Text style={[styles.noteText, tight && styles.noteTextTight]} adjustsFontSizeToFit numberOfLines={1}>
            {noteLabel(upcoming)}
          </Text>
          {toUpcoming !== null && (
            <Text style={[styles.noteDistance, tight && styles.noteTextTight]}>
              {toUpcoming < 5 ? 'ahora' : `a ${Math.round(toUpcoming / 10) * 10} m`}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.noteCard}>
          <Text style={styles.noteText}>A META</Text>
        </View>
      )}

      {upcoming && following && (
        <Text style={styles.following} numberOfLines={1} adjustsFontSizeToFit>
          {followingLabel(upcoming, following)}
        </Text>
      )}

      <View style={{ flex: 1 }} />

      <View style={styles.bottomStats}>
        <Stat label="km/h" value={String(Math.round(speed * 3.6))} big />
        <Stat label="Tiempo" value={timed && elapsed !== null ? formatTime(elapsed) : '—'} big />
        {liveDelta && timed && (
          <Stat
            label="vs mejor"
            value={delta !== null ? formatDelta(delta) : '—'}
            color={delta === null ? colors.text : delta <= 0 ? '#3DDC84' : colors.danger}
            big
          />
        )}
      </View>
    </View>
  );
}

function followingLabel(upcoming: Pacenote, following: Pacenote): string {
  const link = upcoming.link;
  const prefix =
    link?.kind === 'y' ? 'Y' : link?.kind === 'distance' ? (link.meters > 1000 ? 'RECTA' : String(link.meters)) : '';
  return `${prefix} · ${noteLabel(following)}`;
}

function StatusStrip({
  status,
  s,
  stageLength,
  toStart,
}: {
  status: string;
  s: number;
  stageLength: number;
  toStart: number | null;
}) {
  if (status === 'approach') {
    return (
      <View style={[styles.strip, styles.stripInfo]}>
        <Text style={styles.stripText}>
          {toStart === null
            ? 'BUSCANDO GPS…'
            : toStart <= START_RADIUS_M
              ? 'EN LA SALIDA · ¡CUANDO QUIERAS!'
              : `VE A LA SALIDA · ${formatKm(toStart)}`}
        </Text>
      </View>
    );
  }
  if (status === 'offroute') {
    return (
      <View style={[styles.strip, styles.stripDanger]}>
        <Text style={styles.stripText}>FUERA DE RUTA</Text>
      </View>
    );
  }
  const progress = stageLength > 0 ? Math.min(1, s / stageLength) : 0;
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>
        {formatKm(s)} / {formatKm(stageLength)}
      </Text>
    </View>
  );
}

function Disclaimer({ visible, onAccept, onCancel }: { visible: boolean; onAccept: () => void; onCancel: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modal}>
          <Ionicons name="warning" size={36} color={colors.note} />
          <Text style={styles.modalTitle}>Carretera abierta</Text>
          <Text style={styles.modalText}>
            Esto no es un rally: hay tráfico, peatones y límites de velocidad. Las notas son orientativas y salen de
            datos de mapas que pueden tener errores. Conduce con prudencia; usas Rally4ver bajo tu responsabilidad.
          </Text>
          <Text style={styles.modalText}>No manipules el móvil mientras conduces.</Text>
          <Pressable style={[styles.startButton, { alignSelf: 'stretch' }]} onPress={onAccept}>
            <Text style={styles.startText}>ENTENDIDO</Text>
          </Pressable>
          <Pressable onPress={onCancel} style={{ padding: 10 }}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Stat({ label, value, big, color }: { label: string; value: string; big?: boolean; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, big && styles.statValueBig, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: colors.text, fontSize: 18, fontWeight: '900' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.border,
    borderWidth: 1,
  },
  ready: { flex: 1, paddingTop: 24, gap: 16 },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius,
    padding: 18,
    borderLeftWidth: 6,
    borderLeftColor: colors.note,
  },
  readyHelp: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  secondaryButton: {
    flexDirection: 'row',
    gap: 8,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.text, fontWeight: '800', fontSize: 16 },
  startButton: {
    flexDirection: 'row',
    gap: 10,
    height: 64,
    borderRadius: 14,
    backgroundColor: colors.note,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: { color: '#000', fontWeight: '900', fontSize: 20, letterSpacing: 1 },
  driving: { flex: 1, paddingTop: 16, gap: 14 },
  strip: { borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  stripInfo: { backgroundColor: colors.surfaceHigh },
  stripDanger: { backgroundColor: colors.accent },
  stripText: { color: colors.text, fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  progressWrap: { gap: 6 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceHigh, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: colors.accent },
  progressText: { color: colors.muted, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  noteCard: {
    backgroundColor: colors.note,
    borderRadius: radius,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  noteCardTight: { backgroundColor: colors.accent },
  noteText: { color: '#000', fontSize: 52, fontWeight: '900', letterSpacing: 1 },
  noteTextTight: { color: '#FFFFFF' },
  noteDistance: { color: '#000', fontSize: 22, fontWeight: '800' },
  following: { color: colors.muted, fontSize: 28, fontWeight: '900', textAlign: 'center' },
  bottomStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: radius,
    paddingVertical: 14,
  },
  stat: { alignItems: 'center' },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '900' },
  statValueBig: { fontSize: 30 },
  statLabel: { color: colors.muted, fontSize: 12 },
  finish: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  finishTitle: { color: colors.accent, fontSize: 64, fontWeight: '900', fontStyle: 'italic', letterSpacing: 4 },
  finishTime: { color: colors.text, fontSize: 56, fontWeight: '900' },
  record: { color: colors.note, fontSize: 24, fontWeight: '900' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: colors.surface, borderRadius: radius, padding: 24, alignItems: 'center', gap: 14 },
  modalTitle: { color: colors.text, fontSize: 24, fontWeight: '900' },
  modalText: { color: colors.text, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  cancelText: { color: colors.muted, fontSize: 15, fontWeight: '700' },
});
