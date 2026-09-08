import { create } from 'zustand';

export interface SendDraft {
  amount: string;
  destAddress: string;
  destAsset: string;
  /** Populated by the path-planning step. */
  bestPath?: {
    path: string[];
    destinationAmount: string;
    destinationMin: string;
    preparedEnvelope?: string;
    stellarTransactionId?: string;
  };
  set: (patch: Partial<SendDraft>) => void;
  reset: () => void;
}

/** Cross-screen draft for the send flow (in-memory only; not persisted). */
export const useSendDraft = create<SendDraft>((set) => ({
  amount: '',
  destAddress: '',
  destAsset: 'XLM',
  set: (patch) => set(patch),
  reset: () => set({ amount: '', destAddress: '', destAsset: 'XLM', bestPath: undefined }),
}));