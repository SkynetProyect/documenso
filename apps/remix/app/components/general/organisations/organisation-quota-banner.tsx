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
