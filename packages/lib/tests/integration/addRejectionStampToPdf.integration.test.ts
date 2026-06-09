import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../constants/app', () => ({
  NEXT_PRIVATE_INTERNAL_WEBAPP_URL: vi.fn(() => 'http://internal.test'),
}));

import { addRejectionStampToPdf } from '../../server-only/pdf/add-rejection-stamp-to-pdf';

describe('addRejectionStampToPdf integration', () => {
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

  it('I-01 - fetches the font, embeds it, and stamps all pages', async () => {
    const font = createFont();
    const page1 = createPage(400, 600);
    const page2 = createPage(500, 700);

    const pdf = {
      getPages: vi.fn(() => [page1, page2]),
      embedFont: vi.fn(() => font),
    };

    const result = await addRejectionStampToPdf(pdf as any, 'document rejected');

    expect(fetch).toHaveBeenCalledOnce();
    expect(pdf.embedFont).toHaveBeenCalledOnce();
    expect(page1.drawRectangle).toHaveBeenCalledOnce();
    expect(page1.drawText).toHaveBeenCalledOnce();
    expect(page2.drawRectangle).toHaveBeenCalledOnce();
    expect(page2.drawText).toHaveBeenCalledOnce();
    expect(result).toBe(pdf);
  });

  it('I-02 - requests the font from the internal webapp URL', async () => {
    const font = createFont();

    const pdf = {
      getPages: vi.fn(() => [createPage()]),
      embedFont: vi.fn(() => font),
    };

    await addRejectionStampToPdf(pdf as any, 'document rejected');

    expect(fetch).toHaveBeenCalledWith('http://internal.test/fonts/noto-sans.ttf');
  });

  it('I-03 - draws the rejection text with the expected content and rotation', async () => {
    const font = createFont();
    const page = createPage();

    const pdf = {
      getPages: vi.fn(() => [page]),
      embedFont: vi.fn(() => font),
    };

    await addRejectionStampToPdf(pdf as any, 'document rejected');

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

  it('I-04 - draws the rectangle with the expected rotation and border width', async () => {
    const font = createFont();
    const page = createPage();

    const pdf = {
      getPages: vi.fn(() => [page]),
      embedFont: vi.fn(() => font),
    };

    await addRejectionStampToPdf(pdf as any, 'document rejected');

    expect(page.drawRectangle).toHaveBeenCalledWith(
      expect.objectContaining({
        borderWidth: 4,
        rotate: {
          angle: 45,
          origin: 'center',
        },
      }),
    );
  });

  it('I-05 - centers text and rectangle based on page dimensions and text width', async () => {
    const font = createFont(200);
    const page = createPage(400, 600);

    const pdf = {
      getPages: vi.fn(() => [page]),
      embedFont: vi.fn(() => font),
    };

    await addRejectionStampToPdf(pdf as any, 'document rejected');

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

  it('I-06 - works with an empty PDF without drawing on any page', async () => {
    const font = createFont();

    const pdf = {
      getPages: vi.fn(() => []),
      embedFont: vi.fn(() => font),
    };

    const result = await addRejectionStampToPdf(pdf as any, 'document rejected');

    expect(fetch).toHaveBeenCalledOnce();
    expect(pdf.embedFont).toHaveBeenCalledOnce();
    expect(result).toBe(pdf);
  });

  it('I-07 - propagates font fetch errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('font fetch failed')));

    const pdf = {
      getPages: vi.fn(() => [createPage()]),
      embedFont: vi.fn(),
    };

    await expect(addRejectionStampToPdf(pdf as any, 'document rejected')).rejects.toThrow('font fetch failed');
    expect(pdf.embedFont).not.toHaveBeenCalled();
  });
});
