import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { env } from '../config/env';
import { colors, spacing } from '../theme/theme';
import { shortKey } from '../lib/stellar';

export function SettingsScreen() {
  const { session } = useAuthStore();
  const network = env.network === 'testnet' ? 'Stellar Testnet' : 'Stellar Mainnet';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>
      <Card>
        <Text style={styles.label}>Network</Text>
        <Text style={styles.body}>{network}</Text>
      </Card>
      <Card>
        <Text style={styles.label}>Account</Text>
        <Text style={styles.body} selectable>
          {session ? shortKey(session.account, 12, 10) : 'Not connected'}
        </Text>
        {session && <Text style={styles.caption}>{session.account}</Text>}
      </Card>
      <Card>
        <Text style={styles.label}>Session</Text>
        <Text style={styles.caption}>
          {session ? `Authenticated (${session.custody})` : 'No active session'}
        </Text>
      </Card>
      <Card>
        <Text style={styles.label}>Backend</Text>
        <Text style={styles.caption}>{env.apiBaseUrl}</Text>
      </Card>
      <View style={styles.versionRow}>
        <Text style={styles.caption}>{env.appName}</Text>
        <Text style={styles.caption}>v{env.appVersion}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  label: { fontSize: 13, color: colors.muted, marginBottom: spacing.xs },
  body: { fontSize: 15, color: colors.text, lineHeight: 21 },
  caption: { fontSize: 13, color: colors.muted, lineHeight: 18, marginTop: 4 },
  versionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xs, marginTop: spacing.md },
});