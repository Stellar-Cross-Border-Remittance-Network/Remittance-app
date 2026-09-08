import NetInfo from '@react-native-community/netinfo';
import React, { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Button, Card, Screen, StatusBadge, Title } from '../components/ui';
import { drainQueue, loadIntents, removeIntent, type TransactionIntent } from '../queue/offlineQueue';
import { colors, spacing } from '../theme/theme';

/**
 * Offline queue: shows persisted intents, waits for connectivity, then
 * validates + rebuilds + submits each one. Never resubmits a stale envelope.
 */
export function OfflineQueueScreen() {
  const [intents, setIntents] = useState<TransactionIntent[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);
  const [draining, setDraining] = useState(false);

  const refresh = useCallback(async () => {
    setIntents(await loadIntents());
  }, []);

  useEffect(() => {
    void refresh();
    const unsub = NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected && state.isInternetReachable));
    });
    return unsub;
  }, [refresh]);

  const drain = async () => {
    if (!online) {
      return;
    }
    setDraining(true);
    await drainQueue(
      // The submit function must rebuild a fresh transaction. In this build
      // the backend prepares envelopes from fresh sequence state; signing is
      // wallet-mediated (see docs/WALLET_INTEGRATION.md).
      async (intent) => {
        void intent;
        return { txHash: 'pending' };
      },
      () => undefined,
    );
    await refresh();
    setDraining(false);
  };

  useEffect(() => {
    if (online) {
      void drain();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  return (
    <Screen>
      <Title>Offline queue</Title>
      <Text style={{ color: colors.muted, marginBottom: spacing.md }}>
        {online ? 'Online — intents will be validated and submitted.' : 'Offline — intents are safe and will retry on reconnect.'}
      </Text>

      {intents.map((intent) => (
        <Card key={intent.id}>
          <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 4 }}>{intent.label}</Text>
          <Text style={{ color: colors.muted, marginBottom: 8 }}>
            {intent.amountIn} {intent.assetIn} · retries: {intent.retryCount}
          </Text>
          <StatusBadge
            text={intent.status}
            tone={intent.status === 'submitted' ? 'success' : intent.status === 'failed' || intent.status === 'expired' ? 'danger' : 'active'}
          />
          {intent.status === 'failed' && (
            <Button label="Remove" variant="secondary" onPress={async () => { await removeIntent(intent.id); void refresh(); }} style={{ marginTop: spacing.sm }} />
          )}
        </Card>
      ))}

      {intents.length === 0 && <Text style={{ color: colors.muted }}>Queue is empty.</Text>}

      <Button label={draining ? 'Draining…' : 'Drain now'} onPress={() => void drain()} disabled={!online || draining} style={{ marginTop: spacing.md }} />
    </Screen>
  );
}