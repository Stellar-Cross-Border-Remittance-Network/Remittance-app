import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';
import { colors } from './src/theme/theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
});

function LoadingGate() {
  const hydrated = useAuthStore((s) => s.hydrated);
  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary.text} />
      </View>
    );
  }
  return <RootNavigator />;
}

export default function App() {
  const restore = useAuthStore((s) => s.restore);

  useEffect(() => {
    // Restore the session from secure storage. Live-status polling is wired
    // per-screen (useRemittanceStream) and offline intents drain from the
    // Offline Queue screen, so nothing else needs starting here.
    void restore();
  }, [restore]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <StatusBar style="light" />
          <LoadingGate />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}