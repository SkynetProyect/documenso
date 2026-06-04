import * as chai from 'chai';
import { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { beforeEach, describe, it, vi } from 'vitest';

chai.use(chaiAsPromised);
chai.use(sinonChai);

const mockPrisma = {
  envelope: {
    findFirstOrThrow: sinon.stub(),
  },
  recipient: {
    updateMany: sinon.stub().resolves({}),
  },
};

const mockGetTeamSettings = sinon.stub();
const mockMapDocumentIdToSecondaryId = sinon.stub();
const mockFieldsContainUnsignedRequiredField = sinon.stub();

vi.mock('@documenso/prisma', () => ({
  prisma: mockPrisma,
}));
vi.mock('../../server-only/team/get-team-settings', () => ({
  getTeamSettings: mockGetTeamSettings,
}));
vi.mock('../../utils/envelope', () => ({
  mapDocumentIdToSecondaryId: mockMapDocumentIdToSecondaryId,
}));
vi.mock('../../utils/advanced-fields-helpers', () => ({
  fieldsContainUnsignedRequiredField: mockFieldsContainUnsignedRequiredField,
}));
vi.mock('../../utils/document', () => ({
  isDocumentCompleted: sinon.stub(),
}));
vi.mock('../../utils/document-audit-logs', () => ({
  createDocumentAuditLogData: sinon.stub().returns({ id: 'audit-1' }),
}));
vi.mock('../../client', () => ({
  jobs: {
    triggerJob: sinon.stub().resolves({}),
  },
}));
vi.mock('../../server-only/webhooks/trigger/trigger-webhook', () => ({
  triggerWebhook: sinon.stub().resolves({}),
}));

import { run } from '../../jobs/definitions/internal/seal-document.handler';

beforeEach(() => {
  sinon.reset();
  mockPrisma.envelope.findFirstOrThrow.reset();
  mockPrisma.recipient.updateMany.reset();
  mockGetTeamSettings.reset();
  mockMapDocumentIdToSecondaryId.reset();
  mockFieldsContainUnsignedRequiredField.reset();
});

describe('seal-document handler regression', () => {
  it('R-01 - throws when the envelope contains no envelope items', async () => {
    mockPrisma.envelope.findFirstOrThrow.resolves({
      id: 'env-1',
      type: 'DOCUMENT',
      secondaryId: 'secondary-doc-1',
      userId: 'user-1',
      teamId: 'team-1',
      documentMeta: { language: 'en' },
      user: { name: 'Name', email: 'email@example.com' },
      recipients: [{ signingStatus: 'SIGNED', role: 'SIGNER' }],
      fields: [],
      envelopeItems: [],
      qrToken: 'qr-token',
      useLegacyFieldInsertion: false,
      internalVersion: 2,
    } as any);
    mockMapDocumentIdToSecondaryId.returns('secondary-doc-1');
    mockGetTeamSettings.resolves({ includeSigningCertificate: false, includeAuditLog: false });
    mockFieldsContainUnsignedRequiredField.returns(false);

    await expect(
      run({
        payload: { documentId: 'doc-1', sendEmail: true, isResealing: false },
        io: {
          runTask: async (_task, callback) => callback(),
        } as any,
      }),
    ).to.be.rejectedWith('At least one envelope item required');
  });

  it('R-02 - throws when unsigned required fields remain on a completed document', async () => {
    mockPrisma.envelope.findFirstOrThrow.resolves({
      id: 'env-1',
      type: 'DOCUMENT',
      secondaryId: 'secondary-doc-1',
      userId: 'user-1',
      teamId: 'team-1',
      documentMeta: { language: 'en' },
      user: { name: 'Name', email: 'email@example.com' },
      recipients: [{ signingStatus: 'SIGNED', role: 'SIGNER' }],
      fields: [{ required: true }],
      envelopeItems: [
        {
          id: 'item-1',
          title: 'contract.pdf',
          documentData: { id: 'old-123', initialData: 'initial-data' },
        },
      ],
      qrToken: 'qr-token',
      useLegacyFieldInsertion: false,
      internalVersion: 2,
    } as any);
    mockMapDocumentIdToSecondaryId.returns('secondary-doc-1');
    mockGetTeamSettings.resolves({ includeSigningCertificate: false, includeAuditLog: false });
    mockFieldsContainUnsignedRequiredField.returns(true);

    await expect(
      run({
        payload: { documentId: 'doc-1', sendEmail: true, isResealing: false },
        io: {
          runTask: async (_task, callback) => callback(),
        } as any,
      }),
    ).to.be.rejectedWith('Document env-1 has unsigned required fields');
  });
});
