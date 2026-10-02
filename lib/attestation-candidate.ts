import type { Interpretation } from "./types";

/** Private adoption input, deliberately incomplete for settlement or signing. */
export type AttestationCandidate = {
  paymentId: string;
  payeeIdentity: { value: string; scheme: string };
  /** Current Peer settlement input uses two-decimal fiat units, including VND. */
  amount: bigint;
  amountExponent: 2;
  currency: string;
  sourceAmountMinor: bigint;
  sourceCurrencyExponent: number;
  timestampMs: number;
  bankStatus: string;
  direction: "outgoing" | "incoming";
  sourceAuthenticated: false;
};

/** Original transport-free mapping. Authentication, hashing, intent and method stay with the owner. */
export function toAttestationCandidate(result: Interpretation): AttestationCandidate {
  if (result.outcome !== "supported") throw new Error("Unsupported observation");
  const payment = result.payment;
  if (
    payment.schemaVersion !== "2" ||
    payment.sourceAuthenticated !== false ||
    !/^[1-9]\d*$/.test(payment.amountMinor) ||
    payment.amountMinor.length > 78 ||
    !/^[A-Z]{3}$/.test(payment.currency) ||
    !Number.isInteger(payment.currencyExponent) ||
    payment.currencyExponent < 0 ||
    payment.currencyExponent > 6 ||
    !payment.transactionId.trim() ||
    !payment.payee.id.trim() ||
    !payment.payee.scheme.trim() ||
    !payment.status.trim() ||
    !["incoming", "outgoing"].includes(payment.direction)
  )
    throw new Error("Invalid observation contract");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/.test(payment.timestamp))
    throw new Error("Timestamp must have explicit UTC provenance");
  const timestampMs = Date.parse(payment.timestamp);
  if (
    !Number.isSafeInteger(timestampMs) ||
    new Date(timestampMs).toISOString().slice(0, 19) !== payment.timestamp.slice(0, 19)
  )
    throw new Error("Invalid timestamp");
  const sourceAmountMinor = BigInt(payment.amountMinor);
  let amount: bigint;
  if (payment.currencyExponent <= 2) {
    amount = sourceAmountMinor * 10n ** BigInt(2 - payment.currencyExponent);
  } else {
    const divisor = 10n ** BigInt(payment.currencyExponent - 2);
    if (sourceAmountMinor % divisor !== 0n)
      throw new Error("Amount cannot be represented exactly at settlement precision");
    amount = sourceAmountMinor / divisor;
  }
  if (amount >= 2n ** 256n) throw new Error("Amount exceeds settlement integer range");
  return {
    paymentId: payment.transactionId,
    payeeIdentity: { value: payment.payee.id, scheme: payment.payee.scheme },
    amount,
    amountExponent: 2,
    currency: payment.currency,
    sourceAmountMinor,
    sourceCurrencyExponent: payment.currencyExponent,
    timestampMs,
    bankStatus: payment.status,
    direction: payment.direction,
    sourceAuthenticated: false,
  };
}
