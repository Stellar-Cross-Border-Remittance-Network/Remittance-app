import { Horizon } from '@stellar/stellar-sdk';

import { env } from '../config/env';

export interface Balance {
  asset: string;
  balance: string;
  limit?: string;
}

export interface AccountSummary {
  address: string;
  sequence: string;
  balances: Balance[];
  hasNativeFunds: boolean;
}

/**
 * Read-only account state from Horizon (testnet). The app never submits
 * transactions against Horizon directly except through the backend's prepared
 * envelopes; this is used for balance display and offline validation.
 */
export async function fetchAccountSummary(address: string): Promise<AccountSummary> {
  const server = new Horizon.Server('https://horizon-testnet.stellar.org');
  const acc = await server.loadAccount(address);
  return {
    address: acc.accountId(),
    sequence: acc.sequence,
    balances: acc.balances.flatMap((b) => {
      if (b.asset_type === 'native') {
        return [{ asset: 'XLM', balance: b.balance }];
      }
      if ('asset_code' in b && b.asset_code) {
        return [{ asset: `${b.asset_code}:${b.asset_issuer}`, balance: b.balance, limit: 'limit' in b ? b.limit : undefined }];
      }
      return [];
    }),
    hasNativeFunds: acc.balances.some((b) => b.asset_type === 'native' && Number(b.balance) > 1),
  };
}

export function formatBalance(balance: string, asset: string): string {
  const value = Number(balance);
  if (!Number.isFinite(value)) {
    return '—';
  }
  const decimals = asset === 'XLM' ? 4 : 2;
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

export { env };