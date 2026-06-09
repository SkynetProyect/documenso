describe('Sign In Flow', () => {
  beforeEach(() => {
    cy.viewport(927, 963);
    cy.visit('http://localhost:3000/signin');
  });

  it('should successfully sign in with valid credentials', () => {
    // Fill in email
    cy.get('#\\:r3\\:-form-item').click().type('venividivichi3105@gmail.com');

    // Fill in password
    cy.get('#\\:r5\\:-form-item').click().type('Clave1234**A');

    // Click sign in and wait for navigation
    cy.get('.bg-primary').click();
    cy.url().should('not.include', '/signin');

    cy.viewport(1854, 963);
  });
});
