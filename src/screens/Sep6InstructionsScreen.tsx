import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '../components/ui';
import { endpoints } from '../lib/api';
import { colors, spacing } from '../theme/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Sep6Instructions'>;

const HIDDEN_KEYS = new Set(['id', 'status', 'more_info_url', 'min_amount', 'max_amount', 'fee_fixed', 'fee_percent']);

/**
 * SEP-6 programmatic flow: the anchor returned instructions (bank details,
 * memo, reference) instead of an interactive URL. The user completes the
 * transfer out-of-band, then the status can be polled from the backend.
 */
export function Sep6InstructionsScreen({ route }: Props) {
  const { sepTransactionId, remittanceId, instructions } = route.params;
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const checkStatus = async () => {
    setBusy(true);
    try {
      const tx = await endpoints.sep6Transaction(sepTransactionId);
      setStatus(String((tx as { status?: string }).status ?? 'unknown'));
    } catch {
      setStatus('Could not reach the backend — try again shortly.');
    } finally {
      setBusy(false);
    }
  };

  const rows = Object.entries(instructions).filter(([k]) => !HIDDEN_KEYS.has(k) && instructions[k] !== undefined);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Bank transfer instructions</Text>
      <Text style={styles.subtitle}>
        The anchor does not offer an interactive flow for this transfer, so complete it
        programmatically using the details below, then check the status.
      </Text>

      <Card>
        <Text style={styles.label}>Transaction</Text>
        <Text style={styles.body}>{sepTransactionId.slice(0, 8)}…</Text>
        {remittanceId && (
          <>
            <Text style={styles.label}>Remittance</Text>
            <Text style={styles.body}>{remittanceId.slice(0, 8)}…</Text>
          </>
        )}
      </Card>

      <Card>
        {rows.length === 0 ? (
          <Text style={styles.muted}>No instructions were returned — check status or contact the anchor.</Text>
        ) : (
          rows.map(([key, value]) => (
            <View key={key} style={styles.row}>
              <Text style={styles.muted}>{key.replace(/_/g, ' ')}</Text>
              <Text style={styles.body}>{String(value)}</Text>
            </View>
          ))
        )}
      </Card>

      {status && <Text style={styles.muted}>Status: {status}</Text>}

      <Button label="Check status" onPress={() => void checkStatus()} loading={busy} />
      <Text style={styles.note}>
        Never share the memo/reference with anyone but the anchor. Transfers are verified from the
        anchor's transaction API — nothing here is fabricated.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: 14, color: colors.muted, marginBottom: spacing.lg, lineHeight: 20 },
  label: { fontSize: 12, color: colors.muted, marginTop: spacing.sm, marginBottom: 2, textTransform: 'uppercase' },
  body: { fontSize: 15, color: colors.text, lineHeight: 21 },
  muted: { fontSize: 14, color: colors.muted, lineHeight: 20, marginTop: spacing.sm },
  row: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  note: { fontSize: 12, color: colors.muted, marginTop: spacing.md, lineHeight: 17 },
});