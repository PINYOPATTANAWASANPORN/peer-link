/**
 * Pure, read-only Hana Bank (하나은행) transaction interpretation.
 * No login, network, or cryptographic signing.
 * @param {unknown} input A Hana Bank transaction history response.
 * @param {string} transactionId Selected transaction reference ID.
 * @returns {import('../../../lib/types.js').Interpretation}
 */
export function interpretHana(input, transactionId) {
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
    return fail("Expected transactions and accounts arrays in data object");
  if (!nonempty(transactionId)) return fail("A transaction ID is required");

  const rows = data.transactions.filter((row) => object(row)?.id === transactionId);
  if (rows.length !== 1)
    return fail("Selected transaction must occur exactly once in this page");

  const row = object(rows[0]);
  if (!row) return fail("Invalid transaction object");

  const details = object(row.details);
  if (details?.kind !== "outgoingTransfer" && details?.kind !== "domesticAccountTransfer")
    return { outcome: "unsupported", reason: "Only outgoing domestic KRW account transfers are supported" };

  if (row.status !== "SUCCESS" && row.status !== "COMPLETED" && row.status !== "성공" && row.status !== "정상")
    return fail("Transaction status is not reported completed or successful");

  if (row.pending === true) return fail("Pending transactions cannot be interpreted as sent");
  if (!Array.isArray(row.holds) || row.holds.length !== 0)
    return fail("Active holds must be present and empty");
  if (row.disputed === true) return fail("Disputed transactions are not supported");

  // KRW amounts are whole integer won (currencyExponent: 0).
  if (typeof row.amount !== "number" || !Number.isFinite(row.amount) || row.amount >= 0)
    return fail("Expected a finite negative KRW debit amount");

  const absAmount = -row.amount;
  if (!Number.isInteger(absAmount) || absAmount <= 0 || absAmount > Number.MAX_SAFE_INTEGER)
    return fail("Amount must be a positive integer whole KRW value");

  const amountMinor = BigInt(absAmount).toString();

  if (row.currency !== undefined && row.currency !== "KRW" && row.currency !== "원")
    return fail("Conflicting currency");

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

  const recipientAccount = details.recipientAccount;
  if (typeof recipientAccount !== "string" || !/^[0-9-]{9,20}$/.test(recipientAccount))
    return fail("Valid Korean recipient account number is required");

  if (!nonempty(row.accountId)) return fail("Payer account identifier is missing");
  const accounts = data.accounts.filter((a) => object(a)?.id === row.accountId);
  if (accounts.length !== 1 || object(accounts[0])?.type !== "checking" && object(accounts[0])?.type !== "savings" && object(accounts[0])?.type !== "deposit")
    return fail("Payer must resolve to exactly one internal deposit/checking account");

  const recipientBankCode = details.recipientBankCode ? `${details.recipientBankCode}:` : "";
  const payeeId = `${recipientBankCode}${recipientAccount}`;

  return {
    outcome: "supported",
    payment: {
      schemaVersion: "2",
      provider: "kr/hana",
      transactionId,
      payer: {
        id: /** @type {string} */ (row.accountId),
        scheme: "kr-bank-account",
        provenance: "transaction.accountId",
      },
      payee: {
        id: payeeId,
        scheme: "kr-bank-account",
        provenance: "transaction.details.recipientAccount",
      },
      amountMinor,
      currency: "KRW",
      currencyExponent: 0,
      direction: "outgoing",
      status: "sent",
      timestamp: row.postedAt,
      timestampMeaning: "postedAt",
      sourceAuthenticated: false,
      limitations: [
        "Input authenticity is not established by this parser.",
        "SUCCESS is the sender-bank reported status, not proof of recipient final settlement.",
        "Payer identity is an internal account reference, not a verified legal person.",
        "Transaction ID is local to Hana Bank; no cross-network deduplication is claimed.",
        "KRW is inferred from the supported domestic Hana Bank transfer surface.",
      ],
    },
  };
}
