import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── vi.mock calls first — no external variable references inside factories ───

vi.mock('@libpdf/core', () => ({ PDF: { load: vi.fn() } }));
vi.mock('@documenso/signing', () => ({ signPdf: vi.fn() }));
vi.mock('../../universal/upload/put-file.server', () => ({ putPdfFileServerSide: vi.fn() }));
vi.mock('../../server-only/pdf/insert-field-in-pdf-v2', () => ({ insertFieldInPDFV2: vi.fn() }));
vi.mock('../../server-only/pdf/insert-field-in-pdf-v1', () => ({ insertFieldInPDFV1: vi.fn() }));
vi.mock('../../server-only/pdf/legacy-insert-field-in-pdf', () => ({ legacy_insertFieldInPDF: vi.fn() }));
vi.mock('@documenso/lib/server-only/pdf/add-rejection-stamp-to-pdf', () => ({ addRejectionStampToPdf: vi.fn() }));
vi.mock('@documenso/lib/server-only/pdf/generate-audit-log-pdf', () => ({ generateAuditLogPdf: vi.fn() }));
vi.mock('@documenso/lib/server-only/pdf/generate-certificate-pdf', () => ({ generateCertificatePdf: vi.fn() }));
vi.mock('../../types/webhook-payload', () => ({
  mapEnvelopeToWebhookDocumentPayload: vi.fn(),
  ZWebhookDocumentSchema: { parse: vi.fn() },
}));
vi.mock('../../types/document-audit-logs', () => ({
  DOCUMENT_AUDIT_LOG_TYPE: {
    DOCUMENT_COMPLETED: 'DOCUMENT_COMPLETED',
    DOCUMENT_REJECTED: 'DOCUMENT_REJECTED',
  },
  createDocumentAuditLogData: vi.fn(),
}));
vi.mock('../../constants/i18n', () => ({
  SUPPORTED_LANGUAGES: {},
  isValidLanguageCode: vi.fn().mockReturnValue(true),
}));
vi.mock('../../constants/teams', () => ({
  LOWEST_TEAM_ROLE: 'MEMBER',
  ALLOWED_TEAM_GROUP_TYPES: [],
  TEAM_DOCUMENT_VISIBILITY_MAP: {},
  TEAM_URL_REGEX: /^\/t\/[^/]+/,
}));
vi.mock('../../utils/teams', () => ({
  canExecuteTeamAction: vi.fn().mockReturnValue(true),
  getUserTeamRole: vi.fn(),
}));
vi.mock('../../utils/advanced-fields-helpers', () => ({ fieldsContainUnsignedRequiredField: vi.fn() }));
vi.mock('../../utils/document', () => ({ isDocumentCompleted: vi.fn() }));
vi.mock('../../utils/document-audit-logs', () => ({ createDocumentAuditLogData: vi.fn() }));
vi.mock('../../utils/envelope', () => ({ mapDocumentIdToSecondaryId: vi.fn() }));
vi.mock('../../universal/upload/get-file.server', () => ({ getFileServerSide: vi.fn() }));
vi.mock('../../server-only/team/get-team-settings', () => ({ getTeamSettings: vi.fn() }));
vi.mock('../../server-only/webhooks/trigger/trigger-webhook', () => ({ triggerWebhook: vi.fn() }));
vi.mock('../../jobs/client', () => ({ jobs: { triggerJob: vi.fn() } }));
vi.mock('../../client-only/recipient-type', () => ({
  RecipientType: { SIGNER: 'SIGNER', CC: 'CC', VIEWER: 'VIEWER', APPROVER: 'APPROVER' },
}));
vi.mock('@documenso/prisma', () => ({
  prisma: {
    envelope: { findFirstOrThrow: vi.fn(), update: vi.fn() },
    recipient: { updateMany: vi.fn() },
    envelopeItem: { update: vi.fn() },
    documentAuditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock('@prisma/client', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    EnvelopeType: { DOCUMENT: 'DOCUMENT' },
    DocumentStatus: { COMPLETED: 'COMPLETED', REJECTED: 'REJECTED' },
    RecipientRole: { CC: 'CC', SIGNER: 'SIGNER', VIEWER: 'VIEWER', APPROVER: 'APPROVER' },
    SigningStatus: { SIGNED: 'SIGNED', REJECTED: 'REJECTED', NOT_SIGNED: 'NOT_SIGNED' },
    WebhookTriggerEvents: {
      DOCUMENT_COMPLETED: 'DOCUMENT_COMPLETED',
      DOCUMENT_REJECTED: 'DOCUMENT_REJECTED',
    },
    FieldType: {
      SIGNATURE: 'SIGNATURE',
      FREE_SIGNATURE: 'FREE_SIGNATURE',
      INITIALS: 'INITIALS',
      NAME: 'NAME',
      EMAIL: 'EMAIL',
      DATE: 'DATE',
      TEXT: 'TEXT',
      CHECKBOX: 'CHECKBOX',
      RADIO: 'RADIO',
      DROPDOWN: 'DROPDOWN',
      NUMBER: 'NUMBER',
    },
    DocumentSource: {
      DOCUMENT: 'DOCUMENT',
      TEMPLATE: 'TEMPLATE',
      TEMPLATE_DIRECT_LINK: 'TEMPLATE_DIRECT_LINK',
      API: 'API',
    },
    TeamMemberRole: { ADMIN: 'ADMIN', MANAGER: 'MANAGER', MEMBER: 'MEMBER' },
    OrganisationGroupType: { INTERNAL: 'INTERNAL', EXTERNAL: 'EXTERNAL' },
    DocumentVisibility: {
      ADMIN: 'ADMIN',
      MANAGER_AND_ABOVE: 'MANAGER_AND_ABOVE',
      EVERYONE: 'EVERYONE',
    },
    ReadStatus: { OPENED: 'OPENED', NOT_OPENED: 'NOT_OPENED' },
    SendStatus: { NOT_SENT: 'NOT_SENT', SENT: 'SENT', ERROR: 'ERROR' },
  };
});

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { signPdf } from '@documenso/signing';
import { PDF } from '@libpdf/core';
import { decorateAndSignPdf } from '../../jobs/definitions/internal/seal-document.handler';
import { insertFieldInPDFV2 } from '../../server-only/pdf/insert-field-in-pdf-v2';
import { putPdfFileServerSide } from '../../universal/upload/put-file.server';

// ─── Typed stub references ────────────────────────────────────────────────────

const mockPDFLoad = PDF.load as ReturnType<typeof vi.fn>;
const mockSignPdf = signPdf as ReturnType<typeof vi.fn>;
const mockPutPdfFileServerSide = putPdfFileServerSide as ReturnType<typeof vi.fn>;
const mockInsertFieldInPDFV2 = insertFieldInPDFV2 as ReturnType<typeof vi.fn>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const pdfBytes = new Uint8Array([1, 2, 3]);
const signedPdfBytes = Buffer.from([5]);

const createPdfDoc = () => ({
  flattenAll: vi.fn(),
  upgradeVersion: vi.fn(),
  copyPagesFrom: vi.fn().mockResolvedValue(undefined),
  getPage: vi.fn().mockReturnValue({ width: 400, height: 500, rotation: 0, drawPage: vi.fn() }),
  embedPage: vi.fn().mockResolvedValue({}),
  save: vi.fn().mockResolvedValue(pdfBytes),
  reload: vi.fn().mockResolvedValue(undefined),
});

const baseEnvelope = {
  id: 'env-1',
  title: 'contract.pdf',
  useLegacyFieldInsertion: false,
  internalVersion: 2,
};

const baseEnvelopeItem = {
  title: 'contract.pdf',
  documentData: { id: 'old-123', initialData: 'initial-data' },
};

const baseArgs = {
  envelope: baseEnvelope,
  envelopeItem: baseEnvelopeItem,
  envelopeItemFields: [],
  isRejected: false,
  rejectionReason: '',
  pdfData: pdfBytes,
  certificateDoc: null,
  auditLogDoc: null,
};

// ─── Thresholds (ms) ──────────────────────────────────────────────────────────

const SINGLE_SEAL_THRESHOLD_MS = 100;
const TEN_SEQUENTIAL_THRESHOLD_MS = 500;
const FIFTY_FIELDS_THRESHOLD_MS = 200;
const TEN_CONCURRENT_THRESHOLD_MS = 300;

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();

  mockSignPdf.mockResolvedValue(signedPdfBytes);
  mockPutPdfFileServerSide.mockResolvedValue({ documentData: { id: 'new-123' }, filePageCount: 1 });
  mockInsertFieldInPDFV2.mockResolvedValue(new Uint8Array([7, 8, 9]));
  mockPDFLoad.mockResolvedValue(createPdfDoc());
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('decorateAndSignPdf performance', () => {
  it(`P-01 - seals a single document with no fields in under ${SINGLE_SEAL_THRESHOLD_MS}ms`, async () => {
    const start = performance.now();

    await decorateAndSignPdf({ ...baseArgs });

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(SINGLE_SEAL_THRESHOLD_MS);
  });

  it(`P-02 - seals 10 documents sequentially in under ${TEN_SEQUENTIAL_THRESHOLD_MS}ms`, async () => {
    const start = performance.now();

    for (let i = 0; i < 10; i++) {
      mockPDFLoad.mockResolvedValue(createPdfDoc());
      await decorateAndSignPdf({ ...baseArgs });
    }

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(TEN_SEQUENTIAL_THRESHOLD_MS);
  });

  it(`P-03 - seals a document with 50 fields in under ${FIFTY_FIELDS_THRESHOLD_MS}ms`, async () => {
    const fields = Array.from({ length: 50 }, (_, i) => ({
      inserted: true,
      page: 1,
      id: `field-${i}`,
    }));

    const start = performance.now();

    await decorateAndSignPdf({
      ...baseArgs,
      envelopeItemFields: fields as any,
    });

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(FIFTY_FIELDS_THRESHOLD_MS);
  });

  it(`P-04 - seals 10 documents concurrently in under ${TEN_CONCURRENT_THRESHOLD_MS}ms`, async () => {
    const start = performance.now();

    await Promise.all(
      Array.from({ length: 10 }, () => {
        mockPDFLoad.mockResolvedValue(createPdfDoc());
        return decorateAndSignPdf({ ...baseArgs });
      }),
    );

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(TEN_CONCURRENT_THRESHOLD_MS);
  });

  it('P-05 - seals a rejected document no slower than a normal document', async () => {
    const normalStart = performance.now();
    await decorateAndSignPdf({ ...baseArgs, isRejected: false });
    const normalElapsed = performance.now() - normalStart;

    mockPDFLoad.mockResolvedValue(createPdfDoc());

    const rejectedStart = performance.now();
    await decorateAndSignPdf({ ...baseArgs, isRejected: true, rejectionReason: 'bad' });
    const rejectedElapsed = performance.now() - rejectedStart;

    // Rejected path should not take more than 3x the normal path
    expect(rejectedElapsed).toBeLessThan(normalElapsed * 3);
  });

  it('P-06 - fields spread across multiple pages do not degrade performance beyond 2x single-page', async () => {
    const singlePageFields = Array.from({ length: 10 }, (_, i) => ({
      inserted: true,
      page: 1,
      id: `field-${i}`,
    }));

    const multiPageDoc = createPdfDoc();
    multiPageDoc.getPage.mockImplementation((index: number) => ({
      width: 400,
      height: 500,
      rotation: 0,
      drawPage: vi.fn(),
    }));

    const singleStart = performance.now();
    await decorateAndSignPdf({ ...baseArgs, envelopeItemFields: singlePageFields as any });
    const singleElapsed = performance.now() - singleStart;

    mockPDFLoad.mockResolvedValue(multiPageDoc);

    const multiPageFields = Array.from({ length: 10 }, (_, i) => ({
      inserted: true,
      page: i + 1,
      id: `field-${i}`,
    }));

    const multiStart = performance.now();
    await decorateAndSignPdf({ ...baseArgs, envelopeItemFields: multiPageFields as any });
    const multiElapsed = performance.now() - multiStart;

    expect(multiElapsed).toBeLessThan(singleElapsed * 2 + 50);
  });
});
