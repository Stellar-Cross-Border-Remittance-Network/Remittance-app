import { PHASES, mapStatus, phaseIndex } from '../src/services/liveStatus';

describe('live status mapping', () => {
  it('maps CREATED to quote created', () => {
    const s = mapStatus('CREATED', '');
    expect(s.phase).toBe('QUOTE_CREATED');
    expect(s.progress).toBe(0);
    expect(s.done).toBe(false);
  });

  it('advances through lifecycle while PROCESSING', () => {
    expect(mapStatus('PROCESSING', 'TRANSFER_INITIATED').phase).toBe('TRANSFER_INITIATED');
    expect(mapStatus('PROCESSING', 'ANCHOR_PROCESSING').phase).toBe('ANCHOR_PROCESSING');
    expect(mapStatus('PROCESSING', 'STELLAR_PAYMENT_SUBMITTED').phase).toBe('STELLAR_PAYMENT_SUBMITTED');
    expect(mapStatus('PROCESSING', 'STELLAR_PAYMENT_CONFIRMED').phase).toBe('STELLAR_PAYMENT_CONFIRMED');
  });

  it('maps settlement authorization to destination settlement', () => {
    const s = mapStatus('SETTLEMENT_AUTHORIZED', '');
    expect(s.phase).toBe('DESTINATION_SETTLEMENT');
  });

  it('maps RELEASED to completed', () => {
    const s = mapStatus('RELEASED', '');
    expect(s.phase).toBe('COMPLETED');
    expect(s.done).toBe(true);
    expect(s.progress).toBe(1);
  });

  it('maps REFUNDED and EXPIRED to failed terminal states', () => {
    expect(mapStatus('REFUNDED', '').failed).toBe('REFUNDED');
    expect(mapStatus('EXPIRED', '').failed).toBe('EXPIRED');
    expect(mapStatus('REFUNDED', '').done).toBe(true);
  });

  it('has seven canonical phases in order', () => {
    expect(PHASES).toEqual([
      'QUOTE_CREATED',
      'TRANSFER_INITIATED',
      'ANCHOR_PROCESSING',
      'STELLAR_PAYMENT_SUBMITTED',
      'STELLAR_PAYMENT_CONFIRMED',
      'DESTINATION_SETTLEMENT',
      'COMPLETED',
    ]);
    expect(phaseIndex('ANCHOR_PROCESSING')).toBe(2);
  });
});