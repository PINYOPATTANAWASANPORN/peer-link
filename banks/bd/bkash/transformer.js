/**
 * Pure deterministic parser for bKash (Bangladesh / BDT) Send Money transactions.
 * Accepts authorized bKash app e-statement / transaction detail records.
 */

export function interpretBKash(raw) {
  if (!raw || typeof raw !== 'object') {
    return { status: 'INVALID_RECORD', reason: 'Payload must be a non-null object' };
  }

  const trxId = raw.trxId || raw.trxID || raw.transactionId || raw.transaction_id;
  if (!trxId || typeof trxId !== 'string' || trxId.trim().length === 0) {
    return { status: 'INSUFFICIENT_EVIDENCE', reason: 'Missing or empty transaction identifier (trxId)' };
  }

  const rawStatus = (raw.status || raw.transactionStatus || '').toUpperCase();
  const validStatuses = ['COMPLETED', 'SUCCESS', 'SUCCESSFUL', 'SETTLED'];
  if (!validStatuses.includes(rawStatus)) {
    return { status: 'NON_FINAL_STATUS', reason: `Transaction status '${rawStatus}' is not settled/completed` };
  }

  const rawAmount = raw.amount || raw.transAmount || raw.totalAmount;
  if (rawAmount === undefined || rawAmount === null) {
    return { status: 'INSUFFICIENT_EVIDENCE', reason: 'Missing transaction amount' };
  }

  const numAmount = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount).replace(/[^0-9.-]+/g, ''));
  if (isNaN(numAmount) || numAmount <= 0) {
    return { status: 'INVALID_AMOUNT', reason: 'Transaction amount must be a positive number' };
  }

  // BDT uses 2 minor decimal units (poisha)
  const amountMinor = Math.round(numAmount * 100).toString();

  const rawCurrency = (raw.currency || raw.currencyCode || 'BDT').toUpperCase();
  if (rawCurrency !== 'BDT') {
    return { status: 'CURRENCY_MISMATCH', reason: `Expected currency BDT, observed '${rawCurrency}'` };
  }

  const payerAccount = raw.senderNumber || raw.senderAccount || raw.fromAccount || raw.payerNumber;
  const payeeAccount = raw.receiverNumber || raw.receiverAccount || raw.toAccount || raw.payeeNumber;

  if (!payeeAccount || typeof payeeAccount !== 'string' || payeeAccount.trim().length === 0) {
    return { status: 'INSUFFICIENT_EVIDENCE', reason: 'Missing payee wallet number/account' };
  }

  const timestamp = raw.timestamp || raw.trxTime || raw.dateTime || raw.completedAt;
  if (!timestamp || typeof timestamp !== 'string') {
    return { status: 'INSUFFICIENT_EVIDENCE', reason: 'Missing valid ISO/RFC transaction timestamp' };
  }

  return {
    status: 'SETTLED',
    transactionId: trxId.trim(),
    currency: 'BDT',
    amountMinor,
    payer: payerAccount ? { accountIdentifier: String(payerAccount).trim() } : null,
    payee: { accountIdentifier: String(payeeAccount).trim(), name: raw.receiverName ? String(raw.receiverName).trim() : null },
    timestamp: timestamp.trim(),
    reference: raw.reference ? String(raw.reference).trim() : null
  };
}
