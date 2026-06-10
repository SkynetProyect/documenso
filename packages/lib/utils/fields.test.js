import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@documenso/lib/constants/pdf-viewer', () => ({
  PDF_VIEWER_CONTENT_SELECTOR: '[data-pdf-content]',
}));

vi.mock('@lingui/core/macro', () => ({
  msg: (strings, ...values) => String.raw({ raw: strings }, ...values),
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

vi.mock('../universal/id', () => ({
  extractLegacyIds: vi.fn(() => ({})),
}));

const PDF_VIEWER_CONTENT_SELECTOR = '[data-pdf-content]';

const { validateFieldsInserted } = await import('./fields');

let scrollIntoViewSpy = vi.fn();

class MockElement {
  children = [];

  attributes = new Map();

  className = '';

  id = '';

  dataset = {};

  constructor(tagName) {
    this.tagName = tagName;
  }

  scrollIntoView = (...args) => scrollIntoViewSpy(...args);

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  querySelector(selector) {
    if (selector === 'div') {
      return this.children.find((child) => child.tagName === 'DIV') ?? null;
    }

    return null;
  }
}

class MockDocument {
  body = new MockElement('BODY');

  nodes = [];

  createElement(tagName) {
    const element = new MockElement(tagName.toUpperCase());
    this.nodes.push(element);
    return element;
  }

  querySelector(selector) {
    if (selector === PDF_VIEWER_CONTENT_SELECTOR) {
      return this.nodes.find((node) => node.hasAttribute('data-pdf-content')) ?? null;
    }

    if (selector === '.field-card-container') {
      return this.nodes.find((node) => node.className === 'field-card-container') ?? null;
    }

    return null;
  }

  querySelectorAll(selector) {
    if (selector === '.field-card-container') {
      return this.nodes.filter((node) => node.className === 'field-card-container');
    }

    return [];
  }

  getElementsByClassName(className) {
    return this.nodes.filter((node) => node.className === className);
  }

  getElementById(id) {
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

const createFieldCard = (label) => {
  const element = document.createElement('div');
  element.className = 'field-card-container';
  element.dataset.label = label;
  document.body.appendChild(element);
  return element;
};

const createFieldElement = (fieldId) => {
  const element = document.createElement('div');
  element.id = `field-${fieldId}`;
  document.body.appendChild(element);
  return element;
};

const createPdfContent = () => {
  const element = document.createElement('div');
  element.setAttribute('data-pdf-content', 'true');
  document.body.appendChild(element);
  return element;
};

describe('validateFieldsInserted', () => {
  beforeEach(() => {
    const documentMock = new MockDocument();
    globalThis.document = documentMock;
    scrollIntoViewSpy = vi.fn();
  });

  it('WB-01 - clears the validation signal and returns true when there are no pending fields', () => {
    // Arrange: prepare a validated PDF container and completed fields only.
    const pdfContent = createPdfContent();
    pdfContent.setAttribute('data-validate-fields', 'true');

    createFieldCard('completed-1');
    createFieldCard('completed-2');

    // Act: execute the helper with only inserted fields.
    const result = validateFieldsInserted([
      createField({ id: 1, inserted: true }),
      createField({ id: 2, inserted: true }),
    ]);

    // Assert: validation succeeds, the signal is cleared, and no scroll occurs.
    expect(result).toBe(true);
    expect(pdfContent.hasAttribute('data-validate-fields')).toBe(false);
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });

  it('WB-02 - validates DOM fields and scrolls directly to the first pending field', () => {
    // Arrange: prepare two pending fields and mount the first one in the DOM.
    const pdfContent = createPdfContent();

    createFieldCard('pending-page-1');
    createFieldCard('pending-page-2');

    const firstPendingField = createField({ id: 11, page: 1, positionY: '800', inserted: false });
    const secondPendingField = createField({ id: 22, page: 2, positionY: '10', inserted: false });

    createFieldElement(firstPendingField.id);

    // Act: execute validation with the fields intentionally ordered out of position.
    const result = validateFieldsInserted([secondPendingField, firstPendingField]);

    // Assert: the fields are marked, the PDF signal remains active, and the first pending field is scrolled into view.
    expect(result).toBe(false);
    expect(pdfContent.getAttribute('data-validate-fields')).toBe('true');

    const fieldCards = document.querySelectorAll('.field-card-container');

    expect(fieldCards).toHaveLength(2);
    expect(fieldCards[0].getAttribute('data-validate')).toBe('true');
    expect(fieldCards[1].getAttribute('data-validate')).toBe('true');
    expect(scrollIntoViewSpy).toHaveBeenCalledOnce();
    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(pdfContent.hasAttribute('data-scroll-to-page')).toBe(false);
  });

  it('WB-03 - falls back to data-scroll-to-page when the first pending field is not mounted', () => {
    // Arrange: prepare a pending field that is not mounted in the DOM.
    const pdfContent = createPdfContent();

    createFieldCard('pending-page-3');

    const pendingField = createField({ id: 33, page: 4, positionY: '120', inserted: false });

    // Act: validate while the first pending field is virtualized away.
    const result = validateFieldsInserted([pendingField]);

    // Assert: the helper signals page navigation instead of direct scrolling.
    expect(result).toBe(false);
    expect(pdfContent.getAttribute('data-validate-fields')).toBe('true');
    expect(pdfContent.getAttribute('data-scroll-to-page')).toBe('4');
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });

  it('WB-04 - returns false without page scrolling when the PDF container is missing', () => {
    // Arrange: prepare a pending field without mounting the PDF container.
    createFieldCard('pending-page-missing-pdf');

    const pendingField = createField({ id: 44, page: 7, positionY: '12', inserted: false });

    // Act: validate in the defensive branch where the container is unavailable.
    const result = validateFieldsInserted([pendingField]);

    // Assert: the helper still blocks completion and does not try to scroll by page.
    expect(result).toBe(false);
    expect(document.querySelector(PDF_VIEWER_CONTENT_SELECTOR)).toBeNull();
    expect(document.querySelector('.field-card-container').getAttribute('data-validate')).toBe('true');
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });

  it('WB-05 - returns false directly when the first uninserted field is falsy (defensive branch)', () => {
    // Arrange: prepare a pending field, but force `Array.prototype.filter` (used to build
    // `uninsertedFields`) to yield `[undefined]`. After the `JSON.parse(JSON.stringify(...))`
    // round trip in `sortFieldsByPosition`, `undefined` becomes `null`, so
    // `uninsertedFields[0]` is falsy even though `uninsertedFields.length > 0`.
    // This exercises the `if (firstUninsertedField)` guard's `false` branch, which is
    // unreachable through normal `Field[]` input (filter never lets non-inserted holes
    // through) but remains in the source as defensive code.
    const pdfContent = createPdfContent();

    createFieldCard('pending-falsy-first');

    const pendingField = createField({ id: 55, page: 2, positionY: '50', inserted: false });

    const originalFilter = Array.prototype.filter;
    Array.prototype.filter = function (...args) {
      const result = originalFilter.apply(this, args);

      // Only hijack the `fields.filter(...)` call (Field objects expose `inserted`),
      // leave DOM-node filtering (e.g. `document.getElementsByClassName`) untouched.
      const isFieldsArray = result.length > 0 && Object.hasOwn(result[0], 'inserted');

      return isFieldsArray ? [undefined] : result;
    };

    let result;

    try {
      // Act: validate while `uninsertedFields[0]` resolves to `null`.
      result = validateFieldsInserted([pendingField]);
    } finally {
      Array.prototype.filter = originalFilter;
    }

    // Assert: the helper blocks completion without scrolling to an element or a page.
    expect(result).toBe(false);
    expect(pdfContent.getAttribute('data-validate-fields')).toBe('true');
    expect(pdfContent.hasAttribute('data-scroll-to-page')).toBe(false);
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });
});
