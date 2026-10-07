# Easypaisa (`pk/easypaisa`) — experimental

Scope: Easypaisa **outgoing domestic PKR money transfers**, using the transaction history response. Input is the response envelope with `data.transactions` and `data.accounts`, plus an explicit transaction ID. The pure function `interpretEasypaisa` is in `transformer.js` (checked by TypeScript).

## Semantics

- Payer: `accountId` must resolve uniquely to an internal `wallet` account.
- Payee: `recipientMobile` (11-digit or E.164 Pakistani mobile number, normalized to canonical `+923XXXXXXXXX` format).
- Amount: converted without floating-point rounding from negative decimal to PKR paisa (`amountMinor`).
- Status: `completed` or `success` maps to `sent`. Pending or disputed transactions return `insufficient_evidence`.
