describe('Document Audit Logs Flow', () => {
  beforeEach(() => {
    cy.viewport(1854, 963);
    cy.login();
    cy.visit('http://localhost:3000/t/personal_kbudzsciukycrosn/documents');
  });

  it('should navigate to document audit logs and interact with the table', () => {
    // Click on document link and wait for navigation
    cy.get('[href="/t/personal_kbudzsciukycrosn/documents/envelope_clcunmlwnudymcbe"]').click();
    cy.url().should('include', 'envelope_clcunmlwnudymcbe');

    // Click on html body (dismiss any modal/dropdown)
    cy.get('html').click();

    // Navigate to audit logs
    cy.get('[href="/t/personal_kbudzsciukycrosn/documents/envelope_clcunmlwnudymcbe/logs"]').click();
    cy.url().should('include', '/logs');

    // Click on document title group
    cy.get('.group').click();

    // Scroll down then back up
    cy.scrollTo(0, 552);
    cy.scrollTo(0, 138); // 552 - 414

    // Click on "Acción" column header
    cy.get('.h-12:nth-child(3)').click();
  });
});
