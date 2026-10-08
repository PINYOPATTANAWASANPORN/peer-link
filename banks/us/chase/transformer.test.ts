import { describe, expect, it } from "vitest";
import fixture from "./fixtures/sent.synthetic.json";
import { interpretChase } from "./transformer.js";

const run = (input: unknown = fixture.input, id = fixture.transactionId) =>
  interpretChase(input, id);

describe("Chase Bank payment evidence", () => {
  it("preserves exact payment facts for completed domestic USD transfer", () => {
    const result = run();
    expect(result.outcome).toBe("supported");
    if (result.outcome !== "supported") throw new Error("Expected supported outcome");
    expect(result.payment).toMatchObject({
      amountMinor: "30000",
      currency: "USD",
      status: "sent",
      timestamp: "2026-10-07T12:00:00.000Z",
      sourceAuthenticated: false,
      payer: { id: "432156789012" },
      payee: { id: "021000021:876543210987" }
    });
  });

  it("abstains when transaction is pending or scheduled", () => {
    const pendingInput = structuredClone(fixture.input);
    pendingInput.data.transfers[0].status = "PENDING";
    const result = run(pendingInput);
    expect(result.outcome).toBe("insufficient_evidence");
  });

  it("abstains when currency is not USD", () => {
    const nonCurrInput = structuredClone(fixture.input);
    nonCurrInput.data.transfers[0].currency = "XXX";
    const result = run(nonCurrInput);
    expect(result.outcome).toBe("insufficient_evidence");
  });

  it("abstains when amount is invalid or zero", () => {
    const zeroInput = structuredClone(fixture.input);
    zeroInput.data.transfers[0].amount = "0";
    const result = run(zeroInput);
    expect(result.outcome).toBe("insufficient_evidence");
  });

  it("abstains on missing transaction ID", () => {
    const result = run(fixture.input, "NON-EXISTENT-ID");
    expect(result.outcome).toBe("insufficient_evidence");
  });
});
