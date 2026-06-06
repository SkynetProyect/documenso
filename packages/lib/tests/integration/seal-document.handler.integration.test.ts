import * as chai from 'chai';
import { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { beforeEach, describe, it, vi } from 'vitest';

chai.use(chaiAsPromised);
chai.use(sinonChai);

// ─── vi.mock calls first — no external variable references inside factories ──

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
// To match your actual import:
vi.mock('../../jobs/client', () => ({ jobs: { triggerJob: vi.fn() } }));
vi.mock('../../server-only/team/get-team-settings', () => ({ getTeamSettings: vi.fn() }));
vi.mock('../../server-only/webhooks/trigger/trigger-webhook', () => ({ triggerWebhook: vi.fn() }));
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

vi.mock('@documenso/lib/server-only/pdf/generate-audit-log-pdf', () => ({
  generateAuditLogPdf: vi.fn(),
}));
vi.mock('@documenso/lib/server-only/pdf/generate-certificate-pdf', () => ({
  generateCertificatePdf: vi.fn(),
}));
vi.mock('../../constants/i18n', () => ({
  SUPPORTED_LANGUAGES: {},
  isValidLanguageCode: vi.fn().mockReturnValue(true),
}));
vi.mock('../../server-only/pdf/insert-field-in-pdf-v1', () => ({
  insertFieldInPDFV1: vi.fn(),
}));
vi.mock('../../server-only/pdf/insert-field-in-pdf-v2', () => ({
  insertFieldInPDFV2: vi.fn(),
}));
vi.mock('../../server-only/pdf/legacy-insert-field-in-pdf', () => ({
  legacy_insertFieldInPDF: vi.fn(),
}));
vi.mock('../../types/document-audit-logs', () => ({
  DOCUMENT_AUDIT_LOG_TYPE: {
    DOCUMENT_COMPLETED: 'DOCUMENT_COMPLETED',
  },
  createDocumentAuditLogData: vi.fn(),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

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
  flattenAll: sinon.stub(),
  upgradeVersion: sinon.stub(),
  copyPagesFrom: sinon.stub().resolves(),
  getPage: sinon.stub().returns({
    width: 100,
    height: 200,
    rotation: 0,
    drawPage: sinon.stub(),
  }),
  embedPage: sinon.stub().resolves({}),
  save: sinon.stub().resolves(inputPdfBytes),
  reload: sinon.stub().resolves(),
});

const baseEnvelope = {
  id: 'env-1',
  title: 'contract.pdf',
  useLegacyFieldInsertion: false,
  internalVersion: 2,
  type: 'DOCUMENT',
  secondaryId: 'doc-1',
  userId: 'user-1',
  teamId: 'team-1',
  documentMeta: { language: 'en' },
  recipients: [
    { signingStatus: 'SIGNED', role: 'SIGNER' },
    { signingStatus: 'SIGNED', role: 'CC' },
  ],
  fields: [],
  envelopeItems: [
    {
      id: 'item-1',
      title: 'contract.pdf',
      documentData: {
        id: 'old-123',
        initialData: 'initial-data',
      },
      field: [],
    },
  ],
  qrToken: 'qr-token',
  user: {
    name: 'User Name',
    email: 'user@example.com',
  },
};

const updatedEnvelope = { ...baseEnvelope, status: 'COMPLETED' };

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();

  mockPutPdfFileServerSide.mockResolvedValue({ documentData: { id: 'new-123' }, filePageCount: 1 });
  mockSignPdf.mockResolvedValue(signedPdfBytes);
  mockTriggerWebhook.mockResolvedValue(undefined);
  mockTriggerJob.mockResolvedValue({});
  mockMapDocumentIdToSecondaryId.mockReturnValue('secondary-doc-1');
  mockFieldsContainUnsignedRequiredField.mockReturnValue(false);
  mockCreateDocumentAuditLogData.mockReturnValue({ id: 'audit-1' });
  mockMapEnvelopeToWebhookDocumentPayload.mockReturnValue({ documentId: 'doc-1' });
  mockZWebhookDocumentSchemaParse.mockReturnValue({ documentId: 'doc-1' });
  mockIsDocumentCompleted.mockReturnValue(false);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('seal-document handler integration', () => {
  it('I-01 - seals a completed document and triggers completion workflow', async () => {
    const pdfDoc = createPdfDoc();
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(baseEnvelope);
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(updatedEnvelope);
    mockPrisma.recipient.updateMany.mockResolvedValue({});
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        envelopeItem: { update: vi.fn().mockResolvedValue({}) },
        envelope: { update: vi.fn().mockResolvedValue({}) },
        documentAuditLog: { create: vi.fn().mockResolvedValue({}) },
      }),
    );
    mockGetFileServerSide.mockResolvedValue(inputPdfBytes);
    mockPDFLoad.mockResolvedValue(pdfDoc);
    mockGetTeamSettings.mockResolvedValue({ includeSigningCertificate: false, includeAuditLog: false });

    await run({
      payload: {
        documentId: 1,
        sendEmail: true,
        isResealing: false,
      },
      io: {
        runTask: (_task: unknown, callback: () => Promise<unknown>) => callback(),
      } as any,
    });

    expect(mockPrisma.recipient.updateMany).to.have.been.calledOnce;
    expect(mockTriggerWebhook).to.have.been.calledOnce;
    expect(mockTriggerWebhook).to.have.been.calledWithMatch({
      event: 'DOCUMENT_COMPLETED',
    });
    expect(mockTriggerJob).to.have.been.calledOnce;
    expect(mockTriggerJob).to.have.been.calledWithMatch({
      name: 'send.document.completed.emails',
      payload: { envelopeId: 'env-1' },
    });
  });

  it('I-02 - does not send completed email when sendEmail is false', async () => {
    const pdfDoc = createPdfDoc();
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(baseEnvelope);
    mockPrisma.envelope.findFirstOrThrow.mockResolvedValueOnce(updatedEnvelope);
    mockPrisma.recipient.updateMany.mockResolvedValue({});
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        envelopeItem: { update: vi.fn().mockResolvedValue({}) },
        envelope: { update: vi.fn().mockResolvedValue({}) },
        documentAuditLog: { create: vi.fn().mockResolvedValue({}) },
      }),
    );
    mockGetFileServerSide.mockResolvedValue(inputPdfBytes);
    mockPDFLoad.mockResolvedValue(pdfDoc);
    mockGetTeamSettings.mockResolvedValue({ includeSigningCertificate: false, includeAuditLog: false });

    await run({
      payload: {
        documentId: 1,
        sendEmail: false,
        isResealing: false,
      },
      io: {
        runTask: (_task: unknown, callback: () => Promise<unknown>) => callback(),
      } as any,
    });

    expect(mockTriggerJob).to.not.have.been.called;
  });
});
