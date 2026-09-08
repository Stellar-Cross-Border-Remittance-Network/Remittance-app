import { Horizon } from '@stellar/stellar-sdk';

import { fetchAccountSummary, formatBalance } from '../src/services/balances';

function fakeAccount(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    accountId: () => 'GAAA',
    sequence: '12345',
    balances: [
      { asset_type: 'native', balance: '10.5' },
      { asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: 'GISSUER', balance: '50.25', limit: '100' },
      { asset_type: 'credit_alphanum12', asset_code: 'LONGCODE', asset_issuer: 'GISS2', balance: '3' },
      { asset_type: 'liquidity_pool_shares' },
    ],
    ...overrides,
  };
}

describe('fetchAccountSummary', () => {
  it('maps a Horizon account to a summary with normalized balances', async () => {
    jest.spyOn(Horizon.Server.prototype, 'loadAccount').mockResolvedValue(fakeAccount() as never);
    const summary = await fetchAccountSummary('GAAA');
    expect(summary.address).toBe('GAAA');
    expect(summary.sequence).toBe('12345');
    expect(summary.balances).toEqual([
      { asset: 'XLM', balance: '10.5' },
      { asset: 'USDC:GISSUER', balance: '50.25', limit: '100' },
      { asset: 'LONGCODE:GISS2', balance: '3', limit: undefined },
    ]);
    expect(summary.hasNativeFunds).toBe(true);
  });

  it('reports hasNativeFunds false when XLM is below the 1 XLM reserve', async () => {
    jest.spyOn(Horizon.Server.prototype, 'loadAccount').mockResolvedValue(
      fakeAccount({ balances: [{ asset_type: 'native', balance: '0.5' }] }) as never,
    );
    const summary = await fetchAccountSummary('GAAA');
    expect(summary.hasNativeFunds).toBe(false);
  });
});

describe('formatBalance', () => {
  it('formats XLM with 4 decimals', () => {
    expect(formatBalance('1234.56789', 'XLM')).toBe('1,234.5679');
  });

  it('formats other assets with 2 decimals', () => {
    expect(formatBalance('50.255', 'USDC')).toBe('50.26');
  });

  it('renders an em dash for non-finite values', () => {
    expect(formatBalance('abc', 'XLM')).toBe('—');
  });
});