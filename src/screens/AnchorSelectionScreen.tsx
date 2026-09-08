import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Text, TextInput } from 'react-native';

import { Button, Card, Field, Screen, Subtitle, Title } from '../components/ui';
import { cacheGet, cacheSet, CacheKeys } from '../lib/cache';
import { endpoints } from '../lib/api';
import { useAnchorFlow } from '../store/anchorFlowStore';
import { useAuthStore } from '../store/authStore';
import { colors, spacing } from '../theme/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AnchorSelection'>;

export interface AnchorRow {
  id: string;
  home_domain: string;
  web_auth_endpoint: string | null;
  transfer_server_sep24: string | null;
  transfer_server_sep6: string | null;
  sep24_enabled: boolean;
  sep6_enabled: boolean;
  deposit_enabled: boolean;
  withdraw_enabled: boolean;
  kyc_required: boolean;
  assets: Array<{ code: string; withdraw_enabled: boolean }>;
}

export function AnchorSelectionScreen({ navigation, route }: Props) {
  const { quoteId = '', sourceAmount = '' } = route.params ?? {};
  const [recipient, setRecipient] = useState('');
  const session = useAuthStore((s) => s.session);

  const { data: anchors, isLoading } = useQuery({
    queryKey: ['anchors'],
    queryFn: async () => {
      const cached = await cacheGet<AnchorRow[]>(CacheKeys.anchors);
      try {
        const fresh = (await endpoints.anchors()) as unknown as AnchorRow[];
        await cacheSet(CacheKeys.anchors, fresh);
        return fresh;
      } catch {
        return cached ?? [];
      }
    },
  });

  return (
    <Screen>
      <Title>Choose an anchor</Title>
      <Subtitle>Anchors are discovered live from their stellar.toml — never hard-coded.</Subtitle>

      <Field label="Recipient (phone / bank / wallet id)">
        <TextInput
          value={recipient}
          onChangeText={setRecipient}
          placeholder="+234 800 000 0000"
          placeholderTextColor={colors.muted}
          style={inputStyle}
        />
      </Field>

      {isLoading && <Text style={{ color: colors.muted }}>Loading anchors…</Text>}
      {anchors?.map((a) => (
        <Card key={a.id}>
          <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 4 }}>{a.home_domain}</Text>
          <Text style={{ color: colors.muted, marginBottom: 8 }}>
            SEP-24: {a.sep24_enabled ? '✓' : '✗'} · SEP-6: {a.sep6_enabled ? '✓' : '✗'} · KYC:{' '}
            {a.kyc_required ? 'required' : 'not required'}
          </Text>
          <Button
            label="Use this anchor"
            disabled={!recipient.trim()}
            onPress={() => {
              // Remember the anchor's SEP-10 endpoint so the deposit step can
              // authenticate non-custodial accounts on-device.
              if (session) {
                useAnchorFlow.getState().setContext({
                  anchorId: a.id,
                  anchorWebAuthEndpoint: a.web_auth_endpoint,
                  assetCode: 'USDC',
                  account: session.account,
                  custody: session.custody,
                });
              }
              navigation.navigate('CreateRemittance', {
                quoteId,
                sourceAmount,
                anchorId: a.id,
                recipientAddress: recipient.trim(),
              });
            }}
          />
        </Card>
      ))}
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