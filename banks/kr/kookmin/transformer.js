export function interpretKookmin(input, transactionId) {
  if (!input || typeof input !== "object") {
    return { outcome: "insufficient_evidence", error: "Input must be an object" };
  }

  const data = input.data || input;
  const transfers = Array.isArray(data.transfers) ? data.transfers : Array.isArray(data.transactions) ? data.transactions : [];

  if (transfers.length === 0) {
    return { outcome: "insufficient_evidence", error: "No transfers list found" };
  }

  const tx = transfers.find((t) => String(t.transactionId || t.id || t.txId) === String(transactionId));
  if (!tx) {
    return { outcome: "insufficient_evidence", error: "Transaction not found" };
  }

  // Validate status
  const statusStr = String(tx.status || tx.transferStatus || "").toUpperCase();
  if (statusStr !== "COMPLETED" && statusStr !== "SUCCESS" && statusStr !== "SETTLED" && statusStr !== "DONE") {
    return { outcome: "insufficient_evidence", error: `Non-final or unhandled status: ${tx.status}` };
  }

  // Validate currency
  const currency = String(tx.currency || tx.currencyCode || "").toUpperCase();
  if (currency !== "KRW") {
    return { outcome: "insufficient_evidence", error: `Unsupported currency: ${currency}` };
  }

  // Validate amount
  const rawAmount = tx.amount || tx.transferAmount || tx.txAmount;
  const amountMinor = String(Math.round(Number(rawAmount)));
  if (!rawAmount || isNaN(Number(rawAmount)) || Number(rawAmount) <= 0) {
    return { outcome: "insufficient_evidence", error: "Invalid transfer amount" };
  }

  // Format ISO timestamp
  let timestamp = tx.timestamp || tx.completedAt || tx.transactedAt;
  if (!timestamp || isNaN(new Date(timestamp).getTime())) {
    return { outcome: "insufficient_evidence", error: "Invalid transaction timestamp" };
  }
  timestamp = new Date(timestamp).toISOString();

  // Extract payer / payee details
  const payerAcc = tx.senderAccount || tx.payerAccount || tx.fromAccount;
  const payeeAcc = tx.recipientAccount || tx.payeeAccount || tx.toAccount;
  const payeeBank = tx.recipientBankCode || tx.receivingBankCode || "004";

  if (!payerAcc || !payeeAcc) {
    return { outcome: "insufficient_evidence", error: "Missing sender or recipient account information" };
  }

  return {
    outcome: "supported",
    payment: {
      amountMinor,
      currency: "KRW",
      status: "sent",
      timestamp,
      sourceAuthenticated: false,
      payer: {
        id: String(payerAcc)
      },
      payee: {
        id: `${payeeBank}:${payeeAcc}`
      }
    }
  };
}
