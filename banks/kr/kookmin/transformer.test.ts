import { describe, expect, it } from "vitest";
import fixture from "./fixtures/sent.synthetic.json";
import { interpretKookmin } from "./transformer.js";

const run = (input: unknown = fixture.input, id = fixture.transactionId) =>
  interpretKookmin(input, id);

describe("KB Kookmin Bank (KB국민은행) payment evidence", () => {
  it("preserves exact payment facts for completed domestic KRW account transfer", () => {
    const result = run();
    expect(result.outcome).toBe("supported");
    if (result.outcome !== "supported") throw new Error("Expected supported outcome");
    expect(result.payment).toMatchObject({
      amountMinor: "50000",
      currency: "KRW",
      status: "sent",
      timestamp: "2026-10-07T00:00:00.000Z",
      sourceAuthenticated: false,
      payer: { id: "004-987654-01-012" },
      payee: { id: "088:088-123456-02-034" }
    });
  });

  it("abstains when transaction is scheduled or pending", () => {
    const pendingInput = structuredClone(fixture.input);
    pendingInput.data.transfers[0].status = "SCHEDULED";
    const result = run(pendingInput);
    expect(result.outcome).toBe("insufficient_evidence");
  });

  it("abstains when currency is not KRW", () => {
    const nonKrwInput = structuredClone(fixture.input);
    nonKrwInput.data.transfers[0].currency = "USD";
    const result = run(nonKrwInput);
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
