import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../constants/app', () => ({
  NEXT_PRIVATE_INTERNAL_WEBAPP_URL: vi.fn(() => 'http://internal.test'),
}));

import { addRejectionStampToPdf } from '../../server-only/pdf/add-rejection-stamp-to-pdf';

describe('addRejectionStampToPdf unitary', () => {
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

  it('U-01 - fetches the font and embeds it once', async () => {
    const font = createFont();

    const pdf = {
      getPages: vi.fn(() => [createPage()]),
      embedFont: vi.fn(() => font),
    };

    await addRejectionStampToPdf(pdf as any, 'bad reason');

    expect(fetch).toHaveBeenCalledOnce();
    expect(pdf.embedFont).toHaveBeenCalledOnce();
    expect(pdf.embedFont).toHaveBeenCalledWith(expect.any(Uint8Array));
  });

  it('U-02 - draws one rectangle and one text per page', async () => {
    const font = createFont();
    const page1 = createPage();
    const page2 = createPage();

    const pdf = {
      getPages: vi.fn(() => [page1, page2]),
      embedFont: vi.fn(() => font),
    };

    await addRejectionStampToPdf(pdf as any, 'bad reason');

    expect(page1.drawRectangle).toHaveBeenCalledOnce();
    expect(page1.drawText).toHaveBeenCalledOnce();
    expect(page2.drawRectangle).toHaveBeenCalledOnce();
    expect(page2.drawText).toHaveBeenCalledOnce();
  });

  it('U-03 - draws the rejected text with expected content and style', async () => {
    const font = createFont();
    const page = createPage();

    const pdf = {
      getPages: vi.fn(() => [page]),
      embedFont: vi.fn(() => font),
    };

    await addRejectionStampToPdf(pdf as any, 'bad reason');

    expect(page.drawText).toHaveBeenCalledWith(
      'DOCUMENT REJECTED',
      expect.objectContaining({
        size: 36,
        font,
        rotate: {
          angle: 45,
          origin: 'center',
        },
      }),
    );
  });

  it('U-04 - centers rectangle and text based on page dimensions', async () => {
    const font = createFont(200);
    const page = createPage(400, 600);

    const pdf = {
      getPages: vi.fn(() => [page]),
      embedFont: vi.fn(() => font),
    };

    await addRejectionStampToPdf(pdf as any, 'bad reason');

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

  it('U-05 - returns the same pdf instance', async () => {
    const font = createFont();

    const pdf = {
      getPages: vi.fn(() => [createPage()]),
      embedFont: vi.fn(() => font),
    };

    const result = await addRejectionStampToPdf(pdf as any, 'bad reason');

    expect(result).toBe(pdf);
  });

  it('U-06 - propagates fetch errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('font fetch failed')));

    const pdf = {
      getPages: vi.fn(() => [createPage()]),
      embedFont: vi.fn(),
    };

    await expect(addRejectionStampToPdf(pdf as any, 'bad reason')).rejects.toThrow('font fetch failed');
    expect(pdf.embedFont).not.toHaveBeenCalled();
  });

  it('U-07 - propagates embedFont errors', async () => {
    const pdf = {
      getPages: vi.fn(() => [createPage()]),
      embedFont: vi.fn(() => {
        throw new Error('embed failed');
      }),
    };

    await expect(addRejectionStampToPdf(pdf as any, 'bad reason')).rejects.toThrow('embed failed');
  });

  it('U-08 - propagates drawRectangle errors', async () => {
    const font = createFont();
    const page = {
      width: 400,
      height: 600,
      drawRectangle: vi.fn(() => {
        throw new Error('draw rectangle failed');
      }),
      drawText: vi.fn(),
    };

    const pdf = {
      getPages: vi.fn(() => [page]),
      embedFont: vi.fn(() => font),
    };

    await expect(addRejectionStampToPdf(pdf as any, 'bad reason')).rejects.toThrow('draw rectangle failed');
  });

  it('U-09 - propagates drawText errors', async () => {
    const font = createFont();
    const page = {
      width: 400,
      height: 600,
      drawRectangle: vi.fn(),
      drawText: vi.fn(() => {
        throw new Error('draw text failed');
      }),
    };

    const pdf = {
      getPages: vi.fn(() => [page]),
      embedFont: vi.fn(() => font),
    };

    await expect(addRejectionStampToPdf(pdf as any, 'bad reason')).rejects.toThrow('draw text failed');
  });

  it('U-10 - works with an empty pages array', async () => {
    const font = createFont();

    const pdf = {
      getPages: vi.fn(() => []),
      embedFont: vi.fn(() => font),
    };

    const result = await addRejectionStampToPdf(pdf as any, 'bad reason');

    expect(result).toBe(pdf);
    expect(pdf.embedFont).toHaveBeenCalledOnce();
  });
});
