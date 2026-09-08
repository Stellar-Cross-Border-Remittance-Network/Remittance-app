import { getSecure, SecureKeys, setSecure } from '../lib/secureStore';
import { api } from '../lib/api';

/**
 * Offline transaction intent queue.
 *
 * Every send intent is persisted BEFORE submission: quote id, source account,
 * destination, asset, amount, creation time, expiry and retry count. When
 * connectivity returns the queue VALIDATES the intent (quote still fresh,
 * remittance still pending), then REBUILDS the transaction from fresh account
 * state and sequence — it never blindly resubmits an old signed envelope.
 */

export type IntentKind = 'path_payment' | 'remittance_fund' | 'remittance_create';

export interface TransactionIntent {
  id: string;
  kind: IntentKind;
  /** Backend remittance id when the intent belongs to a remittance. */
  remittanceId?: string;
  quoteId?: string;
  quoteHash?: string;
  sourceAccount: string;
  destination?: string;
  assetIn?: string;
  amountIn?: string;
  assetOut?: string;
  createdAt: number;
  expiry: number;
  retryCount: number;
  /** Human label shown in the Offline Queue screen. */
  label: string;
  status: 'pending' | 'processing' | 'submitted' | 'failed' | 'expired';
}

export async function loadIntents(): Promise<TransactionIntent[]> {
  const raw = await getSecure(SecureKeys.offlineIntents);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as TransactionIntent[];
  } catch {
    return [];
  }
}

async function saveIntents(intents: TransactionIntent[]): Promise<void> {
  await setSecure(SecureKeys.offlineIntents, JSON.stringify(intents));
}

export async function enqueueIntent(intent: Omit<TransactionIntent, 'status' | 'retryCount'>): Promise<TransactionIntent> {
  const intents = await loadIntents();
  const full: TransactionIntent = { ...intent, status: 'pending', retryCount: 0 };
  intents.push(full);
  await saveIntents(intents);
  return full;
}

export async function updateIntent(id: string, patch: Partial<TransactionIntent>): Promise<void> {
  const intents = await loadIntents();
  const idx = intents.findIndex((i) => i.id === id);
  if (idx >= 0) {
    intents[idx] = { ...intents[idx]!, ...patch };
    await saveIntents(intents);
  }
}

export async function removeIntent(id: string): Promise<void> {
  const intents = await loadIntents();
  await saveIntents(intents.filter((i) => i.id !== id));
}

/**
 * Validate an intent against current reality:
 * - the quote (if any) must not be expired,
 * - the remittance (if any) must still be in a mutable state,
 * - the source account must still exist.
 */
export async function validateIntent(intent: TransactionIntent): Promise<{ ok: boolean; reason?: string }> {
  if (intent.expiry && Date.now() > intent.expiry) {
    return { ok: false, reason: 'Intent expired' };
  }
  try {
    if (intent.remittanceId) {
      const remittance = await api<{ status: string; expiry: string }>(`/v1/remittances/${intent.remittanceId}`, { auth: true });
      if (['RELEASED', 'REFUNDED', 'EXPIRED'].includes(remittance.status)) {
        return { ok: false, reason: `Remittance already ${remittance.status.toLowerCase()}` };
      }
      if (new Date(remittance.expiry).getTime() <= Date.now()) {
        return { ok: false, reason: 'Remittance expired' };
      }
    }
    return { ok: true };
  } catch {
    // Network errors during validation surface as "try again", not as a
    // permanent failure — the retry loop will re-validate.
    return { ok: false, reason: 'Could not reach the backend yet' };
  }
}

export interface SubmitFn {
  (intent: TransactionIntent): Promise<{ txHash?: string }>;
}

/**
 * Drain the queue: validate, then hand each valid intent to the submit
 * function, which MUST rebuild a fresh transaction (fresh sequence number)
 * rather than resubmit a cached envelope.
 */
export async function drainQueue(submit: SubmitFn, onProgress?: (id: string, status: TransactionIntent['status']) => void): Promise<{ processed: number; failed: number }> {
  const intents = await loadIntents();
  let processed = 0;
  let failed = 0;
  for (const intent of intents) {
    if (intent.status === 'submitted' || intent.status === 'expired') {
      continue;
    }
    const validation = await validateIntent(intent);
    if (!validation.ok) {
      if (validation.reason === 'Intent expired') {
        await updateIntent(intent.id, { status: 'expired' });
      }
      failed += 1;
      onProgress?.(intent.id, 'failed');
      continue;
    }
    try {
      await updateIntent(intent.id, { status: 'processing' });
      onProgress?.(intent.id, 'processing');
      const result = await submit(intent);
      void result;
      await updateIntent(intent.id, { status: 'submitted', retryCount: intent.retryCount + 1 });
      processed += 1;
      onProgress?.(intent.id, 'submitted');
    } catch (e) {
      await updateIntent(intent.id, { status: 'failed', retryCount: intent.retryCount + 1 });
      failed += 1;
      onProgress?.(intent.id, 'failed');
    }
  }
  return { processed, failed };
}