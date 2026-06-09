import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../constants/app', () => ({
  NEXT_PRIVATE_INTERNAL_WEBAPP_URL: vi.fn(() => 'http://internal.test'),
}));

import { addRejectionStampToPdf } from '../../server-only/pdf/add-rejection-stamp-to-pdf';

describe('addRejectionStampToPdf regression', () => {
  const mockFontBytes = new ArrayBuffer(16);

  const createFont = (textWidth = 200) => ({
    getTextWidth: vi.fn(() => textWidth),
  });

  const createPage = (width = 400, height = 600) => ({
    width,
    height,
    drawRectangle: vi.fn(),
    drawText: vi.fn(),
  });

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        arrayBuffer: vi.fn().mockResolvedValue(mockFontBytes),
      }),
    );
  });

  it('R-01 - keeps the exact rejection text as DOCUMENT REJECTED', async () => {
    const font = createFont();
    const page = createPage();

    const pdf = {
      getPages: vi.fn(() => [page]),
      embedFont: vi.fn(() => font),
    };

    await addRejectionStampToPdf(pdf as any, 'ignored reason');

    expect(page.drawText).toHaveBeenCalledWith('DOCUMENT REJECTED', expect.any(Object));
  });

  it('R-02 - keeps the rejection text font size at 36', async () => {
    const font = createFont();
    const page = createPage();

    const pdf = {
      getPages: vi.fn(() => [page]),
      embedFont: vi.fn(() => font),
    };

    await addRejectionStampToPdf(pdf as any, 'ignored reason');

    expect(page.drawText).toHaveBeenCalledWith(
      'DOCUMENT REJECTED',
      expect.objectContaining({
        size: 36,
      }),
    );
  });

  it('R-03 - keeps the rectangle border width at 4', async () => {
    const font = createFont();
    const page = createPage();

    const pdf = {
      getPages: vi.fn(() => [page]),
      embedFont: vi.fn(() => font),
    };

    await addRejectionStampToPdf(pdf as any, 'ignored reason');

    expect(page.drawRectangle).toHaveBeenCalledWith(
      expect.objectContaining({
        borderWidth: 4,
      }),
    );
  });

  it('R-04 - keeps the rotation angle at 45 degrees for both rectangle and text', async () => {
    const font = createFont();
    const page = createPage();

    const pdf = {
      getPages: vi.fn(() => [page]),
      embedFont: vi.fn(() => font),
    };

    await addRejectionStampToPdf(pdf as any, 'ignored reason');

    expect(page.drawRectangle).toHaveBeenCalledWith(
      expect.objectContaining({
        rotate: {
          angle: 45,
          origin: 'center',
        },
      }),
    );

    expect(page.drawText).toHaveBeenCalledWith(
      'DOCUMENT REJECTED',
      expect.objectContaining({
        rotate: {
          angle: 45,
          origin: 'center',
        },
      }),
    );
  });

  it('R-05 - stamps every page exactly once with one rectangle and one text', async () => {
    const font = createFont();
    const page1 = createPage();
    const page2 = createPage();
    const page3 = createPage();

    const pdf = {
      getPages: vi.fn(() => [page1, page2, page3]),
      embedFont: vi.fn(() => font),
    };

    await addRejectionStampToPdf(pdf as any, 'ignored reason');

    for (const page of [page1, page2, page3]) {
      expect(page.drawRectangle).toHaveBeenCalledTimes(1);
      expect(page.drawText).toHaveBeenCalledTimes(1);
    }
  });

  it('R-06 - keeps the centered coordinates for a 400x600 page with text width 200', async () => {
    const font = createFont(200);
    const page = createPage(400, 600);

    const pdf = {
      getPages: vi.fn(() => [page]),
      embedFont: vi.fn(() => font),
    };

    await addRejectionStampToPdf(pdf as any, 'ignored reason');

    expect(page.drawRectangle).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 90,
        y: 286,
        width: 220,
        height: 56,
      }),
    );

    expect(page.drawText).toHaveBeenCalledWith(
      'DOCUMENT REJECTED',
      expect.objectContaining({
        x: 100,
        y: 300,
      }),
    );
  });

  it('R-07 - returns the same pdf object instance after stamping', async () => {
    const font = createFont();
    const pdf = {
      getPages: vi.fn(() => [createPage()]),
      embedFont: vi.fn(() => font),
    };

    const result = await addRejectionStampToPdf(pdf as any, 'ignored reason');

    expect(result).toBe(pdf);
  });

  it('R-08 - still ignores the reason parameter and always draws DOCUMENT REJECTED', async () => {
    const font = createFont();
    const page = createPage();

    const pdf = {
      getPages: vi.fn(() => [page]),
      embedFont: vi.fn(() => font),
    };

    await addRejectionStampToPdf(pdf as any, 'my custom rejection reason');

    expect(page.drawText).toHaveBeenCalledWith('DOCUMENT REJECTED', expect.any(Object));
  });
});
