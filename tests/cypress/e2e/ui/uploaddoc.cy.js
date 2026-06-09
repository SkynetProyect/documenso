describe('Document Upload Flow', () => {
  beforeEach(() => {
    cy.viewport(1854, 963);
    cy.login();
    cy.visit('/t/personal_kbudzsciukycrosn/documents');
    cy.wait(2000);
  });

  it('should upload a document', () => {
    // Click "Cargar Documento" button
    cy.get('.bg-primary > .flex').click();
    cy.wait(2000);

    // Upload file
    cy.get('[data-testid="document-upload-input"]').selectFile(
      'tests/cypress/fixtures/momento 1 - Lenin Ospina - 1037668556.pdf',
      { force: true },
    );

    // Wait for navigation to envelope editor
    cy.url().should('include', '/edit');

    // Go back to documents
    cy.get('[href="/t/personal_kbudzsciukycrosn/documents"]').click();
    cy.url().should('include', '/documents');
  });
});
