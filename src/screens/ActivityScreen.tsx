import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { FlatList, Text } from 'react-native';

import { Card, Screen, StatusBadge, Title } from '../components/ui';
import { api } from '../lib/api';
import { formatAmount } from '../lib/stroops';
import { colors } from '../theme/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Activity'>;

interface ActivityRow {
  id: string;
  status: string;
  lifecycle: string;
  source_amount: string;
  source_asset: string;
  destination_asset: string;
  corridor: string;
  created_at: string;
}

export function ActivityScreen({ navigation }: Props) {
  const { data } = useQuery({
    queryKey: ['activity'],
    queryFn: () => api<ActivityRow[]>('/v1/internal/remittances', { auth: true }),
  });

  return (
    <Screen>
      <Title>Activity</Title>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={{ color: colors.muted }}>No remittances yet.</Text>}
        renderItem={({ item }) => (
          <Card>
            <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 4 }}>
              {formatAmount(item.source_amount)} {item.source_asset.split(':')[0]} → {item.destination_asset.split(':')[0]}
            </Text>
            <Text style={{ color: colors.muted, marginBottom: 8 }}>
              {item.corridor} · {new Date(item.created_at).toLocaleString()}
            </Text>
            <StatusBadge text={item.status} tone={item.status === 'RELEASED' ? 'success' : item.status === 'CREATED' ? 'neutral' : 'active'} />
          </Card>
        )}
      />
    </Screen>
  );
}