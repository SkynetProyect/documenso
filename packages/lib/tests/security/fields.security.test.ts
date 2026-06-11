import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@documenso/lib/constants/pdf-viewer', () => ({
  PDF_VIEWER_CONTENT_SELECTOR: '[data-pdf-content]',
}));

vi.mock('@lingui/core/macro', () => ({
  msg: (strings: TemplateStringsArray, ...values: unknown[]) => String.raw({ raw: strings }, ...values),
}));

vi.mock('@prisma/client', () => ({
  FieldType: {
    TEXT: 'TEXT',
    CHECKBOX: 'CHECKBOX',
    RADIO: 'RADIO',
    DROPDOWN: 'DROPDOWN',
    SIGNATURE: 'SIGNATURE',
    FREE_SIGNATURE: 'FREE_SIGNATURE',
    INITIALS: 'INITIALS',
    NAME: 'NAME',
    NUMBER: 'NUMBER',
    DATE: 'DATE',
    EMAIL: 'EMAIL',
  },
}));

vi.mock('../../universal/id', () => ({
  extractLegacyIds: vi.fn(() => ({})),
}));

const PDF_VIEWER_CONTENT_SELECTOR = '[data-pdf-content]';

const { validateFieldsInserted, sortFieldsByPosition } = await import('../../utils/fields');

let scrollIntoViewSpy = vi.fn();

class MockElement {
  attributes = new Map<string, string>();

  className = '';

  id = '';

  tagName: string;

  constructor(tagName: string) {
    this.tagName = tagName;
  }

  scrollIntoView = (...args: unknown[]) => scrollIntoViewSpy(...args);

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name: string) {
    return this.attributes.has(name);
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }
}

class MockDocument {
  nodes: MockElement[] = [];

  createElement(tagName: string) {
    const element = new MockElement(tagName.toUpperCase());
    this.nodes.push(element);
    return element;
  }

  querySelector(selector: string) {
    if (selector === PDF_VIEWER_CONTENT_SELECTOR) {
      return this.nodes.find((node) => node.hasAttribute('data-pdf-content')) ?? null;
    }

    return null;
  }

  getElementsByClassName(className: string) {
    return this.nodes.filter((node) => node.className === className);
  }

  getElementById(id: string) {
    return this.nodes.find((node) => node.id === id) ?? null;
  }
}

const createField = (overrides = {}) => ({
  id: 1,
  page: 1,
  positionY: '0',
  inserted: false,
  ...overrides,
});

const createPdfContent = () => {
  const element = document.createElement('div') as unknown as MockElement;
  element.setAttribute('data-pdf-content', 'true');
  return element;
};

const createFieldCard = () => {
  const element = document.createElement('div') as unknown as MockElement;
  element.className = 'field-card-container';
  return element;
};

describe('validateFieldsInserted security (OWASP Top 10)', () => {
  beforeEach(() => {
    globalThis.document = new MockDocument() as unknown as Document;
    scrollIntoViewSpy = vi.fn();
  });

  // A03:2021 Injection - DOM XSS
  it('S-01 - treats a malicious field id as an opaque lookup key, never as markup', () => {
    const pdfContent = createPdfContent();
    createFieldCard();

    const xssId = '"><img src=x onerror=alert(1)>';
    const pendingField = createField({ id: xssId, page: 1, positionY: '0', inserted: false });

    const getElementByIdSpy = vi.spyOn(document, 'getElementById');

    const result = validateFieldsInserted([pendingField] as never);

    expect(result).toBe(false);
    // The id is only ever used to build a lookup key, never written into HTML.
    expect(getElementByIdSpy).toHaveBeenCalledWith(`field-${xssId}`);
    expect(pdfContent.getAttribute('data-validate-fields')).toBe('true');
  });

  // A08:2021 Software and Data Integrity Failures - prototype pollution
  it('S-02 - sortFieldsByPosition does not pollute Object.prototype via the JSON clone round trip', () => {
    const malicious = JSON.parse('{"__proto__":{"polluted":"yes"},"id":1,"page":1,"positionY":"0","inserted":false}');

    sortFieldsByPosition([malicious] as never);

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false);
  });

  // A04:2021 Insecure Design - algorithmic DoS / unbounded resource consumption
  it('S-03 - processes a large field set without throwing or requiring unbounded resources', () => {
    const pdfContent = createPdfContent();
    createFieldCard();

    const fields = Array.from({ length: 5_000 }, (_, index) =>
      createField({ id: index, page: (index % 50) + 1, positionY: String(index), inserted: false }),
    );

    expect(() => validateFieldsInserted(fields as never)).not.toThrow();
    expect(pdfContent.getAttribute('data-validate-fields')).toBe('true');
  });

  // A08:2021 Software and Data Integrity Failures - mass assignment
  it('S-04 - ignores unexpected/extraneous field properties and only sets the known DOM attributes', () => {
    const pdfContent = createPdfContent();
    const card = createFieldCard();

    const pollutedField = createField({
      id: 1,
      page: 1,
      positionY: '0',
      inserted: false,
      isAdmin: true,
      role: 'owner',
      __proto__: { polluted: true },
    });

    validateFieldsInserted([pollutedField] as never);

    const allAttributeNames = new Set<string>();

    for (const node of (document as unknown as MockDocument).nodes) {
      for (const name of node.attributes.keys()) {
        allAttributeNames.add(name);
      }
    }

    expect([...allAttributeNames].sort()).toEqual(
      ['data-pdf-content', 'data-scroll-to-page', 'data-validate', 'data-validate-fields'].sort(),
    );
    expect(card.hasAttribute('isAdmin')).toBe(false);
    expect(card.hasAttribute('role')).toBe(false);
    expect(pdfContent.hasAttribute('polluted')).toBe(false);
  });

  // A09:2021 Security Logging and Monitoring Failures - no incidental data disclosure via logs
  it('S-05 - never logs field data to the console', () => {
    createPdfContent();
    createFieldCard();

    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      validateFieldsInserted([createField({ id: 1, page: 1, positionY: '0', inserted: false })] as never);

      expect(consoleLog).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleLog.mockRestore();
      consoleWarn.mockRestore();
      consoleError.mockRestore();
    }
  });

  // SAST: static guard against unsafe DOM sinks (A03:2021 Injection)
  it('S-06 - source contains no unsafe DOM sinks (innerHTML/eval/Function/document.write)', () => {
    const source = readFileSync(join(__dirname, '../../utils/fields.ts'), 'utf-8');

    const unsafeSinks = [
      /innerHTML/,
      /outerHTML/,
      /insertAdjacentHTML/,
      /document\.write/,
      /\beval\(/,
      /new Function\(/,
    ];

    for (const sink of unsafeSinks) {
      expect(source).not.toMatch(sink);
    }
  });
});

describe('validateFieldsInserted security (after-each isolation)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('S-07 - positionY is used only for numeric sorting and never written to the DOM', () => {
    globalThis.document = new MockDocument() as unknown as Document;
    scrollIntoViewSpy = vi.fn();

    createPdfContent();
    createFieldCard();

    const pendingField = createField({
      id: 99,
      page: 1,
      positionY: '<script>alert(1)</script>',
      inserted: false,
    });

    validateFieldsInserted([pendingField] as never);

    for (const node of (document as unknown as MockDocument).nodes) {
      for (const value of node.attributes.values()) {
        expect(value).not.toContain('<script');
      }
    }
  });
});
