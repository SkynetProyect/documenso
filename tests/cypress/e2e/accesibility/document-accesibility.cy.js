// tests/cypress/e2e/accesibility/document-accessibility.cy.js

describe('Document Accessibility Tests', () => {
  describe('Sign In Page Accessibility', () => {
    beforeEach(() => {
      cy.viewport(927, 963);
      cy.visit('/signin');
      cy.wait(2000);
      cy.injectAxe();
    });

    it('should have no accessibility violations on signin page', () => {
      cy.checkA11y(null, {
        rules: {
          'color-contrast': { enabled: true },
          label: { enabled: true },
          'input-button-name': { enabled: true },
        },
      });
    });

    it('should have labeled email input', () => {
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="email"]')
        .invoke('attr', 'id')
        .then((id) => {
          cy.get(`label[for="${id}"]`).should('exist');
        });
    });

    it('should have labeled password input', () => {
      cy.get('input[type="password"]').should('be.visible');
      cy.get('input[type="password"]')
        .invoke('attr', 'id')
        .then((id) => {
          cy.get(`label[for="${id}"]`).should('exist');
        });
    });

    it('should have accessible submit button', () => {
      cy.get('.bg-primary').should('be.visible').should('not.be.disabled');
    });

    it('should be keyboard navigable', () => {
      cy.get('input[type="email"]').focus().should('be.focused');
      cy.realPress('Tab');
      cy.get('input[type="password"]').should('be.focused');
      cy.realPress('Tab');
      cy.get('.bg-primary').should('be.focused');
    });
  });

  describe('Documents Page Accessibility', () => {
    beforeEach(() => {
      cy.viewport(1854, 963);
      cy.login();
      cy.visit('/t/personal_kbudzsciukycrosn/documents');
      cy.wait(2000);
      cy.injectAxe();
    });

    it('should have no accessibility violations on documents page', () => {
      cy.checkA11y(null, {
        rules: {
          'color-contrast': { enabled: true },
          'button-name': { enabled: true },
          'link-name': { enabled: true },
        },
      });
    });

    it('should have accessible upload button', () => {
      cy.get('.bg-primary > .flex').should('be.visible').should('not.be.disabled');
    });

    it('should have accessible navigation links', () => {
      cy.get('a').each(($el) => {
        cy.wrap($el).should('not.have.attr', 'href', '#');
      });
    });

    it('should have proper heading structure', () => {
      cy.get('h1, h2, h3').should('exist');
    });
  });

  describe('Envelope Editor Accessibility', () => {
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

    it('should have no accessibility violations on envelope editor', () => {
      cy.visit(envelopeUrl);
      cy.wait(4000);
      cy.injectAxe();
      cy.checkA11y(null, {
        rules: {
          'color-contrast': { enabled: true },
          label: { enabled: true },
        },
      });
    });

    it('should have accessible signer email input', () => {
      cy.visit(envelopeUrl);
      cy.wait(4000);
      cy.get('[data-testid="signer-email-input"]').should('be.visible').should('not.be.disabled');
    });

    it('should have accessible form fields with labels', () => {
      cy.visit(envelopeUrl);
      cy.wait(4000);
      cy.get('input').each(($el) => {
        const id = $el.attr('id');
        if (id) {
          cy.get(`label[for="${id}"]`).should('exist');
        }
      });
    });
  });

  describe('Sign Page Accessibility', () => {
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

    it('should have no accessibility violations on sign page', () => {
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
      cy.injectAxe();
      cy.checkA11y(null, {
        rules: {
          'color-contrast': { enabled: true },
          'button-name': { enabled: true },
        },
      });
    });

    it('should have accessible rejection button', () => {
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
      cy.get('.hover\\:text-destructive').should('be.visible');
    });
  });
});
