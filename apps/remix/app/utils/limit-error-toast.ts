import { getLimitErrorKind } from '@documenso/lib/utils/limit-error';
import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

export type LimitErrorToastContent = {
  title: MessageDescriptor;
  description: MessageDescriptor;
};

/**
 * Map an AppError code to friendly toast copy for known limit errors, or return
 * `null` so callers can fall back to their existing generic message.
 *
 * Pass the result through Lingui's `_()` / `i18n._()` before showing the toast.
 */
export const getLimitErrorToastContent = (code: string): LimitErrorToastContent | null => {
  const kind = getLimitErrorKind(code);

  if (kind === 'quota') {
    return {
      title: msg`Usage limit reached`,
      description: msg`Your organisation has reached its plan's usage limit. Please contact your organisation administrator or support to continue.`,
    };
  }

  if (kind === 'recipients') {
    return {
      title: msg`Too many recipients`,
      description: msg`This document has too many recipients to be sent on your current plan. Please remove some recipients or contact support.`,
    };
  }

  return null;
};
