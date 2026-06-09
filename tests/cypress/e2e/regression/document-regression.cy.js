// tests/cypress/e2e/regression/document-regression.cy.js

describe('Document Regression Tests', () => {
  describe('Login Flow', () => {
    beforeEach(() => {
      cy.viewport(927, 963);
      cy.visit('/signin');
      cy.wait(2000);
    });

    it('should not login with wrong password', () => {
      cy.get('input[type="email"]').should('be.visible').type('venividivichi3105@gmail.com', { delay: 50 });
      cy.get('input[type="password"]').should('be.visible').type('WrongPassword123', { delay: 50 });
      cy.get('.bg-primary').click();
      cy.url().should('include', '/signin');
    });

    it('should not login with empty fields', () => {
      cy.get('.bg-primary').click();
      cy.url().should('include', '/signin');
    });

    it('should not login with invalid email format', () => {
      cy.get('input[type="email"]').type('notanemail', { delay: 50 });
      cy.get('input[type="password"]').type('Clave1234**A', { delay: 50 });
      cy.get('.bg-primary').click();
      cy.url().should('include', '/signin');
    });

    it('should successfully login with valid credentials', () => {
      cy.get('input[type="email"]').type('venividivichi3105@gmail.com', { delay: 50 });
      cy.get('input[type="password"]').type('Clave1234**A', { delay: 50 });
      cy.get('.bg-primary').click();
      cy.url().should('not.include', '/signin');
    });
  });

  describe('Document Upload Regression', () => {
    beforeEach(() => {
      cy.viewport(1854, 963);
      cy.login();
      cy.visit('/t/personal_kbudzsciukycrosn/documents');
      cy.wait(2000);
    });

    it('should show upload button on documents page', () => {
      cy.get('.bg-primary > .flex').should('be.visible');
    });

    it('should open upload dialog when clicking upload button', () => {
      cy.get('.bg-primary > .flex').click();
      cy.get('[data-testid="document-upload-input"]').should('exist');
    });

    it('should navigate to editor after uploading PDF', () => {
      cy.get('.bg-primary > .flex').click();
      cy.wait(2000);
      cy.get('[data-testid="document-upload-input"]').selectFile(
        'tests/cypress/fixtures/momento 1 - Lenin Ospina - 1037668556.pdf',
        { force: true },
      );
      cy.url().should('include', '/edit');
    });

    it('should return to documents list after upload and back navigation', () => {
      cy.get('.bg-primary > .flex').click();
      cy.wait(2000);
      cy.get('[data-testid="document-upload-input"]').selectFile(
        'tests/cypress/fixtures/momento 1 - Lenin Ospina - 1037668556.pdf',
        { force: true },
      );
      cy.url().should('include', '/edit');
      cy.get('[href="/t/personal_kbudzsciukycrosn/documents"]').click();
      cy.url().should('include', '/documents');
    });
  });

  describe('Envelope Editor Regression', () => {
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

    it('should show signer email input in editor', () => {
      cy.visit(envelopeUrl);
      cy.wait(4000);
      cy.get('[data-testid="signer-email-input"]').should('be.visible');
    });

    it('should allow filling signer details', () => {
      cy.visit(envelopeUrl);
      cy.wait(4000);
      cy.get('[data-testid="signer-email-input"]')
        .should('not.be.disabled')
        .type('venividivichi3105@gmail.com', { delay: 50 });
      cy.get('input[name*="name"], input[placeholder*="nombre"], input[placeholder*="Name"]')
        .should('not.be.disabled')
        .type('programador', { delay: 50 });
      cy.get('[data-testid="signer-email-input"]').should('have.value', 'venividivichi3105@gmail.com');
    });

    it('should show canvas after clicking Agregar Campos', () => {
      cy.visit(envelopeUrl);
      cy.wait(4000);
      cy.get('[data-testid="signer-email-input"]')
        .should('not.be.disabled')
        .type('venividivichi3105@gmail.com', { delay: 50 });
      cy.get('input[name*="name"], input[placeholder*="nombre"], input[placeholder*="Name"]')
        .should('not.be.disabled')
        .type('programador', { delay: 50 });
      cy.get('.text-primary-foreground:nth-child(1)').click();
      cy.get('canvas').should('exist');
    });

    it('should generate sign links after completing envelope setup', () => {
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
      cy.get('.text-primary-foreground').click();
      cy.wait(1000);
      cy.contains('button', 'None').click();
      cy.contains('button', 'Generate Links').click();
      cy.url().should('not.include', '/edit');
      cy.contains('a', 'Sign').should('exist');
    });
  });

  describe('Document Rejection Regression', () => {
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

    it('should allow rejecting a document with a reason', () => {
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
      cy.get('.text-primary-foreground').click();
      cy.wait(1000);
      cy.contains('button', 'None').click();
      cy.contains('button', 'Generate Links').click();
      cy.url().should('not.include', '/edit');
      cy.wait(2000);
      cy.contains('a', 'Sign').click();
      cy.url().should('include', '/sign/');
      cy.wait(2000);
      cy.get('.hover\\:text-destructive').click();
      cy.get('textarea').should('be.visible').type('motivo de rechazo', { delay: 50 });
      cy.get('.bg-destructive').click();
    });
  });
});
