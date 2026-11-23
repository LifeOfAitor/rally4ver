import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from './src/ui/theme';

// Placeholder screen until the route / stage UI lands.
export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <Text style={styles.title}>RALLY4VER</Text>
        <Text style={styles.note}>◀ IZQ 4 CIERRA</Text>
        <Text style={styles.next}>100 · DER 2 ▶</Text>
      </View>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { color: colors.accent, fontSize: 18, fontWeight: '900', letterSpacing: 4 },
  note: { color: colors.note, fontSize: 40, fontWeight: '900' },
  next: { color: colors.muted, fontSize: 24, fontWeight: '700' },
});
