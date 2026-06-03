import { beforeEach, describe, expect, it, vi } from 'vitest';

const inputPdfBytes = new Uint8Array([0, 1, 2]);
const savedPdfBytes = new Uint8Array([9]);
const overlayBytes = new Uint8Array([3]);
const legacySaveBytes = new Uint8Array([4]);
const signedPdfBytes = Buffer.from([5]);

vi.mock('@documenso/lib/server-only/pdf/add-rejection-stamp-to-pdf', () => ({
  addRejectionStampToPdf: vi.fn(),
}));
vi.mock('@documenso/lib/server-only/pdf/generate-audit-log-pdf', () => ({
  generateAuditLogPdf: vi.fn(),
}));
vi.mock('@documenso/lib/server-only/pdf/generate-certificate-pdf', () => ({
  generateCertificatePdf: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({
  prisma: {},
}));
vi.mock('@documenso/signing', () => ({
  signPdf: vi.fn(),
}));
vi.mock('@libpdf/core', () => ({
  PDF: {
    load: vi.fn(),
  },
}));
vi.mock('@cantoo/pdf-lib', () => ({
  PDFDocument: {
    load: vi.fn(),
  },
}));
vi.mock('../../../server-only/htmltopdf/get-audit-logs-pdf', () => ({
  getAuditLogsPdf: vi.fn(),
}));
vi.mock('../../../server-only/htmltopdf/get-certificate-pdf', () => ({
  getCertificatePdf: vi.fn(),
}));
vi.mock('../../../server-only/pdf/insert-field-in-pdf-v1', () => ({
  insertFieldInPDFV1: vi.fn(),
}));
vi.mock('../../../server-only/pdf/insert-field-in-pdf-v2', () => ({
  insertFieldInPDFV2: vi.fn(),
}));
vi.mock('../../../server-only/pdf/legacy-insert-field-in-pdf', () => ({
  legacy_insertFieldInPDF: vi.fn(),
}));
vi.mock('../../../server-only/team/get-team-settings', () => ({
  getTeamSettings: vi.fn(),
}));
vi.mock('../../../server-only/webhooks/trigger/trigger-webhook', () => ({
  triggerWebhook: vi.fn(),
}));
vi.mock('../../../universal/upload/put-file.server', () => ({
  putPdfFileServerSide: vi.fn(),
}));
vi.mock('../../../universal/upload/get-file.server', () => ({
  getFileServerSide: vi.fn(),
}));
vi.mock('../../../constants/app', () => ({
  NEXT_PRIVATE_USE_PLAYWRIGHT_PDF: vi.fn(() => false),
}));
vi.mock('../../../utils/advanced-fields-helpers', () => ({
  fieldsContainUnsignedRequiredField: vi.fn(),
}));
vi.mock('../../../utils/document', () => ({
  isDocumentCompleted: vi.fn(),
}));
vi.mock('../../../utils/document-audit-logs', () => ({
  createDocumentAuditLogData: vi.fn(),
}));
vi.mock('../../../types/document-audit-logs', () => ({
  DOCUMENT_AUDIT_LOG_TYPE: {
    DOCUMENT: 'DOCUMENT',
  },
}));
vi.mock('../../../utils/envelope', () => ({
  mapDocumentIdToSecondaryId: vi.fn(),
}));
vi.mock('../../client', () => ({
  jobs: {},
}));
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'nanoid'),
  customAlphabet: vi.fn(() => vi.fn(() => 'alphaid')),
}));

import { PDFDocument } from '@cantoo/pdf-lib';
import { addRejectionStampToPdf } from '@documenso/lib/server-only/pdf/add-rejection-stamp-to-pdf';
import { signPdf } from '@documenso/signing';
import { PDF } from '@libpdf/core';
import { insertFieldInPDFV1 } from '../../../server-only/pdf/insert-field-in-pdf-v1';
import { insertFieldInPDFV2 } from '../../../server-only/pdf/insert-field-in-pdf-v2';
import { legacy_insertFieldInPDF } from '../../../server-only/pdf/legacy-insert-field-in-pdf';
import { putPdfFileServerSide } from '../../../universal/upload/put-file.server';
import { decorateAndSignPdf } from './seal-document.handler';

