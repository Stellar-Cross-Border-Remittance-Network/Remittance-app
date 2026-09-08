import { fromStroops, formatAmount, isValidAmount, toStroops } from '../src/lib/stroops';

describe('stroops (exact money)', () => {
  it('converts decimal strings to stroops without float error', () => {
    expect(toStroops('0.1')).toBe(1_000_000n);
    expect(toStroops('0.1234567')).toBe(1_234_567n);
    expect(toStroops('1520.5')).toBe(15_205_000_000n);
    expect(toStroops('100')).toBe(1_000_000_000n);
    expect(toStroops('0')).toBe(0n);
  });

  it('rejects malformed amounts', () => {
    expect(() => toStroops('abc')).toThrow();
    expect(() => toStroops('1.2.3')).toThrow();
    expect(() => toStroops('12,5')).toThrow();
  });

  it('round-trips stroops back to decimal strings', () => {
    expect(fromStroops(1_000_000n)).toBe('0.1');
    expect(fromStroops(15_205_000_000n)).toBe('1520.5');
    expect(fromStroops('1234567')).toBe('0.1234567');
    expect(fromStroops(0n)).toBe('0');
  });

  it('formats for display with grouping', () => {
    expect(formatAmount('1520.5')).toBe('1,520.50');
    expect(formatAmount('1000000')).toBe('1,000,000.00');
    expect(formatAmount('nope')).toBe('—');
  });

  it('validates human-entered amounts', () => {
    expect(isValidAmount('100')).toBe(true);
    expect(isValidAmount('0.5')).toBe(true);
    expect(isValidAmount('0.1234567')).toBe(true);
    expect(isValidAmount('0')).toBe(false);
    expect(isValidAmount('-5')).toBe(false);
    expect(isValidAmount('abc')).toBe(false);
    expect(isValidAmount('')).toBe(false);
    expect(isValidAmount('0.12345678')).toBe(false); // beyond 7 decimals
  });
});