/**
 * Pure deterministic parser for Ualá Argentina (Argentina / ARS) CVU/Alias transfer records.
 * Accepts authorized Ualá app comprobante / activity detail records.
 */

export function interpretUala(raw) {
  if (!raw || typeof raw !== 'object') {
    return { status: 'INVALID_RECORD', reason: 'Payload must be a non-null object' };
  }

  const opId = raw.coelsaId || raw.idOperacion || raw.idTransaccion || raw.operationId || raw.comprobanteId;
  if (!opId || typeof opId !== 'string' || opId.trim().length === 0) {
    return { status: 'INSUFFICIENT_EVIDENCE', reason: 'Missing or empty transaction / COELSA identifier (idOperacion)' };
  }

  const rawStatus = (raw.estado || raw.status || '').toUpperCase();
  const validStatuses = ['COMPLETADA', 'COMPLETADO', 'ACREDITADA', 'ACREDITADO', 'EXITOSA', 'SETTLED', 'SUCCESS'];
  if (!validStatuses.includes(rawStatus)) {
    return { status: 'NON_FINAL_STATUS', reason: `Transfer status '${rawStatus}' is not settled/completada` };
  }

  const rawAmount = raw.monto || raw.importe || raw.amount;
  if (rawAmount === undefined || rawAmount === null) {
    return { status: 'INSUFFICIENT_EVIDENCE', reason: 'Missing transfer amount (monto)' };
  }

  const numAmount = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount).replace(/[^0-9.-]+/g, ''));
  if (isNaN(numAmount) || numAmount <= 0) {
    return { status: 'INVALID_AMOUNT', reason: 'Transfer amount must be a positive number' };
  }

  // ARS uses 2 minor decimal units (centavos)
  const amountMinor = Math.round(numAmount * 100).toString();

  const rawCurrency = (raw.moneda || raw.currency || 'ARS').toUpperCase();
  if (rawCurrency !== 'ARS' && rawCurrency !== 'PESOS' && rawCurrency !== '$') {
    return { status: 'CURRENCY_MISMATCH', reason: `Expected currency ARS (Argentine Pesos), observed '${rawCurrency}'` };
  }

  const payerAccount = raw.cvuOrigen || raw.cuentaOrigen || raw.fromAccount;
  const payeeAccount = raw.cvuDestino || raw.aliasDestino || raw.cbuDestino || raw.toAccount;

  if (!payeeAccount || typeof payeeAccount !== 'string' || payeeAccount.trim().length === 0) {
    return { status: 'INSUFFICIENT_EVIDENCE', reason: 'Missing destination CVU / Alias (cvuDestino)' };
  }

  const timestamp = raw.fechaHora || raw.timestamp || raw.fecha || raw.dateTime;
  if (!timestamp || typeof timestamp !== 'string') {
    return { status: 'INSUFFICIENT_EVIDENCE', reason: 'Missing valid ISO timestamp (fechaHora)' };
  }

  return {
    status: 'SETTLED',
    transactionId: opId.trim(),
    currency: 'ARS',
    amountMinor,
    payer: payerAccount ? { accountIdentifier: String(payerAccount).trim() } : null,
    payee: {
      accountIdentifier: String(payeeAccount).trim(),
      name: raw.nombreDestinatario || raw.beneficiaryName ? String(raw.nombreDestinatario || raw.beneficiaryName).trim() : null
    },
    timestamp: timestamp.trim(),
    reference: raw.motivo || raw.concepto || raw.reference ? String(raw.motivo || raw.concepto || raw.reference).trim() : null
  };
}