const pdfLoad = vi.mocked(PDF.load);
const pdfDocumentLoad = vi.mocked(PDFDocument.load);
const mockedSignPdf = vi.mocked(signPdf);
const mockedPutPdfFileServerSide = vi.mocked(putPdfFileServerSide);
const mockedInsertFieldInPDFV1 = vi.mocked(insertFieldInPDFV1);
const mockedInsertFieldInPDFV2 = vi.mocked(insertFieldInPDFV2);
const mockedLegacyInsertFieldInPDF = vi.mocked(legacy_insertFieldInPDF);
const mockedAddRejectionStampToPdf = vi.mocked(addRejectionStampToPdf);

const createPage = (rotation = 0) => ({
  width: 400,
  height: 500,
  rotation,
  drawPage: vi.fn(),
});

const createPdfDoc = (pages = [createPage()]) => {
  const pdfDoc = {
    flattenAll: vi.fn(),
    upgradeVersion: vi.fn(),
    copyPagesFrom: vi.fn(),
    getPage: vi.fn((index: number) => pages[index]),
    embedPage: vi.fn(async () => ({ embedded: true })),
    save: vi.fn(async () => savedPdfBytes),
    reload: vi.fn(async () => undefined),
  };

  pdfDocumentLoad.mockResolvedValue({
    getForm: vi.fn(() => ({ flatten: vi.fn() }) as unknown as import('@cantoo/pdf-lib').PDFForm),
    save: vi.fn(async () => legacySaveBytes),
  } as unknown as import('@cantoo/pdf-lib').PDFDocument);

  pdfLoad.mockImplementation(async (data: unknown) => {
    if (data === overlayBytes) {
      return { overlay: true } as unknown as PDF;
    }
    return pdfDoc as unknown as PDF;
  });

  return pdfDoc;
};

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

beforeEach(() => {
  vi.clearAllMocks();
  mockedSignPdf.mockResolvedValue(signedPdfBytes);
  mockedPutPdfFileServerSide.mockResolvedValue({ documentData: { id: 'new-123' }, filePageCount: 1 });
  mockedInsertFieldInPDFV2.mockResolvedValue(Buffer.from(overlayBytes) as Buffer);
  mockedAddRejectionStampToPdf.mockResolvedValue(undefined as unknown as PDF);
});

