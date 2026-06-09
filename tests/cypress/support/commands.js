// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

Cypress.Commands.add('fill', { prevSubject: 'element' }, (subject, value) => {
  const text = value == null ? '' : String(value);

  const chain = cy.wrap(subject).clear({ force: true });

  if (text.length === 0) {
    return chain;
  }

  return chain.type(text, { force: true });
});

Cypress.Commands.add('login', () => {
  cy.visit('/signin');
  cy.wait(2000);
  cy.get('input[type="email"]')
    .should('be.visible')
    .should('be.enabled')
    .type('venividivichi3105@gmail.com', { delay: 50 });
  cy.get('input[type="password"]').should('be.visible').should('be.enabled').type('Clave1234**A', { delay: 50 });
  cy.get('.bg-primary').click();
  cy.url().should('not.include', '/signin');
});
