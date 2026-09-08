import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Text } from 'react-native';

import { Button, Card, Screen, Subtitle, Title } from '../components/ui';
import { CORRIDORS } from '../config/env';
import { colors } from '../theme/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CorridorSelection'>;

export function CorridorScreen({ navigation }: Props) {
  return (
    <Screen>
      <Title>Choose corridor</Title>
      <Subtitle>Where is the money coming from, and where is it going?</Subtitle>
      {CORRIDORS.map((corridor) => (
        <Card key={corridor.id}>
          <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 4 }}>{corridor.label}</Text>
          <Text style={{ color: colors.muted, marginBottom: 12 }}>{corridor.id}</Text>
          <Button
            label="Continue"
            onPress={() =>
              navigation.navigate('Quote', {
                corridor: corridor.id,
                sourceAsset: 'USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
                destinationAsset: 'NGN:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
              })
            }
          />
        </Card>
      ))}
    </Screen>
  );
}