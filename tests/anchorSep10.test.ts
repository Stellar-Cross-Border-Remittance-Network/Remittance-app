import { Keypair, Transaction, WebAuth } from '@stellar/stellar-sdk';

import { authenticateWithAnchor } from '../src/services/anchorSep10';
import { deleteSecure, SecureKeys, setSecure } from '../src/lib/secureStore';

const PASSPHRASE = 'Test SDF Network ; September 2015';
const ENDPOINT = 'https://anchor.example.com/auth';

function challengeFor(account: string, serverKp: Keypair): string {
  return WebAuth.buildChallengeTx(serverKp, account, 'anchor.example.com', 300, PASSPHRASE, 'anchor.example.com');
}

const originalFetch = global.fetch;

beforeEach(async () => {
  await deleteSecure(SecureKeys.localSecret);
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('authenticateWithAnchor (on-device SEP-10)', () => {
  it('signs the anchor challenge with the device key and returns the token', async () => {
    const deviceKp = Keypair.random();
    await setSecure(SecureKeys.localSecret, deviceKp.secret());
    const anchorKp = Keypair.random();
    const challenge = challengeFor(deviceKp.publicKey(), anchorKp);

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ transaction: challenge, network_passphrase: PASSPHRASE }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'anchor-jwt' }), { status: 200 }),
      ) as unknown as typeof fetch;

    const token = await authenticateWithAnchor(ENDPOINT, deviceKp.publicKey());
    expect(token).toBe('anchor-jwt');

    // The verify POST body must contain a signed transaction XDR.
    const [, init] = (global.fetch as jest.Mock).mock.calls[1] as [string, RequestInit];
    expect(init.method).toBe('POST');
    const body = JSON.parse(String(init.body)) as { transaction: string };
    const tx = new Transaction(body.transaction, PASSPHRASE);
    expect(tx.signatures.length).toBeGreaterThan(0);
  });

  it('throws when no device key exists', async () => {
    await expect(authenticateWithAnchor(ENDPOINT, 'GAAA')).rejects.toThrow('Device key required');
  });

  it('throws when the device secret is invalid', async () => {
    await setSecure(SecureKeys.localSecret, 'garbage');
    await expect(authenticateWithAnchor(ENDPOINT, 'GAAA')).rejects.toThrow('Device key required');
  });

  it('surfaces a failed challenge fetch', async () => {
    await setSecure(SecureKeys.localSecret, Keypair.random().secret());
    global.fetch = jest.fn().mockResolvedValue(new Response('nope', { status: 500 })) as unknown as typeof fetch;
    await expect(authenticateWithAnchor(ENDPOINT, 'GAAA')).rejects.toThrow('Anchor challenge failed (500)');
  });

  it('surfaces a failed verification', async () => {
    const deviceKp = Keypair.random();
    await setSecure(SecureKeys.localSecret, deviceKp.secret());
    const anchorKp = Keypair.random();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ transaction: challengeFor(deviceKp.publicKey(), anchorKp), network_passphrase: PASSPHRASE }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response('no', { status: 401 })) as unknown as typeof fetch;
    await expect(authenticateWithAnchor(ENDPOINT, deviceKp.publicKey())).rejects.toThrow('Anchor verification failed (401)');
  });

  it('throws when the anchor returns no token', async () => {
    const deviceKp = Keypair.random();
    await setSecure(SecureKeys.localSecret, deviceKp.secret());
    const anchorKp = Keypair.random();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ transaction: challengeFor(deviceKp.publicKey(), anchorKp), network_passphrase: PASSPHRASE }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 })) as unknown as typeof fetch;
    await expect(authenticateWithAnchor(ENDPOINT, deviceKp.publicKey())).rejects.toThrow('Anchor returned no token');
  });
});