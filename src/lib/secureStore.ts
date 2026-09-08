import * as SecureStore from 'expo-secure-store';

/**
 * Secure storage boundary.
 *
 * - Private keys, session tokens and encryption material: SecureStore ONLY
 *   (hardware-backed keystore on iOS/Android). NEVER AsyncStorage.
 * - Non-sensitive cache (asset lists, fetched anchor catalogs): AsyncStorage
 *   (see cache.ts).
 *
 * Private keys are never logged anywhere in the app.
 */
const KEY_PREFIX = 'remittance.';

export async function setSecure(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_PREFIX + key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getSecure(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_PREFIX + key);
}

export async function deleteSecure(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_PREFIX + key);
}

/** Namespaced key names used across the app. */
export const SecureKeys = {
  /** Custodial account secret (server-signed flows) — encrypted by SecureStore. */
  custodialSecret: 'custodial.secret',
  /** Non-custodial secret (device-generated, never leaves the device). */
  localSecret: 'local.secret',
  /** Backend session JWT. */
  sessionToken: 'session.token',
  /** Persisted offline transaction intents (JSON array). */
  offlineIntents: 'offline.intents',
  /** Active Stellar account public key. */
  activeAccount: 'account.active',
  /** Selected custody model. */
  custodyModel: 'account.custody',
  /** Biometric-gated signing flag ('1' | '0'). */
  biometricEnabled: 'account.biometric',
} as const;