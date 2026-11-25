import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sayTokens, silence } from '../audio/voice';
import { GUIDE_ROWS } from '../core/guide';
import { settingsStore } from '../data/settings';
import { DottedCard, Header, PrimaryButton } from './kit';
import { colors, radius, themed } from './theme';

/** The notes legend with a "listen" button per row. */
export function GuideContent() {
  const rate = settingsStore.use((s) => s.voiceRate);
  return (
    <View style={styles.content}>
      <Text style={styles.intro}>
        Las curvas se cantan con una escala del <Text style={styles.bold}>1</Text> (la más cerrada) al{' '}
        <Text style={styles.bold}>6</Text> (casi recta). En pantalla, las muy cerradas salen en rojo. Toca{' '}
        <Ionicons name="volume-high-outline" size={14} color={colors.ink} /> para oír cómo suena cada una.
      </Text>
      <View style={styles.scale}>
        {[1, 2, 3, 4, 5, 6].map((g) => (
          <View key={g} style={[styles.scaleStep, g <= 2 && styles.scaleTight]}>
            <Text style={[styles.scaleText, g <= 2 && styles.scaleTextTight]}>{g}</Text>
          </View>
        ))}
      </View>
      <View style={styles.scaleLegend}>
        <Text style={styles.scaleLegendText}>más cerrada</Text>
        <Text style={styles.scaleLegendText}>más abierta</Text>
      </View>
      {GUIDE_ROWS.map((r) => (
        <DottedCard key={r.label} style={styles.row}>
          <View style={[styles.note, r.tight && styles.noteTight]}>
            <Text style={[styles.noteText, r.tight && styles.noteTextTight]} numberOfLines={1} adjustsFontSizeToFit>
              {r.label}
            </Text>
          </View>
          <Text style={styles.meaning}>{r.meaning}</Text>
          <Pressable
            style={({ pressed }) => [styles.play, pressed && { opacity: 0.6 }]}
            onPress={() => {
              silence();
              void sayTokens(r.say, rate);
            }}
            accessibilityLabel={`Escuchar: ${r.meaning}`}
          >
            <Ionicons name="volume-high-outline" size={20} color={colors.ink} />
          </Pressable>
        </DottedCard>
      ))}
    </View>
  );
}

/** Full screen, shown once after the welcome. */
export function GuideScreen({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <Header title="Cómo leer las notas" />
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}>
        <GuideContent />
      </ScrollView>
      <PrimaryButton title="EMPEZAR" onPress={onDone} style={{ marginHorizontal: 20 }} />
    </View>
  );
}

/** Same legend as a sheet, opened from AJUSTES. */
export function GuideSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 12 }}>
            <Header title="Cómo leer las notas" />
            <GuideContent />
          </ScrollView>
          <PrimaryButton title="LISTO" onPress={onClose} style={{ marginHorizontal: 20 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.card },
    content: { gap: 10, paddingHorizontal: 20 },
    intro: { color: colors.inkSoft, fontSize: 15, lineHeight: 22 },
    bold: { color: colors.ink, fontWeight: '800' },
    scale: { flexDirection: 'row', gap: 6, marginTop: 6 },
    scaleStep: {
      flex: 1,
      height: 36,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scaleTight: { backgroundColor: colors.danger, borderColor: colors.danger },
    scaleText: { color: colors.ink, fontWeight: '900', fontSize: 16 },
    scaleTextTight: { color: colors.onDanger },
    scaleLegend: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    scaleLegendText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12 },
    note: {
      width: 118,
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 12,
      backgroundColor: colors.ink,
      alignItems: 'center',
    },
    noteTight: { backgroundColor: colors.danger },
    noteText: { color: colors.onInk, fontWeight: '900', fontSize: 15 },
    noteTextTight: { color: colors.onDanger },
    meaning: { flex: 1, color: colors.ink, fontSize: 14, lineHeight: 19 },
    play: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: {
      maxHeight: '90%',
      backgroundColor: colors.card,
      borderTopLeftRadius: radius.card + 6,
      borderTopRightRadius: radius.card + 6,
      borderTopWidth: 1,
      borderColor: colors.dots,
      paddingTop: 20,
      paddingBottom: 36,
    },
  }),
);
