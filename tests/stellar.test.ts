import { Account, Asset, Keypair, Operation, TransactionBuilder, WebAuth } from '@stellar/stellar-sdk';

import {
  generateKeypair,
  isValidPublicKey,
  isValidSecret,
  parseAsset,
  shortKey,
  signChallenge,
  signTransaction,
  validateChallenge,
} from '../src/lib/stellar';

const PASSPHRASE = 'Test SDF Network ; September 2015';
const HOME_DOMAIN = 'testanchor.stellar.org';

function buildChallenge(clientKp: Keypair, serverKp: Keypair): string {
  // Real SEP-10 challenge built by the SDK itself.
  return WebAuth.buildChallengeTx(
    serverKp,
    clientKp.publicKey(),
    HOME_DOMAIN,
    300,
    PASSPHRASE,
    HOME_DOMAIN,
  );
}

describe('stellar helpers', () => {
  it('generates valid keypairs', () => {
    const kp = generateKeypair();
    expect(isValidPublicKey(kp.publicKey)).toBe(true);
    expect(isValidSecret(kp.secret)).toBe(true);
  });

  it('signs a challenge and validates it', () => {
    const client = Keypair.random();
    const server = Keypair.random();
    const xdr = buildChallenge(client, server);
    const signed = signChallenge(xdr, client.secret(), PASSPHRASE);
    const { clientAccount } = validateChallenge(signed, server.publicKey(), PASSPHRASE, [HOME_DOMAIN], HOME_DOMAIN);
    expect(clientAccount).toBe(client.publicKey());
  });

  it('rejects signatures from the wrong client', () => {
    const client = Keypair.random();
    const attacker = Keypair.random();
    const server = Keypair.random();
    const xdr = buildChallenge(client, server);
    // The challenge itself parses (structure is valid)…
    const { clientAccount } = validateChallenge(xdr, server.publicKey(), PASSPHRASE, [HOME_DOMAIN], HOME_DOMAIN);
    expect(clientAccount).toBe(client.publicKey());
    // …but signer verification (as the backend performs it) fails when the
    // signature is not by the expected client key.
    const signed = signChallenge(xdr, attacker.secret(), PASSPHRASE);
    expect(() =>
      WebAuth.verifyChallengeTxSigners(signed, server.publicKey(), PASSPHRASE, [client.publicKey()], [HOME_DOMAIN], HOME_DOMAIN),
    ).toThrow();
  });

  it('parses asset specs', () => {
    expect(parseAsset('XLM')).toEqual({ code: 'XLM', isNative: true });
    const issuer = Keypair.random().publicKey();
    const usdc = parseAsset(`USDC:${issuer}`);
    expect(usdc.code).toBe('USDC');
    expect(usdc.isNative).toBe(false);
    expect(usdc.issuer).toMatch(/^G[A-Z0-9]{55}$/);
    expect(() => parseAsset('bad')).toThrow();
  });

  it('shortens keys for display', () => {
    const kp = Keypair.random().publicKey();
    expect(shortKey(kp)).toMatch(/…/);
    expect(shortKey('GABC', 2, 2)).toBe('GABC');
  });

  it('signs a prepared (unsigned) envelope like the backend relay flow', () => {
    const kp = Keypair.random();
    // A prepared Soroban envelope is an unsigned tx built by the backend; the
    // app only adds its signature. Account(server, '-1') mirrors how the SDK
    // builds challenge transactions (sequence 0 after the increment).
    const unsigned = new TransactionBuilder(new Account(kp.publicKey(), '-1'), {
      fee: '100',
      networkPassphrase: PASSPHRASE,
    })
      .addOperation(
        Operation.payment({
          destination: Keypair.random().publicKey(),
          asset: Asset.native(),
          amount: '1',
        }),
      )
      .setTimeout(300)
      .build()
      .toXDR();

    const signed = signTransaction(unsigned, kp.secret(), PASSPHRASE);
    expect(signed).not.toBe(unsigned);
    // The signed envelope parses and carries exactly one signature.
    const { Transaction } = require('@stellar/stellar-sdk') as typeof import('@stellar/stellar-sdk');
    const parsed = new Transaction(signed, PASSPHRASE);
    expect(parsed.signatures).toHaveLength(1);
    expect(parsed.source).toBe(kp.publicKey());
  });
});