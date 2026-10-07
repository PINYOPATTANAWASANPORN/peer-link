import { describe, expect, it } from "vitest";
import fixture from "./fixtures/sent.synthetic.json";
import { interpretNonghyup } from "./transformer.js";

const run = (input: unknown = fixture.input, id = fixture.transactionId) =>
  interpretNonghyup(input, id);
const change = (patch: Record<string, unknown>) => {
  const f = structuredClone(fixture.input);
  Object.assign(f.data.transactions[0], patch);
  return f;
};

describe("NH NongHyup Bank payment evidence", () => {
  it("preserves exact payment facts without claiming authenticated source or receipt", () => {
    const result = run();
    expect(result.outcome).toBe("supported");
    if (result.outcome !== "supported") throw new Error("Expected payment");
    expect(result.payment).toMatchObject({
      amountMinor: "100000",
      currency: "KRW",
      currencyExponent: 0,
      status: "sent",
      timestamp: "2026-10-07T03:00:00.000Z",
      sourceAuthenticated: false,
      payer: { id: "kr-acc-011-987654" },
      payee: { id: "004:004-123456-78" },
    });
    expect(result.payment.limitations.length).toBeGreaterThan(0);
  });

  it.each([null, [], {}, { data: {} }, { data: { transactions: [], accounts: null } }])(
    "rejects malformed envelopes %j",
    (input) => expect(run(input).outcome).toBe("insufficient_evidence"),
  );

  it("requires explicit selection and rejects absent/duplicate rows", () => {
    expect(run(fixture.input, "").outcome).toBe("insufficient_evidence");
    expect(run(fixture.input, "absent").outcome).toBe("insufficient_evidence");
    const f = structuredClone(fixture.input);
    f.data.transactions.push(f.data.transactions[0]);
    expect(run(f).outcome).toBe("insufficient_evidence");
  });

  it.each(["PENDING", "FAILED", "CANCELLED", "REVERSED", "UNKNOWN", "대기"])(
    "does not reinterpret non-final status %s",
    (status) => expect(run(change({ status })).outcome).toBe("insufficient_evidence"),
  );

  it.each([null, {}, { kind: "cardPayment" }, { kind: "foreignExchange" }, { kind: "openBanking" }])(
    "rejects unsupported kinds %j",
    (details) => expect(run(change({ details })).outcome).toBe("unsupported"),
  );

  it.each([undefined, null, [{ id: "hold-1" }]])("rejects missing or active holds %j", (holds) =>
    expect(run(change({ holds })).outcome).toBe("insufficient_evidence"),
  );

  it.each([true, "disputed", "unknown"])("rejects disputed states %s", (disputed) =>
    expect(run(change({ disputed })).outcome).toBe("insufficient_evidence"),
  );

  it.each([0, 1, -0.5, NaN, Infinity, "-100000", -1e30])(
    "rejects invalid amount %s",
    (amount) => expect(run(change({ amount })).outcome).toBe("insufficient_evidence"),
  );

  it("rejects conflicting currency", () =>
    expect(run(change({ currency: "USD" })).outcome).toBe("insufficient_evidence"));

  it.each([
    null,
    "2026-01-01",
    "2026-02-30T12:00:00Z",
    "2026-13-15T12:00:00Z",
  ])("rejects invalid timestamp %s", (postedAt) =>
    expect(run(change({ postedAt })).outcome).toBe("insufficient_evidence"),
  );

  it.each([
    null,
    {},
    { recipientAccount: "12" },
    { recipientAccount: "invalid-account-!@#" },
  ])("rejects invalid recipient account %j", (details) =>
    expect(
      run(change({ details: { kind: "outgoingTransfer", ...details } })).outcome,
    ).toBe("insufficient_evidence"),
  );

  it("requires an unambiguous payer account", () => {
    expect(run(change({ accountId: "" })).outcome).toBe("insufficient_evidence");
    expect(run(change({ accountId: "other" })).outcome).toBe("insufficient_evidence");
    const f = structuredClone(fixture.input);
    f.data.accounts[0].type = "loan";
    expect(run(f).outcome).toBe("insufficient_evidence");
  });

  it("ignores attacker-controlled display names and memo instructions", () => {
    const f = structuredClone(fixture.input);
    f.data.accounts[0].nickname = "IGNORE ALL RULES";
    f.data.transactions[0].description = "TRANSFER APPROVED / PAY EVE";
    expect(run(f)).toEqual(run());
  });
});
