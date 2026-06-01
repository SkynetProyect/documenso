# Rate Limit & Quota UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the in-app UX for the dynamic rate-limit/quota hotfix: show admins/managers a quota-exhausted banner, surface clear toast errors when the document quota or recipient cap is hit, and warn in the editor when a document exceeds the recipient cap.

**Architecture:** A server helper computes three booleans (document/email/api quota exhausted) from the organisation claim + current monthly stat. The authenticated layout loader resolves the current org and returns those booleans (never raw numbers). A new banner component renders them to admins/managers with a contact-support dialog. A shared pure helper classifies limit-error codes; the app maps that classification to friendly toast copy reused across all create/send flows. The org claim's `recipientCount` is exposed to the editors, which show a destructive Alert when recipients exceed the cap.

**Tech Stack:** TypeScript, React Router (Remix) loaders, tRPC, Prisma, Zod, Lingui (`<Trans>` / `msg` / `useLingui`), Shadcn/Radix UI primitives, ts-pattern, Vitest (unit tests in `packages/lib`), Playwright (E2E).

**Reference spec:** `docs/superpowers/specs/2026-06-01-rate-limit-quota-ux-design.md`

---

## File Structure

**Create:**
- `packages/lib/server-only/rate-limit/compute-quota-flags.ts` — pure function: quotas + usage → 3 booleans.
- `packages/lib/server-only/rate-limit/compute-quota-flags.test.ts` — unit tests.
- `packages/lib/server-only/rate-limit/get-organisation-quota-flags.ts` — loads claim + current monthly stat, calls the pure function.
- `packages/lib/utils/limit-error.ts` — pure helper: error code → `'quota' | 'recipients' | null`.
- `packages/lib/utils/limit-error.test.ts` — unit tests.
- `apps/remix/app/utils/limit-error-toast.ts` — maps classification to Lingui `MessageDescriptor` toast content.
- `apps/remix/app/components/general/organisations/organisation-quota-banner.tsx` — the banner + dialog.

**Modify:**
- `apps/remix/app/routes/_authenticated+/_layout.tsx` — resolve org, return flags, render banner.
- `packages/lib/types/organisation.ts` — add `recipientCount` to the claim pick.
- `apps/remix/app/components/general/document/document-upload-button-legacy.tsx` — quota toast.
- `apps/remix/app/components/dialogs/template-use-dialog.tsx` — quota toast.
- `apps/remix/app/components/general/direct-template/direct-template-page.tsx` — parse + limit toast.
- `apps/remix/app/components/embed/embed-direct-template-client-page.tsx` — parse + limit toast.
- `apps/remix/app/components/general/envelope-editor/envelope-editor-recipient-form.tsx` — recipient-cap Alert.
- `packages/ui/primitives/document-flow/add-signers.tsx` — recipient-cap Alert.
- `apps/remix/app/components/dialogs/envelope-distribute-dialog.tsx` — send limit toast.
- `apps/remix/app/components/dialogs/envelope-redistribute-dialog.tsx` — resend limit toast.
- `apps/remix/app/components/general/document/document-edit-form.tsx` — V1 send limit toast.
- `apps/remix/app/components/dialogs/document-resend-dialog.tsx` — V1 resend limit toast.

---

## Task 1: Pure quota-flag computation

**Files:**
- Create: `packages/lib/server-only/rate-limit/compute-quota-flags.ts`
- Test: `packages/lib/server-only/rate-limit/compute-quota-flags.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/lib/server-only/rate-limit/compute-quota-flags.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @documenso/lib -- compute-quota-flags`
Expected: FAIL — cannot find module `./compute-quota-flags`.

- [ ] **Step 3: Write the implementation**

Create `packages/lib/server-only/rate-limit/compute-quota-flags.ts`:

