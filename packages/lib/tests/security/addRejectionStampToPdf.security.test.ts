import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../constants/app', () => ({
  NEXT_PRIVATE_INTERNAL_WEBAPP_URL: vi.fn(() => 'http://internal.test'),
}));

import { addRejectionStampToPdf } from '../../server-only/pdf/add-rejection-stamp-to-pdf';

describe('addRejectionStampToPdf security', () => {
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

  it('S-01 - fails closed when the font request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('font fetch failed')));

    const pdf = {
      getPages: vi.fn(() => [createPage()]),
      embedFont: vi.fn(),
    };

    await expect(addRejectionStampToPdf(pdf as any, 'bad reason')).rejects.toThrow('font fetch failed');
    expect(pdf.embedFont).not.toHaveBeenCalled();
  });

  it('S-02 - does not continue to draw when embedFont throws', async () => {
    const page = createPage();

    const pdf = {
      getPages: vi.fn(() => [page]),
      embedFont: vi.fn(() => {
        throw new Error('embed failed');
      }),
    };

    await expect(addRejectionStampToPdf(pdf as any, 'bad reason')).rejects.toThrow('embed failed');
    expect(page.drawRectangle).not.toHaveBeenCalled();
    expect(page.drawText).not.toHaveBeenCalled();
  });

  it('S-03 - stops execution when drawRectangle throws', async () => {
    const font = createFont();

    const page = {
      width: 400,
      height: 600,
      drawRectangle: vi.fn(() => {
        throw new Error('rectangle draw failed');
      }),
      drawText: vi.fn(),
    };

    const pdf = {
      getPages: vi.fn(() => [page]),
      embedFont: vi.fn(() => font),
    };

    await expect(addRejectionStampToPdf(pdf as any, 'bad reason')).rejects.toThrow('rectangle draw failed');
    expect(page.drawText).not.toHaveBeenCalled();
  });

  it('S-04 - propagates drawText errors instead of silently succeeding', async () => {
    const font = createFont();

    const page = {
      width: 400,
      height: 600,
      drawRectangle: vi.fn(),
      drawText: vi.fn(() => {
        throw new Error('text draw failed');
      }),
    };

    const pdf = {
      getPages: vi.fn(() => [page]),
      embedFont: vi.fn(() => font),
    };

    await expect(addRejectionStampToPdf(pdf as any, 'bad reason')).rejects.toThrow('text draw failed');
  });

  it('S-05 - does not use the reason input to build the font URL', async () => {
    const font = createFont();

    const pdf = {
      getPages: vi.fn(() => [createPage()]),
      embedFont: vi.fn(() => font),
    };

    const maliciousReason = '../../../etc/passwd?font=evil.ttf';

    await addRejectionStampToPdf(pdf as any, maliciousReason);

    expect(fetch).toHaveBeenCalledWith('http://internal.test/fonts/noto-sans.ttf');
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining(maliciousReason));
  });

  it('S-06 - fetches the font only once even when stamping multiple pages', async () => {
    const font = createFont();
    const page1 = createPage();
    const page2 = createPage();
    const page3 = createPage();

    const pdf = {
      getPages: vi.fn(() => [page1, page2, page3]),
      embedFont: vi.fn(() => font),
    };

    await addRejectionStampToPdf(pdf as any, 'bad reason');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(pdf.embedFont).toHaveBeenCalledTimes(1);
  });

  it('S-07 - does not mutate external input reason and still draws the fixed rejection label', async () => {
    const font = createFont();
    const page = createPage();
    const reason = '<script>alert("xss")</script>';

    const pdf = {
      getPages: vi.fn(() => [page]),
      embedFont: vi.fn(() => font),
    };

    await addRejectionStampToPdf(pdf as any, reason);

    expect(page.drawText).toHaveBeenCalledWith('DOCUMENT REJECTED', expect.any(Object));
    expect(reason).toBe('<script>alert("xss")</script>');
  });

  it('S-08 - does not perform any page drawing when the PDF has no pages', async () => {
    const font = createFont();

    const pdf = {
      getPages: vi.fn(() => []),
      embedFont: vi.fn(() => font),
    };

    const result = await addRejectionStampToPdf(pdf as any, 'bad reason');

    expect(result).toBe(pdf);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(pdf.embedFont).toHaveBeenCalledTimes(1);
  });
});
