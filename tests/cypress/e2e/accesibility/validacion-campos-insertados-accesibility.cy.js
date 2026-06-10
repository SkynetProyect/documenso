// tests/cypress/e2e/accesibility/validacion-campos-insertados-accesibility.cy.js
//
// Accesibilidad de los estados producidos por validateFieldsInserted
// (packages/lib/utils/fields.ts) en la página de firma.

describe('Validación de campos insertados - Accessibility', () => {
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

  it('should have no accessibility violations when a required field is highlighted as pending', () => {
    configurarSobreYGenerarEnlace();
    irAFirmar();

    cy.contains('button', /Next Field|Complete/).click();
    cy.wait(1000);
    cy.get('#field-tooltip').should('be.visible');

    cy.injectAxe();
    cy.checkA11y(null, {
      rules: {
        'color-contrast': { enabled: true },
        'button-name': { enabled: true },
      },
    });
  });

  it('should keep the highlighted pending field visible', () => {
    configurarSobreYGenerarEnlace();
    irAFirmar();

    cy.contains('button', /Next Field|Complete/).click();
    cy.wait(1000);

    cy.get('#field-tooltip').should('be.visible');
  });

  it('should have no accessibility violations on the finalize sign dialog when validation passes', () => {
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

    cy.injectAxe();
    cy.checkA11y(null, {
      rules: {
        'color-contrast': { enabled: true },
        'button-name': { enabled: true },
      },
    });
  });
});
