import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button, Field, Screen, Subtitle, Title } from '../components/ui';
import { isValidAmount } from '../lib/stroops';
import { isValidPublicKey } from '../lib/stellar';
import { useSendDraft } from '../store/sendDraftStore';
import { colors, spacing } from '../theme/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Send'>;

/**
 * Simple send: choose destination asset, get a REAL Stellar path from the
 * backend (never fabricated), review, sign and submit.
 */
export function SendScreen({ navigation }: Props) {
  const [amount, setAmount] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [destAsset, setDestAsset] = useState('XLM');
  const valid = isValidAmount(amount) && isValidPublicKey(destAddress.trim());

  return (
    <Screen>
      <Title>Send</Title>
      <Subtitle>PathPaymentStrictSend — paths come from Horizon, not guesses.</Subtitle>

      <Field label="Amount">
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.muted}
          style={inputStyle}
        />
      </Field>

      <Field label="Destination account">
        <TextInput
          value={destAddress}
          onChangeText={setDestAddress}
          autoCapitalize="none"
          placeholder="G…"
          placeholderTextColor={colors.muted}
          style={inputStyle}
        />
      </Field>

      <Field label="Destination asset">
        {['XLM', 'USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NOZ4X6K4ZD7Y6ZB'].map((asset) => (
          <Button
            key={asset}
            label={asset.split(':')[0]}
            variant={destAsset === asset ? 'primary' : 'secondary'}
            onPress={() => setDestAsset(asset)}
            style={{ marginBottom: spacing.xs }}
          />
        ))}
      </Field>

      <View style={{ marginTop: spacing.md }} />
      <Button
        label="Find path"
        disabled={!valid}
        onPress={() => {
          useSendDraft.getState().set({ amount, destAddress: destAddress.trim(), destAsset });
          navigation.navigate('PathPayment');
        }}
      />
      <Text style={{ color: colors.muted, marginTop: spacing.sm, fontSize: 12 }}>
        You will review the real path and expected destination amount before signing.
      </Text>
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