import { Keypair } from '@stellar/stellar-sdk';

import { api } from '../lib/api';
import { deleteSecure, getSecure, SecureKeys, setSecure } from '../lib/secureStore';
import { generateKeypair, isValidSecret, signChallenge } from '../lib/stellar';
import type { CustodyModel } from '../store/authStore';

export interface AuthResult {
  account: string;
  custody: CustodyModel;
}

async function fetchChallenge(account: string): Promise<{ transaction: string; network_passphrase: string }> {
  return api<{ transaction: string; network_passphrase: string }>('/v1/sep10/challenge', {
    method: 'POST',
    body: { account },
  });
}

function deriveAccount(secret: string): string {
  return Keypair.fromSecret(secret).publicKey();
}

/**
 * SEP-10 authentication against the backend.
 *
 * - **Non-custodial**: a device-generated keypair signs the challenge; the
 *   secret never leaves the device. Freighter-style wallets are supported via
 *   deep links (see docs/WALLET_INTEGRATION.md).
 * - **Custodial**: the backend holds the account secret and verifies the
 *   challenge server-side on the user's behalf.
 */
export async function authenticate(
  custody: CustodyModel,
  opts: { account?: string; secret?: string } = {},
): Promise<AuthResult> {
  let secret = opts.secret;
  let account = opts.account;

  if (custody === 'non_custodial') {
    secret = secret ?? (await getSecure(SecureKeys.localSecret)) ?? undefined;
    if (!secret) {
      const kp = generateKeypair();
      secret = kp.secret;
      account = kp.publicKey;
      await setSecure(SecureKeys.localSecret, secret);
    }
    account = account ?? deriveAccount(secret);
    if (!isValidSecret(secret)) {
      throw new Error('Invalid device secret');
    }
    const challenge = await fetchChallenge(account);
    const signed = signChallenge(challenge.transaction, secret, challenge.network_passphrase);
    const verify = await api<{ token: string; account: string; custody: string }>('/v1/sep10/verify', {
      method: 'POST',
      body: { transaction: signed, account, custody: 'non_custodial' },
    });
    await setSecure(SecureKeys.sessionToken, verify.token);
    return { account, custody: 'non_custodial' };
  }

  // Custodial: an existing backend-registered account is required.
  secret = secret ?? (await getSecure(SecureKeys.custodialSecret)) ?? undefined;
  if (!secret) {
    throw new Error('Custodial sign-in requires a backend-issued account secret');
  }
  account = account ?? deriveAccount(secret);
  await setSecure(SecureKeys.custodialSecret, secret);
  const challenge = await fetchChallenge(account);
  // The backend signs with the stored secret and verifies on our behalf.
  const verify = await api<{ token: string; account: string; custody: string }>('/v1/sep10/verify', {
    method: 'POST',
    body: { transaction: challenge.transaction, account, custody: 'custodial' },
  });
  await setSecure(SecureKeys.sessionToken, verify.token);
  return { account, custody: 'custodial' };
}

/** Sign out: wipe the session and all locally held secrets. */
export async function signOut(): Promise<void> {
  await Promise.all([
    deleteSecure(SecureKeys.sessionToken),
    deleteSecure(SecureKeys.activeAccount),
    deleteSecure(SecureKeys.custodialSecret),
    deleteSecure(SecureKeys.localSecret),
  ]);
}