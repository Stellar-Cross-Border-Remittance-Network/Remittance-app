import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button, Card, Field, Screen, Subtitle, Title } from '../components/ui';
import { endpoints } from '../lib/api';
import { isValidPublicKey } from '../lib/stellar';
import { enqueueIntent } from '../queue/offlineQueue';
import { useAuthStore } from '../store/authStore';
import { useAnchorFlow } from '../store/anchorFlowStore';
import { colors, spacing } from '../theme/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateRemittance'>;

interface CreateResult {
  id: string;
  status: string;
  approval_required?: boolean;
  approval?: { method: string; transactionXdr: string };
}

/**
 * Creates the on-chain escrow commitment via the backend. Non-custodial
 * accounts receive a prepared transaction to sign in-app; the intent is also
 * persisted to the offline queue so a connectivity loss mid-flow never loses
 * the user's money or intent.
 */
export function CreateRemittanceScreen({ navigation, route }: Props) {
  const { quoteId, sourceAmount, anchorId, recipientAddress } = route.params;
  const session = useAuthStore((s) => s.session);
  const [recipientStellar, setRecipientStellar] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);

  const create = async () => {
    if (!session) {
      setError('Not authenticated');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = (await endpoints.createRemittance({
        quote_id: quoteId,
        sender_account_id: '', // backend resolves from the session account
        recipient_address: recipientAddress,
        recipient_stellar_account: recipientStellar.trim(),
        anchor_id: anchorId,
      })) as unknown as CreateResult;
      setResult(res);
      // Remember the anchor so the detail screen can offer the deposit
      // action (SEP-24 first, SEP-6 fallback) with the right context.
      const previous = useAnchorFlow.getState().context;
      useAnchorFlow.getState().setContext({
        anchorId,
        anchorWebAuthEndpoint: previous?.anchorWebAuthEndpoint ?? null,
        assetCode: 'USDC',
        amount: sourceAmount,
        account: session.account,
        custody: session.custody,
      });

      await enqueueIntent({
        id: `intent-${Date.now()}`,
        kind: 'remittance_create',
        remittanceId: res.id,
        quoteId,
        sourceAccount: session.account,
        assetIn: 'USDC',
        amountIn: sourceAmount,
        createdAt: Date.now(),
        expiry: Date.now() + 30 * 60 * 1000,
        label: `Remittance ${res.id.slice(0, 8)}`,
      });

      navigation.replace('RemittanceDetail', { id: res.id });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Title>Create remittance</Title>
      <Subtitle>Escrow is locked on-chain before settlement starts.</Subtitle>

      <Card>
        <Text style={{ color: colors.muted }}>Recipient</Text>
        <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 12 }}>{recipientAddress}</Text>
        <Text style={{ color: colors.muted }}>Amount</Text>
        <Text style={{ color: colors.text, fontWeight: '600' }}>{sourceAmount}</Text>
      </Card>

      <Field label="Recipient Stellar account (receives the released escrow)">
        <TextInput
          value={recipientStellar}
          onChangeText={setRecipientStellar}
          autoCapitalize="none"
          placeholder="G…"
          placeholderTextColor={colors.muted}
          style={inputStyle}
        />
        {recipientStellar && !isValidPublicKey(recipientStellar.trim()) && (
          <Text style={{ color: colors.danger.text, marginTop: 4, fontSize: 12 }}>Invalid Stellar address</Text>
        )}
      </Field>

      {error && <Text style={{ color: colors.danger.text, marginBottom: spacing.md }}>{error}</Text>}

      <Button label="Lock escrow" onPress={() => void create()} loading={busy} disabled={!isValidPublicKey(recipientStellar.trim())} />

      {result?.approval_required && (
        <View style={{ marginTop: spacing.lg }}>
          <Text style={{ color: colors.muted, fontSize: 13, marginBottom: spacing.sm }}>
            Your approval is required — the prepared transaction is ready to sign in your wallet.
          </Text>
          <Button label="Sign in wallet" variant="secondary" onPress={() => navigation.replace('RemittanceDetail', { id: result.id })} />
        </View>
      )}
    </Screen>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 10,
  padding: 12,
  color: colors.text,
  backgroundColor: colors.card,
} as const;