describe('Envelope Sign Flow', () => {
  let envelopeUrl;

  beforeEach(() => {
    cy.viewport(1854, 963);
    cy.login();

    cy.visit('/t/personal_kbudzsciukycrosn/documents');
    cy.wait(2000);

    cy.get('.bg-primary > .flex').click();
    cy.wait(2000);

    cy.get('[data-testid="document-upload-input"]').selectFile(
      'tests/cypress/fixtures/momento 1 - Lenin Ospina - 1037668556.pdf',
      { force: true },
    );

    cy.url()
      .should('include', '/edit')
      .then((url) => {
        envelopeUrl = url;
      });

    cy.wait(2000);
  });

  it('should configure signer, add fields, send and sign document', () => {
    cy.visit(envelopeUrl);
    cy.wait(4000);

    cy.get('[data-testid="signer-email-input"]')
      .should('be.visible')
      .should('not.be.disabled')
      .click()
      .type('venividivichi3105@gmail.com', { delay: 50 });

    cy.get('input[name*="name"], input[placeholder*="nombre"], input[placeholder*="Name"]')
      .should('be.visible')
      .should('not.be.disabled')
      .type('programador', { delay: 50 });

    cy.get('.text-primary-foreground:nth-child(1)').click();
    cy.wait(1000);

    cy.scrollTo(0, 1668, { ensureScrollable: false });

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

    cy.scrollTo(0, 552, { ensureScrollable: false });
    cy.scrollTo(0, 1032, { ensureScrollable: false });

    // Click on Konva canvas (signing area) three times  ← aquí el fix
    cy.get('.konvajs-content > canvas').first().click();
    cy.get('.konvajs-content > canvas').first().click();
    cy.get('.konvajs-content > canvas').first().click();

    // Navigate to signing page
    cy.contains('a', 'Sign').click();
    cy.url().should('include', '/sign/');
    cy.wait(2000);

    // Click "Siguiente campo" para navegar al campo de firma
    cy.contains('button', 'Next Field').click();
    cy.wait(1000);

    // Click en el campo Firma del canvas
    cy.get('div:nth-child(1) > .relative canvas').first().click();
    cy.wait(1000);

    // Ahora aparece "Completo"
    cy.contains('button', 'Complete').should('be.visible').click();
    cy.wait(1000);

    // Click "Firmar"
    cy.contains('button', 'Sign').click();
    cy.url().should('not.include', '/sign/');
  });
});
