import * as chai from 'chai';
import { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { beforeEach, describe, it, vi } from 'vitest';

chai.use(chaiAsPromised);
chai.use(sinonChai);

const inputPdfBytes = new Uint8Array([1, 2, 3]);
const signedPdfBytes = Buffer.from([5]);

const mockPrisma = {
  envelope: {
    findFirstOrThrow: sinon.stub(),
    update: sinon.stub().resolves({}),
  },
  recipient: {
    updateMany: sinon.stub().resolves({}),
  },
  envelopeItem: {
    update: sinon.stub().resolves({}),
  },
  documentAuditLog: {
    create: sinon.stub().resolves({}),
  },
  $transaction: sinon.stub(),
};

const mockJobs = {
  triggerJob: sinon.stub().resolves({}),
};

const mockTriggerWebhook = sinon.stub();
const mockGetTeamSettings = sinon.stub();
const mockGetFileServerSide = sinon.stub();
const mockPDFLoad = sinon.stub();
const mockMapDocumentIdToSecondaryId = sinon.stub();
const mockFieldsContainUnsignedRequiredField = sinon.stub();
const mockCreateDocumentAuditLogData = sinon.stub();
const mockMapEnvelopeToWebhookDocumentPayload = sinon.stub();
const mockZWebhookDocumentSchemaParse = sinon.stub();
const mockIsDocumentCompleted = sinon.stub();

vi.mock('@documenso/prisma', () => ({
  prisma: mockPrisma,
}));
vi.mock('../../server-only/team/get-team-settings', () => ({
  getTeamSettings: mockGetTeamSettings,
}));
vi.mock('../../universal/upload/get-file.server', () => ({
  getFileServerSide: mockGetFileServerSide,
}));
vi.mock('@libpdf/core', () => ({
  PDF: {
    load: mockPDFLoad,
  },
}));
vi.mock('../../utils/envelope', () => ({
  mapDocumentIdToSecondaryId: mockMapDocumentIdToSecondaryId,
}));
vi.mock('../../utils/advanced-fields-helpers', () => ({
  fieldsContainUnsignedRequiredField: mockFieldsContainUnsignedRequiredField,
}));
vi.mock('../../utils/document-audit-logs', () => ({
  createDocumentAuditLogData: mockCreateDocumentAuditLogData,
}));
vi.mock('../../types/webhook-payload', () => ({
  mapEnvelopeToWebhookDocumentPayload: mockMapEnvelopeToWebhookDocumentPayload,
  ZWebhookDocumentSchema: {
    parse: mockZWebhookDocumentSchemaParse,
  },
}));
vi.mock('../../utils/document', () => ({
  isDocumentCompleted: mockIsDocumentCompleted,
}));
vi.mock('../../server-only/webhooks/trigger/trigger-webhook', () => ({
  triggerWebhook: mockTriggerWebhook,
}));
vi.mock('../../client', () => ({
  jobs: mockJobs,
}));

import { run } from '../../jobs/definitions/internal/seal-document.handler';

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
  documentMeta: {
    language: 'en',
  },
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
    },
  ],
  qrToken: 'qr-token',
  user: {
    name: 'User Name',
    email: 'user@example.com',
  },
};

const updatedEnvelope = {
  ...baseEnvelope,
  status: 'COMPLETED',
};

beforeEach(() => {
  sinon.reset();
  mockPrisma.envelope.findFirstOrThrow.reset();
  mockPrisma.recipient.updateMany.reset();
  mockPrisma.envelopeItem.update.reset();
  mockPrisma.envelope.update.reset();
  mockPrisma.documentAuditLog.create.reset();
  mockPrisma.$transaction.reset();
  mockJobs.triggerJob.reset();
  mockTriggerWebhook.reset();
  mockGetTeamSettings.reset();
  mockGetFileServerSide.reset();
  mockPDFLoad.reset();
  mockMapDocumentIdToSecondaryId.reset();
  mockFieldsContainUnsignedRequiredField.reset();
  mockCreateDocumentAuditLogData.reset();
  mockMapEnvelopeToWebhookDocumentPayload.reset();
  mockZWebhookDocumentSchemaParse.reset();
  mockIsDocumentCompleted.reset();
});

