import { describe, expect, it } from 'vitest';

import { computeQuotaFlags } from './compute-quota-flags';

describe('computeQuotaFlags', () => {
  it('returns all false when every quota is unlimited (null)', () => {
    const result = computeQuotaFlags({
      quotas: { documentQuota: null, emailQuota: null, apiQuota: null },
      usage: { documentCount: 100, emailCount: 100, apiCount: 100 },
    });

    expect(result).toEqual({
      isDocumentQuotaExceeded: false,
      isEmailQuotaExceeded: false,
      isApiQuotaExceeded: false,
    });
  });

  it('treats a quota of 0 as always exceeded (blocked)', () => {
    const result = computeQuotaFlags({
      quotas: { documentQuota: 0, emailQuota: 0, apiQuota: 0 },
      usage: { documentCount: 0, emailCount: 0, apiCount: 0 },
    });

    expect(result).toEqual({
      isDocumentQuotaExceeded: true,
      isEmailQuotaExceeded: true,
      isApiQuotaExceeded: true,
    });
  });

  it('is exceeded when usage equals or exceeds a positive quota', () => {
    const result = computeQuotaFlags({
      quotas: { documentQuota: 10, emailQuota: 10, apiQuota: 10 },
      usage: { documentCount: 10, emailCount: 11, apiCount: 9 },
    });

    expect(result).toEqual({
      isDocumentQuotaExceeded: true, // equal => exceeded
      isEmailQuotaExceeded: true, // over => exceeded
      isApiQuotaExceeded: false, // under => not exceeded
    });
  });

  it('treats missing usage counts as zero', () => {
    const result = computeQuotaFlags({
      quotas: { documentQuota: 5, emailQuota: 5, apiQuota: 5 },
      usage: undefined,
    });

    expect(result).toEqual({
      isDocumentQuotaExceeded: false,
      isEmailQuotaExceeded: false,
      isApiQuotaExceeded: false,
    });
  });
});
