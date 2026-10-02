import { describe, expect, it } from "vitest";
import fixture from "../banks/us/mercury/fixtures/sent.synthetic.json";
import { interpretMercury } from "../banks/us/mercury/transformer";
import { toAttestationCandidate } from "./attestation-candidate";
import type { PaymentObservation } from "./types";

function observation(): PaymentObservation {
  const result = interpretMercury(fixture.input, fixture.transactionId);
  if (result.outcome !== "supported") throw new Error("Invalid synthetic fixture");
  return result.payment;
}

describe("private adoption candidate", () => {
  it("maps USD to settlement units without creating signing authority", () => {
    const result = toAttestationCandidate({ outcome: "supported", payment: observation() });
    expect(result).toEqual({
      paymentId: "synthetic-wire-001",
      payeeIdentity: { value: "000000000:000000000001", scheme: "us-routing-account" },
      amount: 12345n,
      amountExponent: 2,
      currency: "USD",
      sourceAmountMinor: 12345n,
      sourceCurrencyExponent: 2,
      timestampMs: 1768478400000,
      bankStatus: "sent",
      direction: "outgoing",
      sourceAuthenticated: false,
    });
    expect(result).not.toHaveProperty("intentHash");
    expect(result).not.toHaveProperty("method");
    expect(result).not.toHaveProperty("payeeId");
  });
  it("converts 25,000 VND to 2,500,000 settlement units while preserving source precision", () => {
    const payment = {
      ...observation(),
      currency: "VND",
      currencyExponent: 0,
      amountMinor: "25000",
    };
    expect(toAttestationCandidate({ outcome: "supported", payment })).toMatchObject({
      amount: 2500000n,
      amountExponent: 2,
      sourceAmountMinor: 25000n,
      sourceCurrencyExponent: 0,
    });
  });
  it("converts higher precision exactly and rejects rounding or integer overflow", () => {
    const payment = { ...observation(), currency: "KWD", currencyExponent: 3 };
    expect(
      toAttestationCandidate({
        outcome: "supported",
        payment: { ...payment, amountMinor: "123450" },
      }).amount,
    ).toBe(12345n);
    for (const amountMinor of ["123451", (2n ** 256n * 10n).toString()]) {
      expect(() =>
        toAttestationCandidate({ outcome: "supported", payment: { ...payment, amountMinor } }),
      ).toThrow();
    }
    expect(() =>
      toAttestationCandidate({
        outcome: "supported",
        payment: { ...observation(), amountMinor: (2n ** 256n).toString() },
      }),
    ).toThrow("integer range");
  });
  it.each([
    { schemaVersion: "1" },
    { sourceAuthenticated: true },
    { amountMinor: "0" },
    { amountMinor: "1.00" },
    { currency: "usd" },
    { currencyExponent: -1 },
    { currencyExponent: 1.5 },
    { currencyExponent: 7 },
    { transactionId: " " },
    { payee: { id: "", scheme: "us-routing-account", provenance: "field" } },
    { payee: { id: "synthetic", scheme: "", provenance: "field" } },
    { status: "" },
    { direction: "unknown" },
    { timestamp: "2026-01-15T12:00:00" },
    { timestamp: "2026-02-30T12:00:00Z" },
    { timestamp: "2026-99-01T12:00:00Z" },
  ])("rejects ambiguous or incorrectly normalized evidence: %j", (change) => {
    const payment = { ...observation(), ...change } as PaymentObservation;
    expect(() => toAttestationCandidate({ outcome: "supported", payment })).toThrow();
  });
  it("cannot turn abstention into a payment", () => {
    expect(() =>
      toAttestationCandidate({ outcome: "unsupported", reason: "not supported" }),
    ).toThrow();
  });
});
