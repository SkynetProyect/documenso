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
