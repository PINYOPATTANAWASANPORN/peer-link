export function interpretBoc(input, transactionId) {
  if (!input || typeof input !== "object") {
    return { outcome: "insufficient_evidence", error: "Input must be an object" };
  }

  const data = input.data || input;
  const transfers = Array.isArray(data.transfers) ? data.transfers : Array.isArray(data.transactions) ? data.transactions : [];

  if (transfers.length === 0) {
    return { outcome: "insufficient_evidence", error: "No transfers list found" };
  }

  const tx = transfers.find((t) => String(t.transactionId || t.id || t.txId || t.orderNo) === String(transactionId));
  if (!tx) {
    return { outcome: "insufficient_evidence", error: "Transaction not found" };
  }

  // Validate bank-reported success status
  const statusStr = String(tx.status || tx.transferStatus || "").toUpperCase();
  if (statusStr !== "SUCCESS" && statusStr !== "COMPLETED" && statusStr !== "SUCCESSFUL" && statusStr !== "SETTLED") {
    return { outcome: "insufficient_evidence", error: `Non-final or unhandled status: ${tx.status}` };
  }

  // Validate currency (CNY / RMB)
  const currency = String(tx.currency || tx.currencyCode || "").toUpperCase();
  if (currency !== "CNY" && currency !== "RMB") {
    return { outcome: "insufficient_evidence", error: `Unsupported currency: ${currency}` };
  }

  // Validate amount in yuan, convert to minor units (cents / fen, 2 decimals)
  const rawAmount = tx.amount || tx.transferAmount || tx.txAmount;
  if (!rawAmount || isNaN(Number(rawAmount)) || Number(rawAmount) <= 0) {
    return { outcome: "insufficient_evidence", error: "Invalid transfer amount" };
  }
  const amountMinor = String(Math.round(Number(rawAmount) * 100));

  // Validate timestamp ISO string
  let timestamp = tx.timestamp || tx.transactedAt || tx.completedAt || tx.tradeTime;
  if (!timestamp || isNaN(new Date(timestamp).getTime())) {
    return { outcome: "insufficient_evidence", error: "Invalid transaction timestamp" };
  }
  timestamp = new Date(timestamp).toISOString();

  // Extract payer and payee accounts
  const payerAcc = tx.senderAccount || tx.payerAccount || tx.fromAccount || tx.payerCardNo;
  const payeeAcc = tx.recipientAccount || tx.payeeAccount || tx.toAccount || tx.payeeCardNo;
  const payeeBank = tx.recipientBankCode || tx.receivingBankCode || "104";

  if (!payerAcc || !payeeAcc) {
    return { outcome: "insufficient_evidence", error: "Missing sender or recipient account information" };
  }

  return {
    outcome: "supported",
    payment: {
      amountMinor,
      currency: "CNY",
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
