import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { settingsStore, updateSettings } from './src/data/settings';
import type { Stage } from './src/data/stageStore';
import { DriveScreen } from './src/ui/DriveScreen';
import { HomeScreen } from './src/ui/HomeScreen';
import { GuideScreen } from './src/ui/NotesGuide';
import { RouteEditor } from './src/ui/RouteEditor';
import { SettingsScreen } from './src/ui/SettingsSheet';
import { type Tab, TabBar } from './src/ui/TabBar';
import { colors } from './src/ui/theme';
import { TimesScreen } from './src/ui/TimesScreen';
import { WelcomeScreen } from './src/ui/WelcomeScreen';

type Overlay = { name: 'editor'; stage?: Stage } | { name: 'drive'; stage: Stage } | null;

export default function App() {
  const welcomed = settingsStore.use((s) => s.welcomed);
  const guideSeen = settingsStore.use((s) => s.guideSeen);
  const [tab, setTab] = useState<Tab>('tramos');
  const [overlay, setOverlay] = useState<Overlay>(null);

  let content;
  if (!welcomed) {
    content = <WelcomeScreen onDone={() => updateSettings({ welcomed: true })} />;
  } else if (!guideSeen) {
    content = <GuideScreen onDone={() => updateSettings({ guideSeen: true })} />;
  } else if (overlay?.name === 'editor') {
    content = (
      <RouteEditor
        stage={overlay.stage}
        onDone={(saved) => setOverlay(saved ? { name: 'drive', stage: saved } : null)}
      />
    );
  } else if (overlay?.name === 'drive') {
    content = (
      <DriveScreen
        stage={overlay.stage}
        onEdit={() => setOverlay({ name: 'editor', stage: overlay.stage })}
        onClose={() => setOverlay(null)}
      />
    );
  } else {
    content = (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {tab === 'tramos' && (
            <HomeScreen
              onNew={() => setOverlay({ name: 'editor' })}
              onOpen={(stage) => setOverlay({ name: 'drive', stage })}
            />
          )}
          {tab === 'tiempos' && <TimesScreen />}
          {tab === 'ajustes' && <SettingsScreen />}
        </View>
        <TabBar tab={tab} onChange={setTab} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.card }}>{content}</View>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
