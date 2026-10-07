# GCash (`ph/gcash`) — experimental

Scope: GCash **outgoing domestic PHP Send Money transfers**, using the transaction history response. Input is the response envelope with `data.transactions` and `data.accounts`, plus an explicit transaction ID. The pure function `interpretGCash` is in `transformer.js` (checked by TypeScript).

## Semantics

- Payer: `accountId` must resolve uniquely to an internal `wallet` account.
- Payee: `recipientMobile` (11-digit or E.164 Philippine mobile number, normalized to canonical `+639XXXXXXXXX` format).
- Amount: converted without floating-point rounding from negative decimal to PHP centavos (`amountMinor`).
- Status: `completed` or `success` maps to `sent`. Pending or disputed transactions return `insufficient_evidence`.
