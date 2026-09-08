import Constants from 'expo-constants';

/**
 * Runtime configuration. Secrets never belong here — this is public
 * configuration shipped with the binary. API base URLs are configurable so
 * the same build can point at a staging backend.
 */
export const env = {
  // Backend base URL. Override via app.json `extra.apiBaseUrl` or at runtime
  // from Settings.
  apiBaseUrl:
    (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ??
    'https://api.remittance.example.com',
  networkPassphrase: 'Test SDF Network ; September 2015',
  network: 'testnet',
  appName: 'remittance-app',
  appVersion: '1.0.0',
  homeDomain: 'remittance.example.com',
} as const;

export type Env = typeof env;

/** Assets the app knows about (issuers are testnet well-known values). */
export const SUPPORTED_ASSETS = [
  { code: 'USDC', issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', label: 'USDC' },
  { code: 'XLM', issuer: undefined, label: 'XLM (native)' },
  { code: 'NGN', issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', label: 'NGN' },
] as const;

export const CORRIDORS = [
  { id: 'US/NG', source: 'US', destination: 'NG', label: 'United States → Nigeria' },
  { id: 'UK/NG', source: 'UK', destination: 'NG', label: 'United Kingdom → Nigeria' },
  { id: 'US/PH', source: 'US', destination: 'PH', label: 'United States → Philippines' },
  { id: 'US/MX', source: 'US', destination: 'MX', label: 'United States → Mexico' },
] as const;