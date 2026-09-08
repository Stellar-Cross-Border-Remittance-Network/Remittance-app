import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { colors } from '../theme/theme';
import type { RootStackParamList } from './types';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { SendScreen } from '../screens/SendScreen';
import { ReceiveScreen } from '../screens/ReceiveScreen';
import { CorridorScreen } from '../screens/CorridorScreen';
import { QuoteScreen } from '../screens/QuoteScreen';
import { AnchorSelectionScreen } from '../screens/AnchorSelectionScreen';
import { CreateRemittanceScreen } from '../screens/CreateRemittanceScreen';
import { Sep24WebViewScreen } from '../screens/Sep24WebViewScreen';
import { Sep6InstructionsScreen } from '../screens/Sep6InstructionsScreen';
import { RemittanceDetailScreen } from '../screens/RemittanceDetailScreen';
import { PathPaymentScreen } from '../screens/PathPaymentScreen';
import { ActivityScreen } from '../screens/ActivityScreen';
import { OfflineQueueScreen } from '../screens/OfflineQueueScreen';
import { SecurityScreen } from '../screens/SecurityScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Auth" component={AuthScreen} options={{ title: 'Sign in' }} />
      <Stack.Screen name="Wallet" component={WalletScreen} options={{ title: 'Wallet' }} />
      <Stack.Screen name="Send" component={SendScreen} options={{ title: 'Send' }} />
      <Stack.Screen name="Receive" component={ReceiveScreen} options={{ title: 'Receive' }} />
      <Stack.Screen name="CorridorSelection" component={CorridorScreen} options={{ title: 'Corridor' }} />
      <Stack.Screen name="Quote" component={QuoteScreen} options={{ title: 'Quote' }} />
      <Stack.Screen name="AnchorSelection" component={AnchorSelectionScreen} options={{ title: 'Anchor' }} />
      <Stack.Screen name="CreateRemittance" component={CreateRemittanceScreen} options={{ title: 'Confirm & send' }} />
      <Stack.Screen
        name="Sep24WebView"
        component={Sep24WebViewScreen}
        options={{ title: 'Anchor flow', headerShown: false }}
      />
      <Stack.Screen name="Sep6Instructions" component={Sep6InstructionsScreen} options={{ title: 'Transfer instructions' }} />
      <Stack.Screen name="RemittanceDetail" component={RemittanceDetailScreen} options={{ title: 'Remittance' }} />
      <Stack.Screen name="PathPayment" component={PathPaymentScreen} options={{ title: 'Path payment' }} />
      <Stack.Screen name="Activity" component={ActivityScreen} options={{ title: 'Activity' }} />
      <Stack.Screen name="OfflineQueue" component={OfflineQueueScreen} options={{ title: 'Offline queue' }} />
      <Stack.Screen name="Security" component={SecurityScreen} options={{ title: 'Security' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Stack.Navigator>
  );
}