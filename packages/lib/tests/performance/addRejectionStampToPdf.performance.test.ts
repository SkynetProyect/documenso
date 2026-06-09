import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../constants/app', () => ({
  NEXT_PRIVATE_INTERNAL_WEBAPP_URL: vi.fn(() => 'http://internal.test'),
}));

import { addRejectionStampToPdf } from '../../server-only/pdf/add-rejection-stamp-to-pdf';

describe('addRejectionStampToPdf performance', () => {
  const mockFontBytes = new ArrayBuffer(16);

  const ONE_PAGE_THRESHOLD_MS = 20;
  const TEN_PAGES_THRESHOLD_MS = 50;
  const HUNDRED_PAGES_THRESHOLD_MS = 200;
  const TEN_RUNS_THRESHOLD_MS = 300;

  const createFont = (textWidth = 200) => ({
    getTextWidth: vi.fn(() => textWidth),
  });

  const createPage = (width = 400, height = 600) => ({
    width,
    height,
    drawRectangle: vi.fn(),
    drawText: vi.fn(),
  });

  const createPages = (count: number) => Array.from({ length: count }, () => createPage());

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        arrayBuffer: vi.fn().mockResolvedValue(mockFontBytes),
      }),
    );
  });

  it(`P-01 - stamps a one-page PDF in under ${ONE_PAGE_THRESHOLD_MS}ms`, async () => {
    const font = createFont();
    const pdf = {
      getPages: vi.fn(() => createPages(1)),
      embedFont: vi.fn(() => font),
    };

    const start = performance.now();

    await addRejectionStampToPdf(pdf as any, 'document rejected');

    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(ONE_PAGE_THRESHOLD_MS);
  });

  it(`P-02 - stamps a 10-page PDF in under ${TEN_PAGES_THRESHOLD_MS}ms`, async () => {
    const font = createFont();
    const pages = createPages(10);

    const pdf = {
      getPages: vi.fn(() => pages),
      embedFont: vi.fn(() => font),
    };

    const start = performance.now();

    await addRejectionStampToPdf(pdf as any, 'document rejected');

    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(TEN_PAGES_THRESHOLD_MS);
    expect(pages.every((page) => page.drawRectangle.mock.calls.length === 1)).toBe(true);
    expect(pages.every((page) => page.drawText.mock.calls.length === 1)).toBe(true);
  });

  it(`P-03 - stamps a 100-page PDF in under ${HUNDRED_PAGES_THRESHOLD_MS}ms`, async () => {
    const font = createFont();
    const pages = createPages(100);

    const pdf = {
      getPages: vi.fn(() => pages),
      embedFont: vi.fn(() => font),
    };

    const start = performance.now();

    await addRejectionStampToPdf(pdf as any, 'document rejected');

    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(HUNDRED_PAGES_THRESHOLD_MS);
    expect(pages[0].drawRectangle).toHaveBeenCalledOnce();
    expect(pages[99].drawText).toHaveBeenCalledOnce();
  });

  it(`P-04 - runs 10 sequential stamp operations in under ${TEN_RUNS_THRESHOLD_MS}ms`, async () => {
    const start = performance.now();

    for (let i = 0; i < 10; i++) {
      const font = createFont();
      const pdf = {
        getPages: vi.fn(() => createPages(5)),
        embedFont: vi.fn(() => font),
      };

      await addRejectionStampToPdf(pdf as any, 'document rejected');
    }

    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(TEN_RUNS_THRESHOLD_MS);
  });

  it('P-05 - fetches and embeds the font only once per function call, even for many pages', async () => {
    const font = createFont();
    const pages = createPages(50);

    const pdf = {
      getPages: vi.fn(() => pages),
      embedFont: vi.fn(() => font),
    };

    await addRejectionStampToPdf(pdf as any, 'document rejected');

    expect(fetch).toHaveBeenCalledOnce();
    expect(pdf.embedFont).toHaveBeenCalledOnce();
    expect(font.getTextWidth).toHaveBeenCalledTimes(50);
  });

  it('P-06 - execution time grows roughly with page count, not exponentially', async () => {
    const font1 = createFont();
    const pdf10 = {
      getPages: vi.fn(() => createPages(10)),
      embedFont: vi.fn(() => font1),
    };

    const start10 = performance.now();
    await addRejectionStampToPdf(pdf10 as any, 'document rejected');
    const elapsed10 = performance.now() - start10;

    const font2 = createFont();
    const pdf100 = {
      getPages: vi.fn(() => createPages(100)),
      embedFont: vi.fn(() => font2),
    };

    const start100 = performance.now();
    await addRejectionStampToPdf(pdf100 as any, 'document rejected');
    const elapsed100 = performance.now() - start100;

    expect(elapsed100).toBeLessThan(elapsed10 * 20 + 50);
  });
});
