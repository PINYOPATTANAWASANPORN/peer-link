import { describe, it, expect } from 'vitest';
import { interpretUala } from './transformer.js';
import syntheticSent from './fixtures/sent.synthetic.json';

describe('Uala Argentina Transfer Adapter', () => {
  it('successfully interprets settled Uala ARS transfer', () => {
    const res = interpretUala(syntheticSent);
    expect(res.status).toBe('SETTLED');
    expect(res.transactionId).toBe('COELSA-984729104829');
    expect(res.currency).toBe('ARS');
    expect(res.amountMinor).toBe('2500000'); // 25,000.00 ARS
    expect(res.payee.accountIdentifier).toBe('0000003100012345678901');
  });

  it('fails closed on missing transaction / COELSA ID', () => {
    const invalid = { ...syntheticSent, coelsaId: '' };
    const res = interpretUala(invalid);
    expect(res.status).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('fails closed on non-final status (PENDIENTE / RECHAZADA)', () => {
    const pending = { ...syntheticSent, estado: 'PENDIENTE' };
    const res = interpretUala(pending);
    expect(res.status).toBe('NON_FINAL_STATUS');
  });

  it('fails closed on currency mismatch', () => {
    const mismatch = { ...syntheticSent, moneda: 'USD' };
    const res = interpretUala(mismatch);
    expect(res.status).toBe('CURRENCY_MISMATCH');
  });

  it('fails closed on invalid transfer amount', () => {
    const badAmount = { ...syntheticSent, monto: -100 };
    const res = interpretUala(badAmount);
    expect(res.status).toBe('INVALID_AMOUNT');
  });

  it('fails closed on missing payee destination CVU/Alias', () => {
    const noPayee = { ...syntheticSent, cvuDestino: '' };
    const res = interpretUala(noPayee);
    expect(res.status).toBe('INSUFFICIENT_EVIDENCE');
  });
});
