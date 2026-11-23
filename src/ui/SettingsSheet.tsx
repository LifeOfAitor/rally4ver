import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VOICES, type VoiceId } from '../audio/clips';
import { previewVoice } from '../audio/voice';
import { LEAD_OPTIONS, RATE_OPTIONS, settingsStore, updateSettings } from '../data/settings';
import { DottedCard, Header, PrimaryButton, SecondaryButton } from './kit';
import { colors, radius } from './theme';

const RATE_LABEL = ['Normal', 'Rápida', 'Muy rápida'];

/** Settings list, used both as the AJUSTES tab and as a sheet on the drive screen. */
export function SettingsContent() {
  const s = settingsStore.use((x) => x);
  return (
    <View style={styles.content}>
      <DottedCard style={styles.row}>
        <Text style={styles.rowLabel}>Voz del copiloto</Text>
        <Switch
          value={s.voiceEnabled}
          onValueChange={(v) => updateSettings({ voiceEnabled: v })}
          trackColor={{ true: colors.ink }}
        />
      </DottedCard>

      <DottedCard style={styles.block}>
        <Text style={styles.rowLabel}>Antelación de las notas</Text>
        <Segmented
          options={LEAD_OPTIONS.map((n) => ({ value: n, label: `${n} s` }))}
          value={s.leadSeconds}
          onChange={(v) => updateSettings({ leadSeconds: v })}
        />
        <Text style={styles.help}>Cuántos segundos antes de cada curva te la canta, según tu velocidad.</Text>
      </DottedCard>

      <DottedCard style={styles.block}>
        <Text style={styles.rowLabel}>Voz</Text>
        <Segmented
          options={(Object.keys(VOICES) as VoiceId[]).map((id) => ({ value: id, label: VOICES[id].label }))}
          value={s.voiceId}
          onChange={(v) => {
            updateSettings({ voiceId: v });
            previewVoice(s.voiceRate); // hear it straight away
          }}
        />
        <Text style={styles.rowLabel}>Velocidad de la voz</Text>
        <Segmented
          options={RATE_OPTIONS.map((r, i) => ({ value: r, label: RATE_LABEL[i] }))}
          value={s.voiceRate}
          onChange={(v) => updateSettings({ voiceRate: v })}
        />
        <SecondaryButton title="Probar voz" icon="volume-high-outline" onPress={() => previewVoice(s.voiceRate)} />
      </DottedCard>

      <DottedCard style={styles.block}>
        <View style={styles.rowInline}>
          <Text style={styles.rowLabel}>Cronómetro en vivo</Text>
          <Switch
            value={s.liveDelta}
            onValueChange={(v) => updateSettings({ liveDelta: v })}
            trackColor={{ true: colors.ink }}
          />
        </View>
        <Text style={styles.help}>
          Muestra mientras conduces si vas por delante o por detrás de tu mejor tiempo. En carretera abierta no hay
          rally: respeta los límites y el tráfico. Bajo tu responsabilidad.
        </Text>
      </DottedCard>

      <Text style={styles.credits}>
        Voces generadas con Piper: davefx (CC0) y SHARVARD (CC BY 3.0, Universidad de Edimburgo). Mapas © OpenStreetMap
        · OpenFreeMap. Rutas OSRM.
      </Text>
    </View>
  );
}

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 30, gap: 22 }}
    >
      <Header title="Ajustes" />
      <SettingsContent />
    </ScrollView>
  );
}

export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 12 }}>
            <Header title="Ajustes" />
            <SettingsContent />
          </ScrollView>
          <PrimaryButton title="LISTO" onPress={onClose} style={{ marginHorizontal: 20 }} />
        </View>
      </View>
    </Modal>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          style={[styles.segment, o.value === value && styles.segmentOn]}
          onPress={() => onChange(o.value)}
        >
          <Text style={[styles.segmentText, o.value === value && styles.segmentTextOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.card },
  content: { gap: 12, paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  rowInline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  block: { gap: 12 },
  rowLabel: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  help: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  segmented: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderStyle: 'dotted',
    borderColor: colors.dots,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: { backgroundColor: colors.ink, borderStyle: 'solid', borderColor: colors.ink },
  segmentText: { color: colors.ink, fontWeight: '700' },
  segmentTextOn: { color: colors.onInk },
  credits: { color: colors.muted, fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 8 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingBottom: 36,
  },
});