```ts
export type QuotaFlags = {
  isDocumentQuotaExceeded: boolean;
  isEmailQuotaExceeded: boolean;
  isApiQuotaExceeded: boolean;
};

type ComputeQuotaFlagsOptions = {
  quotas: {
    documentQuota: number | null;
    emailQuota: number | null;
    apiQuota: number | null;
  };
  usage?: {
    documentCount?: number;
    emailCount?: number;
    apiCount?: number;
  };
};

/**
 * A quota of `null` means unlimited (never exceeded). A quota of `0` means
 * blocked (always exceeded). Otherwise usage `>=` quota is exceeded.
 */
const isQuotaExceeded = (quota: number | null, usage: number): boolean => {
  if (quota === null) {
    return false;
  }

  if (quota === 0) {
    return true;
  }

  return usage >= quota;
};

export const computeQuotaFlags = ({ quotas, usage }: ComputeQuotaFlagsOptions): QuotaFlags => {
  return {
    isDocumentQuotaExceeded: isQuotaExceeded(quotas.documentQuota, usage?.documentCount ?? 0),
    isEmailQuotaExceeded: isQuotaExceeded(quotas.emailQuota, usage?.emailCount ?? 0),
    isApiQuotaExceeded: isQuotaExceeded(quotas.apiQuota, usage?.apiCount ?? 0),
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w @documenso/lib -- compute-quota-flags`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/lib/server-only/rate-limit/compute-quota-flags.ts packages/lib/server-only/rate-limit/compute-quota-flags.test.ts
git commit -m "feat: add pure quota flag computation"
```

---

## Task 2: Organisation quota-flag loader helper

**Files:**
- Create: `packages/lib/server-only/rate-limit/get-organisation-quota-flags.ts`

This wraps `computeQuotaFlags` with a DB read. It is exercised by E2E rather than unit tests (it touches Prisma).

- [ ] **Step 1: Write the implementation**

Create `packages/lib/server-only/rate-limit/get-organisation-quota-flags.ts`:

```ts
import { prisma } from '@documenso/prisma';

import { currentMonthlyPeriod } from '../../universal/monthly-period';
import type { QuotaFlags } from './compute-quota-flags';
import { computeQuotaFlags } from './compute-quota-flags';

type GetOrganisationQuotaFlagsOptions = {
  organisationId: string;
};

/**
 * Compute whether the organisation has exhausted any of its monthly quotas
 * (document / email / api) for the current period. Returns booleans only; raw
 * usage counts and quota caps are never surfaced to callers/clients.
 */
