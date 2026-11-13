import { generateBookingCode } from './booking-code.js';

describe('generateBookingCode', () => {
  it('builds a short code without confusing characters', () => {
    const codes = Array.from({ length: 200 }, () => generateBookingCode());
    for (const code of codes) {
      expect(code).toMatch(/^PP-[A-HJKMNP-Z2-9]{8}$/);
      expect(code.length).toBeLessThanOrEqual(12);
    }
    expect(new Set(codes).size).toBe(codes.length);
  });
});
