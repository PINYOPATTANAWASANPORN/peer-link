/**
 * Pure deterministic parser for BBVA México (Mexico / MXN) SPEI transfer records.
 * Accepts authorized BBVA México Móvil / Web movement records with clave de rastreo.
 */

export function interpretBBVAMexico(raw) {
  if (!raw || typeof raw !== 'object') {
    return { status: 'INVALID_RECORD', reason: 'Payload must be a non-null object' };
  }

  const claveRastreo = raw.claveRastreo || raw.clave_de_rastreo || raw.trackingKey || raw.folio || raw.folioOperacion;
  if (!claveRastreo || typeof claveRastreo !== 'string' || claveRastreo.trim().length === 0) {
    return { status: 'INSUFFICIENT_EVIDENCE', reason: 'Missing or empty clave de rastreo / folio' };
  }

  const rawStatus = (raw.estado || raw.status || '').toUpperCase();
  const validStatuses = ['LIQUIDADA', 'LIQUIDADO', 'EXITOSA', 'EXITOSO', 'SETTLED', 'COMPLETED', 'SUCCESS'];
  if (!validStatuses.includes(rawStatus)) {
    return { status: 'NON_FINAL_STATUS', reason: `SPEI status '${rawStatus}' is not settled/liquidada` };
  }

  const rawAmount = raw.importe || raw.monto || raw.amount;
  if (rawAmount === undefined || rawAmount === null) {
    return { status: 'INSUFFICIENT_EVIDENCE', reason: 'Missing SPEI transfer amount' };
  }

  const numAmount = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount).replace(/[^0-9.-]+/g, ''));
  if (isNaN(numAmount) || numAmount <= 0) {
    return { status: 'INVALID_AMOUNT', reason: 'Transfer amount must be a positive number' };
  }

  // MXN uses 2 minor decimal units (centavos)
  const amountMinor = Math.round(numAmount * 100).toString();

  const rawCurrency = (raw.moneda || raw.currency || 'MXN').toUpperCase();
  if (rawCurrency !== 'MXN' && rawCurrency !== 'PESOS' && rawCurrency !== '$') {
    return { status: 'CURRENCY_MISMATCH', reason: `Expected currency MXN (Mexican Pesos), observed '${rawCurrency}'` };
  }

  const payerAccount = raw.cuentaRetiro || raw.cuentaCargo || raw.clabeEmisora || raw.fromAccount;
  const payeeAccount = raw.cuentaBeneficiario || raw.cuentaAbono || raw.clabeReceptora || raw.toAccount;

  if (!payeeAccount || typeof payeeAccount !== 'string' || payeeAccount.trim().length === 0) {
    return { status: 'INSUFFICIENT_EVIDENCE', reason: 'Missing beneficiary CLABE/account (cuentaBeneficiario)' };
  }

  const timestamp = raw.fechaOperacion || raw.fechaHora || raw.timestamp || raw.dateTime;
  if (!timestamp || typeof timestamp !== 'string') {
    return { status: 'INSUFFICIENT_EVIDENCE', reason: 'Missing valid ISO timestamp (fechaOperacion)' };
  }

  return {
    status: 'SETTLED',
    transactionId: claveRastreo.trim(),
    currency: 'MXN',
    amountMinor,
    payer: payerAccount ? { accountIdentifier: String(payerAccount).trim() } : null,
    payee: {
      accountIdentifier: String(payeeAccount).trim(),
      name: raw.nombreBeneficiario || raw.beneficiaryName ? String(raw.nombreBeneficiario || raw.beneficiaryName).trim() : null
    },
    timestamp: timestamp.trim(),
    reference: raw.concepto || raw.referenciaNumerica || raw.reference ? String(raw.concepto || raw.referenciaNumerica || raw.reference).trim() : null
  };
}
