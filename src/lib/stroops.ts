/**
 * Exact money handling for the app: API amounts are decimal strings;
 * on-chain amounts are stroops. No floating point for money.
 */

export const STROOPS_PER_UNIT = 10_000_000n;

export function toStroops(amount: string | number, decimals = 7): bigint {
  const s = typeof amount === 'number' ? String(amount) : amount;
  const normalized = s.includes('.') ? s : `${s}.`;
  const parts = normalized.split('.');
  if (parts.length !== 2) {
    throw new Error(`Invalid amount: ${s}`);
  }
  const whole = parts[0] ?? '0';
  const frac = parts[1] ?? '';
  const padded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(padded)) {
    throw new Error(`Invalid amount: ${s}`);
  }
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || '0');
}

export function fromStroops(stroops: bigint | string, decimals = 7): string {
  const value = typeof stroops === 'string' ? BigInt(stroops) : stroops;
  const unit = 10n ** BigInt(decimals);
  const whole = value / unit;
  const frac = (value % unit).toString().padStart(decimals, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole.toString();
}

/** Human display formatting, e.g. 1520.5 -> "1,520.50". */
export function formatAmount(amount: string | number, decimals = 2): string {
  const num = typeof amount === 'number' ? amount : Number.parseFloat(amount);
  if (!Number.isFinite(num)) {
    return '—';
  }
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Validate a human-entered amount string. */
export function isValidAmount(amount: string): boolean {
  return /^\d+(\.\d{1,7})?$/.test(amount) && Number(amount) > 0;
}