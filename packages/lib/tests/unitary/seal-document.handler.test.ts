import * as chai from 'chai';
import { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { beforeEach, describe, it } from 'vitest';

chai.use(chaiAsPromised);
chai.use(sinonChai);

// ─── Test doubles ────────────────────────────────────────────────────────────

const inputPdfBytes = new Uint8Array([0, 1, 2]);
const savedPdfBytes = new Uint8Array([9]);
const overlayBytes = Buffer.from([3]);
const legacySaveBytes = new Uint8Array([4]);
const signedPdfBytes = Buffer.from([5]);

// ─── Module mocks ─────────────────────────────────────────────────────────────

import { vi } from 'vitest';

vi.mock('@documenso/lib/server-only/pdf/add-rejection-stamp-to-pdf', () => ({
  addRejectionStampToPdf: sinon.stub(),
}));
vi.mock('@documenso/lib/server-only/pdf/generate-audit-log-pdf', () => ({
  generateAuditLogPdf: sinon.stub(),
}));
vi.mock('@documenso/lib/server-only/pdf/generate-certificate-pdf', () => ({
  generateCertificatePdf: sinon.stub(),
}));
vi.mock('@documenso/prisma', () => ({
  prisma: {},
}));
vi.mock('@documenso/signing', () => ({
  signPdf: sinon.stub(),
}));
vi.mock('@libpdf/core', () => ({
  PDF: {
    load: sinon.stub(),
  },
}));
vi.mock('@cantoo/pdf-lib', () => ({
  PDFDocument: {
    load: sinon.stub(),
  },
}));
vi.mock('../../server-only/htmltopdf/get-audit-logs-pdf', () => ({
  getAuditLogsPdf: sinon.stub(),
}));
vi.mock('../../server-only/htmltopdf/get-certificate-pdf', () => ({
  getCertificatePdf: sinon.stub(),
}));
vi.mock('../../server-only/pdf/insert-field-in-pdf-v1', () => ({
  insertFieldInPDFV1: sinon.stub(),
}));
vi.mock('../../server-only/pdf/insert-field-in-pdf-v2', () => ({
  insertFieldInPDFV2: sinon.stub(),
}));
vi.mock('../../server-only/pdf/legacy-insert-field-in-pdf', () => ({
  legacy_insertFieldInPDF: sinon.stub(),
}));
vi.mock('../../server-only/team/get-team-settings', () => ({
  getTeamSettings: sinon.stub(),
}));
vi.mock('../../server-only/webhooks/trigger/trigger-webhook', () => ({
  triggerWebhook: sinon.stub(),
}));
vi.mock('../../universal/upload/put-file.server', () => ({
  putPdfFileServerSide: sinon.stub(),
}));
vi.mock('../../universal/upload/get-file.server', () => ({
  getFileServerSide: sinon.stub(),
}));
vi.mock('../../constants/app', () => ({
  NEXT_PRIVATE_USE_PLAYWRIGHT_PDF: sinon.stub().returns(false),
}));
vi.mock('../../utils/advanced-fields-helpers', () => ({
  fieldsContainUnsignedRequiredField: sinon.stub(),
}));
vi.mock('../../utils/document', () => ({
  isDocumentCompleted: sinon.stub(),
}));
vi.mock('../../utils/document-audit-logs', () => ({
  createDocumentAuditLogData: sinon.stub(),
}));
vi.mock('../../types/document-audit-logs', () => ({
  DOCUMENT_AUDIT_LOG_TYPE: {
    DOCUMENT: 'DOCUMENT',
  },
}));
vi.mock('../../utils/envelope', () => ({
  mapDocumentIdToSecondaryId: sinon.stub(),
}));
vi.mock('../../client', () => ({
  jobs: {},
}));
vi.mock('nanoid', () => ({
  nanoid: sinon.stub().returns('nanoid'),
  customAlphabet: sinon.stub().returns(sinon.stub().returns('alphaid')),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { PDFDocument } from '@cantoo/pdf-lib';
import { addRejectionStampToPdf } from '@documenso/lib/server-only/pdf/add-rejection-stamp-to-pdf';
import { signPdf } from '@documenso/signing';
import { PDF } from '@libpdf/core';
import { decorateAndSignPdf } from '../../jobs/definitions/internal/seal-document.handler';
import { insertFieldInPDFV1 } from '../../server-only/pdf/insert-field-in-pdf-v1';
import { insertFieldInPDFV2 } from '../../server-only/pdf/insert-field-in-pdf-v2';
import { legacy_insertFieldInPDF } from '../../server-only/pdf/legacy-insert-field-in-pdf';
import { putPdfFileServerSide } from '../../universal/upload/put-file.server';

// ─── Sinon stub references ────────────────────────────────────────────────────

const pdfLoad = PDF.load as sinon.SinonStub;
const pdfDocumentLoad = PDFDocument.load as sinon.SinonStub;
const stubSignPdf = signPdf as sinon.SinonStub;
const stubPutPdfFileServerSide = putPdfFileServerSide as sinon.SinonStub;
const stubInsertFieldInPDFV1 = insertFieldInPDFV1 as sinon.SinonStub;
const stubInsertFieldInPDFV2 = insertFieldInPDFV2 as sinon.SinonStub;
const stubLegacyInsertFieldInPDF = legacy_insertFieldInPDF as sinon.SinonStub;
const stubAddRejectionStampToPdf = addRejectionStampToPdf as sinon.SinonStub;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createPage = (rotation = 0) => ({
  width: 400,
  height: 500,
  rotation,
  drawPage: sinon.stub(),
});

const createPdfDoc = (pages = [createPage()]) => {
  const pdfDoc = {
    flattenAll: sinon.stub(),
    upgradeVersion: sinon.stub(),
    copyPagesFrom: sinon.stub().resolves(),
    getPage: sinon.stub().callsFake((index: number) => pages[index]),
    embedPage: sinon.stub().resolves({ embedded: true }),
    save: sinon.stub().resolves(savedPdfBytes),
    reload: sinon.stub().resolves(),
  };

  pdfDocumentLoad.resolves({
    getForm: sinon.stub().returns({ flatten: sinon.stub() }),
    save: sinon.stub().resolves(legacySaveBytes),
  });

  pdfLoad.callsFake(async (data: unknown) => {
    if (data === overlayBytes) {
      return { overlay: true } as unknown as PDF;
    }
    return pdfDoc as unknown as PDF;
  });

  return pdfDoc;
};

// ─── Base fixtures ────────────────────────────────────────────────────────────

const baseEnvelope = {
  id: 'env-1',
  title: 'contract.pdf',
  useLegacyFieldInsertion: false,
  internalVersion: 1,
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
  pdfData: inputPdfBytes,
  certificateDoc: null,
  auditLogDoc: null,
};

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  // Reset call history and behaviour on every stub created via vi.mock()
  [
    pdfLoad,
    pdfDocumentLoad,
    stubSignPdf,
    stubPutPdfFileServerSide,
    stubInsertFieldInPDFV1,
    stubInsertFieldInPDFV2,
    stubLegacyInsertFieldInPDF,
    stubAddRejectionStampToPdf,
  ].forEach((s) => s.reset());

  stubSignPdf.resolves(signedPdfBytes);
  stubPutPdfFileServerSide.resolves({ documentData: { id: 'new-123' }, filePageCount: 1 });
  stubInsertFieldInPDFV2.resolves(overlayBytes);
  stubAddRejectionStampToPdf.resolves();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('decorateAndSignPdf', () => {
  // ── isRejected ──────────────────────────────────────────────────────────────

  it('T-01 - calls addRejectionStampToPdf when isRejected is true', async () => {
    // Arrange
    const pdfDoc = createPdfDoc();

    // Act
    await decorateAndSignPdf({ ...baseArgs, isRejected: true, rejectionReason: 'bad' });

    // Assert
    expect(stubAddRejectionStampToPdf).to.have.been.calledOnce;
    expect(stubAddRejectionStampToPdf).to.have.been.calledWith(pdfDoc, 'bad');
  });

  it('T-02 - does not call addRejectionStampToPdf when isRejected is false', async () => {
    // Arrange
    createPdfDoc();

    // Act
    await decorateAndSignPdf({ ...baseArgs, isRejected: false });

    // Assert
    expect(stubAddRejectionStampToPdf).to.not.have.been.called;
  });

  // ── certificateDoc ──────────────────────────────────────────────────────────

  it('T-03 - copies certificate pages when certificateDoc is provided', async () => {
    // Arrange
    const pdfDoc = createPdfDoc();
    const certificateDoc = { getPageCount: sinon.stub().returns(2) } as unknown as PDF;

    // Act
    await decorateAndSignPdf({ ...baseArgs, certificateDoc });

    // Assert
    expect(pdfDoc.copyPagesFrom).to.have.been.calledWith(certificateDoc, [0, 1]);
  });

  it('T-04 - does not copy certificate pages when certificateDoc is null', async () => {
    // Arrange
    const pdfDoc = createPdfDoc();

    // Act
    await decorateAndSignPdf({ ...baseArgs, certificateDoc: null });

    // Assert
    expect(pdfDoc.copyPagesFrom).to.not.have.been.called;
  });

  // ── auditLogDoc ─────────────────────────────────────────────────────────────

  it('T-05 - copies audit log pages when auditLogDoc is provided', async () => {
    // Arrange
    const pdfDoc = createPdfDoc();
    const auditLogDoc = { getPageCount: sinon.stub().returns(3) } as unknown as PDF;

    // Act
    await decorateAndSignPdf({ ...baseArgs, auditLogDoc });

    // Assert
    expect(pdfDoc.copyPagesFrom).to.have.been.calledWith(auditLogDoc, [0, 1, 2]);
  });

  it('T-06 - does not copy audit log pages when auditLogDoc is null', async () => {
    // Arrange
    const pdfDoc = createPdfDoc();

    // Act
    await decorateAndSignPdf({ ...baseArgs, auditLogDoc: null });

    // Assert
    expect(pdfDoc.copyPagesFrom).to.not.have.been.called;
  });

  // ── internalVersion === 1 ───────────────────────────────────────────────────

  it('T-07 - executes V1 block when internalVersion is 1', async () => {
    // Arrange
    const pdfDoc = createPdfDoc();

    // Act
    await decorateAndSignPdf({ ...baseArgs, envelope: { ...baseEnvelope, internalVersion: 1 } });

    // Assert
    expect(pdfDocumentLoad).to.have.been.calledOnce;
    expect(pdfDoc.reload).to.have.been.calledOnce;
  });

  it('T-08 - skips V1 block when internalVersion is 2', async () => {
    // Arrange
    const pdfDoc = createPdfDoc();

    // Act
    await decorateAndSignPdf({ ...baseArgs, envelope: { ...baseEnvelope, internalVersion: 2 } });

    // Assert
    expect(pdfDocumentLoad).to.not.have.been.called;
    expect(pdfDoc.reload).to.not.have.been.called;
  });

  // ── useLegacyFieldInsertion ─────────────────────────────────────────────────

  it('T-09 - uses legacy inserter when useLegacyFieldInsertion is true', async () => {
    // Arrange
    createPdfDoc();

    // Act
    await decorateAndSignPdf({
      ...baseArgs,
      envelope: { ...baseEnvelope, internalVersion: 1, useLegacyFieldInsertion: true },
      envelopeItemFields: [{ inserted: true } as any],
    });

    // Assert
    expect(stubLegacyInsertFieldInPDF).to.have.been.calledOnce;
    expect(stubInsertFieldInPDFV1).to.not.have.been.called;
  });

  it('T-10 - uses V1 inserter when useLegacyFieldInsertion is false', async () => {
    // Arrange
    createPdfDoc();

    // Act
    await decorateAndSignPdf({
      ...baseArgs,
      envelope: { ...baseEnvelope, internalVersion: 1, useLegacyFieldInsertion: false },
      envelopeItemFields: [{ inserted: true } as any],
    });

    // Assert
    expect(stubInsertFieldInPDFV1).to.have.been.calledOnce;
    expect(stubLegacyInsertFieldInPDF).to.not.have.been.called;
  });

  // ── field.inserted ──────────────────────────────────────────────────────────

  it('T-11 - inserts field when field.inserted is true', async () => {
    // Arrange
    createPdfDoc();

    // Act
    await decorateAndSignPdf({
      ...baseArgs,
      envelope: { ...baseEnvelope, internalVersion: 1, useLegacyFieldInsertion: false },
      envelopeItemFields: [{ inserted: true } as any],
    });

    // Assert
    expect(stubInsertFieldInPDFV1).to.have.been.called;
  });

  it('T-12 - skips field when field.inserted is false', async () => {
    // Arrange
    createPdfDoc();

    // Act
    await decorateAndSignPdf({
      ...baseArgs,
      envelope: { ...baseEnvelope, internalVersion: 1, useLegacyFieldInsertion: false },
      envelopeItemFields: [{ inserted: false } as any],
    });

    // Assert
    expect(stubInsertFieldInPDFV1).to.not.have.been.called;
    expect(stubLegacyInsertFieldInPDF).to.not.have.been.called;
  });

  // ── internalVersion === 2 ───────────────────────────────────────────────────

  it('T-13 - executes V2 overlay pipeline when internalVersion is 2', async () => {
    // Arrange
    const page = createPage(0);
    const pdfDoc = createPdfDoc([page]);

    // Act
    await decorateAndSignPdf({
      ...baseArgs,
      envelope: { ...baseEnvelope, internalVersion: 2 },
      envelopeItemFields: [{ inserted: true, page: 1 } as any],
    });

    // Assert
    expect(stubInsertFieldInPDFV2).to.have.been.calledOnce;
    expect(pdfDoc.embedPage).to.have.been.calledOnce;
    expect(page.drawPage).to.have.been.calledOnce;
  });

  it('T-14 - skips V2 block when internalVersion is 1', async () => {
    // Arrange
    createPdfDoc();

    // Act
    await decorateAndSignPdf({
      ...baseArgs,
      envelope: { ...baseEnvelope, internalVersion: 1 },
    });

    // Assert
    expect(stubInsertFieldInPDFV2).to.not.have.been.called;
  });

  // ── page existence check ────────────────────────────────────────────────────

  it('T-15 - throws when field references a page that does not exist', async () => {
    // Arrange
    createPdfDoc([createPage(0)]);

    // Act
    const action = decorateAndSignPdf({
      ...baseArgs,
      envelope: { ...baseEnvelope, internalVersion: 2 },
      envelopeItemFields: [{ inserted: true, page: 99 } as any],
    });

    // Assert
    await expect(action).to.be.rejectedWith('Page 99 does not exist');
  });

  it('T-16 - resolves successfully when field references a valid page', async () => {
    // Arrange
    createPdfDoc([createPage(0)]);

    // Act
    const action = decorateAndSignPdf({
      ...baseArgs,
      envelope: { ...baseEnvelope, internalVersion: 2 },
      envelopeItemFields: [{ inserted: true, page: 1 } as any],
    });

    // Assert
    await expect(action).to.eventually.deep.equal({
      oldDocumentDataId: 'old-123',
      newDocumentDataId: 'new-123',
    });
  });

  // ── page.rotation switch ────────────────────────────────────────────────────

  it('T-17 - applies zero translation when rotation is 0', async () => {
    // Arrange
    const page = createPage(0);
    createPdfDoc([page]);

    // Act
    await decorateAndSignPdf({
      ...baseArgs,
      envelope: { ...baseEnvelope, internalVersion: 2 },
      envelopeItemFields: [{ inserted: true, page: 1 } as any],
    });

    // Assert
    expect(page.drawPage).to.have.been.calledWith(sinon.match.any, sinon.match({ x: 0, y: 0 }));
  });

  it('T-18 - translates by pageHeight on X when rotation is 90', async () => {
    // Arrange
    const page = createPage(90);
    createPdfDoc([page]);

    // Act
    await decorateAndSignPdf({
      ...baseArgs,
      envelope: { ...baseEnvelope, internalVersion: 2 },
      envelopeItemFields: [{ inserted: true, page: 1 } as any],
    });

    // Assert
    expect(page.drawPage).to.have.been.calledWith(sinon.match.any, sinon.match({ x: 500, y: 0 }));
  });

  it('T-19 - translates by pageWidth and pageHeight when rotation is 180', async () => {
    // Arrange
    const page = createPage(180);
    createPdfDoc([page]);

    // Act
    await decorateAndSignPdf({
      ...baseArgs,
      envelope: { ...baseEnvelope, internalVersion: 2 },
      envelopeItemFields: [{ inserted: true, page: 1 } as any],
    });

    // Assert
    expect(page.drawPage).to.have.been.calledWith(sinon.match.any, sinon.match({ x: 400, y: 500 }));
  });

  it('T-20 - translates by pageWidth on Y when rotation is 270', async () => {
    // Arrange
    const page = createPage(270);
    createPdfDoc([page]);

    // Act
    await decorateAndSignPdf({
      ...baseArgs,
      envelope: { ...baseEnvelope, internalVersion: 2 },
      envelopeItemFields: [{ inserted: true, page: 1 } as any],
    });

    // Assert
    expect(page.drawPage).to.have.been.calledWith(sinon.match.any, sinon.match({ x: 0, y: 400 }));
  });

  // ── isRejected suffix ───────────────────────────────────────────────────────

  it('T-21 - uploads with _rejected.pdf suffix when isRejected is true', async () => {
    // Arrange
    createPdfDoc();

    // Act
    await decorateAndSignPdf({ ...baseArgs, isRejected: true, rejectionReason: 'bad' });

    // Assert
    expect(stubPutPdfFileServerSide).to.have.been.calledWith(
      sinon.match({ name: 'contract_rejected.pdf' }),
      'initial-data',
    );
  });

  it('T-22 - uploads with _signed.pdf suffix when isRejected is false', async () => {
    // Arrange
    createPdfDoc();

    // Act
    await decorateAndSignPdf({ ...baseArgs, isRejected: false });

    // Assert
    expect(stubPutPdfFileServerSide).to.have.been.calledWith(
      sinon.match({ name: 'contract_signed.pdf' }),
      'initial-data',
    );
  });

  // ── function failures ───────────────────────────────────────────────────────

  it('T-23 - throws and skips all further calls when PDF.load fails', async () => {
    // Arrange
    createPdfDoc();
    pdfLoad.rejects(new Error('bad pdf'));

    // Act
    const action = decorateAndSignPdf({ ...baseArgs });

    // Assert
    await expect(action).to.be.rejectedWith('bad pdf');
    expect(stubSignPdf).to.not.have.been.called;
    expect(stubPutPdfFileServerSide).to.not.have.been.called;
  });

  it('T-24 - throws and skips upload when addRejectionStampToPdf fails', async () => {
    // Arrange
    stubAddRejectionStampToPdf.rejects(new Error('stamp failed'));
    createPdfDoc();

    // Act
    const action = decorateAndSignPdf({ ...baseArgs, isRejected: true, rejectionReason: 'bad' });

    // Assert
    await expect(action).to.be.rejectedWith('stamp failed');
    expect(stubPutPdfFileServerSide).to.not.have.been.called;
  });

  it('T-25 - throws when copyPagesFrom fails for certificateDoc', async () => {
    // Arrange
    const pdfDoc = createPdfDoc();
    pdfDoc.copyPagesFrom.rejects(new Error('copy fail'));
    const certificateDoc = { getPageCount: sinon.stub().returns(1) } as unknown as PDF;

    // Act
    const action = decorateAndSignPdf({ ...baseArgs, certificateDoc });

    // Assert
    await expect(action).to.be.rejectedWith('copy fail');
  });

  it('T-26 - throws when copyPagesFrom fails for auditLogDoc', async () => {
    // Arrange
    const pdfDoc = createPdfDoc();
    pdfDoc.copyPagesFrom.rejects(new Error('copy fail'));
    const auditLogDoc = { getPageCount: sinon.stub().returns(1) } as unknown as PDF;

    // Act
    const action = decorateAndSignPdf({ ...baseArgs, auditLogDoc });

    // Assert
    await expect(action).to.be.rejectedWith('copy fail');
  });

  it('T-27 - throws when legacy_insertFieldInPDF fails', async () => {
    // Arrange
    stubLegacyInsertFieldInPDF.rejects(new Error('legacy fail'));
    createPdfDoc();

    // Act
    const action = decorateAndSignPdf({
      ...baseArgs,
      envelope: { ...baseEnvelope, internalVersion: 1, useLegacyFieldInsertion: true },
      envelopeItemFields: [{ inserted: true } as any],
    });

    // Assert
    await expect(action).to.be.rejectedWith('legacy fail');
  });

  it('T-28 - throws when insertFieldInPDFV1 fails', async () => {
    // Arrange
    stubInsertFieldInPDFV1.rejects(new Error('v1 fail'));
    createPdfDoc();

    // Act
    const action = decorateAndSignPdf({
      ...baseArgs,
      envelope: { ...baseEnvelope, internalVersion: 1, useLegacyFieldInsertion: false },
      envelopeItemFields: [{ inserted: true } as any],
    });

    // Assert
    await expect(action).to.be.rejectedWith('v1 fail');
  });

  it('T-29 - throws when insertFieldInPDFV2 fails', async () => {
    // Arrange
    stubInsertFieldInPDFV2.rejects(new Error('v2 fail'));
    createPdfDoc([createPage(0)]);

    // Act
    const action = decorateAndSignPdf({
      ...baseArgs,
      envelope: { ...baseEnvelope, internalVersion: 2 },
      envelopeItemFields: [{ inserted: true, page: 1 } as any],
    });

    // Assert
    await expect(action).to.be.rejectedWith('v2 fail');
  });

  it('T-30 - throws and skips upload when signPdf fails', async () => {
    // Arrange
    stubSignPdf.rejects(new Error('sign fail'));
    createPdfDoc();

    // Act
    const action = decorateAndSignPdf({ ...baseArgs });

    // Assert
    await expect(action).to.be.rejectedWith('sign fail');
    expect(stubPutPdfFileServerSide).to.not.have.been.called;
  });

  it('T-31 - throws when putPdfFileServerSide fails', async () => {
    // Arrange
    stubPutPdfFileServerSide.rejects(new Error('upload fail'));
    createPdfDoc();

    // Act
    const action = decorateAndSignPdf({ ...baseArgs });

    // Assert
    await expect(action).to.be.rejectedWith('upload fail');
  });

  // ── edge cases ──────────────────────────────────────────────────────────────

  it('T-32 - resolves without calling any inserter when fields array is empty in V1', async () => {
    // Arrange
    createPdfDoc();

    // Act
    const action = decorateAndSignPdf({
      ...baseArgs,
      envelope: { ...baseEnvelope, internalVersion: 1 },
      envelopeItemFields: [],
    });

    // Assert
    await expect(action).to.eventually.deep.equal({
      oldDocumentDataId: 'old-123',
      newDocumentDataId: 'new-123',
    });
    expect(stubInsertFieldInPDFV1).to.not.have.been.called;
    expect(stubLegacyInsertFieldInPDF).to.not.have.been.called;
  });

  it('T-33 - skips both V1 and V2 blocks and reaches signPdf when internalVersion is unknown', async () => {
    // Arrange
    createPdfDoc();

    // Act
    await decorateAndSignPdf({
      ...baseArgs,
      envelope: { ...baseEnvelope, internalVersion: 99 },
    });

    // Assert
    expect(pdfDocumentLoad).to.not.have.been.called;
    expect(stubInsertFieldInPDFV2).to.not.have.been.called;
    expect(stubSignPdf).to.have.been.calledOnce;
  });

  it('T-34 - calls insertFieldInPDFV2 once per page group when fields span multiple pages', async () => {
    // Arrange
    const pages = [createPage(0), createPage(0), createPage(0)];
    createPdfDoc(pages);

    // Act
    await decorateAndSignPdf({
      ...baseArgs,
      envelope: { ...baseEnvelope, internalVersion: 2 },
      envelopeItemFields: [{ inserted: true, page: 1 } as any, { inserted: true, page: 3 } as any],
    });

    // Assert
    expect(stubInsertFieldInPDFV2).to.have.been.calledTwice;
  });

  it('T-35 - returns correct old and new document data IDs on successful run', async () => {
    // Arrange
    createPdfDoc();

    // Act
    const result = await decorateAndSignPdf({ ...baseArgs });

    // Assert
    expect(result).to.deep.equal({
      oldDocumentDataId: 'old-123',
      newDocumentDataId: 'new-123',
    });
  });
});
