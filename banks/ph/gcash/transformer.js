/**
 * Pure, read-only GCash transaction interpretation. No login, network or signing.
 * @param {unknown} input A GCash transaction history response.
 * @param {string} transactionId Selected GCash transaction reference ID.
 * @returns {import('../../../lib/types.js').Interpretation}
 */
export function interpretGCash(input, transactionId) {
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
  if (details?.kind !== "outgoingSendMoney")
    return { outcome: "unsupported", reason: "Only outgoing domestic PHP GCash Send Money transfers are supported" };
  if (row.status !== "completed" && row.status !== "success")
    return fail("Transaction is not reported completed or successful");
  if (row.pending === true) return fail("Pending transactions cannot be interpreted as sent");
  if (!Array.isArray(row.holds) || row.holds.length !== 0)
    return fail("Active holds must be present and empty");
  if (row.disputed === true) return fail("Disputed transactions are not supported");
  if (typeof row.amount !== "number" || !Number.isFinite(row.amount) || row.amount >= 0)
    return fail("Expected a finite negative PHP debit");

  // Decimal-string conversion avoids floating-point multiplication and rounding.
  const decimal = String(-row.amount);
  if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(decimal))
    return fail("Amount must have at most two decimals");
  const [whole, fraction = ""] = decimal.split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (cents <= 0n || cents > BigInt(Number.MAX_SAFE_INTEGER))
    return fail("Amount outside supported range");
  if (row.currency !== undefined && row.currency !== "PHP") return fail("Conflicting currency");
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

  const recipientMobile = details.recipientMobile;
  if (
    typeof recipientMobile !== "string" ||
    !/^(\+63|0)9\d{9}$/.test(recipientMobile)
  )
    return fail("Valid 11-digit or E.164 Philippine recipient mobile number is required");

  if (!nonempty(row.accountId)) return fail("Payer account identifier is missing");
  const accounts = data.accounts.filter((a) => object(a)?.id === row.accountId);
  if (accounts.length !== 1 || object(accounts[0])?.type !== "wallet")
    return fail("Payer must resolve to exactly one internal GCash wallet account");

  // Normalize mobile number to +63 format
  const normalizedPayee = recipientMobile.startsWith("0")
    ? "+63" + recipientMobile.slice(1)
    : recipientMobile;

  return {
    outcome: "supported",
    payment: {
      schemaVersion: "2",
      provider: "ph/gcash",
      transactionId,
      payer: {
        id: /** @type {string} */ (row.accountId),
        scheme: "gcash-account-id",
        provenance: "transaction.accountId",
      },
      payee: {
        id: normalizedPayee,
        scheme: "ph-mobile-number",
        provenance: "transaction.details.recipientMobile",
      },
      amountMinor: cents.toString(),
      currency: "PHP",
      currencyExponent: 2,
      direction: "outgoing",
      status: "sent",
      timestamp: row.postedAt,
      timestampMeaning: "postedAt",
      sourceAuthenticated: false,
      limitations: [
        "Input authenticity is not established by this parser.",
        "Completed is the sender-wallet reported status, not proof of recipient final settlement.",
        "Payer identity is an internal GCash account reference, not a verified legal person.",
        "Transaction ID is local to GCash; no cross-network deduplication is claimed.",
        "PHP is inferred from the supported domestic GCash Send Money surface.",
      ],
    },
  };
}
