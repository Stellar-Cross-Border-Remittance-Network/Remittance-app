import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, Screen, StatusBadge, StatusTimeline, Subtitle, Title } from '../components/ui';
import { endpoints } from '../lib/api';
import { formatAmount } from '../lib/stroops';
import { useRemittanceStream } from '../services/streamingService';
import { initiateAnchorDeposit } from '../services/sepFlow';
import { useAnchorFlow } from '../store/anchorFlowStore';
import { colors, spacing } from '../theme/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RemittanceDetail'>;

interface RemittanceRecord {
  id: string;
  status: string;
  lifecycle: string;
  source_asset: string;
  source_amount: string;
  destination_asset: string;
  expected_destination_amount: string;
  recipient_address: string;
  corridor: string;
  expiry: string;
  contract_remittance_id?: string;
  contract_status?: string | null;
}

export function RemittanceDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const [remittance, setRemittance] = useState<RemittanceRecord | null>(null);
  const [depositBusy, setDepositBusy] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const { events, connected } = useRemittanceStream(id);
  const anchorFlow = useAnchorFlow((s) => s.context);

  const refresh = async () => {
    try {
      setRemittance((await endpoints.remittance(id)) as unknown as RemittanceRecord);
    } catch {
      setRemittance(null);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const terminal = remittance ? ['RELEASED', 'REFUNDED', 'EXPIRED'].includes(remittance.status) : false;

  /**
   * Deposit via the chosen anchor: AUTO preference on the backend tries
   * SEP-24 (interactive WebView) first and falls back to SEP-6 (programmatic
   * instructions) when SEP-24 is genuinely unavailable.
   */
  const depositViaAnchor = async () => {
    if (!anchorFlow) {
      setDepositError('No anchor context — start a remittance from the corridor flow.');
      return;
    }
    setDepositBusy(true);
    setDepositError(null);
    try {
      const result = await initiateAnchorDeposit({
        anchorId: anchorFlow.anchorId,
        anchorWebAuthEndpoint: anchorFlow.anchorWebAuthEndpoint,
        assetCode: anchorFlow.assetCode,
        amount: anchorFlow.amount,
        account: anchorFlow.account,
        custody: anchorFlow.custody,
        countryCode: anchorFlow.countryCode,
        remittanceId: id,
      });
      if (result.protocol === 'sep24') {
        navigation.navigate('Sep24WebView', {
          url: result.url,
          sepTransactionId: result.id,
          remittanceId: id,
          expectedResult: 'deposit',
        });
      } else {
        navigation.navigate('Sep6Instructions', {
          sepTransactionId: result.id,
          remittanceId: id,
          instructions: result.instructions,
        });
      }
    } catch (e) {
      setDepositError((e as Error).message);
    } finally {
      setDepositBusy(false);
    }
  };

  return (
    <Screen>
      <Title>Remittance</Title>
      <Subtitle>
        {remittance?.corridor ?? ''} · {remittance ? remittance.id.slice(0, 8) : id.slice(0, 8)}
      </Subtitle>

      {!remittance && <Text style={{ color: colors.muted }}>Loading…</Text>}

      {remittance && (
        <>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: colors.muted }}>Status</Text>
              <StatusBadge
                text={`${remittance.status} · ${connected ? 'live' : 'offline'}`}
                tone={terminal ? (remittance.status === 'RELEASED' ? 'success' : 'danger') : 'active'}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: colors.muted }}>Sending</Text>
              <Text style={{ color: colors.text }}>{formatAmount(remittance.source_amount)} {remittance.source_asset.split(':')[0]}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: colors.muted }}>Receiving</Text>
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                {formatAmount(remittance.expected_destination_amount)} {remittance.destination_asset.split(':')[0]}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.muted }}>On-chain</Text>
              <Text style={{ color: colors.text }}>
                {remittance.contract_remittance_id ? `#${remittance.contract_remittance_id}` : 'pending'}
              </Text>
            </View>
          </Card>

          <Card>
            <Text style={{ color: colors.muted, marginBottom: spacing.md }}>Live progress</Text>
            <StatusTimeline status={remittance.status} lifecycle={remittance.lifecycle} />
          </Card>

          {!terminal && (
            <>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <Button
                  label="Fund escrow"
                  onPress={async () => {
                    await endpoints.fund(id);
                    void refresh();
                  }}
                  style={{ flex: 1 }}
                />
                <Button label="Refresh" variant="secondary" onPress={() => void refresh()} style={{ flex: 1 }} />
              </View>
              {anchorFlow && (
                <Button
                  label="Deposit via anchor (SEP-24 / SEP-6)"
                  onPress={() => void depositViaAnchor()}
                  loading={depositBusy}
                  style={{ marginTop: spacing.sm }}
                />
              )}
              {depositError && (
                <Text style={{ color: colors.danger.text, fontSize: 12, marginTop: spacing.sm }}>{depositError}</Text>
              )}
            </>
          )}

          <Text style={{ color: colors.muted, fontSize: 12, marginTop: spacing.sm }}>
            Events observed: {events.length} · expiry {remittance.expiry ? new Date(remittance.expiry).toLocaleString() : '—'}
          </Text>
        </>
      )}
    </Screen>
  );
}