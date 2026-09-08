/**
 * Live status phases rendered in the remittance detail screen.
 *
 *   Quote Created → Transfer Initiated → Anchor Processing →
 *   Stellar Payment Submitted → Stellar Payment Confirmed →
 *   Destination Settlement → Completed
 *
 * The backend drives these from the on-chain machine plus streamed payment
 * events; the app renders them and never fabricates a phase on its own.
 */
export const PHASES = [
  'QUOTE_CREATED',
  'TRANSFER_INITIATED',
  'ANCHOR_PROCESSING',
  'STELLAR_PAYMENT_SUBMITTED',
  'STELLAR_PAYMENT_CONFIRMED',
  'DESTINATION_SETTLEMENT',
  'COMPLETED',
] as const;

export type Phase = (typeof PHASES)[number];

export interface LiveStatus {
  phase: Phase;
  /** 0..1 progress for UI. */
  progress: number;
  done: boolean;
  failed?: 'REFUNDED' | 'EXPIRED';
  label: string;
}

/** Backend remittance.status + lifecycle → UI phase. */
export function mapStatus(status: string, lifecycle: string): LiveStatus {
  const failed = status === 'REFUNDED' ? ('REFUNDED' as const) : status === 'EXPIRED' ? ('EXPIRED' as const) : undefined;
  if (failed) {
    const label = failed === 'REFUNDED' ? 'Refunded' : 'Expired';
    return { phase: 'COMPLETED', progress: 1, done: true, failed, label };
  }
  switch (status) {
    case 'RELEASED':
      return { phase: 'COMPLETED', progress: 1, done: true, label: 'Completed' };
    case 'SETTLEMENT_AUTHORIZED':
      return { phase: 'DESTINATION_SETTLEMENT', progress: 5 / 6, done: false, label: 'Destination settlement' };
    case 'PROCESSING':
    case 'FUNDED':
      break; // refined by lifecycle below
    case 'CREATED':
      return { phase: 'QUOTE_CREATED', progress: 0, done: false, label: 'Quote created' };
    default:
      return { phase: 'QUOTE_CREATED', progress: 0, done: false, label: 'Pending' };
  }
  switch (lifecycle) {
    case 'TRANSFER_INITIATED':
      return { phase: 'TRANSFER_INITIATED', progress: 1 / 6, done: false, label: 'Transfer initiated' };
    case 'ANCHOR_PROCESSING':
      return { phase: 'ANCHOR_PROCESSING', progress: 2 / 6, done: false, label: 'Anchor processing' };
    case 'STELLAR_PAYMENT_SUBMITTED':
      return { phase: 'STELLAR_PAYMENT_SUBMITTED', progress: 3 / 6, done: false, label: 'Stellar payment submitted' };
    case 'STELLAR_PAYMENT_CONFIRMED':
      return { phase: 'STELLAR_PAYMENT_CONFIRMED', progress: 4 / 6, done: false, label: 'Stellar payment confirmed' };
    default:
      return { phase: 'QUOTE_CREATED', progress: 0, done: false, label: 'Quote created' };
  }
}

/** Phase index used to color the timeline. */
export function phaseIndex(phase: Phase): number {
  return PHASES.indexOf(phase);
}