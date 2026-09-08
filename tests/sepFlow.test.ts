import { routeDepositResult } from '../src/services/sepFlow';

describe('SEP-6 fallback routing (AUTO)', () => {
  it('routes a SEP-24 interactive URL to the WebView flow', () => {
    const r = routeDepositResult({ protocol: 'sep24', url: 'https://testanchor.stellar.org/sep24/deposit' });
    expect(r).toEqual({ kind: 'sep24', url: 'https://testanchor.stellar.org/sep24/deposit' });
  });

  it('falls back to SEP-6 when SEP-24 is unavailable (no url)', () => {
    expect(routeDepositResult({ protocol: 'sep24', url: undefined })).toEqual({ kind: 'sep6' });
  });

  it('falls back to SEP-6 when the backend chose sep6', () => {
    expect(routeDepositResult({ protocol: 'sep6' })).toEqual({ kind: 'sep6' });
  });

  it('falls back to SEP-6 for unknown protocols instead of crashing', () => {
    expect(routeDepositResult({ protocol: 'weird' })).toEqual({ kind: 'sep6' });
  });

  it('never routes to a WebView without an https url', () => {
    const r = routeDepositResult({ protocol: 'sep24', url: 'javascript:alert(1)' });
    expect(r).toEqual({ kind: 'sep6' });
  });
});