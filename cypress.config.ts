import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    specPattern: 'tests/cypress/e2e/**/*.cy.ts',
    supportFile: false,
    baseUrl: 'http://localhost:3000',
  },
});
