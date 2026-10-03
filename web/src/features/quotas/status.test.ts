import { describe, expect, it } from 'vitest';
import { quotaStatus } from './status';

describe('quotaStatus', () => {
  it('marks unlimited quotas explicitly', () => {
    expect(quotaStatus(null, null)).toBe('unlimited');
  });

  it('uses sold-out, almost-sold-out, and good thresholds', () => {
    expect(quotaStatus(100, 10)).toBe('almost_sold_out');
    expect(quotaStatus(100, 25)).toBe('almost_sold_out');
    expect(quotaStatus(100, 26)).toBe('good');
    expect(quotaStatus(0, 0)).toBe('sold_out');
    expect(quotaStatus(1, 1)).toBe('good');
  });
});
