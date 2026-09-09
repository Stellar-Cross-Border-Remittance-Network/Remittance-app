import { Account, BASE_FEE, Keypair, Operation, TransactionBuilder } from '@stellar/stellar-sdk';

import { authenticate, createCustodialAccount, signOut } from '../src/services/authService';
import { api } from '../src/lib/api';
import { deleteSecure, getSecure, SecureKeys, setSecure } from '../src/lib/secureStore';

jest.mock('../src/lib/api', () => ({
  api: jest.fn(),
}));

const mockApi = api as jest.MockedFunction<typeof api>;

const PASSPHRASE = 'Test SDF Network ; September 2015';

/** A real (unsigned) challenge transaction the signer can parse and sign. */
function challengeXdrFor(account: string): { xdr: string; passphrase: string } {
  const source = new Account(account, '0');
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(Operation.setOptions({ source: account }))
    .setTimeout(300)
    .build();
  return { xdr: tx.toXDR(), passphrase: PASSPHRASE };
}

beforeEach(async () => {
  mockApi.mockReset();
  mockApi.mockImplementation(async () => ({}));
  await Promise.all(
    [SecureKeys.sessionToken, SecureKeys.localSecret, SecureKeys.custodialSecret, SecureKeys.activeAccount].map((k) =>
      deleteSecure(k),
    ),
  );
});

describe('authenticate (non-custodial)', () => {
  it('generates a device keypair, signs the challenge and stores the token', async () => {
    const challenge = challengeXdrFor(Keypair.random().publicKey());
    mockApi
      .mockResolvedValueOnce({ transaction: challenge.xdr, network_passphrase: challenge.passphrase })
      .mockResolvedValueOnce({ token: 'jwt', account: 'GAAA', custody: 'non_custodial' });

    const result = await authenticate('non_custodial');
    expect(result.custody).toBe('non_custodial');
    expect(result.account).toMatch(/^G[A-Z0-9]{55}$/);
    expect(mockApi).toHaveBeenCalledTimes(3);
    expect(await getSecure(SecureKeys.sessionToken)).toBe('jwt');
    const deviceSecret = await getSecure(SecureKeys.localSecret);
    expect(deviceSecret).toBeTruthy();
    expect(Keypair.fromSecret(deviceSecret!).publicKey()).toBe(result.account);
    // The second api call must carry the signed challenge and non-custodial flag.
    const verifyPayload = mockApi.mock.calls[1]![1] as { body: { custody: string } };
    expect(verifyPayload.body.custody).toBe('non_custodial');
    // The third call registers the device key with the backend (idempotent).
    const registerCall = mockApi.mock.calls[2]!;
    expect(registerCall[0]).toBe('/v1/accounts');
    expect((registerCall[1] as { body: { custody: string; public_key: string } }).body.custody).toBe('non_custodial');
  });

  it('reuses an existing device secret', async () => {
    const kp = Keypair.random();
    await setSecure(SecureKeys.localSecret, kp.secret());
    const challenge = challengeXdrFor(kp.publicKey());
    mockApi
      .mockResolvedValueOnce({ transaction: challenge.xdr, network_passphrase: challenge.passphrase })
      .mockResolvedValueOnce({ token: 'jwt', account: kp.publicKey(), custody: 'non_custodial' });

    const result = await authenticate('non_custodial');
    expect(result.account).toBe(kp.publicKey());
    expect(await getSecure(SecureKeys.localSecret)).toBe(kp.secret());
  });

  it('throws on an invalid device secret', async () => {
    await setSecure(SecureKeys.localSecret, 'not-a-secret');
    // The invalid secret must be caught by validation, not crash later.
    await expect(authenticate('non_custodial', { account: Keypair.random().publicKey() })).rejects.toThrow(
      'Invalid device secret',
    );
  });
});

describe('authenticate (custodial)', () => {
  it('requires a backend-issued secret', async () => {
    await expect(authenticate('custodial')).rejects.toThrow('Custodial sign-in requires a backend-issued account secret');
  });

  it('verifies via the backend and stores the session token', async () => {
    const kp = Keypair.random();
    await setSecure(SecureKeys.custodialSecret, kp.secret());
    const challenge = challengeXdrFor(kp.publicKey());
    mockApi
      .mockResolvedValueOnce({ transaction: challenge.xdr, network_passphrase: challenge.passphrase })
      .mockResolvedValueOnce({ token: 'jwt-c', account: kp.publicKey(), custody: 'custodial' });

    const result = await authenticate('custodial');
    expect(result.account).toBe(kp.publicKey());
    expect(result.custody).toBe('custodial');
    expect(await getSecure(SecureKeys.sessionToken)).toBe('jwt-c');
    expect(await getSecure(SecureKeys.custodialSecret)).toBe(kp.secret());
  });
});

describe('createCustodialAccount', () => {
  it('issues a server-side account, stores the secret once, and returns the key', async () => {
    const kp = Keypair.random();
    mockApi.mockResolvedValueOnce({
      user_id: 'u1',
      account_id: 'a1',
      public_key: kp.publicKey(),
      secret: kp.secret(),
      network: 'testnet',
    });

    const issued = await createCustodialAccount();
    expect(issued.publicKey).toBe(kp.publicKey());
    expect(issued.secret).toBe(kp.secret());
    expect(mockApi).toHaveBeenCalledWith('/v1/accounts/custodial', expect.objectContaining({ method: 'POST' }));
    expect(await getSecure(SecureKeys.custodialSecret)).toBe(kp.secret());
    expect(await getSecure(SecureKeys.activeAccount)).toBe(kp.publicKey());
    expect(await getSecure(SecureKeys.custodyModel)).toBe('custodial');
  });
});

describe('signOut', () => {
  it('wipes the session token and all secrets', async () => {
    await setSecure(SecureKeys.sessionToken, 't');
    await setSecure(SecureKeys.localSecret, 's');
    await setSecure(SecureKeys.custodialSecret, 'c');
    await setSecure(SecureKeys.activeAccount, 'GAAA');
    await signOut();
    expect(await getSecure(SecureKeys.sessionToken)).toBeNull();
    expect(await getSecure(SecureKeys.localSecret)).toBeNull();
    expect(await getSecure(SecureKeys.custodialSecret)).toBeNull();
    expect(await getSecure(SecureKeys.activeAccount)).toBeNull();
  });
});