/**
 * Pure, read-only Wells Fargo transaction interpretation. No login, network or signing.
 * @param {unknown} input A Wells Fargo web transactions-lite response.
 * @param {string} transactionId Selected Wells Fargo transaction ID.
 * @returns {import('../../../lib/types.js').Interpretation}
 */
export function interpretWellsFargo(input, transactionId) {
  const fail = (/** @type {string} */ reason) =>
    /** @type {const} */ ({ outcome: "insufficient_evidence", reason });
  const object = (/** @type {unknown} */ v) =>
    v !== null && typeof v === "object" && !Array.isArray(v)
      ? /** @type {Record<string, unknown>} */ (v)
      : null;
  const nonempty = (/** @type {unknown} */ v) =>
    typeof v === "string" && v.trim().length > 0;
  const root = object(input);
  const data = object(root?.data);
  if (!data || !Array.isArray(data.transactions) || !Array.isArray(data.accounts))
    return fail("Expected transactions and accounts arrays");
  if (!nonempty(transactionId)) return fail("A transaction ID is required");
  const rows = data.transactions.filter((row) => object(row)?.id === transactionId);
  if (rows.length !== 1)
    return fail("Selected transaction must occur exactly once in this page");
  const row = object(rows[0]);
  if (!row) return fail("Invalid transaction");
  const details = object(row.details);
  if (details?.kind !== "outgoingDomesticACH")
    return { outcome: "unsupported", reason: "Only outgoing domestic USD ACH transfers are supported" };
  if (row.status !== "posted" && row.status !== "settled")
    return fail("Transaction is not bank-reported posted or settled");
  if (row.pending === true) return fail("Pending transactions cannot be interpreted as sent");
  if (!Array.isArray(row.holds) || row.holds.length !== 0)
    return fail("Active holds must be present and empty");
  if (row.disputed === true) return fail("Disputed transactions are not supported");
  if (typeof row.amount !== "number" || !Number.isFinite(row.amount) || row.amount >= 0)
    return fail("Expected a finite negative USD debit");

  // Decimal-string conversion avoids floating-point multiplication and rounding.
  const decimal = String(-row.amount);
  if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(decimal))
    return fail("Amount must have at most two decimals");
  const [whole, fraction = ""] = decimal.split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (cents <= 0n || cents > BigInt(Number.MAX_SAFE_INTEGER))
    return fail("Amount outside supported range");
  if (row.currency !== undefined && row.currency !== "USD") return fail("Conflicting currency");
  if (
    typeof row.postedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/.test(row.postedAt)
  )
    return fail("Expected a UTC postedAt timestamp");
  const date = new Date(row.postedAt);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 19) !== row.postedAt.slice(0, 19)
  )
    return fail("Invalid postedAt timestamp");
  const routing = object(details.achRoutingInfo);
  if (
    !routing ||
    typeof routing.routingNumber !== "string" ||
    !/^\d{9}$/.test(routing.routingNumber) ||
    typeof routing.accountNumber !== "string" ||
    !/^\d{4,17}$/.test(routing.accountNumber)
  )
    return fail("Full recipient routing and account identifiers are required");
  if (!nonempty(row.accountId)) return fail("Payer account identifier is missing");
  const accounts = data.accounts.filter((a) => object(a)?.id === row.accountId);
  if (accounts.length !== 1 || object(accounts[0])?.type !== "checking")
    return fail("Payer must resolve to exactly one internal checking account");
  return {
    outcome: "supported",
    payment: {
      schemaVersion: "2",
      provider: "us/wells-fargo",
      transactionId,
      payer: {
        id: /** @type {string} */ (row.accountId),
        scheme: "wells-fargo-account-id",
        provenance: "transaction.accountId",
      },
      payee: {
        id: `${routing.routingNumber}:${routing.accountNumber}`,
        scheme: "us-routing-account",
        provenance: "transaction.details.achRoutingInfo",
      },
      amountMinor: cents.toString(),
      currency: "USD",
      currencyExponent: 2,
      direction: "outgoing",
      status: "sent",
      timestamp: row.postedAt,
      timestampMeaning: "postedAt",
      sourceAuthenticated: false,
      limitations: [
        "Input authenticity is not established by this parser.",
        "Posted/settled is the sender-bank status, not proof of recipient credit or irreversible settlement.",
        "Payer identity is a Wells Fargo account reference, not a verified legal person.",
        "Transaction ID is local to this ledger; no cross-bank deduplication is claimed.",
        "USD is inferred from the supported domestic ACH surface.",
      ],
    },
  };
}
