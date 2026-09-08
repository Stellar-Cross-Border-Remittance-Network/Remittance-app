import { useAnchorFlow } from '../src/store/anchorFlowStore';
import { useAuthStore } from '../src/store/authStore';
import { useSendDraft } from '../src/store/sendDraftStore';
import { getSecure, SecureKeys } from '../src/lib/secureStore';

beforeEach(() => {
  useAuthStore.getState().clearSession();
  useAnchorFlow.getState().setContext(null);
  useSendDraft.getState().reset();
});

describe('authStore', () => {
  it('starts unauthenticated and unhydrated', () => {
    const s = useAuthStore.getState();
    expect(s.session).toBeNull();
    expect(s.hydrated).toBe(false);
  });

  it('restores a persisted session', async () => {
    await useAuthStore.getState().setSession({ token: 't', account: 'GAAA', custody: 'non_custodial' });
    useAuthStore.setState({ session: null, hydrated: false });
    await useAuthStore.getState().restore();
    const s = useAuthStore.getState();
    expect(s.session).toEqual({ token: 't', account: 'GAAA', custody: 'non_custodial' });
    expect(s.hydrated).toBe(true);
  });

  it('restores to null when no session is persisted', async () => {
    await useAuthStore.getState().restore();
    const s = useAuthStore.getState();
    expect(s.session).toBeNull();
    expect(s.hydrated).toBe(true);
  });

  it('persists session fields to secure storage', async () => {
    await useAuthStore.getState().setSession({ token: 'tok', account: 'GAAA', custody: 'custodial' });
    expect(await getSecure(SecureKeys.sessionToken)).toBe('tok');
    expect(await getSecure(SecureKeys.activeAccount)).toBe('GAAA');
    expect(await getSecure(SecureKeys.custodyModel)).toBe('custodial');
    expect(useAuthStore.getState().session?.account).toBe('GAAA');
  });

  it('clearSession wipes the session and stored secrets', async () => {
    await useAuthStore.getState().setSession({ token: 'tok', account: 'GAAA', custody: 'custodial' });
    await useAuthStore.getState().clearSession();
    expect(useAuthStore.getState().session).toBeNull();
    expect(await getSecure(SecureKeys.sessionToken)).toBeNull();
    expect(await getSecure(SecureKeys.custodialSecret)).toBeNull();
    expect(await getSecure(SecureKeys.localSecret)).toBeNull();
  });

  it('token() reads the session token from secure storage', async () => {
    await useAuthStore.getState().setSession({ token: 'tt', account: 'GAAA', custody: 'non_custodial' });
    expect(await useAuthStore.getState().token()).toBe('tt');
  });
});

describe('anchorFlowStore', () => {
  it('defaults to no context', () => {
    expect(useAnchorFlow.getState().context).toBeNull();
  });

  it('carries the deposit context between screens', () => {
    const ctx = {
      anchorId: 'a1',
      assetCode: 'USDC',
      amount: '10',
      account: 'GAAA',
      custody: 'non_custodial' as const,
      anchorWebAuthEndpoint: 'https://anchor.example.com/auth',
    };
    useAnchorFlow.getState().setContext(ctx);
    expect(useAnchorFlow.getState().context).toEqual(ctx);
  });

  it('clears the context', () => {
    useAnchorFlow.getState().setContext({
      anchorId: 'a1',
      assetCode: 'USDC',
      account: 'GAAA',
      custody: 'custodial' as const,
    });
    useAnchorFlow.getState().setContext(null);
    expect(useAnchorFlow.getState().context).toBeNull();
  });
});

describe('sendDraftStore', () => {
  it('defaults to an empty draft in XLM', () => {
    const d = useSendDraft.getState();
    expect(d.amount).toBe('');
    expect(d.destAddress).toBe('');
    expect(d.destAsset).toBe('XLM');
  });

  it('patches fields', () => {
    useSendDraft.getState().set({ amount: '25', destAddress: 'GBBB', destAsset: 'USDC' });
    const d = useSendDraft.getState();
    expect(d.amount).toBe('25');
    expect(d.destAddress).toBe('GBBB');
    expect(d.destAsset).toBe('USDC');
  });

  it('reset clears the draft and the best path', () => {
    useSendDraft.getState().set({
      amount: '25',
      bestPath: { path: ['XLM'], destinationAmount: '24', destinationMin: '23' },
    });
    useSendDraft.getState().reset();
    const d = useSendDraft.getState();
    expect(d.amount).toBe('');
    expect(d.bestPath).toBeUndefined();
  });
});