describe('seal-document handler integration', () => {
  it('I-01 - seals a completed document and triggers completion workflow', async () => {
    const pdfDoc = createPdfDoc();
    mockPrisma.envelope.findFirstOrThrow.onFirstCall().resolves(baseEnvelope as any);
    mockPrisma.envelope.findFirstOrThrow.onSecondCall().resolves(updatedEnvelope as any);
    mockPrisma.$transaction.callsFake(async (callback) =>
      callback({
        envelopeItem: { update: sinon.stub().resolves({}) },
        envelope: { update: sinon.stub().resolves({}) },
        documentAuditLog: { create: sinon.stub().resolves({}) },
      } as any),
    );
    mockGetFileServerSide.resolves(inputPdfBytes);
    mockPDFLoad.resolves(pdfDoc as any);
    mockGetTeamSettings.resolves({ includeSigningCertificate: false, includeAuditLog: false });
    mockMapDocumentIdToSecondaryId.returns('secondary-doc-1');
    mockFieldsContainUnsignedRequiredField.returns(false);
    mockCreateDocumentAuditLogData.returns({ id: 'audit-1' });
    mockMapEnvelopeToWebhookDocumentPayload.returns({ documentId: 'doc-1' });
    mockZWebhookDocumentSchemaParse.returns({ documentId: 'doc-1' });

    await run({
      payload: {
        documentId: 'doc-1',
        sendEmail: true,
        isResealing: false,
      },
      io: {
        runTask: async (_task, callback) => callback(),
      } as any,
    });

    expect(mockPrisma.recipient.updateMany).to.have.been.calledOnce;
    expect(mockTriggerWebhook).to.have.been.calledOnce;
    expect(mockTriggerWebhook).to.have.been.calledWithMatch({
      event: 'DOCUMENT_COMPLETED',
    });
    expect(mockJobs.triggerJob).to.have.been.calledOnce;
    expect(mockJobs.triggerJob).to.have.been.calledWithMatch({
      name: 'send.document.completed.emails',
      payload: {
        envelopeId: 'env-1',
      },
    });
  });

  it('I-02 - does not send completed email when sendEmail is false', async () => {
    const pdfDoc = createPdfDoc();
    mockPrisma.envelope.findFirstOrThrow.onFirstCall().resolves(baseEnvelope as any);
    mockPrisma.envelope.findFirstOrThrow.onSecondCall().resolves(updatedEnvelope as any);
    mockPrisma.$transaction.callsFake(async (callback) =>
      callback({
        envelopeItem: { update: sinon.stub().resolves({}) },
        envelope: { update: sinon.stub().resolves({}) },
        documentAuditLog: { create: sinon.stub().resolves({}) },
      } as any),
    );
    mockGetFileServerSide.resolves(inputPdfBytes);
    mockPDFLoad.resolves(pdfDoc as any);
    mockGetTeamSettings.resolves({ includeSigningCertificate: false, includeAuditLog: false });
    mockMapDocumentIdToSecondaryId.returns('secondary-doc-1');
    mockFieldsContainUnsignedRequiredField.returns(false);
    mockCreateDocumentAuditLogData.returns({ id: 'audit-1' });
    mockMapEnvelopeToWebhookDocumentPayload.returns({ documentId: 'doc-1' });
    mockZWebhookDocumentSchemaParse.returns({ documentId: 'doc-1' });

    await run({
      payload: {
        documentId: 'doc-1',
        sendEmail: false,
        isResealing: false,
      },
      io: {
        runTask: async (_task, callback) => callback(),
      } as any,
    });

    expect(mockJobs.triggerJob).to.not.have.been.called;
  });
});
