import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Card } from '../components/ui';
import { colors, spacing } from '../theme/theme';
import { signOut } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { getSecure, SecureKeys, setSecure } from '../lib/secureStore';

export function SecurityScreen() {
  const { session } = useAuthStore();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  // Biometric gating for signing is a device-level setting (SecureStore flag).
  // The native sign flow checks it before touching any secret.
  const toggleBiometric = useCallback(async (value: boolean) => {
    setBiometricEnabled(value);
    try {
      await setSecure(SecureKeys.biometricEnabled, value ? '1' : '0');
    } catch {
      setBiometricEnabled(!value);
      Alert.alert('Biometrics', 'Could not update biometric settings.');
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
    }
  }, []);

  const custody = session?.custody === 'custodial' ? 'Custodial' : 'Non-custodial';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Security</Text>
      <Card>
        <Text style={styles.label}>Custody model</Text>
        <Text style={styles.body}>{custody}</Text>
        <Text style={styles.caption}>
          {custody === 'Custodial'
            ? 'Your signing key is held by the backend and used to sign Stellar transactions on your behalf.'
            : 'Your signing key lives only on this device in secure storage. You approve and sign every transaction.'}
        </Text>
      </Card>
      <Card>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.label}>Biometric unlock</Text>
            <Text style={styles.caption}>Require Face ID / fingerprint before signing transactions.</Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={(v) => void toggleBiometric(v)}
            trackColor={{ true: colors.primary.bg }}
          />
        </View>
      </Card>
      <Card>
        <Text style={styles.label}>About key storage</Text>
        <Text style={styles.caption}>
          Private keys are stored in the platform keychain / Keystore (expo-secure-store) and never in
          AsyncStorage, logs, or request payloads. Signed transactions are built fresh at signing time
          using the current account sequence number.
        </Text>
      </Card>
      <Button label="Sign out" variant="danger" onPress={() => void handleSignOut()} disabled={busy || !session} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  label: { fontSize: 13, color: colors.muted, marginBottom: spacing.xs },
  body: { fontSize: 15, color: colors.text, lineHeight: 21, marginBottom: spacing.sm },
  caption: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1, paddingRight: 12 },
});