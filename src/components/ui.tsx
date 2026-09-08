import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text as RNText, View, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../theme/theme';
import { PHASES, mapStatus, type Phase } from '../services/liveStatus';

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
}) {
  const palette =
    variant === 'danger'
      ? colors.danger
      : variant === 'secondary'
        ? colors.secondary
        : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border },
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.buttonPressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <RNText style={[styles.buttonText, { color: palette.text }]}>{label}</RNText>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <RNText style={styles.fieldLabel}>{label}</RNText>
      {children}
    </View>
  );
}

export function StatusBadge({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'success' | 'danger' | 'active' }) {
  const bg =
    tone === 'success' ? colors.success.bg : tone === 'danger' ? colors.danger.bg : tone === 'active' ? colors.active.bg : colors.neutral.bg;
  const fg =
    tone === 'success' ? colors.success.text : tone === 'danger' ? colors.danger.text : tone === 'active' ? colors.active.text : colors.neutral.text;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <RNText style={[styles.badgeText, { color: fg }]}>{text}</RNText>
    </View>
  );
}

/** Live-status timeline with the canonical phase list. */
export function StatusTimeline({ status, lifecycle }: { status: string; lifecycle: string }) {
  const live = mapStatus(status, lifecycle);
  const currentIdx = PHASES.indexOf(live.phase);
  return (
    <View>
      {PHASES.map((phase, idx) => {
        const reached = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <View key={phase} style={styles.timelineRow}>
            <View style={[styles.timelineDot, reached ? styles.timelineDotReached : null, isCurrent ? styles.timelineDotCurrent : null]} />
            <RNText style={[styles.timelineLabel, reached ? styles.timelineLabelReached : null]}>
              {phase.replace(/_/g, ' ').toLowerCase()}
            </RNText>
          </View>
        );
      })}
    </View>
  );
}

export function Screen({ children, padded = true }: { children: React.ReactNode; padded?: boolean }) {
  return <View style={[styles.screen, padded && styles.screenPadded]}>{children}</View>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <RNText style={styles.title}>{children}</RNText>;
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  return <RNText style={styles.subtitle}>{children}</RNText>;
}

export function Text({
  children,
  variant = 'body',
  selectable,
}: {
  children: React.ReactNode;
  variant?: 'title' | 'body' | 'label' | 'caption';
  selectable?: boolean;
}) {
  const style =
    variant === 'title'
      ? styles.title
      : variant === 'label'
        ? styles.fieldLabel
        : variant === 'caption'
          ? styles.caption
          : styles.body;
  return (
    <RNText selectable={selectable} style={style}>
      {children}
    </RNText>
  );
}

export function Spacer({ small }: { small?: boolean }) {
  return <View style={small ? styles.spacerSmall : styles.spacer} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenPadded: { padding: spacing.lg },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: 15, color: colors.muted, marginBottom: spacing.lg },
  button: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  field: { marginBottom: spacing.md },
  fieldLabel: { fontSize: 13, color: colors.muted, marginBottom: spacing.xs },
  badge: { alignSelf: 'flex-start', borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  timelineRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border, marginRight: 10 },
  timelineDotReached: { backgroundColor: colors.success.bg },
  timelineDotCurrent: { backgroundColor: colors.active.bg, width: 12, height: 12, borderRadius: 6 },
  timelineLabel: { fontSize: 14, color: colors.muted },
  timelineLabelReached: { color: colors.text },
  body: { fontSize: 15, color: colors.text, lineHeight: 21 },
  caption: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  spacer: { height: spacing.lg },
  spacerSmall: { height: spacing.sm },
});