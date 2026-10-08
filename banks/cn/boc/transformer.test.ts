import { describe, expect, it } from "vitest";
import fixture from "./fixtures/sent.synthetic.json";
import { interpretBoc } from "./transformer.js";

const run = (input: unknown = fixture.input, id = fixture.transactionId) =>
  interpretBoc(input, id);

describe("Bank of China (中国银行) payment evidence", () => {
  it("preserves exact payment facts for completed domestic CNY account transfer", () => {
    const result = run();
    expect(result.outcome).toBe("supported");
    if (result.outcome !== "supported") throw new Error("Expected supported outcome");
    expect(result.payment).toMatchObject({
      amountMinor: "100000",
      currency: "CNY",
      status: "sent",
      timestamp: "2026-10-07T08:30:00.000Z",
      sourceAuthenticated: false,
      payer: { id: "6216611001123456789" },
      payee: { id: "104:6216611001987654321" }
    });
  });

  it("abstains when transaction is processing or pending", () => {
    const pendingInput = structuredClone(fixture.input);
    pendingInput.data.transfers[0].status = "PROCESSING";
    const result = run(pendingInput);
    expect(result.outcome).toBe("insufficient_evidence");
  });

  it("abstains when currency is not CNY", () => {
    const nonCnyInput = structuredClone(fixture.input);
    nonCnyInput.data.transfers[0].currency = "USD";
    const result = run(nonCnyInput);
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
