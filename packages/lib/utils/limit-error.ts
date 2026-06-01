import { AppErrorCode } from '../errors/app-error';

export type LimitErrorKind = 'quota' | 'recipients';

/**
 * Classify an AppError code into a known limit-error kind, or `null` if it is
 * not a limit error. `RECIPIENT_LIMIT_EXCEEDED` is thrown server-side as a raw
 * string (it is intentionally not part of the AppErrorCode enum).
 */
export const getLimitErrorKind = (code: string): LimitErrorKind | null => {
  if (code === AppErrorCode.TOO_MANY_REQUESTS) {
    return 'quota';
  }

  if (code === 'RECIPIENT_LIMIT_EXCEEDED') {
    return 'recipients';
  }

  return null;
};
