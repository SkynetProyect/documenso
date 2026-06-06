import * as chai from 'chai';
import { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import { beforeEach, describe, it, vi, expect as vitestExpect } from 'vitest';

chai.use(chaiAsPromised);
chai.use(sinonChai);

// ─── vi.mock calls first — no external variable references inside factories ───

vi.mock('@libpdf/core', () => ({ PDF: { load: vi.fn() } }));
vi.mock('@documenso/signing', () => ({ signPdf: vi.fn() }));
vi.mock('../../universal/upload/put-file.server', () => ({ putPdfFileServerSide: vi.fn() }));
vi.mock('../../server-only/pdf/insert-field-in-pdf-v2', () => ({ insertFieldInPDFV2: vi.fn() }));
vi.mock('@documenso/lib/server-only/pdf/add-rejection-stamp-to-pdf', () => ({ addRejectionStampToPdf: vi.fn() }));
vi.mock('@documenso/lib/server-only/pdf/generate-audit-log-pdf', () => ({ generateAuditLogPdf: vi.fn() }));
vi.mock('@documenso/lib/server-only/pdf/generate-certificate-pdf', () => ({ generateCertificatePdf: vi.fn() }));
vi.mock('../../server-only/pdf/insert-field-in-pdf-v1', () => ({ insertFieldInPDFV1: vi.fn() }));
vi.mock('../../server-only/pdf/legacy-insert-field-in-pdf', () => ({ legacy_insertFieldInPDF: vi.fn() }));
vi.mock('../../constants/i18n', () => ({
  SUPPORTED_LANGUAGES: {},
  isValidLanguageCode: vi.fn().mockReturnValue(true),
}));
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
vi.mock('@documenso/prisma', () => ({
  prisma: {
    envelope: {
      findFirstOrThrow: vi.fn(),
      update: vi.fn(),
    },
    recipient: { updateMany: vi.fn() },
    envelopeItem: { update: vi.fn() },
    documentAuditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock('../../client-only/recipient-type', () => ({
  RecipientType: {
    SIGNER: 'SIGNER',
    CC: 'CC',
    VIEWER: 'VIEWER',
    APPROVER: 'APPROVER',
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

const signedPdfBytes = Buffer.from([5]);
const pdfBytes = new Uint8Array([1, 2, 3]);

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
  documentData: {
    id: 'old-123',
    initialData: 'initial-data',
  },
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

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();

  mockSignPdf.mockResolvedValue(signedPdfBytes);
  mockPutPdfFileServerSide.mockResolvedValue({ documentData: { id: 'new-123' }, filePageCount: 1 });
  mockInsertFieldInPDFV2.mockResolvedValue(new Uint8Array([7, 8, 9]));
  mockPDFLoad.mockResolvedValue(createPdfDoc());
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('decorateAndSignPdf security', () => {
  it('S-01 - drops path segments from the file name when saving the signed PDF', async () => {
    await decorateAndSignPdf({
      ...baseArgs,
      envelopeItem: {
        ...baseEnvelopeItem,
        title: '../secret/contract.pdf',
      },
    });

    vitestExpect(mockPutPdfFileServerSide).toHaveBeenCalledOnce();
    vitestExpect(mockPutPdfFileServerSide).toHaveBeenCalledWith(
      vitestExpect.objectContaining({ name: 'contract_signed.pdf' }),
      'initial-data',
    );
  });

  it('S-02 - rejects invalid V2 field page references before signing or uploading', async () => {
    const pdfDoc = createPdfDoc();
    pdfDoc.getPage.mockReturnValue(undefined);
    mockPDFLoad.mockResolvedValue(pdfDoc);

    const action = decorateAndSignPdf({
      ...baseArgs,
      envelopeItemFields: [{ inserted: true, page: 99 } as any],
    });

    await expect(action).to.be.rejectedWith('Page 99 does not exist');
    vitestExpect(mockSignPdf).not.toHaveBeenCalled();
    vitestExpect(mockPutPdfFileServerSide).not.toHaveBeenCalled();
  });

  it('S-03 - uses _rejected.pdf suffix instead of _signed.pdf when isRejected is true', async () => {
    await decorateAndSignPdf({
      ...baseArgs,
      isRejected: true,
      rejectionReason: 'not approved',
    });

    vitestExpect(mockPutPdfFileServerSide).toHaveBeenCalledWith(
      vitestExpect.objectContaining({ name: 'contract_rejected.pdf' }),
      'initial-data',
    );
  });

  it('S-04 - does not call putPdfFileServerSide when signPdf throws', async () => {
    mockSignPdf.mockRejectedValue(new Error('signing failed'));

    const action = decorateAndSignPdf({ ...baseArgs });

    await expect(action).to.be.rejectedWith('signing failed');
    vitestExpect(mockPutPdfFileServerSide).not.toHaveBeenCalled();
  });

  it('S-05 - does not call signPdf or upload when PDF.load throws on initial load', async () => {
    mockPDFLoad.mockRejectedValue(new Error('corrupt pdf'));

    const action = decorateAndSignPdf({ ...baseArgs });

    await expect(action).to.be.rejectedWith('corrupt pdf');
    vitestExpect(mockSignPdf).not.toHaveBeenCalled();
    vitestExpect(mockPutPdfFileServerSide).not.toHaveBeenCalled();
  });

  it('S-06 - strips path traversal from title and still uses _rejected.pdf suffix', async () => {
    await decorateAndSignPdf({
      ...baseArgs,
      isRejected: true,
      rejectionReason: 'bad',
      envelopeItem: {
        ...baseEnvelopeItem,
        title: '../../etc/passwd.pdf',
      },
    });

    vitestExpect(mockPutPdfFileServerSide).toHaveBeenCalledWith(
      vitestExpect.objectContaining({ name: 'passwd_rejected.pdf' }),
      'initial-data',
    );
  });

  it('S-07 - passes initialData as the second argument to putPdfFileServerSide', async () => {
    await decorateAndSignPdf({
      ...baseArgs,
      envelopeItem: {
        ...baseEnvelopeItem,
        documentData: { id: 'old-123', initialData: 'custom-initial-data' },
      },
    });

    vitestExpect(mockPutPdfFileServerSide).toHaveBeenCalledWith(vitestExpect.any(Object), 'custom-initial-data');
  });

  it('S-08 - does not call signPdf or upload when insertFieldInPDFV2 throws', async () => {
    mockInsertFieldInPDFV2.mockRejectedValue(new Error('v2 inject failed'));

    const action = decorateAndSignPdf({
      ...baseArgs,
      envelopeItemFields: [{ inserted: true, page: 1 } as any],
    });

    await expect(action).to.be.rejectedWith('v2 inject failed');
    vitestExpect(mockSignPdf).not.toHaveBeenCalled();
    vitestExpect(mockPutPdfFileServerSide).not.toHaveBeenCalled();
  });
});
