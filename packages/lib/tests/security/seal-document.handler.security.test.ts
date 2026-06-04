import * as chai from 'chai';
import { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { beforeEach, describe, it, vi } from 'vitest';

chai.use(chaiAsPromised);
chai.use(sinonChai);

const signedPdfBytes = Buffer.from([5]);
const pdfBytes = new Uint8Array([1, 2, 3]);

let mockPdfLoad: any;
let mockSignPdf: any;
let mockPutPdfFileServerSide: any;

mockPdfLoad = sinon.stub();
mockSignPdf = sinon.stub().resolves(signedPdfBytes);
mockPutPdfFileServerSide = sinon.stub().resolves({ documentData: { id: 'new-123' }, filePageCount: 1 });

vi.mock('@libpdf/core', () => ({
  PDF: {
    load: mockPdfLoad,
  },
}));
vi.mock('@documenso/signing', () => ({
  signPdf: mockSignPdf,
}));
vi.mock('../../universal/upload/put-file.server', () => ({
  putPdfFileServerSide: mockPutPdfFileServerSide,
}));
vi.mock('../../server-only/pdf/insert-field-in-pdf-v2', () => ({
  insertFieldInPDFV2: sinon.stub().resolves(new Uint8Array([7, 8, 9])),
}));

import { decorateAndSignPdf } from '../../jobs/definitions/internal/seal-document.handler';

const createPdfDoc = () => ({
  flattenAll: sinon.stub(),
  upgradeVersion: sinon.stub(),
  copyPagesFrom: sinon.stub().resolves(),
  getPage: sinon.stub().returns({
    width: 400,
    height: 500,
    rotation: 0,
    drawPage: sinon.stub(),
  }),
  embedPage: sinon.stub().resolves({}),
  save: sinon.stub().resolves(pdfBytes),
  reload: sinon.stub().resolves(),
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

beforeEach(() => {
  sinon.reset();
  mockPdfLoad.reset();
  mockSignPdf.reset();
  mockPutPdfFileServerSide.reset();
  mockSignPdf.resolves(signedPdfBytes);
  mockPutPdfFileServerSide.resolves({ documentData: { id: 'new-123' }, filePageCount: 1 });
});

describe('decorateAndSignPdf security', () => {
  it('S-01 - drops path segments from the file name when saving the signed PDF', async () => {
    const pdfDoc = createPdfDoc();
    mockPdfLoad.resolves(pdfDoc as any);

    await decorateAndSignPdf({
      ...baseArgs,
      envelopeItem: {
        ...baseEnvelopeItem,
        title: '../secret/contract.pdf',
      },
    });

    expect(mockPutPdfFileServerSide).to.have.been.calledOnce;
    expect(mockPutPdfFileServerSide).to.have.been.calledWithMatch(
      sinon.match({ name: 'contract_signed.pdf' }),
      'initial-data',
    );
  });

  it('S-02 - rejects invalid V2 field page references before signing or uploading', async () => {
    const pdfDoc = createPdfDoc();
    pdfDoc.getPage = sinon.stub().returns(undefined);
    mockPdfLoad.resolves(pdfDoc as any);

    const action = decorateAndSignPdf({
      ...baseArgs,
      envelopeItemFields: [{ inserted: true, page: 99 } as any],
    });

    await expect(action).to.be.rejectedWith('Page 99 does not exist');
    expect(mockSignPdf).to.not.have.been.called;
    expect(mockPutPdfFileServerSide).to.not.have.been.called;
  });
});
