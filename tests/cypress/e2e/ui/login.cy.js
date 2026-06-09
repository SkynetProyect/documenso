describe('Sign In Flow', () => {
  beforeEach(() => {
    cy.viewport(927, 963);
    cy.visit('/signin');
    // Esperar a que Next.js termine la hidratación
    cy.wait(2000);
  });

  it('should successfully sign in with valid credentials', () => {
    cy.get('input[type="email"]')
      .should('be.visible')
      .should('be.enabled')
      .click()
      .type('venividivichi3105@gmail.com', { delay: 50 });

    cy.get('input[type="password"]')
      .should('be.visible')
      .should('be.enabled')
      .click()
      .type('Clave1234**A', { delay: 50 });

    cy.get('.bg-primary').click();
    cy.url().should('not.include', '/signin');
  });
});
