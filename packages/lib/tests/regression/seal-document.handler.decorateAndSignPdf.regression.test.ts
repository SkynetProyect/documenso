import * as chai from 'chai';
import { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import { beforeEach, describe, it, vi, expect as vitestExpect } from 'vitest';

chai.use(chaiAsPromised);
chai.use(sinonChai);

// ─── vi.mock calls first — no external variable references inside factories ───

vi.mock('@documenso/prisma', () => ({
  prisma: {
    envelope: {
      findFirstOrThrow: vi.fn(),
      update: vi.fn(),
    },
    recipient: {
      updateMany: vi.fn(),
    },
    envelopeItem: {
      update: vi.fn(),
    },
    documentAuditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));
vi.mock('@documenso/signing', () => ({ signPdf: vi.fn() }));
vi.mock('@libpdf/core', () => ({ PDF: { load: vi.fn() } }));
vi.mock('../../jobs/client', () => ({ jobs: { triggerJob: vi.fn() } }));
vi.mock('../../server-only/team/get-team-settings', () => ({ getTeamSettings: vi.fn() }));
vi.mock('../../server-only/webhooks/trigger/trigger-webhook', () => ({ triggerWebhook: vi.fn() }));
vi.mock('../../server-only/pdf/insert-field-in-pdf-v1', () => ({ insertFieldInPDFV1: vi.fn() }));
vi.mock('../../server-only/pdf/insert-field-in-pdf-v2', () => ({ insertFieldInPDFV2: vi.fn() }));
vi.mock('../../server-only/pdf/legacy-insert-field-in-pdf', () => ({ legacy_insertFieldInPDF: vi.fn() }));
vi.mock('@documenso/lib/server-only/pdf/add-rejection-stamp-to-pdf', () => ({ addRejectionStampToPdf: vi.fn() }));
vi.mock('@documenso/lib/server-only/pdf/generate-audit-log-pdf', () => ({ generateAuditLogPdf: vi.fn() }));
vi.mock('@documenso/lib/server-only/pdf/generate-certificate-pdf', () => ({ generateCertificatePdf: vi.fn() }));
vi.mock('../../types/webhook-payload', () => ({
  mapEnvelopeToWebhookDocumentPayload: vi.fn(),
  ZWebhookDocumentSchema: { parse: vi.fn() },
}));
vi.mock('../../universal/upload/get-file.server', () => ({ getFileServerSide: vi.fn() }));
vi.mock('../../universal/upload/put-file.server', () => ({ putPdfFileServerSide: vi.fn() }));
vi.mock('../../utils/advanced-fields-helpers', () => ({ fieldsContainUnsignedRequiredField: vi.fn() }));
vi.mock('../../utils/document', () => ({ isDocumentCompleted: vi.fn() }));
vi.mock('../../utils/document-audit-logs', () => ({ createDocumentAuditLogData: vi.fn() }));
vi.mock('../../utils/envelope', () => ({ mapDocumentIdToSecondaryId: vi.fn() }));
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
vi.mock('@prisma/client', async (importOriginal) => {
  const actual = (await importOriginal()) as Record;
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
  };
});

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { addRejectionStampToPdf } from '@documenso/lib/server-only/pdf/add-rejection-stamp-to-pdf';
import { prisma } from '@documenso/prisma';
import { signPdf } from '@documenso/signing';
import { PDF } from '@libpdf/core';
import { jobs } from '../../jobs/client';
import { run } from '../../jobs/definitions/internal/seal-document.handler';
import { getTeamSettings } from '../../server-only/team/get-team-settings';
import { triggerWebhook } from '../../server-only/webhooks/trigger/trigger-webhook';
import { mapEnvelopeToWebhookDocumentPayload, ZWebhookDocumentSchema } from '../../types/webhook-payload';
import { getFileServerSide } from '../../universal/upload/get-file.server';
import { putPdfFileServerSide } from '../../universal/upload/put-file.server';
import { fieldsContainUnsignedRequiredField } from '../../utils/advanced-fields-helpers';
import { isDocumentCompleted } from '../../utils/document';
import { createDocumentAuditLogData } from '../../utils/document-audit-logs';
import { mapDocumentIdToSecondaryId } from '../../utils/envelope';

// ─── Typed stub references ────────────────────────────────────────────────────

const mockPrisma = prisma as unknown as {
  envelope: {
    findFirstOrThrow: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  recipient: { updateMany: ReturnType<typeof vi.fn> };
  envelopeItem: { update: ReturnType<typeof vi.fn> };
  documentAuditLog: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const mockSignPdf = signPdf as ReturnType<typeof vi.fn>;
const mockPDFLoad = PDF.load as ReturnType<typeof vi.fn>;
const mockTriggerJob = jobs.triggerJob as ReturnType<typeof vi.fn>;
const mockGetTeamSettings = getTeamSettings as ReturnType<typeof vi.fn>;
const mockTriggerWebhook = triggerWebhook as ReturnType<typeof vi.fn>;
const mockAddRejectionStampToPdf = addRejectionStampToPdf as ReturnType<typeof vi.fn>;
const mockMapEnvelopeToWebhookDocumentPayload = mapEnvelopeToWebhookDocumentPayload as ReturnType<typeof vi.fn>;
const mockZWebhookDocumentSchemaParse = ZWebhookDocumentSchema.parse as ReturnType<typeof vi.fn>;
const mockGetFileServerSide = getFileServerSide as ReturnType<typeof vi.fn>;
const mockPutPdfFileServerSide = putPdfFileServerSide as ReturnType<typeof vi.fn>;
const mockFieldsContainUnsignedRequiredField = fieldsContainUnsignedRequiredField as ReturnType<typeof vi.fn>;
const mockIsDocumentCompleted = isDocumentCompleted as ReturnType<typeof vi.fn>;
const mockCreateDocumentAuditLogData = createDocumentAuditLogData as ReturnType<typeof vi.fn>;
const mockMapDocumentIdToSecondaryId = mapDocumentIdToSecondaryId as ReturnType<typeof vi.fn>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const inputPdfBytes = new Uint8Array([1, 2, 3]);
const signedPdfBytes = Buffer.from([5]);

const createPdfDoc = () => ({
  flattenAll: vi.fn(),
  upgradeVersion: vi.fn(),
  copyPagesFrom: vi.fn().mockResolvedValue(undefined),
  getPage: vi.fn().mockReturnValue({ width: 100, height: 200, rotation: 0, drawPage: vi.fn() }),
  embedPage: vi.fn().mockResolvedValue({}),
  save: vi.fn().mockResolvedValue(inputPdfBytes),
  reload: vi.fn().mockResolvedValue(undefined),
});

const baseEnvelope = (overrides = {}) => ({
  id: 'env-1',
  title: 'contract.pdf',
  useLegacyFieldInsertion: false,
  internalVersion: 2,
  type: 'DOCUMENT',
  secondaryId: 'secondary-doc-1',
  userId: 'user-1',
  teamId: 'team-1',
  documentMeta: { language: 'en' },
  recipients: [{ signingStatus: 'SIGNED', role: 'SIGNER' }],
  fields: [],
  envelopeItems: [
    {
      id: 'item-1',
      title: 'contract.pdf',
      documentData: { id: 'old-123', initialData: 'initial-data' },
      field: [],
    },
  ],
  qrToken: 'qr-token',
  user: { name: 'User Name', email: 'user@example.com' },
  ...overrides,
});

const io = {
  runTask: (_task: unknown, callback: () => Promise<unknown>) => callback(),
} as any;

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();

  mockSignPdf.mockResolvedValue(signedPdfBytes);
  mockTriggerWebhook.mockResolvedValue(undefined);
  mockTriggerJob.mockResolvedValue({});
  mockMapDocumentIdToSecondaryId.mockReturnValue('secondary-doc-1');
  mockFieldsContainUnsignedRequiredField.mockReturnValue(false);
  mockCreateDocumentAuditLogData.mockReturnValue({ id: 'audit-1' });
  mockMapEnvelopeToWebhookDocumentPayload.mockReturnValue({ documentId: 1 });
  mockZWebhookDocumentSchemaParse.mockReturnValue({ documentId: 1 });
  mockIsDocumentCompleted.mockReturnValue(false);
  mockGetTeamSettings.mockResolvedValue({ includeSigningCertificate: false, includeAuditLog: false });
  mockGetFileServerSide.mockResolvedValue(inputPdfBytes);
  mockPutPdfFileServerSide.mockResolvedValue({ documentData: { id: 'new-123' }, filePageCount: 1 });
  mockPrisma.recipient.updateMany.mockResolvedValue({});
  mockPrisma.envelope.update.mockResolvedValue({});
  mockPrisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      envelopeItem: { update: vi.fn().mockResolvedValue({}) },
      envelope: { update: vi.fn().mockResolvedValue({}) },
      documentAuditLog: { create: vi.fn().mockResolvedValue({}) },
    }),
  );
  mockPDFLoad.mockResolvedValue(createPdfDoc());
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('seal-document handler regression', () => {
  // ── guard: empty envelope items ────────────────────────────────────────────

  it('R-01 - throws when the envelope contains no envelope items', async () => {
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValue(baseEnvelope({ envelopeItems: [] }));

    await expect(run({ payload: { documentId: 1, sendEmail: true, isResealing: false }, io })).to.be.rejectedWith(
      'At least one envelope item required',
    );
  });

  // ── guard: unsigned required fields ───────────────────────────────────────

  it('R-02 - throws when unsigned required fields remain on a non-rejected document', async () => {
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValue(baseEnvelope({ fields: [{ required: true }] }));
    mockFieldsContainUnsignedRequiredField.mockReturnValue(true);

    await expect(run({ payload: { documentId: 1, sendEmail: true, isResealing: false }, io })).to.be.rejectedWith(
      'has unsigned required fields',
    );
  });

  // ── guard: document not complete ───────────────────────────────────────────

  it('R-03 - throws when not all recipients have signed', async () => {
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValue(
      baseEnvelope({
        recipients: [
          { signingStatus: 'SIGNED', role: 'SIGNER' },
          { signingStatus: 'NOT_SIGNED', role: 'SIGNER' },
        ],
      }),
    );

    await expect(run({ payload: { documentId: 1, sendEmail: true, isResealing: false }, io })).to.be.rejectedWith(
      'Document is not complete',
    );
  });

  // ── rejected document ──────────────────────────────────────────────────────

  it('R-04 - skips unsigned field check when document is rejected', async () => {
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(
      baseEnvelope({
        recipients: [{ signingStatus: 'REJECTED', role: 'SIGNER', rejectionReason: 'bad' }],
      }),
    );
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(baseEnvelope({ status: 'REJECTED' }));
    mockFieldsContainUnsignedRequiredField.mockReturnValue(true);

    await run({ payload: { documentId: 1, sendEmail: true, isResealing: false }, io });

    vitestExpect(mockFieldsContainUnsignedRequiredField).not.toHaveBeenCalled();
  });

  it('R-05 - calls addRejectionStampToPdf when a recipient has rejected', async () => {
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(
      baseEnvelope({
        recipients: [{ signingStatus: 'REJECTED', role: 'SIGNER', rejectionReason: 'not happy' }],
      }),
    );
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(baseEnvelope({ status: 'REJECTED' }));

    await run({ payload: { documentId: 1, sendEmail: true, isResealing: false }, io });

    vitestExpect(mockAddRejectionStampToPdf).toHaveBeenCalledOnce();
  });

  it('R-06 - triggers DOCUMENT_REJECTED webhook when document is rejected', async () => {
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(
      baseEnvelope({
        recipients: [{ signingStatus: 'REJECTED', role: 'SIGNER', rejectionReason: 'bad' }],
      }),
    );
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(baseEnvelope({ status: 'REJECTED' }));

    await run({ payload: { documentId: 1, sendEmail: true, isResealing: false }, io });

    vitestExpect(mockTriggerWebhook).toHaveBeenCalledWith(
      vitestExpect.objectContaining({ event: 'DOCUMENT_REJECTED' }),
    );
  });

  it('R-07 - does not trigger completion email when document is rejected', async () => {
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(
      baseEnvelope({
        recipients: [{ signingStatus: 'REJECTED', role: 'SIGNER', rejectionReason: 'bad' }],
      }),
    );
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(baseEnvelope({ status: 'REJECTED' }));

    await run({ payload: { documentId: 1, sendEmail: true, isResealing: false }, io });

    vitestExpect(mockTriggerJob).not.toHaveBeenCalled();
  });

  // ── resealing ──────────────────────────────────────────────────────────────

  it('R-08 - sends completion email on reseal when document was not previously completed', async () => {
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(baseEnvelope({ status: 'PENDING' }));
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(baseEnvelope({ status: 'COMPLETED' }));
    mockIsDocumentCompleted.mockReturnValue(false);

    await run({ payload: { documentId: 1, sendEmail: true, isResealing: true }, io });

    vitestExpect(mockTriggerJob).toHaveBeenCalledWith(
      vitestExpect.objectContaining({ name: 'send.document.completed.emails' }),
    );
  });

  it('R-09 - does not send completion email on reseal when document was already completed', async () => {
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(baseEnvelope({ status: 'COMPLETED' }));
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(baseEnvelope({ status: 'COMPLETED' }));
    mockIsDocumentCompleted.mockReturnValue(true);

    await run({ payload: { documentId: 1, sendEmail: true, isResealing: true }, io });

    vitestExpect(mockTriggerJob).not.toHaveBeenCalled();
  });

  // ── qrToken ────────────────────────────────────────────────────────────────

  it('R-10 - updates envelope with a new qrToken when qrToken is missing', async () => {
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(baseEnvelope({ qrToken: null }));
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(baseEnvelope({ status: 'COMPLETED' }));

    await run({ payload: { documentId: 1, sendEmail: true, isResealing: false }, io });

    vitestExpect(mockPrisma.envelope.update).toHaveBeenCalledWith(
      vitestExpect.objectContaining({
        where: { id: 'env-1' },
        data: vitestExpect.objectContaining({ qrToken: vitestExpect.any(String) }),
      }),
    );
  });

  it('R-11 - does not update qrToken when one already exists', async () => {
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(baseEnvelope({ qrToken: 'existing-token' }));
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(baseEnvelope({ status: 'COMPLETED' }));

    await run({ payload: { documentId: 1, sendEmail: true, isResealing: false }, io });

    vitestExpect(mockPrisma.envelope.update).not.toHaveBeenCalled();
  });

  // ── CC recipients ──────────────────────────────────────────────────────────

  it('R-12 - marks CC recipients as signed before completeness check', async () => {
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(
      baseEnvelope({
        recipients: [
          { signingStatus: 'SIGNED', role: 'SIGNER' },
          { signingStatus: 'NOT_SIGNED', role: 'CC' },
        ],
      }),
    );
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(baseEnvelope({ status: 'COMPLETED' }));

    await run({ payload: { documentId: 1, sendEmail: true, isResealing: false }, io });

    vitestExpect(mockPrisma.recipient.updateMany).toHaveBeenCalledWith(
      vitestExpect.objectContaining({
        where: vitestExpect.objectContaining({ role: 'CC' }),
        data: { signingStatus: 'SIGNED' },
      }),
    );
  });
});
