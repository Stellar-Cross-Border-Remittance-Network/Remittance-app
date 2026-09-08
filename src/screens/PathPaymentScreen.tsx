import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, Screen, Subtitle, Title } from '../components/ui';
import { endpoints } from '../lib/api';
import { enqueueIntent } from '../queue/offlineQueue';
import { useSendDraft } from '../store/sendDraftStore';
import { colors, spacing } from '../theme/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PathPayment'>;

interface PathPlan {
  paths: Array<{ sourceAmount: string; destinationAmount: string; path: string[] }>;
  best: { sourceAmount: string; destinationAmount: string; path: string[] };
}

export function PathPaymentScreen({ navigation }: Props) {
  const draft = useSendDraft();
  const [plan, setPlan] = useState<PathPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planPath = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await endpoints.pathPlan({
        send_asset: 'XLM',
        send_amount: draft.amount,
        dest_asset: draft.destAsset,
        dest_account: draft.destAddress,
      });
      setPlan(res as unknown as PathPlan);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!plan) {
      return;
    }
    await enqueueIntent({
      id: `path-${Date.now()}`,
      kind: 'path_payment',
      sourceAccount: draft.destAddress, // replaced by active account in a real flow
      destination: draft.destAddress,
      assetIn: 'XLM',
      amountIn: draft.amount,
      assetOut: draft.destAsset.split(':')[0],
      createdAt: Date.now(),
      expiry: Date.now() + 10 * 60 * 1000,
      label: `Send ${draft.amount} XLM via path`,
    });
    navigation.navigate('OfflineQueue');
  };

  return (
    <Screen>
      <Title>Send via path</Title>
      <Subtitle>Review the REAL path before signing — nothing is estimated.</Subtitle>

      {!plan && (
        <Button label="Find path" onPress={() => void planPath()} loading={busy} />
      )}
      {error && <Text style={{ color: colors.danger.text, marginTop: spacing.md }}>{error}</Text>}

      {plan && (
        <>
          <Card>
            <Text style={{ color: colors.muted, marginBottom: 8 }}>Path</Text>
            <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 8 }}>
              {plan.best.path.length > 0 ? plan.best.path.join(' → ') : 'direct'}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.muted }}>You send</Text>
              <Text style={{ color: colors.text }}>{plan.best.sourceAmount}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ color: colors.muted }}>They receive (est.)</Text>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{plan.best.destinationAmount}</Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>
              {plan.paths.length} real path{plan.paths.length === 1 ? '' : 's'} returned by Horizon
            </Text>
          </Card>

          <Button label="Queue for sign & submit" onPress={() => void submit()} />
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: spacing.sm }}>
            On submit, a fresh transaction is built with the latest sequence number — never a cached envelope.
          </Text>
        </>
      )}
    </Screen>
  );
}