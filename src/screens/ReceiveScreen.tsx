import React from 'react';
import { Text, View } from 'react-native';

import { Card, Screen, Title } from '../components/ui';
import { shortKey } from '../lib/stellar';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/theme';

/** Receive: display the account address (QR-ready) and asset instructions. */
export function ReceiveScreen() {
  const session = useAuthStore((s) => s.session);
  return (
    <Screen>
      <Title>Receive</Title>
      <Card>
        <Text style={{ color: colors.muted, marginBottom: 8 }}>Your Stellar account</Text>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          {session ? shortKey(session.account, 12, 8) : ''}
        </Text>
        <Text style={{ color: colors.text, fontSize: 12 }} selectable>
          {session?.account ?? ''}
        </Text>
      </Card>
      <Card>
        <Text style={{ color: colors.muted, marginBottom: 8 }}>Supported testnet assets</Text>
        <Text style={{ color: colors.text }}>
          XLM (native) · USDC · NGN — send from any wallet that supports the same network.
        </Text>
        <View style={{ marginTop: 12 }} />
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Receiving USDC? Make sure the trustline is open for the issuer shown in Settings.
        </Text>
      </Card>
    </Screen>
  );
}