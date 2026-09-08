import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button, Card, Field, Screen, Subtitle, Title } from '../components/ui';
import { endpoints } from '../lib/api';
import { formatAmount, isValidAmount } from '../lib/stroops';
import { colors, spacing } from '../theme/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Quote'>;

interface QuoteResponse {
  id: string;
  quoteHash: string;
  sourceAmount: string;
  destinationAmount: string;
  fees: { platform: string; corridor: string; anchor: string; total: string };
  rateSource: string;
  route: string;
  expiresAt: string;
}

export function QuoteScreen({ navigation, route }: Props) {
  const { corridor, sourceAsset, destinationAsset } = route.params;
  const [sourceCountry, destCountry] = corridor.split('/');
  const [amount, setAmount] = useState('100');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = async () => {
    if (!isValidAmount(amount)) {
      setError('Enter a valid amount');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await endpoints.quote({
        source_asset: sourceAsset,
        destination_asset: destinationAsset,
        source_amount: amount,
        source_country: sourceCountry,
        destination_country: destCountry,
      });
      setQuote(res as unknown as QuoteResponse);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void fetchQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen>
      <Title>Quote</Title>
      <Subtitle>{corridor}</Subtitle>

      <Field label="Amount to send">
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          style={inputStyle}
          placeholderTextColor={colors.muted}
        />
      </Field>
      <Button label="Get quote" onPress={() => void fetchQuote()} loading={busy} />

      {error && <Text style={{ color: colors.danger.text, marginTop: spacing.md }}>{error}</Text>}

      {quote && (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: colors.muted }}>You send</Text>
            <Text style={{ color: colors.text }}>{formatAmount(quote.sourceAmount)} {sourceAsset.split(':')[0]}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: colors.muted }}>They receive</Text>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{formatAmount(quote.destinationAmount)} {destinationAsset.split(':')[0]}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: colors.muted }}>Platform fee</Text>
            <Text style={{ color: colors.text }}>{formatAmount(quote.fees.platform)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: colors.muted }}>Route</Text>
            <Text style={{ color: colors.text }}>{quote.route}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.muted }}>Rate source</Text>
            <Text style={{ color: colors.text }}>{quote.rateSource}</Text>
          </View>
        </Card>
      )}

      {quote && (
        <Button
          label="Continue to anchor"
          onPress={() => navigation.navigate('AnchorSelection', { quoteId: quote.id, sourceAmount: quote.sourceAmount })}
        />
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