import { endpoints } from '../lib/api';
import { authenticateWithAnchor } from './anchorSep10';

export type SepFlowResult =
  | { protocol: 'sep24'; id: string; url: string; status: string }
  | { protocol: 'sep6'; id: string; instructions: Record<string, unknown>; status: string };

export interface SepFlowInput {
  anchorId: string;
  /** Anchor WEB_AUTH_ENDPOINT — required for non-custodial accounts. */
  anchorWebAuthEndpoint?: string | null;
  assetCode: string;
  amount?: string;
  account: string;
  custody: 'non_custodial' | 'custodial';
  remittanceId?: string;
  countryCode?: string;
}

/**
 * Initiates an anchor transfer with AUTO preference: the backend tries
 * SEP-24 (interactive URL) first and falls back to SEP-6 (programmatic
 * instructions) only when SEP-24 is genuinely unavailable. Non-custodial
 * accounts obtain the anchor SEP-10 JWT on-device; custodial accounts let
 * the backend derive it from the stored secret.
 */
/**
 * Pure routing decision: SEP-24 interactive URL wins; anything else is a
 * SEP-6 programmatic flow. Exported for tests.
 */
export function routeDepositResult(
  res: { protocol: string; url?: string },
): { kind: 'sep24'; url: string } | { kind: 'sep6' } {
  if (res.protocol === 'sep24' && res.url && res.url.startsWith('https://')) {
    return { kind: 'sep24', url: res.url };
  }
  return { kind: 'sep6' };
}

export async function initiateAnchorDeposit(input: SepFlowInput): Promise<SepFlowResult> {
  const anchorJwt =
    input.custody === 'non_custodial' && input.anchorWebAuthEndpoint
      ? await authenticateWithAnchor(input.anchorWebAuthEndpoint, input.account)
      : undefined;
  const res = await endpoints.sep6Deposit({
    anchor_id: input.anchorId,
    asset_code: input.assetCode,
    account: input.account,
    amount: input.amount,
    country_code: input.countryCode,
    remittance_id: input.remittanceId,
    preference: 'AUTO',
    ...(anchorJwt ? { anchor_jwt: anchorJwt } : {}),
  });
  const routed = routeDepositResult(res);
  if (routed.kind === 'sep24') {
    return { protocol: 'sep24', id: res.id, url: routed.url, status: res.status };
  }
  return {
    protocol: 'sep6',
    id: res.id,
    instructions: ((res as { instructions?: Record<string, unknown> }).instructions ?? {}) as Record<string, unknown>,
    status: res.status,
  };
}