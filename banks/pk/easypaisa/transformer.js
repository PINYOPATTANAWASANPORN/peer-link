/**
 * Pure, read-only Easypaisa transaction interpretation. No login, network or signing.
 * @param {unknown} input An Easypaisa transaction history response.
 * @param {string} transactionId Selected Easypaisa transaction ID.
 * @returns {import('../../../lib/types.js').Interpretation}
 */
export function interpretEasypaisa(input, transactionId) {
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
  if (details?.kind !== "outgoingMoneyTransfer")
    return { outcome: "unsupported", reason: "Only outgoing domestic PKR Easypaisa money transfers are supported" };
  if (row.status !== "completed" && row.status !== "success")
    return fail("Transaction is not reported completed or successful");
  if (row.pending === true) return fail("Pending transactions cannot be interpreted as sent");
  if (!Array.isArray(row.holds) || row.holds.length !== 0)
    return fail("Active holds must be present and empty");
  if (row.disputed === true) return fail("Disputed transactions are not supported");
  if (typeof row.amount !== "number" || !Number.isFinite(row.amount) || row.amount >= 0)
    return fail("Expected a finite negative PKR debit");

  // Decimal-string conversion avoids floating-point multiplication and rounding.
  const decimal = String(-row.amount);
  if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(decimal))
    return fail("Amount must have at most two decimals");
  const [whole, fraction = ""] = decimal.split(".");
  const paise = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (paise <= 0n || paise > BigInt(Number.MAX_SAFE_INTEGER))
    return fail("Amount outside supported range");
  if (row.currency !== undefined && row.currency !== "PKR") return fail("Conflicting currency");
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
    !/^(\+92|0)3\d{9}$/.test(recipientMobile)
  )
    return fail("Valid 11-digit or E.164 Pakistani recipient mobile number is required");

  if (!nonempty(row.accountId)) return fail("Payer account identifier is missing");
  const accounts = data.accounts.filter((a) => object(a)?.id === row.accountId);
  if (accounts.length !== 1 || object(accounts[0])?.type !== "wallet")
    return fail("Payer must resolve to exactly one internal Easypaisa wallet account");

  // Normalize mobile number to +92 format
  const normalizedPayee = recipientMobile.startsWith("0")
    ? "+92" + recipientMobile.slice(1)
    : recipientMobile;

  return {
    outcome: "supported",
    payment: {
      schemaVersion: "2",
      provider: "pk/easypaisa",
      transactionId,
      payer: {
        id: /** @type {string} */ (row.accountId),
        scheme: "easypaisa-account-id",
        provenance: "transaction.accountId",
      },
      payee: {
        id: normalizedPayee,
        scheme: "pk-mobile-number",
        provenance: "transaction.details.recipientMobile",
      },
      amountMinor: paise.toString(),
      currency: "PKR",
      currencyExponent: 2,
      direction: "outgoing",
      status: "sent",
      timestamp: row.postedAt,
      timestampMeaning: "postedAt",
      sourceAuthenticated: false,
      limitations: [
        "Input authenticity is not established by this parser.",
        "Completed is the sender-wallet reported status, not proof of recipient final settlement.",
        "Payer identity is an internal Easypaisa account reference, not a verified legal person.",
        "Transaction ID is local to Easypaisa; no cross-network deduplication is claimed.",
        "PKR is inferred from the supported domestic Easypaisa money transfer surface.",
      ],
    },
  };
}
