import { env } from '../config/env';
import { getSecure, SecureKeys } from './secureStore';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  /** Attach the stored session token. */
  auth?: boolean;
  timeoutMs?: number;
}

/**
 * Typed backend client. The session token is read from secure storage on
 * every request so stale tokens are never cached in memory longer than needed.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.auth ? await getSecure(SecureKeys.sessionToken) : null;
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 20_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${env.apiBaseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    if (res.status === 401) {
      // Session expired — the caller decides whether to re-auth.
      throw new ApiError(401, 'UNAUTHORIZED', 'Session expired');
    }
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      const body = (json ?? {}) as { code?: string; message?: string; details?: unknown };
      throw new ApiError(res.status, body.code ?? 'UPSTREAM_ERROR', body.message ?? `Request failed (${res.status})`, body.details);
    }
    return json as T;
  } catch (e) {
    if (e instanceof ApiError) {
      throw e;
    }
    if (e instanceof Error && e.name === 'AbortError') {
      throw new ApiError(408, 'TIMEOUT', 'Request timed out');
    }
    throw new ApiError(0, 'NETWORK_ERROR', (e as Error).message ?? 'Network request failed');
  } finally {
    clearTimeout(timer);
  }
}

/** Convenience for the endpoints the app actually calls. */
export const endpoints = {
  challenge: () => api<{ transaction: string; network_passphrase: string }>('/v1/sep10/challenge', { method: 'POST', body: {} }),
  verify: (payload: { transaction: string; account: string; custody?: 'non_custodial' | 'custodial' }) =>
    api<{ token: string; account: string; custody: string }>('/v1/sep10/verify', { method: 'POST', body: payload }),
  anchors: () => api<Array<Record<string, unknown>>>('/v1/anchors', { auth: true }),
  anchor: (id: string) => api<Record<string, unknown>>(`/v1/anchors/${id}`, { auth: true }),
  quote: (payload: Record<string, unknown>) =>
    api<Record<string, unknown>>('/v1/remittances/quote', { method: 'POST', auth: true, body: payload }),
  createRemittance: (payload: Record<string, unknown>) =>
    api<Record<string, unknown>>('/v1/remittances', { method: 'POST', auth: true, body: payload }),
  remittance: (id: string) => api<Record<string, unknown>>(`/v1/remittances/${id}`, { auth: true }),
  remittanceEvents: (id: string) => api<unknown[]>(`/v1/remittances/${id}/events`, { auth: true }),
  fund: (id: string) => api<Record<string, unknown>>(`/v1/remittances/${id}/fund`, { method: 'POST', auth: true }),
  release: (id: string) => api<Record<string, unknown>>(`/v1/remittances/${id}/release`, { method: 'POST', auth: true }),
  refund: (id: string) => api<Record<string, unknown>>(`/v1/remittances/${id}/refund`, { method: 'POST', auth: true }),
  confirmSoroban: (id: string, payload: { tx_hash: string; method: string }) =>
    api<{ ok: boolean }>(`/v1/remittances/${id}/confirm-soroban`, { method: 'POST', auth: true, body: payload }),
  prepareFund: (id: string) =>
    api<{ transactionXdr: string }>(`/v1/remittances/${id}/prepare-fund`, { method: 'POST', auth: true }),
  prepareRefund: (id: string) =>
    api<{ transactionXdr: string }>(`/v1/remittances/${id}/prepare-refund`, { method: 'POST', auth: true }),
  /** Submit a device-signed Soroban envelope; the backend verifies on-chain state. */
  relay: (id: string, payload: { signed_xdr: string; method: 'create_remittance' | 'fund_remittance' | 'refund' }) =>
    api<{ ok: boolean }>(`/v1/remittances/${id}/relay`, { method: 'POST', auth: true, body: payload }),
  sep24Deposit: (payload: Record<string, unknown>) =>
    api<{ id: string; url?: string; status: string }>('/v1/sep24/deposit', { method: 'POST', auth: true, body: payload }),
  sep24Withdraw: (payload: Record<string, unknown>) =>
    api<{ id: string; url?: string; status: string }>('/v1/sep24/withdraw', { method: 'POST', auth: true, body: payload }),
  sep6Transaction: (id: string) => api<Record<string, unknown>>(`/v1/sep6/transactions/${id}`, { auth: true }),
  sep6Deposit: (payload: Record<string, unknown>) =>
    api<{ id: string; protocol: string; url?: string; status: string; instructions?: Record<string, unknown> }>('/v1/sep6/deposit', { method: 'POST', auth: true, body: payload }),
  sep6Withdraw: (payload: Record<string, unknown>) =>
    api<{ id: string; protocol: string; url?: string; status: string; instructions?: Record<string, unknown> }>('/v1/sep6/withdraw', { method: 'POST', auth: true, body: payload }),
  pathPlan: (payload: Record<string, unknown>) =>
    api<{ paths: unknown[]; best: unknown }>('/v1/path-payments/plan', { method: 'POST', auth: true, body: payload }),
};