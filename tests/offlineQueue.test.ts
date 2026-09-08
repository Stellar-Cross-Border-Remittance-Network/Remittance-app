import { drainQueue, enqueueIntent, loadIntents, removeIntent, updateIntent, validateIntent, type TransactionIntent } from '../src/queue/offlineQueue';
import { api } from '../src/lib/api';

jest.mock('../src/lib/api', () => ({
  api: jest.fn(),
}));

const mockApi = api as jest.MockedFunction<typeof api>;

function makeIntent(overrides: Partial<TransactionIntent> = {}): TransactionIntent {
  return {
    id: 'i1',
    kind: 'path_payment',
    sourceAccount: 'GAAA',
    destination: 'GBBB',
    assetIn: 'XLM',
    amountIn: '10',
    createdAt: Date.now(),
    expiry: Date.now() + 60_000,
    retryCount: 0,
    label: 'test',
    status: 'pending',
    ...overrides,
  };
}

beforeEach(() => {
  mockApi.mockReset();
  jest.clearAllMocks();
  // wipe stored intents
  return removeIntent('i1');
});

describe('offline queue', () => {
  it('persists and reloads intents', async () => {
    await enqueueIntent(makeIntent());
    const loaded = await loadIntents();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.label).toBe('test');
    expect(loaded[0]!.status).toBe('pending');
  });

  it('rejects expired intents at validation', async () => {
    const intent = makeIntent({ expiry: Date.now() - 1000 });
    const result = await validateIntent(intent);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Intent expired');
  });

  it('rejects intents whose remittance is terminal', async () => {
    mockApi.mockResolvedValueOnce({ status: 'RELEASED', expiry: new Date(Date.now() + 60_000).toISOString() });
    const intent = makeIntent({ remittanceId: 'r1' });
    const result = await validateIntent(intent);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('already released');
  });

  it('validates fresh intents', async () => {
    mockApi.mockResolvedValueOnce({ status: 'FUNDED', expiry: new Date(Date.now() + 60_000).toISOString() });
    const intent = makeIntent({ remittanceId: 'r1' });
    const result = await validateIntent(intent);
    expect(result.ok).toBe(true);
  });

  it('marks validation failures as failed during drain', async () => {
    const intent = makeIntent({ expiry: Date.now() - 1 });
    await enqueueIntent(intent);
    const { processed, failed } = await drainQueue(async () => ({ txHash: 'x' }));
    expect(processed).toBe(0);
    expect(failed).toBe(1);
    const [stored] = await loadIntents();
    expect(stored!.status).toBe('expired');
  });

  it('submits valid intents exactly once and bumps retry count', async () => {
    await enqueueIntent(makeIntent());
    const submit = jest.fn(async () => ({ txHash: 'deadbeef' }));
    const { processed, failed } = await drainQueue(submit);
    expect(processed).toBe(1);
    expect(failed).toBe(0);
    expect(submit).toHaveBeenCalledTimes(1);
    const [stored] = await loadIntents();
    expect(stored!.status).toBe('submitted');
    expect(stored!.retryCount).toBe(1);
  });

  it('does not resubmit intents already marked submitted', async () => {
    await enqueueIntent(makeIntent());
    await updateIntent('i1', { status: 'submitted' });
    const submit = jest.fn();
    await drainQueue(submit);
    expect(submit).not.toHaveBeenCalled();
  });

  it('records failure and allows retry', async () => {
    await enqueueIntent(makeIntent());
    const submit = jest.fn(async () => {
      throw new Error('network down');
    });
    const { processed, failed } = await drainQueue(submit);
    expect(processed).toBe(0);
    expect(failed).toBe(1);
    const [stored] = await loadIntents();
    expect(stored!.status).toBe('failed');
    expect(stored!.retryCount).toBe(1);
  });

  it('supports removing intents', async () => {
    await enqueueIntent(makeIntent());
    await updateIntent('i1', { status: 'failed' });
    await removeIntent('i1');
    expect(await loadIntents()).toHaveLength(0);
  });
});