/**
 * Pure deterministic parser for Banco de Crédito del Perú (BCP - Peru / PEN) transfer movements.
 * Accepts authorized BCP Banca Móvil / Banca por Internet receipt records.
 */

export function interpretBCP(raw) {
  if (!raw || typeof raw !== 'object') {
    return { status: 'INVALID_RECORD', reason: 'Payload must be a non-null object' };
  }

  const opNumber = raw.numeroOperacion || raw.operationNumber || raw.nroOperacion || raw.idOperacion || raw.operation_id;
  if (!opNumber || typeof opNumber !== 'string' || opNumber.trim().length === 0) {
    return { status: 'INSUFFICIENT_EVIDENCE', reason: 'Missing or empty operation number (numeroOperacion)' };
  }

  const rawStatus = (raw.estado || raw.status || '').toUpperCase();
  const validStatuses = ['EXITOSO', 'PROCESADO', 'REALIZADO', 'SETTLED', 'COMPLETED', 'SUCCESS'];
  if (!validStatuses.includes(rawStatus)) {
    return { status: 'NON_FINAL_STATUS', reason: `Operation status '${rawStatus}' is not settled/exitoso` };
  }

  const rawAmount = raw.monto || raw.importe || raw.amount;
  if (rawAmount === undefined || rawAmount === null) {
    return { status: 'INSUFFICIENT_EVIDENCE', reason: 'Missing transfer amount (monto)' };
  }

  const numAmount = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount).replace(/[^0-9.-]+/g, ''));
  if (isNaN(numAmount) || numAmount <= 0) {
    return { status: 'INVALID_AMOUNT', reason: 'Transfer amount must be a positive number' };
  }

  // PEN uses 2 minor decimal units (céntimos)
  const amountMinor = Math.round(numAmount * 100).toString();

  const rawCurrency = (raw.moneda || raw.currency || 'PEN').toUpperCase();
  if (rawCurrency !== 'PEN' && rawCurrency !== 'S/' && rawCurrency !== 'SOLES') {
    return { status: 'CURRENCY_MISMATCH', reason: `Expected currency PEN (Soles), observed '${rawCurrency}'` };
  }

  const payerAccount = raw.cuentaOrigen || raw.sourceAccount || raw.fromAccount;
  const payeeAccount = raw.cuentaDestino || raw.destinationAccount || raw.cciDestino || raw.toAccount;

  if (!payeeAccount || typeof payeeAccount !== 'string' || payeeAccount.trim().length === 0) {
    return { status: 'INSUFFICIENT_EVIDENCE', reason: 'Missing destination account / CCI (cuentaDestino)' };
  }

  const timestamp = raw.fechaHora || raw.timestamp || raw.dateTime || raw.fecha;
  if (!timestamp || typeof timestamp !== 'string') {
    return { status: 'INSUFFICIENT_EVIDENCE', reason: 'Missing valid ISO timestamp (fechaHora)' };
  }

  return {
    status: 'SETTLED',
    transactionId: opNumber.trim(),
    currency: 'PEN',
    amountMinor,
    payer: payerAccount ? { accountIdentifier: String(payerAccount).trim() } : null,
    payee: {
      accountIdentifier: String(payeeAccount).trim(),
      name: raw.nombreBeneficiario || raw.beneficiaryName ? String(raw.nombreBeneficiario || raw.beneficiaryName).trim() : null
    },
    timestamp: timestamp.trim(),
    reference: raw.motivo || raw.mensaje || raw.reference ? String(raw.motivo || raw.mensaje || raw.reference).trim() : null
  };
}
