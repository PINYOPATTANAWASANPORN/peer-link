# NH NongHyup Bank (`kr/nonghyup`) — experimental

Scope: NH NongHyup Bank (NH농협은행) **outgoing domestic KRW account transfers (계좌이체)**, using transaction history responses.

## Semantics
- Payer: `accountId` must resolve uniquely to an internal `deposit`, `checking`, or `savings` account.
- Payee: `recipientAccount` (optionally prefixed with `recipientBankCode:` for interbank transfers).
- Amount: converted from integer negative amount to whole KRW (`amountMinor`, `currencyExponent: 0`).
- Status: `SUCCESS`, `COMPLETED`, `성공`, or `정상` maps to `sent`. Nonfinal/pending/disputed transactions return `insufficient_evidence`.
