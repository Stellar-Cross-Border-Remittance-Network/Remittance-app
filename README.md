# remittance-app

Mobile Stellar remittance wallet (Expo / React Native / TypeScript) powered by
the [remittance-backend](https://github.com/Stellar-Cross-Border-Remittance-Network/Remittance-backend)
and the on-chain escrow in
[remittance-contracts](https://github.com/Stellar-Cross-Border-Remittance-Network/Remittance--contracts).

Runs against **Stellar Testnet** out of the box.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  remittance-app (Expo / RN / TS)                             │
│                                                              │
│  Screens: Onboarding · Auth · Wallet · Send · Receive ·      │
│           Corridor · Quote · Anchor · CreateRemittance ·     │
│           SEP-24 WebView · RemittanceDetail · PathPayment ·  │
│           Activity · OfflineQueue · Security · Settings      │
│                                                              │
│  - SEP-10 auth (non-custodial device signing + custodial)    │
│  - SEP-24 interactive flows in a restricted WebView          │
│  - SEP-6 programmatic fallback                               │
│  - Real Horizon path payments (never fabricated paths)       │
│  - Live status timeline from the backend event stream        │
│  - Offline intent queue: validate → rebuild fresh → submit   │
│  - SecureStore-only key storage, biometric-gated signing     │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTPS (JWT)
┌──────────────────────────▼───────────────────────────────────┐
│  remittance-backend                                          │
│  SEP-1/6/10/24 · quotes · path planning · Soroban escrow ·   │
│  Horizon streaming + reconciler · BullMQ jobs                │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│  Stellar Testnet (Horizon + RPC + Soroban escrow contract)   │
└──────────────────────────────────────────────────────────────┘
```

## Getting started

```bash
npm install
npm start            # Expo dev server
```

Point the app at your backend: set `extra.apiBaseUrl` in `app.json` (or
override per-build). The default points at `https://api.remittance.example.com`.

> You can also run against a local backend: start `remittance-backend` with
> `docker compose up` and set `apiBaseUrl` to `http://<host>:3000`.
> On a device, use your machine's LAN IP, not `localhost`.

## Testing

```bash
npm run typecheck    # strict TS
npm test             # Jest (jest-expo preset, 32 tests)
```

Coverage includes: exact stroops math, the live-status phase mapper, offline
queue validation/drain semantics (expiry, terminal-state rejection, no double
submit, retry counting), SEP-10 challenge signing/verification (including
wrong-signer rejection), SEP-24 WebView origin restrictions + completion
detection, and render tests for the onboarding flow.

## Security model

- **Keys**: `expo-secure-store` only. Private keys never touch AsyncStorage,
  logs, or network payloads. The session JWT lives in SecureStore too.
- **Custody split**: non-custodial accounts sign on-device (backend prepares
  envelopes); custodial accounts are signed server-side. The two are never
  conflated in the UI.
- **SEP-24 WebView**: locked to the anchor origin (https only, subdomain
  allowance), navigation away is blocked and surfaced, completion is detected
  from redirect markers, and the user can cancel at any time.
- **Offline queue**: persists intents, never signed envelopes. On reconnect it
  validates quote/remittance state and rebuilds a fresh transaction — it never
  blindly resubmits a cached envelope.
- **Biometrics**: the Security screen exposes a device-level flag that signing
  flows must check before touching keys.

See [docs/WALLET_INTEGRATION.md](docs/WALLET_INTEGRATION.md) for the full
wallet/custody architecture, including Freighter-compatible deep links.

## Flows

| Flow | Path |
|---|---|
| Onboarding / auth | Onboarding → Auth (SEP-10) → Wallet |
| Simple send | Send → PathPayment (real Horizon path) → OfflineQueue |
| Remittance | Corridor → Quote → Anchor → CreateRemittance → RemittanceDetail (live timeline) |
| Deposit / withdraw | SEP-24 WebView (or SEP-6 fallback), status reconciled from the backend |
| Offline recovery | OfflineQueue drains validated intents on reconnect |

## Testnet notes

- The app targets Testnet (`Test SDF Network ; September 2015`) — funded test
  accounts can be created via the backend's friendbot integration or the
  Stellar Lab.
- Asset issuers in `src/config/env.ts` are Testnet values; swap for Mainnet
  issuers when moving to production (see the contracts/backend repos for the
  migration checklist).

## Repository hygiene

- Keys/secrets: none stored in the repo; `.env` equivalents for the app are
  `app.json` `extra` fields which are public by design (no secrets belong
  there).
- The app holds **no third-party SDK secrets**; all sensitive integration
  (anchors, SEP-10, Soroban) is mediated by the backend.