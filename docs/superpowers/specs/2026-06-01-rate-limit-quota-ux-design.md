# Rate Limit & Quota UX Improvements — Design

**Date:** 2026-06-01
**Status:** Approved (pending final spec review)
**Context:** Follow-up to the dynamic rate-limits hotfix (`61138cdd8`, PR #2892). That hotfix added
organisation-level monthly quotas (document / email / api), per-document recipient caps, and an
"organisation limit exceeded" email. The user-facing UX for those limits is poor: there is no
in-app signal that a quota was hit, and the errors users receive are generic toasts. This design
improves the UX without exposing raw usage numbers or caps to end users.

## Background — what the hotfix added

- **Monthly quotas** on `OrganisationClaim`: `documentQuota`, `emailQuota`, `apiQuota`
  (`number | null`; `null` = unlimited, `0` = blocked). Consumption tracked per period in
  `OrganisationMonthlyStat` (`documentCount`, `emailCount`, `apiCount`).
  Enforced in `packages/lib/server-only/rate-limit/check-monthly-quota.ts` /
  `assert-organisation-rates-and-limits.ts`. On exhaustion it throws
  `AppError(AppErrorCode.TOO_MANY_REQUESTS, ...)` and (once, on threshold crossing) triggers
  `send.organisation-limit-exceeded.email`.
- **Per-document recipient cap**: `OrganisationClaim.recipientCount` (`0` = unlimited). Enforced at
  send time in `send-document.ts`, `resend-document.ts`, and `create-document-from-direct-template.ts`,
  throwing `AppError('RECIPIENT_LIMIT_EXCEEDED', ...)` (raw string, not in the enum).

## Problems being solved

1. Admins/managers get no in-app signal that the org has hit a monthly quota (email only).
2. When the document quota is exhausted, document creation fails with a generic toast that does not
   explain why. Affects: document upload, create-from-template, create-from-direct-template.
3. When a document exceeds the recipient cap, the send action fails with a generic
   "Something went wrong" toast, and there is no in-editor warning beforehand.

## Key constraints / decisions (from brainstorming)

- **Never expose raw usage counts or quota caps to end users.** The server computes booleans only.
- Banner appears **only when a quota is fully exhausted** (any of document/email/api), to
  admins/managers only.
- Quota flags are delivered via the **top-level authenticated layout loader** as booleans.
- Banner is visible **everywhere in the authenticated app** (like the existing billing banner).
- The recipient-cap Alert shows **only when the current recipient count exceeds the cap**.
- Improved send-toast mapping applies to **all** send paths: V1 send, V2 distribute, and
  resend/redistribute.
- A **centralized limit-error message helper** is used so copy is consistent and DRY.
- `RECIPIENT_LIMIT_EXCEEDED` stays a raw string (not added to the enum) — matched as a string in the
  helper.

---

## Part 1 — Quota-exhausted banner

### 1a. Server: quota flag computation

New helper in `packages/lib/server-only/rate-limit/`:

```ts
// get-organisation-quota-flags.ts
export type OrganisationQuotaFlags = {
  isDocumentQuotaExceeded: boolean;
  isEmailQuotaExceeded: boolean;
  isApiQuotaExceeded: boolean;
};

export const getOrganisationQuotaFlags = (opts: {
  organisationId: string;
}): Promise<OrganisationQuotaFlags>;
```

Logic:
- Load the org's `organisationClaim` quotas and the **current period** `OrganisationMonthlyStat`
  (reuse `currentMonthlyPeriod()` from `@documenso/lib/universal/monthly-period`).
- For each counter: `exceeded = quota !== null && usage >= quota`. (`quota === 0` ⇒ always
  exceeded once any usage exists; treat `0` as blocked regardless — exceeded = `true` when
  `quota === 0`.) `null` quota ⇒ `false` (unlimited).
- Returns only the three booleans.

### 1b. Loader wiring

In `apps/remix/app/routes/_authenticated+/_layout.tsx` loader:
- Resolve the **current organisation** for the request from `params` (`orgUrl`, or via `teamUrl`),
  matching the same resolution the layout already does client-side from the session.
- If an org is resolved, call `getOrganisationQuotaFlags`. Return the flags object on the loader data.
- If no org context (e.g. account-level pages), return all-false flags.
- Note: the layout currently sets `shouldRevalidate = () => false`. The flags are loaded once on full
  page load, which is acceptable for a banner. (We do not need live revalidation.)

### 1c. Banner component

New `apps/remix/app/components/general/organisations/organisation-quota-banner.tsx`, modeled on
`organisation-billing-banner.tsx`:
- Receives the quota flags (via loader data / props from the layout).
- Renders `null` unless: current user is admin/manager
  (`canExecuteOrganisationAction('MANAGE_ORGANISATION', organisation.currentOrganisationRole)`)
  **and** at least one flag is true.
- One combined banner (generic copy, not per-counter) — full-width warning bar with `AlertTriangleIcon`,
  a `<Trans>` message such as *"Your organisation has reached a usage limit on its current plan."*,
  and a button (e.g. *"Learn more"*) that opens a `<Dialog>`.
- Dialog content: an `<Alert variant="neutral">` explaining that the organisation has reached a fair-use
  limit on its plan and to contact support to review/adjust, with a `mailto:${SUPPORT_EMAIL}` link
  (`SUPPORT_EMAIL` from `@documenso/lib/constants/app`). Mirrors the billing banner dialog.
- Mounted in `_authenticated+/_layout.tsx` next to `<OrganisationBillingBanner />`.

---

## Part 2 — Better document-creation toast errors

A shared frontend helper for limit-related error copy (used by Parts 2 and 3):

```ts
// apps/remix/app/utils/limit-error-toast.ts (or similar shared location)
// Given an AppError code string, return friendly toast content for known limit errors,
// or null if the code isn't a limit error (caller falls back to its existing message).
export const getLimitErrorToastContent = (
  code: string,
): { title: MessageDescriptor; description: MessageDescriptor } | null;
```

Handled codes:
- `TOO_MANY_REQUESTS` (quota exhausted) → e.g.
  title *"Usage limit reached"*,
  description *"Your organisation has reached its plan's usage limit. Please contact your
  administrator or support to continue."*
- `RECIPIENT_LIMIT_EXCEEDED` (recipient cap) → e.g.
  title *"Too many recipients"*,
  description *"This document has too many recipients to be sent on your current plan. Please
  remove some recipients or contact support."*

Wire it into the three creation flows:

1. **Document upload** — `apps/remix/app/components/general/document/document-upload-button-legacy.tsx`:
   add a `TOO_MANY_REQUESTS` branch (consult the helper) ahead of the `.otherwise()` fallback.
2. **Create from template** — `apps/remix/app/components/dialogs/template-use-dialog.tsx`: same.
3. **Create from direct template** —
   `apps/remix/app/components/general/direct-template/direct-template-page.tsx` and
   `apps/remix/app/components/embed/embed-direct-template-client-page.tsx`: these currently use a
   generic catch with no `AppError.parse`. Add `AppError.parseError`, consult the helper for
   `TOO_MANY_REQUESTS` / `RECIPIENT_LIMIT_EXCEEDED`, and keep the existing generic message as fallback.
   (Embed variant continues to post `document-error` to the parent window.)

The helper keeps copy consistent; each flow keeps its own existing non-limit branches.

---

## Part 3 — Recipient cap Alert + send toasts

### 3a. Expose `recipientCount` to the editor frontend

Add `recipientCount: true` to the `organisationClaim` pick in
`packages/lib/types/organisation.ts` (`ZOrganisationSchema`). This makes
`useCurrentOrganisation().organisationClaim.recipientCount` available client-side. It's a single
integer and not a hidden usage figure — it's the configured cap, which is fine to surface in the
editor (the Alert references it).

### 3b. In-editor Alert (only when exceeded)

Add a destructive `<Alert>` near the recipient list in both editors:
- **V2:** `apps/remix/app/components/general/envelope-editor/envelope-editor-recipient-form.tsx`
  (inside `<CardContent>`, above the recipient list).
- **V1:** `packages/ui/primitives/document-flow/add-signers.tsx` (inside the form content, above the
  signer list / Add Signer row).

Condition: `recipientCount > 0 && signers.length > recipientCount`.
Message: e.g. *"This document has more than {recipientCount} recipients and cannot be sent on your
current plan. Please remove recipients to continue."*

(Note: this `recipientCount` cap is distinct from the `useLimits().remaining.recipients` plan limit
that already disables the "Add Signer" button. The two limits are intentionally separate; this Alert
specifically addresses the send-time cap.)

### 3c. Send/distribute/redistribute toasts

Map limit errors via the Part 2 helper in all send paths (currently generic catches with no
`AppError.parse`):
- **V2 distribute** — `apps/remix/app/components/dialogs/envelope-distribute-dialog.tsx`
- **V2 redistribute (resend)** — `apps/remix/app/components/dialogs/envelope-redistribute-dialog.tsx`
- **V1 send** — the document-flow send action (distribute) in the V1 editor path.

For each: parse the error with `AppError.parseError`, consult `getLimitErrorToastContent` for
`RECIPIENT_LIMIT_EXCEEDED` and `TOO_MANY_REQUESTS` (email-quota exhaustion can also block sends),
and fall back to the existing generic message otherwise.

---

## Components / interfaces summary

| Unit | Location | Responsibility |
|---|---|---|
| `getOrganisationQuotaFlags` | `packages/lib/server-only/rate-limit/get-organisation-quota-flags.ts` | Compute 3 booleans from claim quotas + current monthly stat |
| Layout loader change | `apps/remix/app/routes/_authenticated+/_layout.tsx` | Resolve current org, return quota flags |
| `OrganisationQuotaBanner` | `apps/remix/app/components/general/organisations/organisation-quota-banner.tsx` | Admin/manager banner + contact-support dialog |
| `getLimitErrorToastContent` | `apps/remix/app/utils/limit-error-toast.ts` | Map `TOO_MANY_REQUESTS` / `RECIPIENT_LIMIT_EXCEEDED` to toast copy |
| `recipientCount` exposure | `packages/lib/types/organisation.ts` | Add to claim pick for client access |
| Recipient Alert (V2) | `envelope-editor-recipient-form.tsx` | Destructive Alert when over cap |
| Recipient Alert (V1) | `packages/ui/primitives/document-flow/add-signers.tsx` | Destructive Alert when over cap |
| Toast wiring | upload / template-use / direct-template / distribute / redistribute / V1 send | Consult helper, fall back to existing messages |

## Error handling

- All new server logic uses `AppError`; the flag helper never throws on missing stats (treats missing
  current-period stat as zero usage ⇒ not exceeded, unless quota is `0`).
- Frontend uses `AppError.parseError(err)` then the shared helper; unknown codes fall back to each
  flow's existing message. No behavioral change for non-limit errors.

## Testing

- **Unit:** `getOrganisationQuotaFlags` — unlimited (`null`), blocked (`0`), under, at, and over quota
  for each counter; missing monthly stat row.
- **Unit:** `getLimitErrorToastContent` — returns content for the two codes, `null` otherwise.
- **E2E (extend existing specs in `packages/app-tests/e2e/api/...rate-limits`/`recipient-count-limit`):**
  - Admin/manager sees the banner when a quota is exhausted; member does not; no banner when under quota.
  - Document creation over quota surfaces the improved toast (the three flows).
  - Recipient Alert appears in V1 and V2 editors when over the cap, and send shows the improved toast.
- Manual: dialog contact-support link resolves to `SUPPORT_EMAIL`.

## Out of scope (explicitly declined)

- Proactive disabling of the create/upload button on quota exhaustion.
- Aligning the "Add Signer" plan-limit vs send-cap messaging.
- A user-facing usage panel exposing raw numbers (the admin-only `OrganisationUsagePanel` stays
  platform-admin only).
- Adding `RECIPIENT_LIMIT_EXCEEDED` to the `AppErrorCode` enum.
