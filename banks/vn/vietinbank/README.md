# VietinBank (`vn/vietinbank`) — experimental

Scope: VietinBank (Ngân hàng TMCP Công Thương Việt Nam) **outgoing domestic VND transfers and Napas 247 transfers**, using transaction history responses.

## Semantics
- Payer: `accountId` must resolve uniquely to an internal `checking` or `current` account.
- Payee: `recipientAccount` (optionally prefixed with `recipientBankCode:` for interbank Napas transfers).
- Amount: converted from integer negative amount to whole VND (`amountMinor`, `currencyExponent: 0`).
- Status: `SUCCESS`, `COMPLETED`, or `Thành công` maps to `sent`. Nonfinal/pending/disputed transactions return `insufficient_evidence`.
