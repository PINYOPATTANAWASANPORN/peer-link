# Wells Fargo (`us/wells-fargo`) — experimental

Scope: Wells Fargo web **outgoing domestic USD ACH transfers**, using the transactions-lite response. Input is the response envelope with `data.transactions` and `data.accounts`, plus an explicit transaction ID. The pure function `interpretWellsFargo` is in `transformer.js` (checked by TypeScript).

## Semantics

- Payer: `accountId` must resolve uniquely to an internal `checking` account. This is a Wells Fargo internal account reference, not a verified legal identity.
- Payee: `achRoutingInfo.routingNumber:achRoutingInfo.accountNumber` (9-digit US routing number followed by the recipient account number).
- Amount: converted without floating-point rounding from negative decimal to USD cents (`amountMinor`).
- Status: `posted` or `settled` maps to `sent`. Pending or disputed transactions return `insufficient_evidence`.
