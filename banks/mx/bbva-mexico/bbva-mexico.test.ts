import { describe, it, expect } from 'vitest';
import { interpretBBVAMexico } from './transformer.js';
import syntheticSent from './fixtures/sent.synthetic.json';

describe('BBVA Mexico SPEI Adapter', () => {
  it('successfully interprets settled BBVA Mexico SPEI transfer', () => {
    const res = interpretBBVAMexico(syntheticSent);
    expect(res.status).toBe('SETTLED');
    expect(res.transactionId).toBe('MBAN01002304150098472839');
    expect(res.currency).toBe('MXN');
    expect(res.amountMinor).toBe('150000'); // 1,500.00 MXN
    expect(res.payee.accountIdentifier).toBe('012180012345678901');
  });

  it('fails closed on missing clave de rastreo', () => {
    const invalid = { ...syntheticSent, claveRastreo: '' };
    const res = interpretBBVAMexico(invalid);
    expect(res.status).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('fails closed on non-final status (EN_PROCESO / DEVUELTA)', () => {
    const pending = { ...syntheticSent, estado: 'DEVUELTA' };
    const res = interpretBBVAMexico(pending);
    expect(res.status).toBe('NON_FINAL_STATUS');
  });

  it('fails closed on currency mismatch', () => {
    const mismatch = { ...syntheticSent, moneda: 'USD' };
    const res = interpretBBVAMexico(mismatch);
    expect(res.status).toBe('CURRENCY_MISMATCH');
  });

  it('fails closed on invalid transfer amount', () => {
    const badAmount = { ...syntheticSent, importe: 0 };
    const res = interpretBBVAMexico(badAmount);
    expect(res.status).toBe('INVALID_AMOUNT');
  });

  it('fails closed on missing beneficiary account', () => {
    const noPayee = { ...syntheticSent, cuentaBeneficiario: '' };
    const res = interpretBBVAMexico(noPayee);
    expect(res.status).toBe('INSUFFICIENT_EVIDENCE');
  });
});
