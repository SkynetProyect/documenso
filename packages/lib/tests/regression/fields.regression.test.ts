import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const { validateFieldsInserted } = await import('../../utils/fields');

let scrollIntoViewSpy = vi.fn();

class MockElement {
  children: MockElement[] = [];
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

  appendChild(child: MockElement) {
    this.children.push(child);
    return child;
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

const createFieldCard = () => {
  const element = document.createElement('div') as unknown as MockElement;
  element.className = 'field-card-container';
  return element;
};

const createPdfContent = () => {
  const element = document.createElement('div') as unknown as MockElement;
  element.setAttribute('data-pdf-content', 'true');
  return element;
};

describe('validateFieldsInserted regression', () => {
  beforeEach(() => {
    globalThis.document = new MockDocument() as unknown as Document;
    scrollIntoViewSpy = vi.fn();
  });

  it('R-01 - picks the first pending field by page then Y position, regardless of input order', () => {
    createPdfContent();
    createFieldCard();

    // Field on page 2 comes first in the array, but the page-1 field should win.
    const pageTwoField = createField({ id: 2, page: 2, positionY: '10', inserted: false });
    const pageOneField = createField({ id: 1, page: 1, positionY: '500', inserted: false });

    validateFieldsInserted([pageTwoField, pageOneField] as never);

    const pdfContent = document.querySelector(PDF_VIEWER_CONTENT_SELECTOR) as unknown as MockElement;
    expect(pdfContent.getAttribute('data-scroll-to-page')).toBe('1');
  });

  it('R-02 - does not mutate the original fields array passed in', () => {
    createPdfContent();
    createFieldCard();

    const fields = [createField({ id: 7, page: 3, positionY: '50', inserted: false })];
    const fieldsSnapshot = JSON.parse(JSON.stringify(fields));

    validateFieldsInserted(fields as never);

    expect(fields).toEqual(fieldsSnapshot);
  });

  it('R-03 - marks every .field-card-container element, even with multiple cards and one pending field', () => {
    createPdfContent();
    const cardA = createFieldCard();
    const cardB = createFieldCard();
    const cardC = createFieldCard();

    validateFieldsInserted([createField({ id: 9, page: 1, positionY: '0', inserted: false })] as never);

    expect(cardA.getAttribute('data-validate')).toBe('true');
    expect(cardB.getAttribute('data-validate')).toBe('true');
    expect(cardC.getAttribute('data-validate')).toBe('true');
  });

  it('R-04 - scrolls the first pending field with smooth/center options', () => {
    createPdfContent();
    createFieldCard();

    const pendingField = createField({ id: 5, page: 1, positionY: '0', inserted: false });
    const fieldElement = document.createElement('div') as unknown as MockElement;
    fieldElement.id = `field-${pendingField.id}`;

    validateFieldsInserted([pendingField] as never);

    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });

  it('R-05 - leaves field cards untouched when no fields are pending', () => {
    const pdfContent = createPdfContent();
    pdfContent.setAttribute('data-validate-fields', 'true');
    const card = createFieldCard();

    const result = validateFieldsInserted([createField({ id: 1, inserted: true })] as never);

    expect(result).toBe(true);
    expect(card.hasAttribute('data-validate')).toBe(false);
    expect(pdfContent.hasAttribute('data-validate-fields')).toBe(false);
  });
});
