import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pill } from './kit';
import { colors, themed } from './theme';

/** First-launch screen in the line-art style of the design reference. */
export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Pill>Rally4ver</Pill>
      <Text style={styles.hi}>¡Hola!</Text>

      <View style={styles.art}>
        <View style={[styles.ring, { width: 300, height: 300 }]} />
        <View style={[styles.ring, { width: 220, height: 220 }]} />
        <View style={styles.carCircle}>
          <Ionicons name="car-sport-outline" size={96} color={colors.ink} />
        </View>
        <Check style={{ top: 18, left: 34 }} size={52} />
        <Check style={{ top: 120, left: 4 }} size={40} />
        <Check style={{ bottom: 26, right: 30 }} size={48} />
        <Check style={{ top: 40, right: 14 }} size={30} />
      </View>

      <Text style={styles.text}>
        Elige la carretera que te gusta y te canto las curvas como un copiloto de rally: «izquierda tres, cien, derecha
        dos cierra».
      </Text>

      <View style={{ flex: 1 }} />
      <Pressable style={styles.next} onPress={onDone} accessibilityLabel="Empezar">
        <Ionicons name="arrow-forward" size={34} color={colors.ink} />
      </Pressable>
    </View>
  );
}

function Check({ style, size }: { style: object; size: number }) {
  return (
    <View style={[styles.check, { width: size, height: size }, style]}>
      <Ionicons name="checkmark" size={size * 0.85} color={colors.ink} />
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.card, alignItems: 'center', paddingHorizontal: 28 },
    hi: { fontSize: 30, fontWeight: '800', color: colors.ink, marginTop: 40 },
    art: { width: 320, height: 320, marginTop: 24, alignItems: 'center', justifyContent: 'center' },
    ring: {
      position: 'absolute',
      borderRadius: 999,
      borderWidth: 1.5,
      borderStyle: 'dotted',
      borderColor: colors.dots,
    },
    carCircle: {
      width: 160,
      height: 160,
      borderRadius: 80,
      borderWidth: 2,
      borderColor: colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    check: {
      position: 'absolute',
      borderWidth: 1.5,
      borderStyle: 'dotted',
      borderColor: colors.dots,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    text: { fontSize: 16, lineHeight: 23, color: colors.inkSoft, textAlign: 'center', marginTop: 20 },
    next: { alignSelf: 'flex-end', padding: 8 },
  }),
);
