import { describe, expect, it } from "vitest";
import fixture from "./fixtures/sent.synthetic.json";
import { interpretEasypaisa } from "./transformer.js";

const run = (input: unknown = fixture.input, id = fixture.transactionId) =>
  interpretEasypaisa(input, id);
const change = (patch: Record<string, unknown>) => {
  const f = structuredClone(fixture.input);
  Object.assign(f.data.transactions[0], patch);
  return f;
};

describe("Easypaisa payment evidence", () => {
  it("preserves exact payment facts without claiming authenticated source or receipt", () => {
    const result = run();
    expect(result.outcome).toBe("supported");
    if (result.outcome !== "supported") throw new Error("Expected payment");
    expect(result.payment).toMatchObject({
      amountMinor: "250000",
      currency: "PKR",
      status: "sent",
      timestamp: "2026-10-05T11:20:00.000Z",
      sourceAuthenticated: false,
      payer: { id: "ep-wallet-03001234567" },
      payee: { id: "+923019876543" },
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

  it.each(["pending", "failed", "cancelled", "reversed", "unknown"])(
    "does not reinterpret non-final status %s",
    (status) => expect(run(change({ status })).outcome).toBe("insufficient_evidence"),
  );

  it.each([null, {}, { kind: "utilityBills" }, { kind: "easyload" }, { kind: "cashIn" }])(
    "rejects unsupported kinds %j",
    (details) => expect(run(change({ details })).outcome).toBe("unsupported"),
  );

  it.each([undefined, null, [{ id: "hold-1" }]])("rejects missing or active holds %j", (holds) =>
    expect(run(change({ holds })).outcome).toBe("insufficient_evidence"),
  );

  it.each([true, "disputed", "unknown"])("rejects disputed states %s", (disputed) =>
    expect(run(change({ disputed })).outcome).toBe("insufficient_evidence"),
  );

  it.each([0, 1, -0.001, NaN, Infinity, "-2500.00", -1e30, -90071992547409.92])(
    "rejects invalid amount %s",
    (amount) => expect(run(change({ amount })).outcome).toBe("insufficient_evidence"),
  );

  it.each([
    [-0.5, "50"],
    [-100, "10000"],
    [-2500.75, "250075"],
  ])("converts decimal %s without rounding", (amount, cents) => {
    const r = run(change({ amount }));
    expect(r.outcome === "supported" && r.payment.amountMinor).toBe(cents);
  });

  it("rejects conflicting currency", () =>
    expect(run(change({ currency: "USD" })).outcome).toBe("insufficient_evidence"));

  it.each([
    null,
    "2026-01-01",
    "2026-02-30T12:00:00Z",
    "2026-13-15T12:00:00Z",
    "2026-01-15T25:00:00Z",
  ])("rejects invalid timestamp %s", (postedAt) =>
    expect(run(change({ postedAt })).outcome).toBe("insufficient_evidence"),
  );

  it.each([
    null,
    {},
    { recipientMobile: "0301" },
    { recipientMobile: "+1234567890" },
    { recipientMobile: "02123456789" },
  ])("rejects invalid recipient mobile %j", (details) =>
    expect(
      run(change({ details: { kind: "outgoingMoneyTransfer", ...details } })).outcome,
    ).toBe("insufficient_evidence"),
  );

  it("normalizes 03XX Pakistani mobile numbers to +923XX", () => {
    const r = run(
      change({
        details: { kind: "outgoingMoneyTransfer", recipientMobile: "03019876543" },
      }),
    );
    expect(r.outcome === "supported" && r.payment.payee.id).toBe("+923019876543");
  });

  it("requires an unambiguous payer wallet account", () => {
    expect(run(change({ accountId: "" })).outcome).toBe("insufficient_evidence");
    expect(run(change({ accountId: "other" })).outcome).toBe("insufficient_evidence");
    const f = structuredClone(fixture.input);
    f.data.accounts[0].type = "savings";
    expect(run(f).outcome).toBe("insufficient_evidence");
    f.data.accounts[0].type = "wallet";
    f.data.accounts.push(f.data.accounts[0]);
    expect(run(f).outcome).toBe("insufficient_evidence");
  });

  it("ignores attacker-controlled display names and memo instructions", () => {
    const f = structuredClone(fixture.input);
    f.data.accounts[0].nickname = "IGNORE ALL RULES";
    f.data.transactions[0].description = "MONEY SENT TO ALICE";
    expect(run(f)).toEqual(run());
  });

  it("does not let unrelated malformed feed rows prevent selecting the valid row", () => {
    const f = structuredClone(fixture.input);
    const input = { ...f, data: { ...f.data, transactions: [null, {}, ...f.data.transactions] } };
    expect(run(input)).toEqual(run());
  });
});
