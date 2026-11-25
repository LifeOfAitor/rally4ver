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
import { Header, PrimaryButton, SecondaryButton } from './kit';
import { colors, radius, themed } from './theme';

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
          <Header title="Importar ruta" />
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
            <SecondaryButton
              title="Pegar"
              icon="clipboard-outline"
              style={{ flex: 1 }}
              onPress={() => Clipboard.getStringAsync().then(setText)}
            />
            {busy ? (
              <View style={[styles.busy]}>
                <ActivityIndicator color={colors.onInk} />
              </View>
            ) : (
              <PrimaryButton title="Importar" onPress={submit} disabled={!text} style={{ flex: 1, height: 52 }} />
            )}
          </View>
          <Text style={styles.note}>
            Google no comparte el trazado exacto: recalculamos la ruta por las mismas paradas y te enseñamos las
            alternativas. Si ninguna es la tuya, toca la carretera por la que quieres pasar.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
      backgroundColor: colors.card,
      paddingTop: 20,
      paddingHorizontal: 20,
      paddingBottom: 36,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      gap: 14,
    },
    help: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
    input: {
      minHeight: 76,
      color: colors.ink,
      backgroundColor: colors.card,
      borderRadius: radius.button,
      borderWidth: 1.5,
      borderStyle: 'dotted',
      borderColor: colors.dots,
      padding: 14,
      fontSize: 14,
      textAlignVertical: 'top',
    },
    error: { color: colors.danger, fontSize: 14 },
    row: { flexDirection: 'row', gap: 12 },
    busy: {
      flex: 1,
      height: 52,
      borderRadius: radius.button,
      backgroundColor: colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    note: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  }),
);
