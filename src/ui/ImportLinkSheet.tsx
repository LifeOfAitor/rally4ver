import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { LatLon } from '../core/geo';
import { extractUrl } from '../core/importLink';
import { currentLocation } from '../data/location';
import { requestFromSharedText, resolveStops } from '../data/routing';
import type { StageSource } from '../data/stageStore';
import { colors, radius } from './theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onImported: (stops: LatLon[], source: StageSource, preferredAlternative?: number) => void;
}

export function ImportLinkSheet({ visible, onClose, onImported }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill with a link from the clipboard, the usual way to bring a route over.
  // Android only: on iOS reading the clipboard shows a "paste" prompt every time.
  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (Platform.OS !== 'android') return;
    Clipboard.getStringAsync()
      .then((clip) => {
        if (clip && extractUrl(clip)) setText(clip);
      })
      .catch(() => {});
  }, [visible]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const request = await requestFromSharedText(text);
      const here = request.origin ? null : await currentLocation();
      const stops = await resolveStops(request, here);
      onImported(stops, request.source, request.preferredAlternative);
      setText('');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Importar ruta</Text>
          <Text style={styles.help}>
            En Google Maps calcula la ruta, pulsa «Compartir» y copia el enlace. También vale un enlace de Waze (solo
            trae el destino; la salida será tu ubicación).
          </Text>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="https://maps.app.goo.gl/…"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.row}>
            <Pressable
              style={[styles.button, styles.secondary]}
              onPress={() => Clipboard.getStringAsync().then(setText)}
            >
              <Text style={styles.buttonText}>Pegar</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.primary, (!text || busy) && styles.disabled]}
              disabled={!text || busy}
              onPress={submit}
            >
              {busy ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={[styles.buttonText, styles.primaryText]}>Importar</Text>
              )}
            </Pressable>
          </View>
          <Text style={styles.note}>
            Google no comparte el trazado exacto: recalculamos la ruta por las mismas paradas. Si algún tramo no
            coincide, toca el mapa para añadir una parada y arrástrala.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: colors.surface,
    padding: 20,
    paddingBottom: 36,
    borderTopLeftRadius: radius,
    borderTopRightRadius: radius,
    gap: 12,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '900' },
  help: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  input: {
    minHeight: 70,
    color: colors.text,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  error: { color: colors.danger, fontSize: 14 },
  row: { flexDirection: 'row', gap: 12 },
  button: { flex: 1, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: colors.surfaceHigh },
  primary: { backgroundColor: colors.note },
  disabled: { opacity: 0.4 },
  buttonText: { color: colors.text, fontWeight: '800', fontSize: 16 },
  primaryText: { color: '#000' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 17 },
});
