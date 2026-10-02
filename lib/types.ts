/** Interpretation of supplied evidence, never authentication of its origin. */
export type PaymentObservation = {
  schemaVersion: "2";
  provider: string;
  transactionId: string;
  payer: { id: string; scheme: string; provenance: string };
  payee: {
    id: string;
    scheme: string;
    provenance: string;
  };
  amountMinor: string;
  currency: string;
  currencyExponent: number;
  direction: "outgoing" | "incoming";
  /** Preserve the bank's exact scoped status; the adopting service owns finality. */
  status: string;
  timestamp: string;
  timestampMeaning: string;
  sourceAuthenticated: false;
  limitations: string[];
};
/** An adapter handles evidence only. It has no HTTP, credentials, signer or intent authority. */
export type BankAdapter = {
  readonly id: string;
  readonly version: string;
  readonly capability: string;
  interpret(evidence: unknown, transactionId: string): Interpretation;
};
export type Interpretation =
  | { outcome: "supported"; payment: PaymentObservation }
  | { outcome: "insufficient_evidence" | "unsupported"; reason: string };
export type PaymentClaim = {
  payerId: string;
  payeeId: string;
  amountMinor: string;
  currency: string;
};
