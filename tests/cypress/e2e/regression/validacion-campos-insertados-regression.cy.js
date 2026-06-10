// tests/cypress/e2e/regression/validacion-campos-insertados-regression.cy.js
//
// Regresión de caja negra para validateFieldsInserted (packages/lib/utils/fields.ts).
// Cubre los mismos 4 caminos que tests/playwright/features/validacion-campos-insertados.feature
// (TC-01..TC-04, ver tests/playwright/PLAN-PRUEBAS-CAJA-NEGRA.md).

describe('Validación de campos insertados - Regression', () => {
  let envelopeUrl;

  beforeEach(() => {
    cy.viewport(1854, 963);
    cy.login();
    cy.visit('/t/kbudzsciukycrosn/documents');
    cy.wait(2000);
    cy.get('[data-testid="document-upload-input"]')
      .first()
      .selectFile('tests/cypress/fixtures/momento 1 - Lenin Ospina - 1037668556.pdf', { force: true });
    cy.url()
      .should('include', '/edit')
      .then((url) => {
        envelopeUrl = url;
      });
    cy.wait(2000);
  });

  function configurarSobreYGenerarEnlace() {
    cy.visit(envelopeUrl);
    cy.wait(4000);
    cy.get('[data-testid="signer-email-input"]')
      .should('not.be.disabled')
      .type('venividivichi3105@gmail.com', { delay: 50 });
    cy.get('input[name*="name"], input[placeholder*="nombre"], input[placeholder*="Name"]')
      .should('not.be.disabled')
      .type('programador', { delay: 50 });
    cy.get('.text-primary-foreground:nth-child(1)').click();
    cy.wait(1000);
    cy.get('.group:nth-child(2)').click();
    cy.get('canvas').first().click();
    cy.get('.h-12:nth-child(1)').click();
    cy.get('canvas').first().click();
    cy.get('.text-primary-foreground').click();
    cy.wait(1000);
    cy.contains('button', 'None').click();
    cy.contains('button', 'Generate Links').click();
    cy.url().should('not.include', '/edit');
    cy.wait(2000);
  }

  function irAFirmar() {
    cy.contains('a', 'Sign').click();
    cy.url().should('include', '/sign/');
    cy.wait(2000);
  }

  it('TC-01 (P1) - completing the required field clears the validation signal', () => {
    configurarSobreYGenerarEnlace();
    irAFirmar();

    cy.get('div:nth-child(1) > .relative canvas').first().click();
    cy.wait(500);
    cy.get('[role="dialog"] button[role="tab"]').contains('Type').click();
    cy.get('[role="dialog"] input[type="text"], [role="dialog"] input:not([type])').first().type('programador');
    cy.get('[role="dialog"] button').contains('Sign').click();
    cy.wait(1000);
    cy.contains('button', 'Complete').first().click();
    cy.wait(1000);

    cy.get('[data-pdf-content]').should('not.have.attr', 'data-validate-fields');
    cy.contains('button', 'Sign').should('be.visible');
  });

  it('TC-02 (P2) - pending field visible in the DOM is highlighted and blocks completion', () => {
    configurarSobreYGenerarEnlace();
    irAFirmar();

    cy.contains('button', /Next Field|Complete/).click();
    cy.wait(1000);

    cy.url().should('include', '/sign/');
    cy.get('#field-tooltip').should('be.visible');
    cy.contains(/Field Remaining/).should('be.visible');
  });

  it('TC-03 (P3) - pending field on a virtualized page requests a page jump', () => {
    cy.visit('/t/kbudzsciukycrosn/documents');
    cy.wait(2000);
    cy.get('[data-testid="document-upload-input"]')
      .first()
      .selectFile('tests/cypress/fixtures/documento-multipagina.pdf', { force: true });
    cy.url()
      .should('include', '/edit')
      .then((url) => {
        envelopeUrl = url;
      });
    cy.wait(2000);

    cy.visit(envelopeUrl);
    cy.wait(4000);
    cy.get('[data-testid="signer-email-input"]')
      .should('not.be.disabled')
      .type('venividivichi3105@gmail.com', { delay: 50 });
    cy.get('input[name*="name"], input[placeholder*="nombre"], input[placeholder*="Name"]')
      .should('not.be.disabled')
      .type('programador', { delay: 50 });
    cy.get('.text-primary-foreground:nth-child(1)').click();
    cy.wait(1000);
    cy.window().then((win) => win.scrollTo(0, 2400));
    cy.get('.group:nth-child(2)').click();
    cy.get('canvas').eq(1).click();
    cy.get('.h-12:nth-child(1)').click();
    cy.get('canvas').eq(1).click();
    cy.get('.text-primary-foreground').click();
    cy.wait(1000);
    cy.contains('button', 'None').click();
    cy.contains('button', 'Generate Links').click();
    cy.url().should('not.include', '/edit');
    cy.wait(2000);

    irAFirmar();

    cy.contains('button', /Next Field|Complete/).click();
    cy.wait(1000);

    cy.url().should('include', '/sign/');
    // v2 only sets data-scroll-to-page when #field-tooltip can't be found (page virtualized
    // out of view); at this viewport/zoom both pages render, so the tooltip path is taken.
    // cy.get retries for up to 10s, giving the 150ms setShowPendingFieldTooltip render time to land.
    cy.get('#field-tooltip').should('be.visible');
  });

  it('TC-04 (P4) - missing PDF viewer container does not request a page jump', () => {
    configurarSobreYGenerarEnlace();
    irAFirmar();

    cy.get('[data-pdf-content]').then(($el) => $el.removeAttr('data-pdf-content'));

    cy.contains('button', /Next Field|Complete/).click();
    cy.wait(1000);

    cy.url().should('include', '/sign/');
    cy.get('[data-scroll-to-page]').should('not.exist');
  });
});
