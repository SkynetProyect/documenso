// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';
// import '@argos-ci/cypress/support'
// import '@percy/cypress'
import 'cypress-axe';
Cypress.on('uncaught:exception', (err) => {
  if (
    err.message.includes('Hydration failed') ||
    err.message.includes('initial UI does not match') ||
    err.message.includes('error while hydrating') ||
    err.message.includes('Suspense boundary')
  ) {
    return false;
  }
});
// afterEach(() => {
// 	const testTitle = Cypress.currentTest?.titlePath?.join(' › ') ?? Cypress.currentTest?.title ?? 'Cypress test'
// 	cy.percySnapshot(testTitle)
// })
