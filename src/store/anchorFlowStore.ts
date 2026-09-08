import { create } from 'zustand';

export interface AnchorFlowContext {
  anchorId: string;
  /** Anchor WEB_AUTH_ENDPOINT for on-device SEP-10 (non-custodial). */
  anchorWebAuthEndpoint?: string | null;
  /** Asset code the user deposits (source asset of the remittance). */
  assetCode: string;
  amount?: string;
  account: string;
  custody: 'non_custodial' | 'custodial';
  countryCode?: string;
}

interface AnchorFlowState {
  context: AnchorFlowContext | null;
  setContext: (ctx: AnchorFlowContext | null) => void;
}

/**
 * In-memory bridge between the create-remittance screen (which knows the
 * chosen anchor) and the detail screen (which offers the deposit action).
 * Not persisted — a fresh launch simply has no deposit context.
 */
export const useAnchorFlow = create<AnchorFlowState>((set) => ({
  context: null,
  setContext: (context) => set({ context }),
}));