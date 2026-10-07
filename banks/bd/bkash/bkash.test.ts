import { describe, it, expect } from 'vitest';
import { interpretBKash } from './transformer.js';
import syntheticSent from './fixtures/sent.synthetic.json';

describe('bKash (BD) Payment Adapter', () => {
  it('successfully interprets settled bKash Send Money transfer', () => {
    const res = interpretBKash(syntheticSent);
    expect(res.status).toBe('SETTLED');
    expect(res.transactionId).toBe('BL63G9X2M1');
    expect(res.currency).toBe('BDT');
    expect(res.amountMinor).toBe('250000'); // 2,500.00 BDT
    expect(res.payee.accountIdentifier).toBe('01812345678');
  });

  it('fails closed on missing transaction ID', () => {
    const invalid = { ...syntheticSent, trxId: '' };
    const res = interpretBKash(invalid);
    expect(res.status).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('fails closed on non-final status (PENDING / FAILED)', () => {
    const pending = { ...syntheticSent, status: 'PENDING' };
    const res = interpretBKash(pending);
    expect(res.status).toBe('NON_FINAL_STATUS');
  });

  it('fails closed on currency mismatch', () => {
    const mismatch = { ...syntheticSent, currency: 'USD' };
    const res = interpretBKash(mismatch);
    expect(res.status).toBe('CURRENCY_MISMATCH');
  });

  it('fails closed on negative or zero amount', () => {
    const badAmount = { ...syntheticSent, amount: -100 };
    const res = interpretBKash(badAmount);
    expect(res.status).toBe('INVALID_AMOUNT');
  });

  it('fails closed on missing payee account', () => {
    const noPayee = { ...syntheticSent, receiverNumber: '' };
    const res = interpretBKash(noPayee);
    expect(res.status).toBe('INSUFFICIENT_EVIDENCE');
  });
});