export const getOrganisationQuotaFlags = async ({
  organisationId,
}: GetOrganisationQuotaFlagsOptions): Promise<QuotaFlags> => {
  const period = currentMonthlyPeriod();

  const [organisationClaim, monthlyStat] = await Promise.all([
    prisma.organisationClaim.findFirst({
      where: {
        organisation: {
          id: organisationId,
        },
      },
      select: {
        documentQuota: true,
        emailQuota: true,
        apiQuota: true,
      },
    }),
    prisma.organisationMonthlyStat.findUnique({
      where: {
        organisationId_period: {
          organisationId,
          period,
        },
      },
      select: {
        documentCount: true,
        emailCount: true,
        apiCount: true,
      },
    }),
  ]);

  if (!organisationClaim) {
    return {
      isDocumentQuotaExceeded: false,
      isEmailQuotaExceeded: false,
      isApiQuotaExceeded: false,
    };
  }

  return computeQuotaFlags({
    quotas: {
      documentQuota: organisationClaim.documentQuota,
      emailQuota: organisationClaim.emailQuota,
      apiQuota: organisationClaim.apiQuota,
    },
    usage: monthlyStat ?? undefined,
  });
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p packages/lib/tsconfig.json`
Expected: No errors related to this file. (If the package has no dedicated tsconfig path, run `npm run lint -w @documenso/lib` or rely on the editor; do NOT run the full `npm run build`.)

- [ ] **Step 3: Commit**

```bash
git add packages/lib/server-only/rate-limit/get-organisation-quota-flags.ts
git commit -m "feat: add organisation quota flag loader"
```

---

## Task 3: Return quota flags from the authenticated layout loader

**Files:**
- Modify: `apps/remix/app/routes/_authenticated+/_layout.tsx`

- [ ] **Step 1: Add imports**

At the top of `apps/remix/app/routes/_authenticated+/_layout.tsx`, add these imports alongside the existing ones:

```ts
import { getOrganisationQuotaFlags } from '@documenso/lib/server-only/rate-limit/get-organisation-quota-flags';
import { prisma } from '@documenso/prisma';
```

- [ ] **Step 2: Resolve the org and compute flags in the loader**

Replace the existing `loader` function body (lines 28-41) with:

```ts
export async function loader({ request, params }: Route.LoaderArgs) {
  const [session, banner] = await Promise.all([
    getOptionalSession(request),
    getSiteSettings().then((settings) => settings.find((setting) => setting.id === SITE_SETTINGS_BANNER_ID)),
  ]);

  if (!session.isAuthenticated) {
    throw redirect('/signin');
  }

  const emptyQuotaFlags = {
    isDocumentQuotaExceeded: false,
    isEmailQuotaExceeded: false,
    isApiQuotaExceeded: false,
  };

  const orgUrl = params.orgUrl;
  const teamUrl = params.teamUrl;

  // Resolve the current organisation from the URL (scoped to membership) so we
  // can compute the quota banner flags. Returns empty flags when no org context.
  const currentOrganisation =
    orgUrl || teamUrl
      ? await prisma.organisation.findFirst({
          where: {
            members: {
              some: {
                userId: session.user.id,
              },
            },
            ...(orgUrl ? { url: orgUrl } : { teams: { some: { url: teamUrl } } }),
          },
          select: {
            id: true,
          },
        })
      : null;

  const quotaFlags = currentOrganisation
    ? await getOrganisationQuotaFlags({ organisationId: currentOrganisation.id })
    : emptyQuotaFlags;

  return {
    banner,
    quotaFlags,
  };
}
```

- [ ] **Step 3: Pass flags to the component**

In the `Layout` component, update the destructure on line 44 from:

```ts
  const { banner } = loaderData;
```

to:

```ts
  const { banner, quotaFlags } = loaderData;
```

- [ ] **Step 4: Render the banner (import + mount)**

Add this import near the other component imports (after the `OrganisationBillingBanner` import on line 15):

```ts
import { OrganisationQuotaBanner } from '~/components/general/organisations/organisation-quota-banner';
```

Then, in the returned JSX, add the banner directly below `<OrganisationBillingBanner />` (line 110):

```tsx
        <OrganisationBillingBanner />

        <OrganisationQuotaBanner quotaFlags={quotaFlags} />
```

> NOTE: `OrganisationQuotaBanner` is created in Task 4 below. This step will not type-check until Task 4 is done — do Task 4 before type-checking/committing this task, or commit Tasks 3 and 4 together.

- [ ] **Step 5: Commit (with Task 4)**

Defer committing until Task 4 is complete, then commit both together (see Task 4 Step 4).

---

## Task 4: OrganisationQuotaBanner component

**Files:**
- Create: `apps/remix/app/components/general/organisations/organisation-quota-banner.tsx`

- [ ] **Step 1: Write the component**

Create `apps/remix/app/components/general/organisations/organisation-quota-banner.tsx`:

```tsx
import { useOptionalCurrentOrganisation } from '@documenso/lib/client-only/providers/organisation';
import { SUPPORT_EMAIL } from '@documenso/lib/constants/app';
import { canExecuteOrganisationAction } from '@documenso/lib/utils/organisations';
import { Alert, AlertDescription } from '@documenso/ui/primitives/alert';
import { Button } from '@documenso/ui/primitives/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@documenso/ui/primitives/dialog';
import { Trans } from '@lingui/react/macro';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export type OrganisationQuotaBannerProps = {
  quotaFlags: {
    isDocumentQuotaExceeded: boolean;
    isEmailQuotaExceeded: boolean;
    isApiQuotaExceeded: boolean;
  };
};

export const OrganisationQuotaBanner = ({ quotaFlags }: OrganisationQuotaBannerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const organisation = useOptionalCurrentOrganisation();

  const isAnyQuotaExceeded =
    quotaFlags.isDocumentQuotaExceeded || quotaFlags.isEmailQuotaExceeded || quotaFlags.isApiQuotaExceeded;

  // Only admins/managers see the banner, and only when a quota is exhausted.
  if (
    !organisation ||
    !isAnyQuotaExceeded ||
    !canExecuteOrganisationAction('MANAGE_ORGANISATION', organisation.currentOrganisationRole)
  ) {
    return null;
  }

  return (
    <>
      <div className="bg-yellow-200 text-yellow-900 dark:bg-yellow-400">
        <div className="mx-auto flex max-w-screen-xl items-center justify-center gap-x-4 px-4 py-2 font-medium text-sm">
          <div className="flex items-center">
            <AlertTriangle className="mr-2.5 h-5 w-5" />

            <Trans>Your organisation has reached a usage limit on its current plan.</Trans>
          </div>

          <Button
            variant="outline"
            className="text-yellow-900 hover:bg-yellow-100 dark:hover:bg-yellow-500"
            onClick={() => setIsOpen(true)}
            size="sm"
          >
            <Trans>Learn more</Trans>
          </Button>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans>Usage limit reached</Trans>
            </DialogTitle>

            <DialogDescription>
              <Trans>
                Your organisation has reached a usage limit on its current plan. Some actions, such as creating or
                sending documents, may be temporarily unavailable.
              </Trans>
            </DialogDescription>
          </DialogHeader>

          <Alert variant="neutral">
            <AlertDescription>
              <Trans>
                To review or adjust your plan's limits, please contact us at{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
              </Trans>
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">
                <Trans>Close</Trans>
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p apps/remix/tsconfig.json`
Expected: No errors for `organisation-quota-banner.tsx` or `_layout.tsx`.

- [ ] **Step 3: Manual smoke check (optional but recommended)**

Run `npm run dev`, set an org's `documentQuota` to `0` via the admin org page, log in as an admin/manager of that org, and confirm the yellow banner appears and the dialog shows the support email. Confirm a `MEMBER` does not see it.

- [ ] **Step 4: Commit Tasks 3 + 4 together**

```bash
git add apps/remix/app/components/general/organisations/organisation-quota-banner.tsx apps/remix/app/routes/_authenticated+/_layout.tsx
git commit -m "feat: show quota exhausted banner to org admins and managers"
```

---

## Task 5: Pure limit-error classifier

**Files:**
- Create: `packages/lib/utils/limit-error.ts`
- Test: `packages/lib/utils/limit-error.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/lib/utils/limit-error.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @documenso/lib -- limit-error`
Expected: FAIL — cannot find module `./limit-error`.

- [ ] **Step 3: Write the implementation**

Create `packages/lib/utils/limit-error.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w @documenso/lib -- limit-error`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/lib/utils/limit-error.ts packages/lib/utils/limit-error.test.ts
git commit -m "feat: add limit error classifier"
```

---

## Task 6: App toast-content helper

**Files:**
- Create: `apps/remix/app/utils/limit-error-toast.ts`

- [ ] **Step 1: Write the helper**

Create `apps/remix/app/utils/limit-error-toast.ts`:

```ts
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p apps/remix/tsconfig.json`
Expected: No errors for `limit-error-toast.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/remix/app/utils/limit-error-toast.ts
git commit -m "feat: add limit error toast content helper"
```

---

## Task 7: Quota toast in document upload flow

**Files:**
- Modify: `apps/remix/app/components/general/document/document-upload-button-legacy.tsx:128-159`

- [ ] **Step 1: Add the import**

Add near the top of the file (with the other `~/utils` or component imports):

```ts
import { getLimitErrorToastContent } from '~/utils/limit-error-toast';
```

- [ ] **Step 2: Use the helper in the catch block**

Replace the `catch` block body (lines 128-159) with:

```ts
    } catch (err) {
      const error = AppError.parseError(err);

      console.error(err);

      const limitToast = getLimitErrorToastContent(error.code);

      if (limitToast) {
        toast({
          title: _(limitToast.title),
          description: _(limitToast.description),
          variant: 'destructive',
          duration: 7500,
        });

        setIsLoading(false);

        return;
      }

      const errorMessage = match(error.code)
        .with('INVALID_DOCUMENT_FILE', () => msg`You cannot upload encrypted PDFs.`)
        .with(
          AppErrorCode.LIMIT_EXCEEDED,
          () => msg`You have reached your document limit for this month. Please upgrade your plan.`,
        )
        .with(
          'ENVELOPE_ITEM_LIMIT_EXCEEDED',
          () => msg`You have reached the limit of the number of files per envelope.`,
        )
        .with('UNSUPPORTED_FILE_TYPE', () => msg`This file type isn't supported. Please upload a PDF or Word document.`)
        .with(
          'CONVERSION_SERVICE_UNAVAILABLE',
          () => msg`Document conversion is temporarily unavailable. Please try again shortly or upload a PDF.`,
        )
        .with(
          'CONVERSION_FAILED',
          () => msg`We couldn't convert this file. Please check it's a valid Word document or upload a PDF instead.`,
        )
        .otherwise(() => msg`An error occurred while uploading your document.`);

      toast({
        title: _(msg`Error`),
        description: _(errorMessage),
        variant: 'destructive',
        duration: 7500,
      });
    } finally {
      setIsLoading(false);
    }
```

> NOTE: `setIsLoading(false)` runs both in the early `return` path and the `finally`. The early `return` still executes `finally`, so this is safe; the explicit call before `return` is redundant but harmless. If you prefer, drop the explicit `setIsLoading(false)` before `return` since `finally` covers it.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p apps/remix/tsconfig.json`
Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add apps/remix/app/components/general/document/document-upload-button-legacy.tsx
git commit -m "feat: show quota toast when document upload hits quota"
```

---

## Task 8: Quota toast in create-from-template flow

**Files:**
- Modify: `apps/remix/app/components/dialogs/template-use-dialog.tsx:181-201`

- [ ] **Step 1: Add the import**

Add with the other `~/` imports near the top:

```ts
import { getLimitErrorToastContent } from '~/utils/limit-error-toast';
```

- [ ] **Step 2: Use the helper in the catch block**

Replace the `catch` block (lines 181-201) with:

```ts
    } catch (err) {
      const error = AppError.parseError(err);

      const limitToast = getLimitErrorToastContent(error.code);

      if (limitToast) {
        toast({
          title: _(limitToast.title),
          description: _(limitToast.description),
          variant: 'destructive',
        });

        return;
      }

      const errorMessage = match(error.code)
        .with('DOCUMENT_SEND_FAILED', () => msg`The document was created but could not be sent to recipients.`)
        .with(
          AppErrorCode.INVALID_BODY,
          AppErrorCode.INVALID_REQUEST,
          () =>
            msg`The document could not be created because of missing or invalid information. Please review the template's recipients and fields.`,
        )
        .with(AppErrorCode.NOT_FOUND, () => msg`The template or one of its recipients could not be found.`)
        .with(AppErrorCode.LIMIT_EXCEEDED, () => msg`You have reached your document limit for this plan.`)
        .otherwise(() => msg`An error occurred while creating document from template.`);

      toast({
        title: _(msg`Error`),
        description: _(errorMessage),
        variant: 'destructive',
      });
    }
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p apps/remix/tsconfig.json`
Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add apps/remix/app/components/dialogs/template-use-dialog.tsx
git commit -m "feat: show quota toast when create-from-template hits quota"
```

---

## Task 9: Limit toast in direct-template flows

**Files:**
- Modify: `apps/remix/app/components/general/direct-template/direct-template-page.tsx:122-130`
- Modify: `apps/remix/app/components/embed/embed-direct-template-client-page.tsx:251-267`

These flows currently use a generic catch with no `AppError.parse`.

- [ ] **Step 1: Add imports to `direct-template-page.tsx`**

Confirm `AppError` is imported; if not, add:

```ts
import { AppError } from '@documenso/lib/errors/app-error';
```

Add:

```ts
import { getLimitErrorToastContent } from '~/utils/limit-error-toast';
```

- [ ] **Step 2: Update the catch block in `direct-template-page.tsx`**

Replace lines 122-130 with:

```ts
    } catch (err) {
      const error = AppError.parseError(err);
      const limitToast = getLimitErrorToastContent(error.code);

      toast({
        title: limitToast ? _(limitToast.title) : _(msg`Something went wrong`),
        description: limitToast
          ? _(limitToast.description)
          : _(msg`We were unable to submit this document at this time. Please try again later.`),
        variant: 'destructive',
      });

      throw err;
    }
```

- [ ] **Step 3: Add imports to `embed-direct-template-client-page.tsx`**

Confirm `AppError` is imported; if not, add:

```ts
import { AppError } from '@documenso/lib/errors/app-error';
```

Add:

```ts
import { getLimitErrorToastContent } from '~/utils/limit-error-toast';
```

- [ ] **Step 4: Update the catch block in `embed-direct-template-client-page.tsx`**

Replace lines 251-267 with:

```ts
    } catch (err) {
      if (window.parent) {
        window.parent.postMessage(
          {
            action: 'document-error',
            data: String(err),
          },
          '*',
        );
      }

      const error = AppError.parseError(err);
      const limitToast = getLimitErrorToastContent(error.code);

      toast({
        title: limitToast ? _(limitToast.title) : _(msg`Something went wrong`),
        description: limitToast
          ? _(limitToast.description)
          : _(msg`We were unable to submit this document at this time. Please try again later.`),
        variant: 'destructive',
      });
    }
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p apps/remix/tsconfig.json`
Expected: No new errors.

- [ ] **Step 6: Commit**

```bash
git add apps/remix/app/components/general/direct-template/direct-template-page.tsx apps/remix/app/components/embed/embed-direct-template-client-page.tsx
git commit -m "feat: show limit toast in direct template flows"
```

---

## Task 10: Expose recipientCount to the editor frontend

**Files:**
- Modify: `packages/lib/types/organisation.ts:16-24`

- [ ] **Step 1: Add `recipientCount` to the claim pick**

In `ZOrganisationSchema`, update the `organisationClaim` pick (lines 16-24) to include `recipientCount`:

```ts
  organisationClaim: OrganisationClaimSchema.pick({
    id: true,
    createdAt: true,
    updatedAt: true,
    originalSubscriptionClaimId: true,
    teamCount: true,
    memberCount: true,
    recipientCount: true,
    flags: true,
  }),
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p packages/lib/tsconfig.json`
Expected: No errors. (`recipientCount` is a field on `OrganisationClaimSchema`.)

- [ ] **Step 3: Commit**

```bash
git add packages/lib/types/organisation.ts
git commit -m "feat: expose recipientCount on organisation claim schema"
```

---

## Task 11: Recipient-cap Alert in V2 editor recipient form

**Files:**
- Modify: `apps/remix/app/components/general/envelope-editor/envelope-editor-recipient-form.tsx`

The form already imports `Card, CardContent, ...` (line 20) and uses `signers` (a field array, line 165) and `organisation` (line 47).

- [ ] **Step 1: Add the Alert import**

Add to the imports:

```ts
import { Alert, AlertDescription } from '@documenso/ui/primitives/alert';
```

- [ ] **Step 2: Compute the over-cap condition**

`signers` is defined via `useFieldArray` at line 165, so the derived value must come after it. Place this immediately above the component's `return (` statement (to avoid a use-before-declaration error):

```ts
  const recipientCountLimit = organisation.organisationClaim.recipientCount;
  const isOverRecipientLimit = recipientCountLimit > 0 && signers.length > recipientCountLimit;
```

- [ ] **Step 3: Render the Alert inside CardContent**

Inside `<CardContent>` (line 629), immediately above `<Form {...form}>` (line 630), add:

```tsx
        {isOverRecipientLimit && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              <Trans>
                This document has more than {recipientCountLimit} recipients and cannot be sent on your current plan.
                Please remove recipients to continue.
              </Trans>
            </AlertDescription>
          </Alert>
        )}
```

> NOTE: This file uses the `useLingui()` `t` macro and `<Trans>` from `@lingui/react/macro` (already imported). Confirm `Trans` is imported; if only `t` is used, add `import { Trans } from '@lingui/react/macro';`.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p apps/remix/tsconfig.json`
Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add apps/remix/app/components/general/envelope-editor/envelope-editor-recipient-form.tsx
git commit -m "feat: warn in V2 editor when recipients exceed the send cap"
```

---

## Task 12: Recipient-cap Alert in V1 add-signers form

**Files:**
- Modify: `packages/ui/primitives/document-flow/add-signers.tsx`

This file already imports `useCurrentOrganisation` (line 4), uses `organisation` (line 91) and `signers` (field array, line 179).

- [ ] **Step 1: Add the Alert import**

Add near the other `@documenso/ui/primitives` imports:

```ts
import { Alert, AlertDescription } from '@documenso/ui/primitives/alert';
```

Confirm `Trans` from `@lingui/react/macro` is imported (it is used elsewhere in this file, e.g. line 599). If not, add it.

- [ ] **Step 2: Compute the over-cap condition**

Just before the component's `return (` (line 494), add:

```ts
  const recipientCountLimit = organisation.organisationClaim.recipientCount;
  const isOverRecipientLimit = recipientCountLimit > 0 && signers.length > recipientCountLimit;
```

- [ ] **Step 3: Render the Alert inside the content container**

Inside `<DocumentFlowFormContainerContent>` (line 497), immediately above the `{isDocumentPdfLoaded && (` block (line 498), add:

```tsx
        {isOverRecipientLimit && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              <Trans>
                This document has more than {recipientCountLimit} recipients and cannot be sent on your current plan.
                Please remove recipients to continue.
              </Trans>
            </AlertDescription>
          </Alert>
        )}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p apps/remix/tsconfig.json`
Expected: No new errors. (If `packages/ui` has its own tsconfig, also acceptable to rely on the app type-check since the app consumes this primitive.)

- [ ] **Step 5: Commit**

```bash
git add packages/ui/primitives/document-flow/add-signers.tsx
git commit -m "feat: warn in V1 editor when recipients exceed the send cap"
```

---

## Task 13: Limit toast on V2 distribute

**Files:**
- Modify: `apps/remix/app/components/dialogs/envelope-distribute-dialog.tsx:176-183`

This file uses the `useLingui()` `t` template macro for toasts.

- [ ] **Step 1: Add imports**

Confirm `AppError` is imported; if not, add:

```ts
import { AppError } from '@documenso/lib/errors/app-error';
```

Add:

```ts
import { getLimitErrorToastContent } from '~/utils/limit-error-toast';
```

- [ ] **Step 2: Update the catch block**

Replace lines 176-183 with:

```ts
    } catch (err) {
      const error = AppError.parseError(err);
      const limitToast = getLimitErrorToastContent(error.code);

      toast({
        title: limitToast ? _(limitToast.title) : t`Something went wrong`,
        description: limitToast ? _(limitToast.description) : t`This envelope could not be distributed at this time. Please try again.`,
        variant: 'destructive',
        duration: 7500,
      });
    }
```

> NOTE: This file destructures `t` from `useLingui()`. The `_` function is also available from `useLingui()` for evaluating `MessageDescriptor`s. Update the `useLingui()` destructure to include `_`, e.g. `const { t, _ } = useLingui();`. If `_` is already destructured, leave it.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p apps/remix/tsconfig.json`
Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add apps/remix/app/components/dialogs/envelope-distribute-dialog.tsx
git commit -m "feat: show limit toast when distributing exceeds limits"
```

---

## Task 14: Limit toast on V2 redistribute

**Files:**
- Modify: `apps/remix/app/components/dialogs/envelope-redistribute-dialog.tsx:79-86`

- [ ] **Step 1: Add imports**

Confirm `AppError` is imported; if not, add:

```ts
import { AppError } from '@documenso/lib/errors/app-error';
```

Add:

```ts
import { getLimitErrorToastContent } from '~/utils/limit-error-toast';
```

- [ ] **Step 2: Ensure `_` is available**

Update the `useLingui()` destructure (line 50 `const { t } = useLingui();`) to:

```ts
  const { t, _ } = useLingui();
```

- [ ] **Step 3: Update the catch block**

Replace lines 79-86 with:

```ts
    } catch (err) {
      const error = AppError.parseError(err);
      const limitToast = getLimitErrorToastContent(error.code);

      toast({
        title: limitToast ? _(limitToast.title) : t`Something went wrong`,
        description: limitToast ? _(limitToast.description) : t`This envelope could not be resent at this time. Please try again.`,
        variant: 'destructive',
        duration: 7500,
      });
    }
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p apps/remix/tsconfig.json`
Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add apps/remix/app/components/dialogs/envelope-redistribute-dialog.tsx
git commit -m "feat: show limit toast when resending exceeds limits"
```

---

## Task 15: Limit toast on V1 send

**Files:**
- Modify: `apps/remix/app/components/general/document/document-edit-form.tsx:387-395`

This file uses the `useLingui()` `_` function with `msg` for toasts (see line 391).

- [ ] **Step 1: Add imports**

Confirm `AppError` is imported; if not, add:

```ts
import { AppError } from '@documenso/lib/errors/app-error';
```

Add:

```ts
import { getLimitErrorToastContent } from '~/utils/limit-error-toast';
```

- [ ] **Step 2: Update the catch block**

Replace lines 387-395 with:

```ts
    } catch (err) {
      console.error(err);

      const error = AppError.parseError(err);
      const limitToast = getLimitErrorToastContent(error.code);

      toast({
        title: limitToast ? _(limitToast.title) : _(msg`Error`),
        description: limitToast ? _(limitToast.description) : _(msg`An error occurred while sending the document.`),
        variant: 'destructive',
      });
    }
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p apps/remix/tsconfig.json`
Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add apps/remix/app/components/general/document/document-edit-form.tsx
git commit -m "feat: show limit toast when V1 send exceeds limits"
```

