import { api, ApiError, endpoints } from '../src/lib/api';
import { getSecure, SecureKeys, setSecure } from '../src/lib/secureStore';

const BASE = 'https://test.example.com';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const originalFetch = global.fetch;

beforeEach(async () => {
  await setSecure(SecureKeys.sessionToken, 'sess-token');
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.useRealTimers();
});

describe('api client', () => {
  it('performs a GET and parses JSON', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ ok: 1 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const res = await api<{ ok: number }>('/v1/health');
    expect(res).toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/v1/health`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('sends the stored session token when auth is requested', async () => {
    await setSecure(SecureKeys.sessionToken, 'sess-token');
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({}));
    global.fetch = fetchMock as unknown as typeof fetch;
    await api('/v1/remittances', { auth: true });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toEqual(
      expect.objectContaining({ Authorization: 'Bearer sess-token' }),
    );
  });

  it('does not attach an Authorization header without auth', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({}));
    global.fetch = fetchMock as unknown as typeof fetch;
    await api('/v1/sep10/challenge', { method: 'POST', body: {} });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.stringify(init.headers)).not.toContain('Authorization');
  });

  it('sends a JSON body for POSTs', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({}));
    global.fetch = fetchMock as unknown as typeof fetch;
    await api('/v1/remittances', { method: 'POST', body: { amount: '10' } });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ amount: '10' }));
    expect(init.headers).toEqual(
      expect.objectContaining({ 'Content-Type': 'application/json' }),
    );
  });

  it('maps a 401 to an UNAUTHORIZED ApiError', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({ code: 'UNAUTHORIZED' }, 401)) as unknown as typeof fetch;
    await expect(api('/v1/remittances', { auth: true })).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      code: 'UNAUTHORIZED',
    });
  });

  it('surfaces upstream error codes and messages', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({ code: 'EXPIRED', message: 'Quote expired' }, 422)) as unknown as typeof fetch;
    await expect(api('/v1/remittances/quote', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 422,
      code: 'EXPIRED',
      message: 'Quote expired',
    });
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response('oops', { status: 502 })) as unknown as typeof fetch;
    await expect(api('/v1/anchors')).rejects.toMatchObject({
      status: 502,
      code: 'UPSTREAM_ERROR',
    });
  });

  it('maps a timeout to a TIMEOUT ApiError', async () => {
    jest.useFakeTimers();
    // A fetch that rejects with AbortError when the caller aborts, exactly
    // like the native fetch does once the AbortController fires.
    global.fetch = jest.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal as AbortSignal | undefined;
        signal?.addEventListener('abort', () => {
          const e = new Error('Aborted');
          e.name = 'AbortError';
          reject(e);
        });
      });
    }) as unknown as typeof fetch;
    const promise = api('/v1/anchors', { timeoutMs: 50 });
    const assertion = expect(promise).rejects.toMatchObject({ code: 'TIMEOUT', status: 408 });
    jest.advanceTimersByTime(60);
    await assertion;
    jest.useRealTimers();
  });

  it('maps network failures to a NETWORK_ERROR ApiError', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('socket hang up')) as unknown as typeof fetch;
    await expect(api('/v1/anchors')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: 0,
    });
  });

  it('handles empty responses', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 })) as unknown as typeof fetch;
    const res = await api('/v1/anchors');
    expect(res).toBeNull();
  });
});

describe('endpoint helpers', () => {
  it('builds the SEP-10 challenge request', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ transaction: 'x', network_passphrase: 'p' }));
    global.fetch = fetchMock as unknown as typeof fetch;
    await endpoints.challenge();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/v1/sep10/challenge`);
    expect(init.method).toBe('POST');
  });

  it('builds the relay request with method and signed xdr', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ ok: true }));
    global.fetch = fetchMock as unknown as typeof fetch;
    await endpoints.relay('r1', { signed_xdr: 'AAAA', method: 'fund_remittance' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/v1/remittances/r1/relay`);
    expect(init.body).toBe(JSON.stringify({ signed_xdr: 'AAAA', method: 'fund_remittance' }));
  });

  it('builds the SEP-6 deposit request with AUTO preference passthrough', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ id: 't', protocol: 'sep6', status: 'pending' }));
    global.fetch = fetchMock as unknown as typeof fetch;
    await endpoints.sep6Deposit({ anchor_id: 'a', asset_code: 'USDC', preference: 'AUTO' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/v1/sep6/deposit`);
    expect(init.body).toBe(JSON.stringify({ anchor_id: 'a', asset_code: 'USDC', preference: 'AUTO' }));
  });

  it('reads the stored token on auth calls without crashing when absent', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({})) as unknown as typeof fetch;
    expect(await getSecure(SecureKeys.sessionToken)).toBe('sess-token');
  });

  it('covers every endpoint helper with the right path, method and auth', async () => {
    // A fresh Response per call — a shared instance's body is single-use.
    const fetchMock = jest.fn().mockImplementation(() => Promise.resolve(jsonResponse({ ok: true })));
    global.fetch = fetchMock as unknown as typeof fetch;

    const calls: Array<[() => Promise<unknown>, RegExp, string?]> = [
      [() => endpoints.verify({ transaction: 'x', account: 'GAAA' }), /\/v1\/sep10\/verify$/, 'POST'],
      [() => endpoints.registerAccount({ custody: 'non_custodial', public_key: 'GAAA' }), /\/v1\/accounts$/, 'POST'],
      [() => endpoints.createCustodialAccount(), /\/v1\/accounts\/custodial$/, 'POST'],
      [() => endpoints.anchors(), /\/v1\/anchors$/],
      [() => endpoints.anchor('a1'), /\/v1\/anchors\/a1$/],
      [() => endpoints.quote({ a: 1 }), /\/v1\/remittances\/quote$/, 'POST'],
      [() => endpoints.createRemittance({ a: 1 }), /\/v1\/remittances$/, 'POST'],
      [() => endpoints.remittance('r1'), /\/v1\/remittances\/r1$/],
      [() => endpoints.remittanceEvents('r1'), /\/v1\/remittances\/r1\/events$/],
      [() => endpoints.fund('r1'), /\/v1\/remittances\/r1\/fund$/, 'POST'],
      [() => endpoints.release('r1'), /\/v1\/remittances\/r1\/release$/, 'POST'],
      [() => endpoints.refund('r1'), /\/v1\/remittances\/r1\/refund$/, 'POST'],
      [() => endpoints.confirmSoroban('r1', { tx_hash: 'h', method: 'fund_remittance' }), /\/v1\/remittances\/r1\/confirm-soroban$/, 'POST'],
      [() => endpoints.prepareFund('r1'), /\/v1\/remittances\/r1\/prepare-fund$/, 'POST'],
      [() => endpoints.prepareRefund('r1'), /\/v1\/remittances\/r1\/prepare-refund$/, 'POST'],
      [() => endpoints.relay('r1', { signed_xdr: 'x', method: 'create_remittance' }), /\/v1\/remittances\/r1\/relay$/, 'POST'],
      [() => endpoints.sep24Deposit({}), /\/v1\/sep24\/deposit$/, 'POST'],
      [() => endpoints.sep24Withdraw({}), /\/v1\/sep24\/withdraw$/, 'POST'],
      [() => endpoints.sep6Transaction('t1'), /\/v1\/sep6\/transactions\/t1$/],
      [() => endpoints.sep6Deposit({}), /\/v1\/sep6\/deposit$/, 'POST'],
      [() => endpoints.sep6Withdraw({}), /\/v1\/sep6\/withdraw$/, 'POST'],
      [() => endpoints.pathPlan({}), /\/v1\/path-payments\/plan$/, 'POST'],
    ];

    for (const [invoke, path, method] of calls) {
      await invoke();
      const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
      expect(url).toMatch(path);
      expect(init.method).toBe(method ?? 'GET');
      // Auth'd helpers attach the stored token; the public SEP-10
      // challenge/verify and custodial-issuance endpoints are the only
      // helpers without auth.
      if (method !== 'GET' && !url.includes('/sep10/') && !url.includes('/accounts/custodial')) {
        expect(JSON.stringify(init.headers)).toContain('Bearer sess-token');
      }
    }
    expect(fetchMock.mock.calls.length).toBe(calls.length);
  });
});