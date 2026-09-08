import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Text, View } from 'react-native';

import { Button, Screen, Title } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export function OnboardingScreen({ navigation }: Props) {
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Title>Remittance</Title>
        <Text style={{ color: '#8A93B0', marginBottom: 24 }}>
          Send money across borders on Stellar. Quotes are honest, escrow is on-chain, and
          settlement is verified end to end.
        </Text>
        <Button label="I have an account — sign in" onPress={() => navigation.navigate('Auth', { custody: 'non_custodial' })} style={{ marginBottom: 12 }} />
        <Button
          label="Create a new wallet"
          variant="secondary"
          onPress={() => navigation.navigate('Auth', { custody: 'non_custodial' })}
        />
      </View>
      <Text style={{ textAlign: 'center', color: '#8A93B0', fontSize: 12 }}>
        Runs against Stellar Testnet
      </Text>
    </Screen>
  );
}