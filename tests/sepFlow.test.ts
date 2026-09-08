import { routeDepositResult, initiateAnchorDeposit } from '../src/services/sepFlow';
import { endpoints } from '../src/lib/api';
import { authenticateWithAnchor } from '../src/services/anchorSep10';
import { setSecure, SecureKeys } from '../src/lib/secureStore';
import { Keypair } from '@stellar/stellar-sdk';

jest.mock('../src/lib/api', () => ({
  endpoints: {
    sep6Deposit: jest.fn(),
  },
}));

jest.mock('../src/services/anchorSep10', () => ({
  authenticateWithAnchor: jest.fn(),
}));

const mockSep6Deposit = endpoints.sep6Deposit as jest.MockedFunction<typeof endpoints.sep6Deposit>;
const mockAnchorAuth = authenticateWithAnchor as jest.MockedFunction<typeof authenticateWithAnchor>;

beforeEach(() => {
  mockSep6Deposit.mockReset();
  mockAnchorAuth.mockReset();
});

describe('SEP-6 fallback routing (AUTO)', () => {
  it('routes a SEP-24 interactive URL to the WebView flow', () => {
    const r = routeDepositResult({ protocol: 'sep24', url: 'https://testanchor.stellar.org/sep24/deposit' });
    expect(r).toEqual({ kind: 'sep24', url: 'https://testanchor.stellar.org/sep24/deposit' });
  });

  it('falls back to SEP-6 when SEP-24 is unavailable (no url)', () => {
    expect(routeDepositResult({ protocol: 'sep24', url: undefined })).toEqual({ kind: 'sep6' });
  });

  it('falls back to SEP-6 when the backend chose sep6', () => {
    expect(routeDepositResult({ protocol: 'sep6' })).toEqual({ kind: 'sep6' });
  });

  it('falls back to SEP-6 for unknown protocols instead of crashing', () => {
    expect(routeDepositResult({ protocol: 'weird' })).toEqual({ kind: 'sep6' });
  });

  it('never routes to a WebView without an https url', () => {
    const r = routeDepositResult({ protocol: 'sep24', url: 'javascript:alert(1)' });
    expect(r).toEqual({ kind: 'sep6' });
  });
});

describe('initiateAnchorDeposit', () => {
  const base = {
    anchorId: 'a1',
    assetCode: 'USDC',
    amount: '100',
    account: 'GAAA',
    custody: 'custodial' as const,
  };

  it('passes AUTO preference and returns the SEP-24 interactive flow', async () => {
    mockSep6Deposit.mockResolvedValue({
      id: 't1',
      protocol: 'sep24',
      url: 'https://anchor.example.com/interactive?token=x',
      status: 'pending',
    });
    const result = await initiateAnchorDeposit(base);
    expect(result).toEqual({
      protocol: 'sep24',
      id: 't1',
      url: 'https://anchor.example.com/interactive?token=x',
      status: 'pending',
    });
    expect(mockSep6Deposit).toHaveBeenCalledWith(
      expect.objectContaining({ anchor_id: 'a1', preference: 'AUTO' }),
    );
    expect(mockSep6Deposit.mock.calls[0]![0]).not.toHaveProperty('anchor_jwt');
    // Custodial accounts never call the anchor SEP-10 flow on-device.
    expect(mockAnchorAuth).not.toHaveBeenCalled();
  });

  it('returns SEP-6 instructions when the backend routes programmatic', async () => {
    mockSep6Deposit.mockResolvedValue({
      id: 't2',
      protocol: 'sep6',
      status: 'pending',
      instructions: { bank: 'Zenith', account_number: '12345' },
    });
    const result = (await initiateAnchorDeposit(base)) as Extract<Awaited<ReturnType<typeof initiateAnchorDeposit>>, { protocol: 'sep6' }>;
    expect(result.protocol).toBe('sep6');
    expect(result.instructions).toEqual({ bank: 'Zenith', account_number: '12345' });
  });

  it('authenticates with the anchor on-device for non-custodial accounts', async () => {
    mockAnchorAuth.mockResolvedValue('anchor-jwt');
    mockSep6Deposit.mockResolvedValue({ id: 't3', protocol: 'sep24', url: 'https://a.example.com/i', status: 'pending' });
    await initiateAnchorDeposit({
      ...base,
      custody: 'non_custodial',
      anchorWebAuthEndpoint: 'https://anchor.example.com/auth',
    });
    expect(mockAnchorAuth).toHaveBeenCalledWith('https://anchor.example.com/auth', 'GAAA');
    expect(mockSep6Deposit).toHaveBeenCalledWith(expect.objectContaining({ anchor_jwt: 'anchor-jwt' }));
  });

  it('does not authenticate on-device when the anchor has no web auth endpoint', async () => {
    mockSep6Deposit.mockResolvedValue({ id: 't4', protocol: 'sep6', status: 'pending', instructions: {} });
    await initiateAnchorDeposit({ ...base, custody: 'non_custodial', anchorWebAuthEndpoint: null });
    expect(mockAnchorAuth).not.toHaveBeenCalled();
  });
});