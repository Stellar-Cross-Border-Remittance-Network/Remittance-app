import { Keypair, Transaction, WebAuth } from '@stellar/stellar-sdk';

import { env } from '../config/env';

/**
 * Pure Stellar helpers used by the auth and send flows. All key handling is
 * the caller's responsibility (secure storage); nothing here logs secrets.
 */

export function generateKeypair(): { publicKey: string; secret: string } {
  const kp = Keypair.random();
  return { publicKey: kp.publicKey(), secret: kp.secret() };
}

/** Sign a SEP-10 challenge produced by the backend with a client keypair. */
export function signChallenge(challengeXdr: string, secret: string, passphrase: string = env.networkPassphrase): string {
  const tx = new Transaction(challengeXdr, passphrase);
  tx.sign(Keypair.fromSecret(secret));
  return tx.toXDR();
}

/**
 * Sign a prepared (simulated, unsigned) Soroban envelope with the device
 * keypair so it can be relayed to the backend for submission. The envelope
 * already carries the correct sequence/auth from the backend's simulation;
 * we only add the signature. Returns the signed base64 XDR.
 */
export function signTransaction(envelopeXdr: string, secret: string, passphrase: string = env.networkPassphrase): string {
  const tx = new Transaction(envelopeXdr, passphrase);
  tx.sign(Keypair.fromSecret(secret));
  return tx.toXDR();
}

/** Validate a challenge for the given server account and domains. */
export function validateChallenge(
  signedXdr: string,
  serverAccountId: string,
  passphrase: string = env.networkPassphrase,
  homeDomains: string[] = [env.homeDomain],
  webAuthDomain: string = env.homeDomain,
): { clientAccount: string } {
  const challenge = WebAuth.readChallengeTx(signedXdr, serverAccountId, passphrase, homeDomains, webAuthDomain);
  return { clientAccount: challenge.clientAccountID };
}

/** Parse 'CODE:ISSUER' or 'XLM' into a display string. */
export function parseAsset(spec: string): { code: string; issuer?: string; isNative: boolean } {
  if (spec === 'XLM') {
    return { code: 'XLM', isNative: true };
  }
  const match = /^([A-Z0-9]{1,12}):(G[A-Z0-9]{55})$/.exec(spec);
  if (!match) {
    throw new Error(`Invalid asset spec: ${spec}`);
  }
  return { code: match[1]!, issuer: match[2]!, isNative: false };
}

export function isValidPublicKey(key: string): boolean {
  return /^G[A-Z0-9]{55}$/.test(key);
}

export function isValidSecret(key: string): boolean {
  try {
    Keypair.fromSecret(key);
    return true;
  } catch {
    return false;
  }
}

/** Short display form for a public key. */
export function shortKey(key: string, head = 6, tail = 4): string {
  if (key.length <= head + tail + 1) {
    return key;
  }
  return `${key.slice(0, head)}…${key.slice(-tail)}`;
}