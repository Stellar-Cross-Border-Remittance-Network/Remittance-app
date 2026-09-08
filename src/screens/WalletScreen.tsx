import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { Button, Card, Screen, StatusBadge, Title } from '../components/ui';
import { shortKey } from '../lib/stellar';
import { fetchAccountSummary, formatBalance, type AccountSummary } from '../services/balances';
import { useAuthStore } from '../store/authStore';
import { colors, spacing } from '../theme/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Wallet'>;

export function WalletScreen({ navigation }: Props) {
  const session = useAuthStore((s) => s.session);
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!session) {
      return;
    }
    try {
      const s = await fetchAccountSummary(session.account);
      setSummary(s);
    } catch {
      setSummary(null);
    }
  };

  useEffect(() => {
    void load();
  }, [session?.account]);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title>Wallet</Title>
        <StatusBadge text={session?.custody === 'custodial' ? 'custodial' : 'self-custody'} tone="active" />
      </View>
      <Text style={{ color: colors.muted, marginBottom: spacing.lg }}>
        {session ? shortKey(session.account) : ''}
      </Text>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)); }} />}
      >
        <Card>
          <Text style={{ color: colors.muted, marginBottom: spacing.sm }}>Balances</Text>
          {summary === null ? (
            <Text style={{ color: colors.muted }}>Loading account state from Horizon…</Text>
          ) : summary.balances.length === 0 ? (
            <Text style={{ color: colors.muted }}>No balances yet — fund your account to begin.</Text>
          ) : (
            summary.balances.map((b) => (
              <View key={b.asset} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                <Text style={{ color: colors.text }}>{b.asset.split(':')[0]}</Text>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{formatBalance(b.balance, b.asset)}</Text>
              </View>
            ))
          )}
        </Card>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button label="Send" onPress={() => navigation.navigate('Send')} style={{ flex: 1 }} />
          <Button label="Receive" variant="secondary" onPress={() => navigation.navigate('Receive')} style={{ flex: 1 }} />
        </View>

        <Card>
          <Text style={{ color: colors.muted, marginBottom: spacing.md }}>Remittance</Text>
          <Button label="Start a remittance" onPress={() => navigation.navigate('CorridorSelection')} style={{ marginBottom: spacing.sm }} />
          <Button label="Activity" variant="secondary" onPress={() => navigation.navigate('Activity')} />
        </Card>
      </ScrollView>
    </Screen>
  );
}