describe('decorateAndSignPdf', () => {
  it('T-01 isRejected:true → addRejectionStampToPdf called', async () => {
    const pdfDoc = createPdfDoc();

    await decorateAndSignPdf({
      envelope: baseEnvelope,
      envelopeItem: baseEnvelopeItem,
      envelopeItemFields: [],
      isRejected: true,
      rejectionReason: 'bad',
      pdfData: inputPdfBytes,
      certificateDoc: null,
      auditLogDoc: null,
    });

    expect(addRejectionStampToPdf).toHaveBeenCalledTimes(1);
    expect(addRejectionStampToPdf).toHaveBeenCalledWith(pdfDoc, 'bad');
  });

  it('T-02 isRejected:false → addRejectionStampToPdf NOT called', async () => {
    createPdfDoc();

    await decorateAndSignPdf({
      envelope: baseEnvelope,
      envelopeItem: baseEnvelopeItem,
      envelopeItemFields: [],
      isRejected: false,
      rejectionReason: 'none',
      pdfData: inputPdfBytes,
      certificateDoc: null,
      auditLogDoc: null,
    });

    expect(addRejectionStampToPdf).not.toHaveBeenCalled();
  });

  it('T-03 certificateDoc:PDF(2p) → copyPagesFrom called with [0,1]', async () => {
    const pdfDoc = createPdfDoc();
    const certificateDoc = { getPageCount: vi.fn(() => 2) } as unknown as PDF;

    await decorateAndSignPdf({
      envelope: baseEnvelope,
      envelopeItem: baseEnvelopeItem,
      envelopeItemFields: [],
      isRejected: false,
      rejectionReason: '',
      pdfData: inputPdfBytes,
      certificateDoc,
      auditLogDoc: null,
    });

    expect(pdfDoc.copyPagesFrom).toHaveBeenCalledWith(certificateDoc, [0, 1]);
  });

  it('T-04 certificateDoc:null → copyPagesFrom NOT called', async () => {
    const pdfDoc = createPdfDoc();

    await decorateAndSignPdf({
      envelope: baseEnvelope,
      envelopeItem: baseEnvelopeItem,
      envelopeItemFields: [],
      isRejected: false,
      rejectionReason: '',
      pdfData: inputPdfBytes,
      certificateDoc: null,
      auditLogDoc: null,
    });

    expect(pdfDoc.copyPagesFrom).not.toHaveBeenCalled();
  });

  it('T-05 auditLogDoc:PDF(3p) → copyPagesFrom called with [0,1,2]', async () => {
    const pdfDoc = createPdfDoc();
    const auditLogDoc = { getPageCount: vi.fn(() => 3) } as unknown as PDF;

    await decorateAndSignPdf({
      envelope: baseEnvelope,
      envelopeItem: baseEnvelopeItem,
      envelopeItemFields: [],
      isRejected: false,
      rejectionReason: '',
      pdfData: inputPdfBytes,
      certificateDoc: null,
      auditLogDoc,
    });

    expect(pdfDoc.copyPagesFrom).toHaveBeenCalledWith(auditLogDoc, [0, 1, 2]);
  });

  it('T-06 auditLogDoc:null → copyPagesFrom NOT called', async () => {
    const pdfDoc = createPdfDoc();

    await decorateAndSignPdf({
      envelope: baseEnvelope,
      envelopeItem: baseEnvelopeItem,
      envelopeItemFields: [],
      isRejected: false,
      rejectionReason: '',
      pdfData: inputPdfBytes,
      certificateDoc: null,
      auditLogDoc: null,
    });

    expect(pdfDoc.copyPagesFrom).not.toHaveBeenCalled();
  });

  it('T-07 internalVersion:1 → PDFDocument.load + pdfDoc.reload called', async () => {
    const pdfDoc = createPdfDoc();

    await decorateAndSignPdf({
      envelope: { ...baseEnvelope, internalVersion: 1, useLegacyFieldInsertion: false },
      envelopeItem: baseEnvelopeItem,
      envelopeItemFields: [],
      isRejected: false,
      rejectionReason: '',
      pdfData: inputPdfBytes,
      certificateDoc: null,
      auditLogDoc: null,
    });

    expect(pdfDocumentLoad).toHaveBeenCalledTimes(1);
    expect(pdfDoc.reload).toHaveBeenCalledTimes(1);
  });

  it('T-08 internalVersion:2 → V1 block skipped entirely', async () => {
    const pdfDoc = createPdfDoc();

    await decorateAndSignPdf({
      envelope: { ...baseEnvelope, internalVersion: 2, useLegacyFieldInsertion: false },
      envelopeItem: baseEnvelopeItem,
      envelopeItemFields: [],
      isRejected: false,
      rejectionReason: '',
      pdfData: inputPdfBytes,
      certificateDoc: null,
      auditLogDoc: null,
    });

    expect(pdfDocumentLoad).not.toHaveBeenCalled();
    expect(pdfDoc.reload).not.toHaveBeenCalled();
  });

  it('T-09 internalVersion:1, useLegacy:true, inserted:true → legacy_insertFieldInPDF called', async () => {
    createPdfDoc();

    await decorateAndSignPdf({
      envelope: { ...baseEnvelope, internalVersion: 1, useLegacyFieldInsertion: true },
      envelopeItem: baseEnvelopeItem,
      envelopeItemFields: [{ inserted: true } as any],
      isRejected: false,
      rejectionReason: '',
      pdfData: inputPdfBytes,
      certificateDoc: null,
      auditLogDoc: null,
    });

    expect(legacy_insertFieldInPDF).toHaveBeenCalledTimes(1);
  });

  it('T-10 internalVersion:1, useLegacy:false, inserted:true → insertFieldInPDFV1 called', async () => {
    createPdfDoc();

    await decorateAndSignPdf({
      envelope: { ...baseEnvelope, internalVersion: 1, useLegacyFieldInsertion: false },
      envelopeItem: baseEnvelopeItem,
      envelopeItemFields: [{ inserted: true } as any],
      isRejected: false,
      rejectionReason: '',
      pdfData: inputPdfBytes,
      certificateDoc: null,
      auditLogDoc: null,
    });

    expect(insertFieldInPDFV1).toHaveBeenCalledTimes(1);
  });

  it('T-11 field.inserted:true → insertion function called', async () => {
    createPdfDoc();

    await decorateAndSignPdf({
      envelope: { ...baseEnvelope, internalVersion: 1, useLegacyFieldInsertion: false },
      envelopeItem: baseEnvelopeItem,
      envelopeItemFields: [{ inserted: true } as any],
      isRejected: false,
      rejectionReason: '',
      pdfData: inputPdfBytes,
      certificateDoc: null,
      auditLogDoc: null,
    });

    expect(insertFieldInPDFV1).toHaveBeenCalled();
  });

  it('T-12 field.inserted:false → insertion function NOT called', async () => {
    createPdfDoc();

    await decorateAndSignPdf({
      envelope: { ...baseEnvelope, internalVersion: 1, useLegacyFieldInsertion: false },
      envelopeItem: baseEnvelopeItem,
      envelopeItemFields: [{ inserted: false } as any],
      isRejected: false,
      rejectionReason: '',
      pdfData: inputPdfBytes,
      certificateDoc: null,
      auditLogDoc: null,
    });

    expect(insertFieldInPDFV1).not.toHaveBeenCalled();
    expect(legacy_insertFieldInPDF).not.toHaveBeenCalled();
  });

  it('T-13 internalVersion:2, field on p1 → insertFieldInPDFV2 + embedPage + drawPage called', async () => {
    const page = createPage(0);
    const pdfDoc = createPdfDoc([page]);

    await decorateAndSignPdf({
      envelope: { ...baseEnvelope, internalVersion: 2, useLegacyFieldInsertion: false },
      envelopeItem: baseEnvelopeItem,
      envelopeItemFields: [{ inserted: true, page: 1 } as any],
      isRejected: false,
      rejectionReason: '',
      pdfData: inputPdfBytes,
      certificateDoc: null,
      auditLogDoc: null,
    });

    expect(insertFieldInPDFV2).toHaveBeenCalledTimes(1);
    expect(pdfDoc.embedPage).toHaveBeenCalledTimes(1);
    expect(page.drawPage).toHaveBeenCalledTimes(1);
  });

  it('T-14 internalVersion:1 → V2 block skipped entirely', async () => {
    createPdfDoc();

    await decorateAndSignPdf({
      envelope: { ...baseEnvelope, internalVersion: 1, useLegacyFieldInsertion: false },
      envelopeItem: baseEnvelopeItem,
      envelopeItemFields: [],
      isRejected: false,
      rejectionReason: '',
      pdfData: inputPdfBytes,
      certificateDoc: null,
      auditLogDoc: null,
    });

    expect(insertFieldInPDFV2).not.toHaveBeenCalled();
  });

  it('T-15 internalVersion:2, field on p99, PDF has 1p → throws Page 99 does not exist', async () => {
    createPdfDoc([createPage(0)]);

    await expect(
      decorateAndSignPdf({
        envelope: { ...baseEnvelope, internalVersion: 2, useLegacyFieldInsertion: false },
        envelopeItem: baseEnvelopeItem,
        envelopeItemFields: [{ inserted: true, page: 99 } as any],
        isRejected: false,
        rejectionReason: '',
        pdfData: inputPdfBytes,
        certificateDoc: null,
        auditLogDoc: null,
      }),
    ).rejects.toThrow('Page 99 does not exist');
  });

  it('T-16 internalVersion:2, field on p1, PDF has 1p → no error', async () => {
    createPdfDoc([createPage(0)]);

    await expect(
      decorateAndSignPdf({
        envelope: { ...baseEnvelope, internalVersion: 2, useLegacyFieldInsertion: false },
        envelopeItem: baseEnvelopeItem,
        envelopeItemFields: [{ inserted: true, page: 1 } as any],
        isRejected: false,
        rejectionReason: '',
        pdfData: inputPdfBytes,
        certificateDoc: null,
        auditLogDoc: null,
      }),
    ).resolves.toEqual({ oldDocumentDataId: 'old-123', newDocumentDataId: 'new-123' });
  });

  it.each([
    { rotation: 0, expected: { x: 0, y: 0 } },
    { rotation: 90, expected: { x: 500, y: 0 } },
    { rotation: 180, expected: { x: 400, y: 500 } },
    { rotation: 270, expected: { x: 0, y: 400 } },
  ])('T-17..T-20 rotation:$rotation → drawPage with expected translate', async ({ rotation, expected }) => {
    const page = createPage(rotation as number);
    createPdfDoc([page]);

    await decorateAndSignPdf({
      envelope: { ...baseEnvelope, internalVersion: 2, useLegacyFieldInsertion: false },
      envelopeItem: baseEnvelopeItem,
      envelopeItemFields: [{ inserted: true, page: 1 } as any],
      isRejected: false,
      rejectionReason: '',
      pdfData: inputPdfBytes,
      certificateDoc: null,
      auditLogDoc: null,
    });

    expect(page.drawPage).toHaveBeenCalledWith(expect.anything(), expect.objectContaining(expected));
  });

  it('T-21 isRejected:true, title:contract.pdf → upload name contract_rejected.pdf', async () => {
    createPdfDoc();

    await decorateAndSignPdf({
      envelope: baseEnvelope,
      envelopeItem: baseEnvelopeItem,
      envelopeItemFields: [],
      isRejected: true,
      rejectionReason: 'bad',
      pdfData: inputPdfBytes,
      certificateDoc: null,
      auditLogDoc: null,
    });

    expect(putPdfFileServerSide).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'contract_rejected.pdf' }),
      'initial-data',
    );
  });

  it('T-22 isRejected:false, title:contract.pdf → upload name contract_signed.pdf', async () => {
    createPdfDoc();

    await decorateAndSignPdf({
      envelope: baseEnvelope,
      envelopeItem: baseEnvelopeItem,
      envelopeItemFields: [],
      isRejected: false,
      rejectionReason: '',
      pdfData: inputPdfBytes,
      certificateDoc: null,
      auditLogDoc: null,
    });

    expect(putPdfFileServerSide).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'contract_signed.pdf' }),
      'initial-data',
    );
  });

  it('T-23 PDF.load rejects → throws, nothing else called', async () => {
    createPdfDoc();
    pdfLoad.mockRejectedValueOnce(new Error('bad pdf'));

    await expect(
      decorateAndSignPdf({
        envelope: baseEnvelope,
        envelopeItem: baseEnvelopeItem,
        envelopeItemFields: [],
        isRejected: false,
        rejectionReason: '',
        pdfData: inputPdfBytes,
        certificateDoc: null,
        auditLogDoc: null,
      }),
    ).rejects.toThrow('bad pdf');

    expect(signPdf).not.toHaveBeenCalled();
    expect(putPdfFileServerSide).not.toHaveBeenCalled();
  });

  it('T-24 isRejected:true, stamp fn rejects → throws, upload NOT called', async () => {
    mockedAddRejectionStampToPdf.mockRejectedValueOnce(new Error('stamp failed'));
    createPdfDoc();

    await expect(
      decorateAndSignPdf({
        envelope: baseEnvelope,
        envelopeItem: baseEnvelopeItem,
        envelopeItemFields: [],
        isRejected: true,
        rejectionReason: 'bad',
        pdfData: inputPdfBytes,
        certificateDoc: null,
        auditLogDoc: null,
      }),
    ).rejects.toThrow('stamp failed');

    expect(putPdfFileServerSide).not.toHaveBeenCalled();
  });

  it('T-25 certificateDoc present, copyPagesFrom rejects → throws', async () => {
    const pdfDoc = createPdfDoc();
    pdfDoc.copyPagesFrom.mockRejectedValueOnce(new Error('copy fail'));
    const certificateDoc = { getPageCount: vi.fn(() => 1) } as unknown as PDF;

    await expect(
      decorateAndSignPdf({
        envelope: baseEnvelope,
        envelopeItem: baseEnvelopeItem,
        envelopeItemFields: [],
        isRejected: false,
        rejectionReason: '',
        pdfData: inputPdfBytes,
        certificateDoc,
        auditLogDoc: null,
      }),
    ).rejects.toThrow('copy fail');
  });

  it('T-26 auditLogDoc present, copyPagesFrom rejects → throws', async () => {
    const pdfDoc = createPdfDoc();
    pdfDoc.copyPagesFrom.mockRejectedValueOnce(new Error('copy fail'));
    const auditLogDoc = { getPageCount: vi.fn(() => 1) } as unknown as PDF;

    await expect(
      decorateAndSignPdf({
        envelope: baseEnvelope,
        envelopeItem: baseEnvelopeItem,
        envelopeItemFields: [],
        isRejected: false,
        rejectionReason: '',
        pdfData: inputPdfBytes,
        certificateDoc: null,
        auditLogDoc,
      }),
    ).rejects.toThrow('copy fail');
  });

  it('T-27 V1 legacy, legacy_insertFieldInPDF rejects → throws', async () => {
    mockedLegacyInsertFieldInPDF.mockRejectedValueOnce(new Error('legacy fail'));
    createPdfDoc();

    await expect(
      decorateAndSignPdf({
        envelope: { ...baseEnvelope, internalVersion: 1, useLegacyFieldInsertion: true },
        envelopeItem: baseEnvelopeItem,
        envelopeItemFields: [{ inserted: true } as any],
        isRejected: false,
        rejectionReason: '',
        pdfData: inputPdfBytes,
        certificateDoc: null,
        auditLogDoc: null,
      }),
    ).rejects.toThrow('legacy fail');
  });

  it('T-28 V1 non-legacy, insertFieldInPDFV1 rejects → throws', async () => {
    mockedInsertFieldInPDFV1.mockRejectedValueOnce(new Error('v1 fail'));
    createPdfDoc();

    await expect(
      decorateAndSignPdf({
        envelope: { ...baseEnvelope, internalVersion: 1, useLegacyFieldInsertion: false },
        envelopeItem: baseEnvelopeItem,
        envelopeItemFields: [{ inserted: true } as any],
        isRejected: false,
        rejectionReason: '',
        pdfData: inputPdfBytes,
        certificateDoc: null,
        auditLogDoc: null,
      }),
    ).rejects.toThrow('v1 fail');
  });

  it('T-29 V2, insertFieldInPDFV2 rejects → throws', async () => {
    mockedInsertFieldInPDFV2.mockRejectedValueOnce(new Error('v2 fail'));
    createPdfDoc([createPage(0)]);

    await expect(
      decorateAndSignPdf({
        envelope: { ...baseEnvelope, internalVersion: 2, useLegacyFieldInsertion: false },
        envelopeItem: baseEnvelopeItem,
        envelopeItemFields: [{ inserted: true, page: 1 } as any],
        isRejected: false,
        rejectionReason: '',
        pdfData: inputPdfBytes,
        certificateDoc: null,
        auditLogDoc: null,
      }),
    ).rejects.toThrow('v2 fail');
  });

  it('T-30 signPdf rejects → throws, upload NOT called', async () => {
    mockedSignPdf.mockRejectedValueOnce(new Error('sign fail'));
    createPdfDoc();

    await expect(
      decorateAndSignPdf({
        envelope: baseEnvelope,
        envelopeItem: baseEnvelopeItem,
        envelopeItemFields: [],
        isRejected: false,
        rejectionReason: '',
        pdfData: inputPdfBytes,
        certificateDoc: null,
        auditLogDoc: null,
      }),
    ).rejects.toThrow('sign fail');

    expect(putPdfFileServerSide).not.toHaveBeenCalled();
  });

  it('T-31 putPdfFileServerSide rejects → throws', async () => {
    mockedPutPdfFileServerSide.mockRejectedValueOnce(new Error('upload fail'));
    createPdfDoc();

    await expect(
      decorateAndSignPdf({
        envelope: baseEnvelope,
        envelopeItem: baseEnvelopeItem,
        envelopeItemFields: [],
        isRejected: false,
        rejectionReason: '',
        pdfData: inputPdfBytes,
        certificateDoc: null,
        auditLogDoc: null,
      }),
    ).rejects.toThrow('upload fail');
  });

  it('T-32 internalVersion:1, fields:[] → no insertion, form still flattened, no error', async () => {
    createPdfDoc();

    await expect(
      decorateAndSignPdf({
        envelope: { ...baseEnvelope, internalVersion: 1, useLegacyFieldInsertion: false },
        envelopeItem: baseEnvelopeItem,
        envelopeItemFields: [],
        isRejected: false,
        rejectionReason: '',
        pdfData: inputPdfBytes,
        certificateDoc: null,
        auditLogDoc: null,
      }),
    ).resolves.toEqual({ oldDocumentDataId: 'old-123', newDocumentDataId: 'new-123' });

    expect(insertFieldInPDFV1).not.toHaveBeenCalled();
    expect(legacy_insertFieldInPDF).not.toHaveBeenCalled();
  });

  it('T-33 internalVersion:99 → both blocks skipped, reaches signPdf', async () => {
    createPdfDoc();

    await decorateAndSignPdf({
      envelope: { ...baseEnvelope, internalVersion: 99, useLegacyFieldInsertion: false },
      envelopeItem: baseEnvelopeItem,
      envelopeItemFields: [],
      isRejected: false,
      rejectionReason: '',
      pdfData: inputPdfBytes,
      certificateDoc: null,
      auditLogDoc: null,
    });

    expect(pdfDocumentLoad).not.toHaveBeenCalled();
    expect(insertFieldInPDFV2).not.toHaveBeenCalled();
    expect(signPdf).toHaveBeenCalledTimes(1);
  });

  it('T-34 V2, fields on p1 and p3 → insertFieldInPDFV2 called twice', async () => {
    const pages = [createPage(0), createPage(0), createPage(0)];
    createPdfDoc(pages);

    await decorateAndSignPdf({
      envelope: { ...baseEnvelope, internalVersion: 2, useLegacyFieldInsertion: false },
      envelopeItem: baseEnvelopeItem,
      envelopeItemFields: [{ inserted: true, page: 1 } as any, { inserted: true, page: 3 } as any],
      isRejected: false,
      rejectionReason: '',
      pdfData: inputPdfBytes,
      certificateDoc: null,
      auditLogDoc: null,
    });

    expect(insertFieldInPDFV2).toHaveBeenCalledTimes(2);
  });

  it('T-35 valid run, upload returns id:new-123 → returns expected result', async () => {
    createPdfDoc();

    const result = await decorateAndSignPdf({
      envelope: baseEnvelope,
      envelopeItem: baseEnvelopeItem,
      envelopeItemFields: [],
      isRejected: false,
      rejectionReason: '',
      pdfData: inputPdfBytes,
      certificateDoc: null,
      auditLogDoc: null,
    });

    expect(result).toEqual({ oldDocumentDataId: 'old-123', newDocumentDataId: 'new-123' });
  });
});
