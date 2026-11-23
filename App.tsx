import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Stage } from './src/data/stageStore';
import { HomeScreen } from './src/ui/HomeScreen';
import { RouteEditor } from './src/ui/RouteEditor';
import { colors } from './src/ui/theme';

type Screen = { name: 'home' } | { name: 'editor'; stage?: Stage };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {screen.name === 'home' ? (
          <HomeScreen onNew={() => setScreen({ name: 'editor' })} onOpen={(stage) => setScreen({ name: 'editor', stage })} />
        ) : (
          <RouteEditor stage={screen.stage} onDone={() => setScreen({ name: 'home' })} />
        )}
      </View>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
