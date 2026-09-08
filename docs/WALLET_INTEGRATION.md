# Wallet integration

The app supports two custody models, kept strictly separate:

## Non-custodial (self-custody)

The signing key is generated on-device, stored only in `expo-secure-store`
(hardware-backed keychain/keystore), and never leaves the device. SEP-10
authentication works like this:

1. The device generates a keypair (or reuses the stored one).
2. The backend issues a SEP-10 challenge for the public key.
3. The device signs the challenge and returns it; the backend verifies the
   signature and issues a session JWT.
4. Stellar transactions (escrow funding, settlement) are **prepared by the
   backend** (fresh sequence number, correct fee) and returned to the app for
   signing. The app signs with the local key and submits the envelope back —
   the backend never sees the private key.

## Freighter / external wallets (deep links)

For users who prefer an external wallet, the prepared envelope can be handed
to Freighter (or any SEP-10-capable wallet) via a deep link of the form:

```
freighter://request/<method>?params=<urlencoded-json>
```

`<method>` is one of `signTransaction` / `getPublicKey`, and the params object
carries the base64 XDR envelope. The response returns the signed XDR, which
the app then submits via the backend's submit endpoint. On Android, the app
declares intent filters for `freighter://`; on iOS, `expo-linking` handles the
URL scheme.

Because the backend always rebuilds envelopes from fresh account state, a deep
link that goes stale (sequence changed) simply fails cleanly and the flow
re-prepares — the app never resubmits an old signed transaction.

## Custodial

The backend holds the account secret (encrypted at rest) and performs SEP-10
on the user's behalf. The app only ever holds the session JWT and the
backend-issued account public key. Signing happens server-side.

## Security invariants

- Private keys live only in SecureStore — never AsyncStorage, never logs,
  never analytics payloads.
- The session JWT is also stored in SecureStore, read per-request.
- The offline queue persists *intents* (what to send), never signed envelopes.
  On reconnect it validates quote expiry and remittance state, then asks the
  backend for a fresh envelope.

## Which model is used when

| Flow | Non-custodial | Custodial |
|---|---|---|
| SEP-10 auth | device signs challenge | backend signs |
| Escrow funding | app signs prepared tx | backend signs |
| SEP-24 interactive | WebView (no keys involved) | WebView (no keys involved) |
| Offline queue drain | backend prepares, app signs | backend prepares + signs |