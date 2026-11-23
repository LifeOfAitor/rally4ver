import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { say } from '../audio/voice';
import { LEAD_OPTIONS, RATE_OPTIONS, settingsStore, updateSettings } from '../data/settings';
import { colors, radius } from './theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const RATE_LABEL = ['Normal', 'Rápida', 'Muy rápida'];

export function SettingsSheet({ visible, onClose }: Props) {
  const s = settingsStore.use((x) => x);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Ajustes</Text>
          <ScrollView contentContainerStyle={styles.content}>
            <Row label="Voz del copiloto">
              <Switch value={s.voiceEnabled} onValueChange={(v) => updateSettings({ voiceEnabled: v })} />
            </Row>

            <Text style={styles.label}>Antelación de las notas</Text>
            <Segmented
              options={LEAD_OPTIONS.map((n) => ({ value: n, label: `${n} s` }))}
              value={s.leadSeconds}
              onChange={(v) => updateSettings({ leadSeconds: v })}
            />
            <Text style={styles.help}>Cuántos segundos antes de cada curva te la canta, según tu velocidad.</Text>

            <Text style={styles.label}>Velocidad de la voz</Text>
            <Segmented
              options={RATE_OPTIONS.map((r, i) => ({ value: r, label: RATE_LABEL[i] }))}
              value={s.voiceRate}
              onChange={(v) => updateSettings({ voiceRate: v })}
            />
            <Pressable
              style={styles.testButton}
              onPress={() =>
                say('cuidado, izquierda tres larga, cien, derecha dos cierra y izquierda cuatro', s.voiceRate)
              }
            >
              <Text style={styles.testText}>Probar voz</Text>
            </Pressable>

            <Row label="Cronómetro en vivo">
              <Switch value={s.liveDelta} onValueChange={(v) => updateSettings({ liveDelta: v })} />
            </Row>
            <Text style={styles.help}>
              Muestra mientras conduces si vas por delante o por detrás de tu mejor tiempo en ese tramo. En carretera
              abierta no hay rally: respeta los límites y el tráfico. Se usa bajo tu responsabilidad.
            </Text>
          </ScrollView>
          <Pressable style={styles.done} onPress={onClose}>
            <Text style={styles.doneText}>Listo</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Segmented<T extends number>({
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
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius,
    borderTopRightRadius: radius,
    padding: 20,
    paddingBottom: 36,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '900', marginBottom: 8 },
  content: { gap: 10, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  label: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 8 },
  help: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  segmented: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 10, padding: 3 },
  segment: { flex: 1, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: colors.note },
  segmentText: { color: colors.muted, fontWeight: '800' },
  segmentTextOn: { color: '#000' },
  testButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
  },
  testText: { color: colors.note, fontWeight: '800' },
  done: { height: 50, borderRadius: 10, backgroundColor: colors.note, alignItems: 'center', justifyContent: 'center' },
  doneText: { color: '#000', fontWeight: '900', fontSize: 16 },
});
