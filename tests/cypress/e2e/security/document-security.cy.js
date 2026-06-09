// tests/cypress/e2e/security/document-security.cy.js

describe('Document Security Tests', () => {
  describe('Unauthenticated Access', () => {
    it('should redirect to signin when accessing documents without login', () => {
      cy.visit('/t/personal_kbudzsciukycrosn/documents');
      cy.url().should('include', '/signin');
    });

    it('should redirect to signin when accessing envelope editor without login', () => {
      cy.visit('/t/personal_kbudzsciukycrosn/documents/envelope_arbdlczztznuihmd/edit');
      cy.url().should('include', '/signin');
    });

    it('should redirect to signin when accessing audit logs without login', () => {
      cy.visit('/t/personal_kbudzsciukycrosn/documents/envelope_arbdlczztznuihmd/logs');
      cy.url().should('include', '/signin');
    });

    it('should not expose document data in API without authentication', () => {
      cy.request({
        url: '/api/trpc/document.findDocumentsInternal',
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([401, 403]);
      });
    });

    it('should not expose envelope data in API without authentication', () => {
      cy.request({
        url: '/api/trpc/envelope.editor.get?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22envelopeId%22%3A%22envelope_arbdlczztznuihmd%22%7D%7D%7D',
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([401, 403]);
      });
    });
  });

  describe('Authorized Access', () => {
    beforeEach(() => {
      cy.viewport(1854, 963);
      cy.login();
    });

    it('should allow authenticated user to access documents page', () => {
      cy.visit('/t/personal_kbudzsciukycrosn/documents');
      cy.url().should('include', '/documents');
    });

    it('should allow authenticated user to access envelope editor', () => {
      cy.visit('/t/personal_kbudzsciukycrosn/documents');
      cy.wait(2000);
      cy.get('.bg-primary > .flex').click();
      cy.wait(2000);
      cy.get('[data-testid="document-upload-input"]').selectFile(
        'tests/cypress/fixtures/momento 1 - Lenin Ospina - 1037668556.pdf',
        { force: true },
      );
      cy.url().should('include', '/edit');
    });
  });

  describe('Sign Link Security', () => {
    it('should allow access to valid sign link', () => {
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
          cy.visit(url);
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

    it('should return 404 for invalid sign link', () => {
      cy.request({
        url: '/sign/invalid-token-123',
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([404, 400]);
      });
    });
  });
});
