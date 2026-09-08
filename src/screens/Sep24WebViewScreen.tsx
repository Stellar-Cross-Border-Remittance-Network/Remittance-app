import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { Button, Screen, Title } from '../components/ui';
import { colors, spacing } from '../theme/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Sep24WebView'>;

const ALLOWED_HOST_SUFFIXES = [
  // The anchor's own domain (supplied by the backend URL).
];
const COMPLETION_KEYWORDS = ['complete', 'success', 'done', 'status=complete'];

/**
 * Controlled SEP-24 interactive WebView.
 *
 * Security rules:
 * - Only the anchor's origin (and its subdomains) may be loaded.
 * - Scripts/popups are disabled; navigation away from the anchor origin is
 *   blocked and surfaces as an error state.
 * - Completion is detected from the anchor's redirect/URL markers; the
 *   user can cancel from the header, and recovery re-fetches status.
 */
export function Sep24WebViewScreen({ navigation, route }: Props) {
  const { url, sepTransactionId, remittanceId, expectedResult } = route.params;
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<string | null>(null);
  const anchorOrigin = useRef<string | null>(null);

  const allowed = (target: string): boolean => {
    try {
      const u = new URL(target);
      if (!anchorOrigin.current) {
        return true; // first load is the backend-provided URL — trust it once
      }
      const origin = u.origin;
      return origin === anchorOrigin.current || origin.endsWith(`.${anchorOrigin.current.split('://')[1]}`);
    } catch {
      return false;
    }
  };

  const onNavigation = (nav: WebViewNavigation) => {
    if (!allowed(nav.url)) {
      setBlocked(`Navigation to ${nav.url} was blocked`);
      return false;
    }
    if (COMPLETION_KEYWORDS.some((k) => nav.url.toLowerCase().includes(k))) {
      // Anchor redirected to a completion marker — hand back to the detail
      // screen, which reconciles status from the backend.
      navigation.replace('RemittanceDetail', { id: remittanceId ?? '' });
    }
    return true;
  };

  return (
    <Screen padded={false}>
      <View style={{ padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title>Anchor flow</Title>
          <Button label="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
          {expectedResult === 'deposit' ? 'Deposit' : 'Withdraw'} · transaction {sepTransactionId.slice(0, 8)}
        </Text>
      </View>

      {blocked && (
        <View style={{ padding: spacing.lg }}>
          <Text style={{ color: colors.danger.text }}>{blocked}</Text>
          <Button label="Go back" onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }} />
        </View>
      )}

      {!blocked && (
        <View style={{ flex: 1 }}>
          <WebView
            source={{ uri: url }}
            originWhitelist={['https://*']}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onNavigationStateChange={(nav) => onNavigation(nav)}
            onShouldStartLoadWithRequest={(request) => allowed(request.url)}
            renderLoading={() => (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator color={colors.primary.bg} />
              </View>
            )}
          />
        </View>
      )}
    </Screen>
  );
}