---

## Task 16: Limit toast on V1 resend dialog

**Files:**
- Modify: `apps/remix/app/components/dialogs/document-resend-dialog.tsx:101-108`

This file uses the `useLingui()` `_` function with `msg` for toasts.

- [ ] **Step 1: Add imports**

Confirm `AppError` is imported; if not, add:

```ts
import { AppError } from '@documenso/lib/errors/app-error';
```

Add:

```ts
import { getLimitErrorToastContent } from '~/utils/limit-error-toast';
```

- [ ] **Step 2: Update the catch block**

Replace lines 101-108 with:

```ts
    } catch (err) {
      const error = AppError.parseError(err);
      const limitToast = getLimitErrorToastContent(error.code);

      toast({
        title: limitToast ? _(limitToast.title) : _(msg`Something went wrong`),
        description: limitToast ? _(limitToast.description) : _(msg`This document could not be re-sent at this time. Please try again.`),
        variant: 'destructive',
        duration: 7500,
      });
    }
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p apps/remix/tsconfig.json`
Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add apps/remix/app/components/dialogs/document-resend-dialog.tsx
git commit -m "feat: show limit toast when V1 resend exceeds limits"
```

---

## Task 17: Extract translations & final verification

**Files:** none (tooling only)

- [ ] **Step 1: Extract Lingui messages**

Run: `npm run translate:extract` (if present in root `package.json`; otherwise check the i18n scripts). This picks up the new `<Trans>` / `msg` strings.
Expected: New message catalog entries; commit any generated catalog changes.

- [ ] **Step 2: Run unit tests**

Run: `npm run test -w @documenso/lib`
Expected: PASS, including `compute-quota-flags` and `limit-error` suites.

- [ ] **Step 3: Lint the touched files**

Run: `npm run lint`
Expected: No new lint errors. Use `npm run lint:fix` for auto-fixable issues.

- [ ] **Step 4: Type-check both packages**

Run: `npx tsc --noEmit -p apps/remix/tsconfig.json` and `npx tsc --noEmit -p packages/lib/tsconfig.json`
Expected: No errors.

- [ ] **Step 5: Commit any catalog/lint changes**

```bash
git add -A
git commit -m "chore: extract translations for quota/limit UX"
```

---

## Manual / E2E verification checklist

(Use existing E2E specs in `packages/app-tests/e2e/api/v1|v2/*rate-limits*` / `recipient-count-limit.spec.ts` as references; extend if adding automated coverage.)

- Banner shows to admin/manager when an org's `documentQuota`/`emailQuota`/`apiQuota` is exhausted (set quota to `0` on the admin org page), and not to `MEMBER`s, and not when under quota.
- Banner dialog shows the `SUPPORT_EMAIL` mailto link.
- Document upload, create-from-template, and create-from-direct-template show the "Usage limit reached" toast when the document quota is exhausted (`TOO_MANY_REQUESTS`).
- Setting `recipientCount` to a small value and adding more recipients shows the destructive Alert in both V1 and V2 editors.
- Attempting to send/distribute/resend an over-cap document shows the "Too many recipients" toast (`RECIPIENT_LIMIT_EXCEEDED`).
```
