import { useCallback, useEffect, useRef, useState } from 'react';

import { endpoints } from '../lib/api';

export interface LiveEvent {
  type: 'payment' | 'soroban' | 'anchor' | 'stellar' | 'audit';
  at: string;
  [key: string]: unknown;
}

export interface LiveSnapshot {
  remittance: Record<string, unknown> | null;
  events: LiveEvent[];
  lastUpdated: number | null;
  connected: boolean;
}

/**
 * Live status consumer.
 *
 * The backend maintains the durable stream (SSE + polling reconciler). The
 * app polls the normalized event feed with a backoff that tightens while the
 * remittance is in flight — equivalent to consuming the backend's stream, and
 * safe across app restarts because every event is persisted server-side.
 */
export function useRemittanceStream(
  remittanceId: string | undefined,
  enabled = true,
): LiveSnapshot {
  const [snapshot, setSnapshot] = useState<LiveSnapshot>({
    remittance: null,
    events: [],
    lastUpdated: null,
    connected: false,
  });
  const [interval, setIntervalMs] = useState(4000);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!remittanceId || !enabled || !mounted.current) {
      return;
    }
    try {
      const [remittance, events] = await Promise.all([
        endpoints.remittance(remittanceId),
        endpoints.remittanceEvents(remittanceId),
      ]);
      const eventsList = (events ?? []) as LiveEvent[];
      setSnapshot({
        remittance,
        events: eventsList,
        lastUpdated: Date.now(),
        connected: true,
      });
      // Tighten polling while in flight, relax when terminal.
      const status = String((remittance as { status?: string }).status ?? '');
      setIntervalMs(['RELEASED', 'REFUNDED', 'EXPIRED'].includes(status) ? 15_000 : 4000);
    } catch {
      setSnapshot((s) => ({ ...s, connected: false }));
      setIntervalMs(10_000); // back off when the backend is unreachable
    }
  }, [remittanceId, enabled]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    timer.current = setInterval(() => void refresh(), interval);
    return () => {
      mounted.current = false;
      if (timer.current) {
        clearInterval(timer.current);
      }
    };
  }, [refresh, interval]);

  return snapshot;
}