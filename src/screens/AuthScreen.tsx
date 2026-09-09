import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button, Card, Field, Screen, Subtitle, Title } from '../components/ui';
import { authenticate, createCustodialAccount } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { colors, spacing } from '../theme/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

/**
 * SEP-10 authentication. Non-custodial accounts are device-generated;
 * custodial accounts use a backend-issued secret. The two models are shown
 * explicitly and never conflated.
 */
export function AuthScreen({ navigation }: Props) {
  const [custody, setCustody] = useState<'non_custodial' | 'custodial'>('non_custodial');
  const [custodialSecret, setCustodialSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSession = useAuthStore((s) => s.setSession);

  /** Issue a custodial account server-side, store its secret, then sign in. */
  const onCreateCustodial = async () => {
    setBusy(true);
    setError(null);
    try {
      const { secret } = await createCustodialAccount();
      setCustodialSecret(secret);
      await signIn(secret);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const signIn = async (secretOverride?: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = await authenticate(
        custody,
        custody === 'custodial' ? { secret: secretOverride ?? custodialSecret } : {},
      );
      await setSession({ token: '', account: result.account, custody: result.custody });
      // Session token is stored by the service; reload it into the store.
      const { getSecure, SecureKeys } = await import('../lib/secureStore');
      const token = await getSecure(SecureKeys.sessionToken);
      if (token) {
        await setSession({ token, account: result.account, custody: result.custody });
      }
      navigation.reset({ index: 0, routes: [{ name: 'Wallet' }] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Title>Sign in</Title>
      <Subtitle>Choose how your account keys are held.</Subtitle>

      <Card>
        <Text style={{ color: colors.muted, marginBottom: spacing.md }}>
          Non-custodial — the private key is generated on this device and never leaves it. Sign
          with your wallet (Freighter-compatible) when prompted.
        </Text>
        <Text style={{ color: colors.muted, marginBottom: spacing.md }}>
          Custodial — the backend holds your account key and signs on your behalf. Only for
          accounts you trust the service with.
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button
            label="Non-custodial"
            variant={custody === 'non_custodial' ? 'primary' : 'secondary'}
            onPress={() => setCustody('non_custodial')}
            style={{ flex: 1 }}
          />
          <Button
            label="Custodial"
            variant={custody === 'custodial' ? 'primary' : 'secondary'}
            onPress={() => setCustody('custodial')}
            style={{ flex: 1 }}
          />
        </View>
      </Card>

      {custody === 'custodial' && (
        <>
          <Field label="Backend-issued account secret">
            <TextInput
              value={custodialSecret}
              onChangeText={setCustodialSecret}
              secureTextEntry
              autoCapitalize="none"
              placeholder="S…"
              placeholderTextColor={colors.muted}
              style={inputStyle}
            />
          </Field>
          <Button
            label="Create a custodial account"
            variant="secondary"
            onPress={() => void onCreateCustodial()}
            loading={busy}
            style={{ marginBottom: spacing.md }}
          />
        </>
      )}

      {error && <Text style={{ color: colors.danger.text, marginBottom: spacing.md }}>{error}</Text>}

      <Button
        label={custody === 'non_custodial' ? 'Sign in with device wallet' : 'Sign in (custodial)'}
        onPress={() => void signIn()}
        loading={busy}
        disabled={custody === 'custodial' && !custodialSecret}
      />
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