import Ionicons from '@expo/vector-icons/Ionicons';
import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatKm, formatTime } from '../core/format';
import { generatePacenotes, type Pacenote } from '../core/pacenotes';
import { buildPath } from '../core/path';
import { noteLabel } from '../core/phrase';
import { formatDelta } from '../core/timer';
import { settingsStore, updateSettings } from '../data/settings';
import type { Stage } from '../data/stageStore';
import { driveStore, loadStage, unloadStage } from '../engine/drive';
import { startTracking, stopTracking } from '../engine/tracking';
import { DottedCard, Header, PrimaryButton, RoundButton, SecondaryButton } from './kit';
import { SettingsSheet } from './SettingsSheet';
import { StageMap } from './StageMap';
import { colors, night, radius } from './theme';

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

  const voiceButton = (inverted: boolean) => (
    <RoundButton
      icon={voiceEnabled ? 'volume-high-outline' : 'volume-mute-outline'}
      label={voiceEnabled ? 'Silenciar' : 'Activar voz'}
      onPress={() => updateSettings({ voiceEnabled: !voiceEnabled })}
      inverted={inverted}
    />
  );

  if (driving && session) {
    return (
      <View style={[styles.night, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        <StatusBar style="light" />
        <Header
          title={stage.name}
          inverted
          left={<RoundButton icon="close" label="Parar" onPress={stop} inverted />}
          right={voiceButton(true)}
        />
        <Driving session={session} stageLength={stageLength} bestTime={bestTime} newRecord={newRecord} onDone={stop} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <Header
        title="Tramo"
        left={<RoundButton icon="chevron-back" label="Volver" onPress={onClose} />}
        right={<RoundButton icon="options-outline" label="Ajustes" onPress={() => setSettingsOpen(true)} />}
      />
      <Ready
        stage={stage}
        distance={stageLength}
        noteCount={noteCount}
        bestTime={bestTime}
        onEdit={onEdit}
        onStart={() => setDisclaimer(true)}
      />
      <Disclaimer visible={disclaimer} onAccept={begin} onCancel={() => setDisclaimer(false)} />
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

function Ready({
  stage,
  distance,
  noteCount,
  bestTime,
  onEdit,
  onStart,
}: {
  stage: Stage;
  distance: number;
  noteCount: number;
  bestTime: number | null;
  onEdit: () => void;
  onStart: () => void;
}) {
  const { path, notes } = useMemo(() => {
    const p = buildPath(stage.route);
    return { path: p, notes: generatePacenotes(p) };
  }, [stage]);

  return (
    <View style={styles.ready}>
      <Text style={styles.stageName} numberOfLines={2}>
        {stage.name}
      </Text>
      <View style={styles.mapCard}>
        <StageMap stops={stage.stops} route={stage.route} path={path} notes={notes} />
      </View>
      <DottedCard style={styles.statsCard}>
        <Stat label="distancia" value={formatKm(distance)} />
        <Stat label="notas" value={String(noteCount)} />
        <Stat label="mejor tiempo" value={bestTime ? formatTime(bestTime) : '—'} />
      </DottedCard>
      <Text style={styles.readyHelp}>
        Pon tu navegador (Google Maps, Waze…) y deja Rally4ver en segundo plano: las notas se cantan solas desde la
        salida.
      </Text>
      <View style={{ flex: 1 }} />
      <SecondaryButton title="Editar ruta" icon="map-outline" onPress={onEdit} />
      <PrimaryButton title="EMPEZAR TRAMO" icon="flag" onPress={onStart} />
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
        <View style={styles.finishBadge}>
          <Ionicons name="flag" size={44} color={night.page} />
        </View>
        <Text style={styles.finishTitle}>META</Text>
        {finishTime !== null ? (
          <Text style={styles.finishTime}>{formatTime(finishTime)}</Text>
        ) : (
          <Text style={styles.nightHelp}>Sin tiempo: empezaste a mitad de tramo o hubo un salto de GPS.</Text>
        )}
        {newRecord && <Text style={styles.record}>¡Mejor tiempo!</Text>}
        {!newRecord && bestTime !== null && finishTime !== null && (
          <Text style={styles.nightHelp}>Mejor: {formatTime(bestTime)}</Text>
        )}
        <Pressable style={styles.nightButton} onPress={onDone}>
          <Text style={styles.nightButtonText}>VOLVER</Text>
        </Pressable>
      </View>
    );
  }

  const tight = !!upcoming && (upcoming.hairpin || upcoming.grade <= 2);
  return (
    <View style={styles.driving}>
      <StatusStrip status={status} s={s} stageLength={stageLength} toStart={toStart} />

      <View style={[styles.noteCard, tight && styles.noteCardTight]}>
        <Text style={[styles.noteText, tight && styles.noteTextTight]} adjustsFontSizeToFit numberOfLines={1}>
          {upcoming ? noteLabel(upcoming) : 'A META'}
        </Text>
        {upcoming && toUpcoming !== null && (
          <Text style={[styles.noteDistance, tight && styles.noteTextTight]}>
            {toUpcoming < 5 ? 'ahora' : `a ${Math.round(toUpcoming / 10) * 10} m`}
          </Text>
        )}
      </View>

      {upcoming && following && (
        <View style={styles.followingRow}>
          <Text style={styles.followingLink}>{linkLabel(upcoming)}</Text>
          <Text style={styles.following} numberOfLines={1} adjustsFontSizeToFit>
            {noteLabel(following)}
          </Text>
        </View>
      )}

      <View style={{ flex: 1 }} />

      <View style={styles.bottomStats}>
        <Stat label="km/h" value={String(Math.round(speed * 3.6))} night />
        <Stat label="tiempo" value={timed && elapsed !== null ? formatTime(elapsed) : '—'} night />
        {liveDelta && timed && (
          <Stat
            label="vs mejor"
            value={delta !== null ? formatDelta(delta) : '—'}
            color={delta === null ? night.ink : delta <= 0 ? '#3DDC84' : night.danger}
            night
          />
        )}
      </View>
    </View>
  );
}

function linkLabel(upcoming: Pacenote): string {
  const link = upcoming.link;
  if (link?.kind === 'y') return 'Y';
  if (link?.kind === 'distance') return link.meters > 1000 ? 'RECTA' : String(link.meters);
  return '';
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
    const text =
      toStart === null
        ? 'BUSCANDO GPS…'
        : toStart <= START_RADIUS_M
          ? 'EN LA SALIDA · ¡CUANDO QUIERAS!'
          : `VE A LA SALIDA · ${formatKm(toStart)}`;
    return (
      <View style={styles.strip}>
        <Text style={styles.stripText}>{text}</Text>
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
          <View style={styles.warnIcon}>
            <Ionicons name="warning-outline" size={34} color={colors.ink} />
          </View>
          <Header title="Carretera abierta" />
          <Text style={styles.modalText}>
            Esto no es un rally: hay tráfico, peatones y límites de velocidad. Las notas son orientativas y salen de
            datos de mapas que pueden tener errores. Conduce con prudencia; usas Rally4ver bajo tu responsabilidad.
          </Text>
          <Text style={[styles.modalText, { fontWeight: '700' }]}>No manipules el móvil mientras conduces.</Text>
          <PrimaryButton title="ENTENDIDO" onPress={onAccept} style={{ alignSelf: 'stretch' }} />
          <Pressable onPress={onCancel} style={{ padding: 8 }}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Stat({ label, value, night: dark, color }: { label: string; value: string; night?: boolean; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, dark && styles.statValueNight, color ? { color } : null]}>{value}</Text>
      <Text style={[styles.statLabel, dark && { color: night.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.card },
  night: { flex: 1, backgroundColor: night.page },
  ready: { flex: 1, paddingTop: 18, paddingHorizontal: 20, gap: 14 },
  stageName: { fontSize: 26, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  mapCard: {
    height: 220,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderStyle: 'dotted',
    borderColor: colors.dots,
  },
  statsCard: { flexDirection: 'row', justifyContent: 'space-around' },
  readyHelp: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  driving: { flex: 1, paddingTop: 18, paddingHorizontal: 18, gap: 16 },
  strip: {
    borderRadius: radius.pill,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dotted',
    borderColor: night.dots,
  },
  stripDanger: { backgroundColor: night.danger, borderStyle: 'solid', borderColor: night.danger },
  stripText: { color: night.ink, fontWeight: '800', fontSize: 15, letterSpacing: 1 },
  progressWrap: { gap: 6 },
  progressTrack: { height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: night.ink, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: night.ink },
  progressText: { color: night.muted, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  noteCard: {
    backgroundColor: night.card,
    borderRadius: 28,
    paddingVertical: 30,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  noteCardTight: { backgroundColor: night.danger },
  noteText: { color: colors.ink, fontSize: 54, fontWeight: '900', letterSpacing: 0.5 },
  noteTextTight: { color: '#FFFFFF' },
  noteDistance: { color: colors.ink, fontSize: 22, fontWeight: '700' },
  followingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dotted',
    borderColor: night.dots,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  followingLink: {
    color: night.page,
    backgroundColor: night.ink,
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontSize: 16,
    fontWeight: '800',
  },
  following: { color: night.ink, fontSize: 28, fontWeight: '800', flexShrink: 1 },
  bottomStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: night.panel,
    borderRadius: 22,
    paddingVertical: 16,
  },
  stat: { alignItems: 'center' },
  statValue: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  statValueNight: { color: night.ink, fontSize: 30 },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  finish: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 24 },
  finishBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: night.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishTitle: { color: night.ink, fontSize: 52, fontWeight: '900', letterSpacing: 6 },
  finishTime: { color: night.ink, fontSize: 56, fontWeight: '900' },
  record: {
    color: night.page,
    backgroundColor: night.ink,
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingVertical: 6,
    fontSize: 18,
    fontWeight: '800',
  },
  nightHelp: { color: night.muted, fontSize: 14, textAlign: 'center' },
  nightButton: {
    alignSelf: 'stretch',
    height: 58,
    borderRadius: radius.button,
    backgroundColor: night.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  nightButtonText: { color: night.page, fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 22 },
  modal: {
    backgroundColor: colors.card,
    borderRadius: 28,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 14,
  },
  warnIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalText: { color: colors.ink, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  cancelText: { color: colors.muted, fontSize: 15, fontWeight: '700' },
});
