import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, type } from './theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Black pill title, centred in the header like the design reference. */
export function Pill({ children, inverted }: { children: string; inverted?: boolean }) {
  return (
    <View style={[styles.pill, inverted && styles.pillInverted]}>
      <Text style={[styles.pillText, inverted && styles.pillTextInverted]}>{children.toUpperCase()}</Text>
    </View>
  );
}

/** Header row: round icon left, pill title, round icon right. */
export function Header({
  title,
  left,
  right,
  inverted,
}: {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
  inverted?: boolean;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>{left}</View>
      <Pill inverted={inverted}>{title}</Pill>
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

export function RoundButton({
  icon,
  onPress,
  label,
  inverted,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  inverted?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.round, inverted && styles.roundInverted, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={22} color={inverted ? colors.onInk : colors.ink} />
    </Pressable>
  );
}

/** White card with the dotted outline. */
export function DottedCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({
  title,
  onPress,
  icon,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.primary, disabled && { opacity: 0.35 }, pressed && { opacity: 0.8 }, style]}
    >
      {icon && <Ionicons name={icon} size={20} color={colors.onInk} />}
      <Text style={styles.primaryText}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  title,
  onPress,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.6 }, style]}>
      {icon && <Ionicons name={icon} size={20} color={colors.ink} />}
      <Text style={styles.secondaryText}>{title}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionText}>{children}</Text>
    </View>
  );
}

/** Segmented bar like the habit progress in the reference: `filled` of `total` blocks. */
export function SegmentBar({ filled, total }: { filled: number; total: number }) {
  return (
    <View style={styles.segBar}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.seg,
            i < filled && styles.segOn,
            i === 0 && styles.segFirst,
            i === total - 1 && styles.segLast,
          ]}
        />
      ))}
    </View>
  );
}

export const styles = StyleSheet.create({
  pill: {
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: 22,
    paddingVertical: 9,
    minWidth: 150,
    alignItems: 'center',
  },
  pillInverted: { backgroundColor: colors.onInk },
  pillText: { ...type.pill, color: colors.onInk },
  pillTextInverted: { color: colors.ink },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  headerSide: { width: 52 },
  round: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  roundInverted: { borderColor: colors.onInk, backgroundColor: 'transparent' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderStyle: 'dotted',
    borderColor: colors.dots,
    padding: 16,
  },
  primary: {
    flexDirection: 'row',
    gap: 10,
    height: 58,
    borderRadius: radius.button,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: colors.onInk, fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },
  secondary: {
    flexDirection: 'row',
    gap: 8,
    height: 52,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderStyle: 'dotted',
    borderColor: colors.dots,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  section: { borderBottomWidth: 1.5, borderStyle: 'dotted', borderColor: colors.dots, paddingBottom: 8 },
  sectionText: { ...type.h2, color: colors.ink },
  segBar: { flexDirection: 'row', height: 12, width: 150 },
  seg: { flex: 1, borderWidth: 1.5, borderColor: colors.ink, borderLeftWidth: 0, backgroundColor: colors.card },
  segOn: { backgroundColor: colors.ink },
  segFirst: { borderLeftWidth: 1.5, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
  segLast: { borderTopRightRadius: 6, borderBottomRightRadius: 6 },
});
