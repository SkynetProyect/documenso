import { describe, expect, it } from 'vitest';

import { AppErrorCode } from '../errors/app-error';
import { getLimitErrorKind } from './limit-error';

describe('getLimitErrorKind', () => {
  it('classifies TOO_MANY_REQUESTS as a quota error', () => {
    expect(getLimitErrorKind(AppErrorCode.TOO_MANY_REQUESTS)).toBe('quota');
  });

  it('classifies RECIPIENT_LIMIT_EXCEEDED as a recipients error', () => {
    expect(getLimitErrorKind('RECIPIENT_LIMIT_EXCEEDED')).toBe('recipients');
  });

  it('returns null for unrelated codes', () => {
    expect(getLimitErrorKind(AppErrorCode.NOT_FOUND)).toBeNull();
    expect(getLimitErrorKind('SOMETHING_ELSE')).toBeNull();
  });
});
