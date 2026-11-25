import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, themed } from './theme';

export type Tab = 'tramos' | 'tiempos' | 'ajustes';

const TABS: { key: Tab; label: string; icon: ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'tramos', label: 'TRAMOS', icon: 'flag-outline' },
  { key: 'tiempos', label: 'TIEMPOS', icon: 'stats-chart-outline' },
  { key: 'ajustes', label: 'AJUSTES', icon: 'options-outline' },
];

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 10 }]}>
      {TABS.map((t) => {
        const on = t.key === tab;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={[styles.item, on && styles.itemOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <Ionicons name={t.icon} size={20} color={on ? colors.onInk : colors.ink} />
            <Text style={[styles.label, on && styles.labelOn]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.soft,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
    },
    item: {
      width: 92,
      height: 62,
      borderRadius: 16,
      borderWidth: 1.5,
      borderStyle: 'dotted',
      borderColor: colors.dots,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    itemOn: { backgroundColor: colors.ink, borderStyle: 'solid', borderColor: colors.ink },
    label: { fontSize: 10, fontWeight: '800', color: colors.ink, letterSpacing: 0.4 },
    labelOn: { color: colors.onInk },
  }),
);
