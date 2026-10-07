import { describe, it, expect } from 'vitest';
import { interpretBCP } from './transformer.js';
import syntheticSent from './fixtures/sent.synthetic.json';

describe('Banco de Credito del Peru (BCP) Adapter', () => {
  it('successfully interprets settled BCP PEN transfer', () => {
    const res = interpretBCP(syntheticSent);
    expect(res.status).toBe('SETTLED');
    expect(res.transactionId).toBe('00548921');
    expect(res.currency).toBe('PEN');
    expect(res.amountMinor).toBe('45000'); // 450.00 PEN
    expect(res.payee.accountIdentifier).toBe('191-98765432-0-12');
  });

  it('fails closed on missing operation number', () => {
    const invalid = { ...syntheticSent, numeroOperacion: '' };
    const res = interpretBCP(invalid);
    expect(res.status).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('fails closed on non-final status (EN_PROCESO / RECHAZADO)', () => {
    const pending = { ...syntheticSent, estado: 'EN_PROCESO' };
    const res = interpretBCP(pending);
    expect(res.status).toBe('NON_FINAL_STATUS');
  });

  it('fails closed on currency mismatch', () => {
    const mismatch = { ...syntheticSent, moneda: 'USD' };
    const res = interpretBCP(mismatch);
    expect(res.status).toBe('CURRENCY_MISMATCH');
  });

  it('fails closed on invalid transfer amount', () => {
    const badAmount = { ...syntheticSent, monto: -50 };
    const res = interpretBCP(badAmount);
    expect(res.status).toBe('INVALID_AMOUNT');
  });

  it('fails closed on missing payee destination account', () => {
    const noPayee = { ...syntheticSent, cuentaDestino: '' };
    const res = interpretBCP(noPayee);
    expect(res.status).toBe('INSUFFICIENT_EVIDENCE');
  });
});
