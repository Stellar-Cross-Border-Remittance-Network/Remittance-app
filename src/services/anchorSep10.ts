import { Keypair, Transaction } from '@stellar/stellar-sdk';

import { getSecure, SecureKeys } from '../lib/secureStore';
import { isValidSecret } from '../lib/stellar';

/**
 * SEP-10 against an anchor's WEB_AUTH_ENDPOINT using the device keypair.
 *
 * Non-custodial accounts authenticate with the anchor directly from the
 * device: the challenge is signed locally and the anchor issues a JWT that is
 * passed to the backend, which never sees the device secret. Custodial
 * accounts skip this — the backend derives the anchor JWT from the stored
 * account secret.
 */
export async function authenticateWithAnchor(webAuthEndpoint: string, account: string): Promise<string> {
  const secret = await getSecure(SecureKeys.localSecret);
  if (!secret || !isValidSecret(secret)) {
    throw new Error('Device key required to authenticate with the anchor');
  }
  const challengeUrl = `${webAuthEndpoint}?account=${encodeURIComponent(account)}`;
  const challengeRes = await fetch(challengeUrl, { headers: { Accept: 'application/json' } });
  if (!challengeRes.ok) {
    throw new Error(`Anchor challenge failed (${challengeRes.status})`);
  }
  const challenge = (await challengeRes.json()) as { transaction: string; network_passphrase: string };
  const tx = new Transaction(challenge.transaction, challenge.network_passphrase);
  tx.sign(Keypair.fromSecret(secret));

  const verifyRes = await fetch(webAuthEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: tx.toXDR() }),
  });
  if (!verifyRes.ok) {
    throw new Error(`Anchor verification failed (${verifyRes.status})`);
  }
  const verified = (await verifyRes.json()) as { token: string };
  if (!verified.token) {
    throw new Error('Anchor returned no token');
  }
  return verified.token;
}